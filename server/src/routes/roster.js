const express = require('express');
const pool = require('../config/db');
const { verifyToken, authorize } = require('../middleware/auth');

const router = express.Router();

// GET /api/roster?date= - duty roster (RECEPTIONIST, DOCTOR read-only)
router.get('/', verifyToken, authorize('RECEPTIONIST', 'DOCTOR'), async (req, res) => {
  try {
    const conditions = [];
    const params = [];

    if (req.query.date) {
      params.push(req.query.date);
      conditions.push(`r.duty_date = $${params.length}`);
    }
    if (req.query.unit_id) {
      params.push(req.query.unit_id);
      conditions.push(`r.unit_id = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await pool.query(
      `SELECT r.*, d.full_name AS doctor_name, d.doctor_type, s.shift_name, s.start_time, s.end_time, u.unit_name
       FROM duty_roster r
       JOIN doctor d ON d.doctor_id = r.doctor_id
       JOIN shift s ON s.shift_id = r.shift_id
       LEFT JOIN unit u ON u.unit_id = r.unit_id
       ${where}
       ORDER BY r.duty_date, s.start_time, u.unit_name`,
      params
    );
    return res.json({ success: true, data: result.rows, count: result.rows.length });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// GET /api/roster/shifts - list all shifts (so the roster form picks up Friday
// shifts automatically). RECEPTIONIST/DOCTOR allowed too; ADMIN always passes.
router.get('/shifts', verifyToken, authorize('RECEPTIONIST', 'DOCTOR'), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT shift_id, shift_name, start_time, end_time FROM shift ORDER BY shift_id'
    );
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// POST /api/roster - create a duty roster entry (ADMIN only)
router.post('/', verifyToken, authorize(), async (req, res) => {
  try {
    const { doctor_id, shift_id, unit_id, duty_date, is_oncall } = req.body;

    if (!doctor_id || !shift_id || !duty_date) {
      return res.status(400).json({ success: false, error: 'doctor_id, shift_id and duty_date are required' });
    }

    const insertResult = await pool.query(
      `INSERT INTO duty_roster (doctor_id, shift_id, unit_id, duty_date, is_oncall)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [doctor_id, shift_id, unit_id || null, duty_date, !!is_oncall]
    );

    return res.status(201).json({ success: true, data: insertResult.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ success: false, error: 'Doctor already has a roster entry for this date and shift' });
    }
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// POST /api/roster/bulk - create many roster entries across a date range (ADMIN only)
router.post('/bulk', verifyToken, authorize(), async (req, res) => {
  try {
    const { doctor_id, shift_id, unit_id, start_date, end_date, days_of_week, is_oncall } = req.body;

    if (!doctor_id || !shift_id || !start_date || !end_date) {
      return res.status(400).json({ success: false, error: 'doctor_id, shift_id, start_date and end_date are required' });
    }
    if (!Array.isArray(days_of_week) || days_of_week.length === 0) {
      return res.status(400).json({ success: false, error: 'Select at least one day' });
    }
    if (!days_of_week.every((d) => Number.isInteger(d) && d >= 0 && d <= 6)) {
      return res.status(400).json({ success: false, error: 'days_of_week values must be 0–6' });
    }

    // Referential checks
    const [doc, shift] = await Promise.all([
      pool.query('SELECT 1 FROM doctor WHERE doctor_id = $1', [doctor_id]),
      pool.query('SELECT 1 FROM shift WHERE shift_id = $1', [shift_id]),
    ]);
    if (doc.rows.length === 0) return res.status(400).json({ success: false, error: 'Doctor not found' });
    if (shift.rows.length === 0) return res.status(400).json({ success: false, error: 'Shift not found' });
    if (unit_id) {
      const unit = await pool.query('SELECT 1 FROM unit WHERE unit_id = $1', [unit_id]);
      if (unit.rows.length === 0) return res.status(400).json({ success: false, error: 'Unit not found' });
    }

    // Date validation against the DB's own "today" (timezone-consistent).
    const { rows: [{ today }] } = await pool.query('SELECT CURRENT_DATE::text AS today');
    if (start_date < today) {
      return res.status(400).json({ success: false, error: 'start_date must be today or in the future' });
    }
    if (end_date < start_date) {
      return res.status(400).json({ success: false, error: 'end_date must be on or after start_date' });
    }
    const start = new Date(start_date + 'T00:00:00');
    const end = new Date(end_date + 'T00:00:00');
    const dayCount = Math.round((end - start) / 86400000) + 1;
    if (dayCount > 90) {
      return res.status(400).json({ success: false, error: 'Maximum range is 90 days' });
    }

    let created = 0;
    let skipped = 0;
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (!days_of_week.includes(d.getDay())) continue;
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const ins = await pool.query(
        `INSERT INTO duty_roster (doctor_id, shift_id, unit_id, duty_date, is_oncall)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (doctor_id, duty_date, shift_id) DO NOTHING
         RETURNING roster_id`,
        [doctor_id, shift_id, unit_id || null, dateStr, !!is_oncall]
      );
      if (ins.rowCount > 0) created += 1; else skipped += 1;
    }

    return res.status(201).json({ success: true, data: { created, skipped, total_days: created + skipped } });
  } catch (err) {
    if (err.code === '23503') return res.status(400).json({ success: false, error: 'Invalid doctor_id, shift_id or unit_id' });
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// PUT /api/roster/:id - update roster entry (ADMIN only)
router.put('/:id', verifyToken, authorize(), async (req, res) => {
  try {
    const current = await pool.query('SELECT * FROM duty_roster WHERE roster_id = $1', [req.params.id]);
    if (current.rows.length === 0) return res.status(404).json({ success: false, error: 'Roster entry not found' });
    const entry = current.rows[0];

    const { doctor_id, shift_id, unit_id, duty_date, is_oncall } = req.body;
    const result = await pool.query(
      `UPDATE duty_roster SET doctor_id=$1, shift_id=$2, unit_id=$3, duty_date=$4, is_oncall=$5
       WHERE roster_id=$6 RETURNING *`,
      [
        doctor_id || entry.doctor_id,
        shift_id || entry.shift_id,
        unit_id !== undefined ? (unit_id || null) : entry.unit_id,
        duty_date || entry.duty_date,
        is_oncall !== undefined ? !!is_oncall : entry.is_oncall,
        req.params.id,
      ]
    );
    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ success: false, error: 'Doctor already has a roster entry for this date and shift' });
    }
    if (err.code === '23503') return res.status(400).json({ success: false, error: 'Invalid doctor_id or shift_id' });
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// DELETE /api/roster/:id - remove roster entry (ADMIN only)
router.delete('/:id', verifyToken, authorize(), async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM duty_roster WHERE roster_id = $1 RETURNING roster_id',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Roster entry not found' });
    return res.json({ success: true, data: { roster_id: result.rows[0].roster_id } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
