const express = require('express');
const pool = require('../config/db');
const { verifyToken, authorize } = require('../middleware/auth');

const router = express.Router();

// GET /api/tokens?date=&unit_id= - list tokens with patient + unit info
router.get('/', verifyToken, authorize('RECEPTIONIST', 'DOCTOR'), async (req, res) => {
  try {
    const { date, unit_id } = req.query;
    const conditions = [];
    const params = [];

    if (date) {
      conditions.push(`t.token_date = $${params.length + 1}`);
      params.push(date);
    } else {
      conditions.push(`t.token_date = CURRENT_DATE`);
    }

    if (unit_id) {
      conditions.push(`t.unit_id = $${params.length + 1}`);
      params.push(unit_id);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;
    const result = await pool.query(
      `SELECT t.token_id, t.token_number, t.health_card_id, t.unit_id, t.issue_datetime,
              t.token_date, t.status, u.unit_name, p.patient_id, p.full_name AS patient_name,
              hc.card_number
       FROM token t
       JOIN unit u ON u.unit_id = t.unit_id
       JOIN health_card hc ON hc.card_id = t.health_card_id
       JOIN patient p ON p.patient_id = hc.patient_id
       ${where}
       ORDER BY u.unit_name, t.token_number`,
      params
    );
    return res.json({ success: true, data: result.rows, count: result.rows.length });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// POST /api/tokens - issue a token (validates active, non-expired health card)
router.post('/', verifyToken, authorize('RECEPTIONIST'), async (req, res) => {
  try {
    const { patient_id, unit_id } = req.body;

    if (!patient_id || !unit_id) {
      return res.status(400).json({ success: false, error: 'patient_id and unit_id are required' });
    }

    const unit = await pool.query('SELECT unit_id, unit_name, is_active FROM unit WHERE unit_id = $1', [unit_id]);
    if (unit.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Unit not found' });
    }
    if (!unit.rows[0].is_active) {
      return res.status(400).json({ success: false, error: 'Unit is not active' });
    }

    const cardResult = await pool.query(
      `SELECT card_id, status, expiry_date, (expiry_date < CURRENT_DATE) AS is_expired FROM health_card WHERE patient_id = $1`,
      [patient_id]
    );
    if (cardResult.rows.length === 0) {
      return res.status(400).json({ success: false, error: 'Patient has no health card' });
    }
    const card = cardResult.rows[0];
    if (card.status !== 'ACTIVE') {
      return res.status(400).json({ success: false, error: 'Health card is not active' });
    }
    if (card.is_expired) {
      return res.status(400).json({ success: false, error: 'Health card has expired' });
    }

    const nextResult = await pool.query(
      `SELECT COALESCE(MAX(token_number), 0) + 1 AS next_number
       FROM token WHERE unit_id = $1 AND token_date = CURRENT_DATE`,
      [unit_id]
    );
    const nextNumber = nextResult.rows[0].next_number;

    const insertResult = await pool.query(
      `INSERT INTO token (token_number, health_card_id, unit_id)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [nextNumber, card.card_id, unit_id]
    );

    const token = insertResult.rows[0];
    const patient = await pool.query('SELECT full_name FROM patient WHERE patient_id = $1', [patient_id]);

    return res.status(201).json({
      success: true,
      data: {
        ...token,
        unit_name: unit.rows[0].unit_name,
        patient_name: patient.rows[0]?.full_name,
      },
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ success: false, error: 'Token number conflict, please retry' });
    }
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// GET /api/tokens/:id/details — full details for the printable card
router.get('/:id/details', verifyToken, authorize('RECEPTIONIST', 'DOCTOR', 'PATIENT'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.token_id, t.token_number, t.token_date, t.status,
              t.issue_datetime, t.unit_id,
              u.unit_name, u.floor_location,
              hc.card_number, hc.patient_id,
              p.full_name AS patient_name, p.patient_category,
              p.university_id, p.academic_dept
       FROM token t
       JOIN health_card hc ON t.health_card_id = hc.card_id
       JOIN patient p ON hc.patient_id = p.patient_id
       JOIN unit u ON t.unit_id = u.unit_id
       WHERE t.token_id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Token not found' });
    }

    const token = result.rows[0];

    if (req.user.role === 'PATIENT' && Number(token.patient_id) !== Number(req.user.patient_id)) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    return res.json({ success: true, data: token });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
