const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { verifyToken, authorize } = require('../middleware/auth');
const { sendAccountApprovedEmail } = require('../utils/email');

const router = express.Router();

const VALID_ROLES = ['ADMIN', 'DOCTOR', 'RECEPTIONIST', 'PHARMACIST', 'LAB_TECH', 'PATIENT'];

// GET /api/users - list all users (ADMIN only)
router.get('/', verifyToken, authorize(), async (req, res) => {
  try {
    const { role, search } = req.query;
    const conditions = [];
    const params = [];

    if (role) {
      params.push(role);
      conditions.push(`u.role = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(u.username ILIKE $${params.length} OR u.email ILIKE $${params.length})`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await pool.query(
      `SELECT u.user_id, u.username, u.email, u.role, u.is_active, u.email_verified, u.created_at,
              d.full_name AS doctor_name, p.full_name AS patient_name
       FROM app_user u
       LEFT JOIN doctor d ON d.doctor_id = u.doctor_id
       LEFT JOIN patient p ON p.patient_id = u.patient_id
       ${where}
       ORDER BY u.created_at DESC`,
      params
    );
    return res.json({ success: true, data: result.rows, count: result.rows.length });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// GET /api/users/pending - list users awaiting admin approval
router.get('/pending', verifyToken, authorize('ADMIN'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.user_id, u.username, u.email, u.role, u.created_at, u.doctor_id,
              d.full_name AS doctor_name, d.specialization, d.doctor_type,
              d.bmdc_reg_no, d.is_parttime, d.unit_id, un.unit_name
       FROM app_user u
       LEFT JOIN doctor d ON d.doctor_id = u.doctor_id
       LEFT JOIN unit un ON un.unit_id = d.unit_id
       WHERE u.email_verified = TRUE AND u.is_active = FALSE
       ORDER BY u.created_at ASC`
    );
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// PUT /api/users/:id/approve - activate a pending user. For a DOCTOR application,
// an optional unit_id assigns the doctor's unit at the same time.
router.put('/:id/approve', verifyToken, authorize('ADMIN'), async (req, res) => {
  try {
    const { unit_id } = req.body;

    const target = await pool.query('SELECT user_id, role, doctor_id FROM app_user WHERE user_id = $1', [req.params.id]);
    if (target.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    const t = target.rows[0];

    // Assign the doctor's unit if provided.
    if (t.role === 'DOCTOR' && t.doctor_id && unit_id) {
      const unitCheck = await pool.query('SELECT 1 FROM unit WHERE unit_id = $1', [unit_id]);
      if (unitCheck.rows.length === 0) return res.status(400).json({ success: false, error: 'Selected unit not found' });
      await pool.query('UPDATE doctor SET unit_id = $1 WHERE doctor_id = $2', [unit_id, t.doctor_id]);
    }

    const result = await pool.query(
      'UPDATE app_user SET is_active = TRUE WHERE user_id = $1 RETURNING user_id, username, email, role, is_active',
      [req.params.id]
    );

    const user = result.rows[0];
    await sendAccountApprovedEmail(user.email, user.username);

    return res.json({ success: true, data: user });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// PUT /api/users/:id/reject - permanently remove a pending user. For a rejected
// doctor application, also remove the doctor record it created (a never-active
// applicant has no visits/roster, so the cleanup is safe; ignored if referenced).
router.put('/:id/reject', verifyToken, authorize('ADMIN'), async (req, res) => {
  try {
    const target = await pool.query('SELECT role, doctor_id FROM app_user WHERE user_id = $1', [req.params.id]);
    if (target.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    await pool.query('DELETE FROM app_user WHERE user_id = $1', [req.params.id]);

    const t = target.rows[0];
    if (t.role === 'DOCTOR' && t.doctor_id) {
      await pool.query('DELETE FROM doctor WHERE doctor_id = $1', [t.doctor_id]).catch(() => {});
    }

    return res.json({ success: true, message: 'User rejected and removed' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// POST /api/users - admin creates a new user (including ADMIN accounts)
router.post('/', verifyToken, authorize('ADMIN'), async (req, res) => {
  try {
    const { username, password, email, role, doctor_id, patient_id } = req.body;

    if (!username || !password || !email || !role) {
      return res.status(400).json({ success: false, error: 'username, password, email and role are required' });
    }
    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ success: false, error: 'Invalid role' });
    }
    if (role === 'ADMIN' && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Only an existing admin can create admin accounts' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
    }
    if (role === 'DOCTOR' && !doctor_id) {
      return res.status(400).json({ success: false, error: 'doctor_id is required when creating a DOCTOR account' });
    }
    if (role === 'PATIENT' && !patient_id) {
      return res.status(400).json({ success: false, error: 'patient_id is required when creating a PATIENT account' });
    }

    // Bind the linked record strictly to the role: only a DOCTOR carries a
    // doctor_id, only a PATIENT carries a patient_id, everyone else links to
    // neither. This guarantees the row satisfies chk_role_link regardless of
    // any extra IDs sent in the request body.
    const linkedDoctorId = role === 'DOCTOR' ? doctor_id : null;
    const linkedPatientId = role === 'PATIENT' ? patient_id : null;

    if (linkedDoctorId) {
      const docCheck = await pool.query('SELECT doctor_id FROM doctor WHERE doctor_id = $1', [linkedDoctorId]);
      if (docCheck.rows.length === 0) return res.status(400).json({ success: false, error: 'doctor_id not found' });
    }
    if (linkedPatientId) {
      const patCheck = await pool.query('SELECT patient_id FROM patient WHERE patient_id = $1', [linkedPatientId]);
      if (patCheck.rows.length === 0) return res.status(400).json({ success: false, error: 'patient_id not found' });
    }

    const existing = await pool.query(
      'SELECT user_id FROM app_user WHERE username = $1 OR email = $2',
      [username, email]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, error: 'Username or email is already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO app_user (username, password_hash, role, doctor_id, patient_id, email, email_verified, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE, TRUE)
       RETURNING user_id, username, role, email, is_active, email_verified`,
      [username, passwordHash, role, linkedDoctorId, linkedPatientId, email]
    );

    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    // Backstop: surface a friendly message if a DB constraint rejects the row,
    // rather than a generic 500.
    if (err.code === '23514' && err.constraint === 'chk_role_link') {
      return res.status(400).json({ success: false, error: 'The account role and its linked record do not match.' });
    }
    if (err.code === '23505') {
      return res.status(409).json({ success: false, error: 'Username or email is already registered' });
    }
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// PUT /api/users/:id - toggle is_active (ADMIN only) with last-admin guard
router.put('/:id', verifyToken, authorize(), async (req, res) => {
  try {
    const { is_active } = req.body;
    if (is_active === undefined) {
      return res.status(400).json({ success: false, error: 'is_active is required' });
    }

    const target = await pool.query('SELECT user_id, role, is_active FROM app_user WHERE user_id = $1', [req.params.id]);
    if (target.rows.length === 0) return res.status(404).json({ success: false, error: 'User not found' });
    const user = target.rows[0];

    // Guard: prevent deactivating the last active admin
    if (!is_active && user.role === 'ADMIN') {
      const adminCount = await pool.query(
        'SELECT COUNT(*) AS cnt FROM app_user WHERE role = $1 AND is_active = TRUE AND user_id != $2',
        ['ADMIN', req.params.id]
      );
      if (Number(adminCount.rows[0].cnt) === 0) {
        return res.status(400).json({ success: false, error: 'Cannot deactivate the only active admin account' });
      }
    }

    const result = await pool.query(
      'UPDATE app_user SET is_active = $1 WHERE user_id = $2 RETURNING user_id, username, role, is_active',
      [!!is_active, req.params.id]
    );
    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
