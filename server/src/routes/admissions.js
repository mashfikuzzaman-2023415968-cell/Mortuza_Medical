const express = require('express');
const pool = require('../config/db');
const { verifyToken, authorize } = require('../middleware/auth');

const router = express.Router();

// GET /api/admissions - list ward admissions (DOCTOR, optional ?status=)
router.get('/', verifyToken, authorize('DOCTOR'), async (req, res) => {
  try {
    const conditions = [];
    const params = [];

    if (req.query.status) {
      params.push(req.query.status);
      conditions.push(`a.status = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await pool.query(
      `SELECT a.*, p.full_name AS patient_name, p.patient_category, b.bed_number, b.ward_type,
              d.full_name AS attending_doctor_name
       FROM ward_admission a
       JOIN patient p ON p.patient_id = a.patient_id
       JOIN bed b ON b.bed_id = a.bed_id
       LEFT JOIN doctor d ON d.doctor_id = a.attending_doctor_id
       ${where}
       ORDER BY a.admit_datetime DESC`,
      params
    );
    return res.json({ success: true, data: result.rows, count: result.rows.length });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// POST /api/admissions - admit a patient to a free isolation bed
router.post('/', verifyToken, authorize('DOCTOR'), async (req, res) => {
  try {
    const { patient_id, disease } = req.body;

    if (!patient_id || !disease) {
      return res.status(400).json({ success: false, error: 'patient_id and disease are required' });
    }

    const patientCheck = await pool.query('SELECT patient_id, full_name FROM patient WHERE patient_id = $1', [patient_id]);
    if (patientCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Patient not found' });
    }

    const existingAdmission = await pool.query(
      `SELECT admission_id FROM ward_admission WHERE patient_id = $1 AND status = 'ADMITTED'`,
      [patient_id]
    );
    if (existingAdmission.rows.length > 0) {
      return res.status(409).json({ success: false, error: 'Patient is already admitted' });
    }

    const bedResult = await pool.query(
      `SELECT b.bed_id, b.bed_number, b.ward_type FROM bed b
       WHERE b.ward_type = 'ISOLATION'
         AND NOT EXISTS (SELECT 1 FROM ward_admission a WHERE a.bed_id = b.bed_id AND a.status = 'ADMITTED')
       ORDER BY b.bed_id LIMIT 1`
    );
    if (bedResult.rows.length === 0) {
      return res.status(400).json({ success: false, error: 'No isolation bed available' });
    }
    const bed = bedResult.rows[0];

    const insertResult = await pool.query(
      `INSERT INTO ward_admission (patient_id, bed_id, attending_doctor_id, disease)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [patient_id, bed.bed_id, req.user.doctor_id, disease]
    );

    return res.status(201).json({
      success: true,
      data: { ...insertResult.rows[0], bed_number: bed.bed_number, ward_type: bed.ward_type, patient_name: patientCheck.rows[0].full_name },
    });
  } catch (err) {
    // If two admissions race for the same free bed, the partial unique index
    // rejects the loser — surface that as a clear 409 instead of a 500.
    if (err.code === '23505' && err.constraint === 'uq_bed_active_admission') {
      return res.status(409).json({ success: false, error: 'That bed was just taken. Please try again.' });
    }
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// PUT /api/admissions/:id/discharge - discharge a patient
router.put('/:id/discharge', verifyToken, authorize('DOCTOR'), async (req, res) => {
  try {
    const existing = await pool.query('SELECT * FROM ward_admission WHERE admission_id = $1', [req.params.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Admission not found' });
    }
    if (existing.rows[0].status === 'DISCHARGED') {
      return res.status(400).json({ success: false, error: 'Patient is already discharged' });
    }

    const updateResult = await pool.query(
      `UPDATE ward_admission SET discharge_datetime = CURRENT_TIMESTAMP, status = 'DISCHARGED'
       WHERE admission_id = $1 RETURNING *`,
      [req.params.id]
    );

    return res.json({ success: true, data: updateResult.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
