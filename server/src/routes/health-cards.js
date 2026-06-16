const express = require('express');
const pool = require('../config/db');
const { verifyToken, authorize } = require('../middleware/auth');

const router = express.Router();

const STATUSES = ['ACTIVE', 'EXPIRED', 'SUSPENDED'];

// GET /api/health-cards - list all cards with patient name
router.get('/', verifyToken, authorize('RECEPTIONIST'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT hc.card_id, hc.card_number, hc.patient_id, p.full_name, p.patient_category,
              hc.issue_date, hc.expiry_date, hc.photo_submitted, hc.status
       FROM health_card hc
       JOIN patient p ON p.patient_id = hc.patient_id
       ORDER BY hc.card_id DESC`
    );
    return res.json({ success: true, data: result.rows, count: result.rows.length });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// GET /api/health-cards/me - patient views their own card
router.get('/me', verifyToken, authorize('PATIENT'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT hc.card_id, hc.card_number, hc.patient_id, hc.issue_date, hc.expiry_date,
              hc.photo_submitted, hc.status,
              p.full_name, p.patient_category, p.university_id, p.phone, p.blood_group, p.date_of_birth
       FROM health_card hc
       JOIN patient p ON p.patient_id = hc.patient_id
       WHERE hc.patient_id = $1`,
      [req.user.patient_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'No health card found for your account' });
    }
    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// GET /api/health-cards/patient/:patientId - get a patient's card
router.get('/patient/:patientId', verifyToken, authorize('RECEPTIONIST', 'DOCTOR'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT card_id, card_number, patient_id, issue_date, expiry_date, photo_submitted, status
       FROM health_card WHERE patient_id = $1`,
      [req.params.patientId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'No health card found for this patient' });
    }
    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// POST /api/health-cards - issue a new health card
router.post('/', verifyToken, authorize('RECEPTIONIST'), async (req, res) => {
  try {
    const { patient_id, expiry_date, photo_submitted } = req.body;

    if (!patient_id || !expiry_date) {
      return res.status(400).json({ success: false, error: 'patient_id and expiry_date are required' });
    }

    const patient = await pool.query('SELECT patient_id FROM patient WHERE patient_id = $1', [patient_id]);
    if (patient.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Patient not found' });
    }

    const existing = await pool.query('SELECT card_id FROM health_card WHERE patient_id = $1', [patient_id]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, error: 'Patient already has a health card' });
    }

    const expiry = new Date(expiry_date);
    if (Number.isNaN(expiry.getTime()) || expiry <= new Date()) {
      return res.status(400).json({ success: false, error: 'expiry_date must be a valid future date' });
    }

    const year = new Date().getFullYear();
    const seqResult = await pool.query(
      `SELECT COUNT(*) + 1 AS next_seq FROM health_card WHERE card_number LIKE $1`,
      [`HC-${year}-%`]
    );
    const seq = String(seqResult.rows[0].next_seq).padStart(4, '0');
    const cardNumber = `HC-${year}-${seq}`;

    const result = await pool.query(
      `INSERT INTO health_card (card_number, patient_id, expiry_date, photo_submitted)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [cardNumber, patient_id, expiry_date, !!photo_submitted]
    );

    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ success: false, error: 'Patient already has a health card' });
    }
    if (err.code === '23514') {
      return res.status(400).json({ success: false, error: 'expiry_date must be after issue_date' });
    }
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// PUT /api/health-cards/:id/status - suspend / activate / expire a card
router.put('/:id/status', verifyToken, authorize('RECEPTIONIST'), async (req, res) => {
  try {
    const { status } = req.body;
    if (!STATUSES.includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    const result = await pool.query(
      `UPDATE health_card SET status = $1 WHERE card_id = $2 RETURNING *`,
      [status, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Health card not found' });
    }

    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
