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
