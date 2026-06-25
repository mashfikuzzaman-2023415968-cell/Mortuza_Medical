const express = require('express');
const pool = require('../config/db');
const { verifyToken, authorize } = require('../middleware/auth');

const router = express.Router();

const VISIT_TYPES = ['NEW', 'FOLLOWUP', 'EMERGENCY'];

// GET /api/visits - list visits (DOCTOR: own, PATIENT: ?patient=me, ADMIN: all)
router.get('/', verifyToken, authorize('DOCTOR', 'PATIENT'), async (req, res) => {
  try {
    const conditions = [];
    const params = [];

    if (req.user.role === 'PATIENT') {
      if (req.query.patient !== 'me') {
        return res.status(403).json({ success: false, error: 'Forbidden' });
      }
      params.push(req.user.patient_id);
      conditions.push(`v.patient_id = $${params.length}`);
    } else if (req.user.role === 'DOCTOR') {
      params.push(req.user.doctor_id);
      conditions.push(`v.doctor_id = $${params.length}`);
    }

    if (req.query.date) {
      params.push(req.query.date);
      conditions.push(`v.visit_datetime::date = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await pool.query(
      `SELECT v.*, p.full_name AS patient_name, p.patient_category, d.full_name AS doctor_name,
              (pr.prescription_id IS NOT NULL) AS has_prescription
       FROM visit v
       JOIN patient p ON p.patient_id = v.patient_id
       JOIN doctor d ON d.doctor_id = v.doctor_id
       LEFT JOIN prescription pr ON pr.visit_id = v.visit_id
       ${where}
       ORDER BY v.visit_datetime DESC`,
      params
    );
    return res.json({ success: true, data: result.rows, count: result.rows.length });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// GET /api/visits/:id - visit details + prescription + test orders
router.get('/:id', verifyToken, authorize('DOCTOR', 'PATIENT'), async (req, res) => {
  try {
    const visitResult = await pool.query(
      `SELECT v.*, p.full_name AS patient_name, p.patient_category, p.patient_id,
              d.full_name AS doctor_name
       FROM visit v
       JOIN patient p ON p.patient_id = v.patient_id
       JOIN doctor d ON d.doctor_id = v.doctor_id
       WHERE v.visit_id = $1`,
      [req.params.id]
    );
    if (visitResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Visit not found' });
    }
    const visit = visitResult.rows[0];

    if (req.user.role === 'DOCTOR' && visit.doctor_id !== req.user.doctor_id) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    if (req.user.role === 'PATIENT' && visit.patient_id !== req.user.patient_id) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const prescriptionResult = await pool.query(
      `SELECT pr.*, d.full_name AS doctor_name FROM prescription pr
       JOIN doctor d ON d.doctor_id = pr.doctor_id
       WHERE pr.visit_id = $1`,
      [req.params.id]
    );
    let prescription = prescriptionResult.rows[0] || null;
    if (prescription) {
      const itemsResult = await pool.query(
        `SELECT pi.*, m.medicine_name, m.strength, m.dosage_form
         FROM prescription_item pi
         JOIN medicine m ON m.medicine_id = pi.medicine_id
         WHERE pi.prescription_id = $1`,
        [prescription.prescription_id]
      );
      prescription = { ...prescription, items: itemsResult.rows };
    }

    const testsResult = await pool.query(
      `SELECT t.*, dt.test_name, dt.test_category
       FROM test_order t
       JOIN diagnostic_test dt ON dt.test_id = t.test_id
       WHERE t.visit_id = $1
       ORDER BY t.order_datetime DESC`,
      [req.params.id]
    );

    return res.json({ success: true, data: { ...visit, prescription, test_orders: testsResult.rows } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// POST /api/visits - create a visit (from a token, or emergency without one)
router.post('/', verifyToken, authorize('DOCTOR'), async (req, res) => {
  try {
    const {
      token_id, patient_id, visit_type, chief_complaint, diagnosis,
      blood_pressure, temperature_f, weight_kg, pulse, follow_up_date,
    } = req.body;

    const type = visit_type || (token_id ? 'NEW' : 'EMERGENCY');
    if (!VISIT_TYPES.includes(type)) {
      return res.status(400).json({ success: false, error: `visit_type must be one of ${VISIT_TYPES.join(', ')}` });
    }
    if (!chief_complaint) {
      return res.status(400).json({ success: false, error: 'chief_complaint is required' });
    }
    if (temperature_f !== undefined && temperature_f !== null && temperature_f !== '' && (temperature_f < 90 || temperature_f > 115)) {
      return res.status(400).json({ success: false, error: 'temperature_f must be between 90 and 115' });
    }
    if (weight_kg !== undefined && weight_kg !== null && weight_kg !== '' && weight_kg <= 0) {
      return res.status(400).json({ success: false, error: 'weight_kg must be greater than 0' });
    }

    let resolvedPatientId = patient_id;

    if (token_id) {
      const tokenResult = await pool.query(
        `SELECT t.token_id, t.status, hc.patient_id
         FROM token t JOIN health_card hc ON hc.card_id = t.health_card_id
         WHERE t.token_id = $1`,
        [token_id]
      );
      if (tokenResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Token not found' });
      }
      const tok = tokenResult.rows[0];
      if (tok.status !== 'WAITING') {
        return res.status(400).json({ success: false, error: 'Token has already been served or cancelled' });
      }
      resolvedPatientId = tok.patient_id;

      const existing = await pool.query('SELECT visit_id FROM visit WHERE token_id = $1', [token_id]);
      if (existing.rows.length > 0) {
        return res.status(409).json({ success: false, error: 'A visit already exists for this token' });
      }
    } else if (!resolvedPatientId) {
      return res.status(400).json({ success: false, error: 'patient_id is required when no token_id is provided' });
    }

    const patientCheck = await pool.query('SELECT patient_id, full_name FROM patient WHERE patient_id = $1', [resolvedPatientId]);
    if (patientCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Patient not found' });
    }

    const insertResult = await pool.query(
      `INSERT INTO visit (token_id, patient_id, doctor_id, visit_type, chief_complaint, diagnosis,
                           blood_pressure, temperature_f, weight_kg, pulse, follow_up_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        token_id || null, resolvedPatientId, req.user.doctor_id, type,
        chief_complaint || null, diagnosis || null, blood_pressure || null,
        temperature_f || null, weight_kg || null, pulse || null, follow_up_date || null,
      ]
    );

    if (token_id) {
      await pool.query(`UPDATE token SET status = 'SERVED' WHERE token_id = $1`, [token_id]);
    }

    return res.status(201).json({
      success: true,
      data: { ...insertResult.rows[0], patient_name: patientCheck.rows[0].full_name },
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ success: false, error: 'A visit already exists for this token' });
    }
    if (err.code === '23514' && err.constraint === 'visit_token_patient_match') {
      return res.status(400).json({ success: false, error: 'This token belongs to a different patient.' });
    }
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// PUT /api/visits/:id - edit visit details (DOCTOR, own visits only; patient_id/doctor_id/visit_datetime immutable)
router.put('/:id', verifyToken, authorize('DOCTOR'), async (req, res) => {
  try {
    const {
      visit_type, chief_complaint, diagnosis,
      blood_pressure, temperature_f, weight_kg, pulse, follow_up_date,
    } = req.body;

    const existing = await pool.query('SELECT visit_id, doctor_id, visit_type FROM visit WHERE visit_id = $1', [req.params.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Visit not found' });
    }
    if (existing.rows[0].doctor_id !== req.user.doctor_id) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const type = visit_type || existing.rows[0].visit_type;
    if (!VISIT_TYPES.includes(type)) {
      return res.status(400).json({ success: false, error: `visit_type must be one of ${VISIT_TYPES.join(', ')}` });
    }
    if (!chief_complaint) {
      return res.status(400).json({ success: false, error: 'chief_complaint is required' });
    }
    if (temperature_f !== undefined && temperature_f !== null && temperature_f !== '' && (temperature_f < 90 || temperature_f > 115)) {
      return res.status(400).json({ success: false, error: 'temperature_f must be between 90 and 115' });
    }
    if (weight_kg !== undefined && weight_kg !== null && weight_kg !== '' && weight_kg <= 0) {
      return res.status(400).json({ success: false, error: 'weight_kg must be greater than 0' });
    }

    const result = await pool.query(
      `UPDATE visit SET
         visit_type = $1, chief_complaint = $2, diagnosis = $3, blood_pressure = $4,
         temperature_f = $5, weight_kg = $6, pulse = $7, follow_up_date = $8
       WHERE visit_id = $9
       RETURNING *`,
      [
        type, chief_complaint, diagnosis || null, blood_pressure || null,
        temperature_f || null, weight_kg || null, pulse || null, follow_up_date || null,
        req.params.id,
      ]
    );

    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
