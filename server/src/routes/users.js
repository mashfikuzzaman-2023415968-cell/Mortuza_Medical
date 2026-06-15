const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { verifyToken, authorize } = require('../middleware/auth');
const { sendAccountApprovedEmail } = require('../utils/email');

const router = express.Router();

const VALID_ROLES = ['ADMIN', 'DOCTOR', 'RECEPTIONIST', 'PHARMACIST', 'LAB_TECH', 'PATIENT'];

// GET /api/users/pending - list users awaiting admin approval
router.get('/pending', verifyToken, authorize('ADMIN'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT user_id, username, email, role, created_at
       FROM app_user
       WHERE email_verified = TRUE AND is_active = FALSE
       ORDER BY created_at ASC`
    );
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// PUT /api/users/:id/approve - activate a pending user
router.put('/:id/approve', verifyToken, authorize('ADMIN'), async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE app_user SET is_active = TRUE WHERE user_id = $1 RETURNING user_id, username, email, role, is_active',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const user = result.rows[0];
    await sendAccountApprovedEmail(user.email, user.username);

    return res.json({ success: true, data: user });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// PUT /api/users/:id/reject - permanently remove a pending user
router.put('/:id/reject', verifyToken, authorize('ADMIN'), async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM app_user WHERE user_id = $1 RETURNING user_id',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
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
      [username, passwordHash, role, doctor_id || null, patient_id || null, email]
    );

    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
