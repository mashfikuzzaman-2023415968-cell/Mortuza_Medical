const express = require('express');
const pool = require('../config/db');
const { verifyToken, authorize } = require('../middleware/auth');

const router = express.Router();

const DOCTOR_TYPES = ['GENERAL', 'SPECIALIST', 'EYE', 'DENTAL', 'HOMEO', 'PHYSIO'];
const GENDERS = ['M', 'F'];

// GET /api/doctors - list all doctors with unit info
router.get('/', verifyToken, authorize('RECEPTIONIST', 'DOCTOR', 'PATIENT'), async (req, res) => {
  try {
    const { search, unit_id, doctor_type } = req.query;
    const conditions = [];
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(d.full_name ILIKE $${params.length} OR d.specialization ILIKE $${params.length})`);
    }
    if (unit_id) {
      params.push(unit_id);
      conditions.push(`d.unit_id = $${params.length}`);
    }
    if (doctor_type) {
      params.push(doctor_type);
      conditions.push(`d.doctor_type = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const isAdmin = req.user.role === 'ADMIN';
    const selectFields = isAdmin
      ? 'd.*'
      : 'd.doctor_id, d.full_name, d.designation, d.specialization, d.doctor_type, d.is_parttime, d.phone';

    const result = await pool.query(
      `SELECT ${selectFields}, u.unit_name, u.floor_location
       FROM doctor d
       LEFT JOIN unit u ON u.unit_id = d.unit_id
       ${where}
       ORDER BY d.doctor_type, d.full_name`,
      params
    );
    return res.json({ success: true, data: result.rows, count: result.rows.length });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// GET /api/doctors/:id - single doctor
router.get('/:id', verifyToken, authorize('RECEPTIONIST', 'DOCTOR'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT d.*, u.unit_name
       FROM doctor d
       LEFT JOIN unit u ON u.unit_id = d.unit_id
       WHERE d.doctor_id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Doctor not found' });
    }
    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// POST /api/doctors - create doctor (ADMIN only)
router.post('/', verifyToken, authorize(), async (req, res) => {
  try {
    const { full_name, gender, bmdc_reg_no, designation, specialization, doctor_type, is_parttime, phone, email, unit_id, joining_date } = req.body;

    if (!full_name || !bmdc_reg_no || !doctor_type) {
      return res.status(400).json({ success: false, error: 'full_name, bmdc_reg_no and doctor_type are required' });
    }
    if (!DOCTOR_TYPES.includes(doctor_type)) {
      return res.status(400).json({ success: false, error: `doctor_type must be one of ${DOCTOR_TYPES.join(', ')}` });
    }
    if (gender && !GENDERS.includes(gender)) {
      return res.status(400).json({ success: false, error: 'gender must be M or F' });
    }

    const result = await pool.query(
      `INSERT INTO doctor (full_name, gender, bmdc_reg_no, designation, specialization, doctor_type, is_parttime, phone, email, unit_id, joining_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [full_name, gender || null, bmdc_reg_no, designation || null, specialization || null, doctor_type, !!is_parttime, phone || null, email || null, unit_id || null, joining_date || null]
    );
    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      const detail = err.detail || '';
      if (detail.includes('bmdc_reg_no')) return res.status(409).json({ success: false, error: 'BMDC registration number already exists' });
      if (detail.includes('email')) return res.status(409).json({ success: false, error: 'Email already registered' });
      return res.status(409).json({ success: false, error: 'Duplicate value' });
    }
    if (err.code === '23503') return res.status(400).json({ success: false, error: 'Invalid unit_id' });
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// PUT /api/doctors/:id - update doctor (ADMIN only)
router.put('/:id', verifyToken, authorize(), async (req, res) => {
  try {
    const current = await pool.query('SELECT * FROM doctor WHERE doctor_id = $1', [req.params.id]);
    if (current.rows.length === 0) return res.status(404).json({ success: false, error: 'Doctor not found' });
    const doc = current.rows[0];

    const { full_name, gender, bmdc_reg_no, designation, specialization, doctor_type, is_parttime, phone, email, unit_id, joining_date } = req.body;

    const newType = doctor_type || doc.doctor_type;
    if (!DOCTOR_TYPES.includes(newType)) {
      return res.status(400).json({ success: false, error: `doctor_type must be one of ${DOCTOR_TYPES.join(', ')}` });
    }
    const newGender = gender !== undefined ? gender : doc.gender;
    if (newGender && !GENDERS.includes(newGender)) {
      return res.status(400).json({ success: false, error: 'gender must be M or F' });
    }

    const result = await pool.query(
      `UPDATE doctor SET
         full_name = $1, gender = $2, bmdc_reg_no = $3, designation = $4,
         specialization = $5, doctor_type = $6, is_parttime = $7,
         phone = $8, email = $9, unit_id = $10, joining_date = $11
       WHERE doctor_id = $12 RETURNING *`,
      [
        full_name || doc.full_name,
        newGender || null,
        bmdc_reg_no || doc.bmdc_reg_no,
        designation !== undefined ? (designation || null) : doc.designation,
        specialization !== undefined ? (specialization || null) : doc.specialization,
        newType,
        is_parttime !== undefined ? !!is_parttime : doc.is_parttime,
        phone !== undefined ? (phone || null) : doc.phone,
        email !== undefined ? (email || null) : doc.email,
        unit_id !== undefined ? (unit_id || null) : doc.unit_id,
        joining_date !== undefined ? (joining_date || null) : doc.joining_date,
        req.params.id,
      ]
    );
    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      const detail = err.detail || '';
      if (detail.includes('bmdc_reg_no')) return res.status(409).json({ success: false, error: 'BMDC registration number already exists' });
      if (detail.includes('email')) return res.status(409).json({ success: false, error: 'Email already registered' });
      return res.status(409).json({ success: false, error: 'Duplicate value' });
    }
    if (err.code === '23503') return res.status(400).json({ success: false, error: 'Invalid unit_id' });
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// DELETE /api/doctors/:id - remove doctor (ADMIN only)
router.delete('/:id', verifyToken, authorize(), async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM doctor WHERE doctor_id = $1 RETURNING doctor_id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Doctor not found' });
    return res.json({ success: true, data: { doctor_id: result.rows[0].doctor_id } });
  } catch (err) {
    if (err.code === '23503') return res.status(409).json({ success: false, error: 'Cannot delete: doctor has visits, rosters, or other linked records' });
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
