const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../config/db');
const { sendVerificationEmail } = require('../utils/email');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Roles selectable via public self-registration. ADMIN accounts can only be
// created by an existing admin via POST /api/users.
const PUBLIC_ROLES = ['DOCTOR', 'RECEPTIONIST', 'PHARMACIST', 'LAB_TECH', 'PATIENT'];

// Roles that require an admin to flip is_active to TRUE before they can log in.
const ROLES_REQUIRING_APPROVAL = ['DOCTOR', 'RECEPTIONIST', 'PHARMACIST', 'LAB_TECH'];

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, password, email, role } = req.body;

    if (!username || !password || !email || !role) {
      return res.status(400).json({ success: false, error: 'username, password, email and role are required' });
    }
    if (role === 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Admin accounts can only be created by an existing admin' });
    }
    if (!PUBLIC_ROLES.includes(role)) {
      return res.status(400).json({ success: false, error: 'Invalid role' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
    }

    // ── PATIENT: link-to-existing-record flow ──────────────────────────────
    if (role === 'PATIENT') {
      const { university_id, health_card_number } = req.body;

      if (!university_id && !health_card_number) {
        return res.status(400).json({ success: false, error: 'Provide your University ID or Health Card Number to find your patient record' });
      }

      // Look up the patient record by whichever identifier was provided
      let patientRow;
      if (university_id) {
        const r = await pool.query(
          'SELECT patient_id, full_name FROM patient WHERE university_id = $1',
          [university_id.trim()]
        );
        patientRow = r.rows[0];
      } else {
        const r = await pool.query(
          `SELECT p.patient_id, p.full_name
           FROM health_card hc
           JOIN patient p ON hc.patient_id = p.patient_id
           WHERE hc.card_number = $1`,
          [health_card_number.trim()]
        );
        patientRow = r.rows[0];
      }

      if (!patientRow) {
        return res.status(404).json({
          success: false,
          error: 'No patient record found with this ID. Please visit the Medical Centre reception desk to register first.',
        });
      }

      // Check if a portal account already exists for this patient record
      const existingPortal = await pool.query(
        'SELECT user_id FROM app_user WHERE patient_id = $1',
        [patientRow.patient_id]
      );
      if (existingPortal.rows.length > 0) {
        return res.status(409).json({ success: false, error: 'A portal account already exists for this patient record.' });
      }

      // Check username and email uniqueness separately for clearer error messages
      const takenUsername = await pool.query('SELECT user_id FROM app_user WHERE username = $1', [username]);
      if (takenUsername.rows.length > 0) {
        return res.status(409).json({ success: false, error: 'Username already taken' });
      }
      const takenEmail = await pool.query('SELECT user_id FROM app_user WHERE email = $1', [email]);
      if (takenEmail.rows.length > 0) {
        return res.status(409).json({ success: false, error: 'Email is already registered' });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const verificationToken = crypto.randomBytes(32).toString('hex');

      await pool.query(
        `INSERT INTO app_user (username, password_hash, role, patient_id, email, verification_token, email_verified, is_active)
         VALUES ($1, $2, 'PATIENT', $3, $4, $5, FALSE, TRUE)`,
        [username, passwordHash, patientRow.patient_id, email, verificationToken]
      );

      await sendVerificationEmail(email, verificationToken);

      return res.status(201).json({
        success: true,
        message: `Account created for ${patientRow.full_name}. Check your email to verify.`,
        patient_name: patientRow.full_name,
      });
    }

    // ── Non-patient roles: existing flow unchanged ─────────────────────────
    const existing = await pool.query(
      'SELECT user_id FROM app_user WHERE username = $1 OR email = $2',
      [username, email]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, error: 'Username or email is already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    // Staff roles require admin approval; all others (currently none) are auto-active.
    const isActive = !ROLES_REQUIRING_APPROVAL.includes(role);

    await pool.query(
      `INSERT INTO app_user (username, password_hash, role, doctor_id, patient_id, email, verification_token, email_verified, is_active)
       VALUES ($1, $2, $3, NULL, NULL, $4, $5, FALSE, $6)`,
      [username, passwordHash, role, email, verificationToken, isActive]
    );

    await sendVerificationEmail(email, verificationToken);

    return res.status(201).json({ success: true, message: 'Account created. Check your email to verify your account.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error during registration' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username/email and password are required' });
    }

    const result = await pool.query(
      'SELECT * FROM app_user WHERE (username = $1 OR email = $1)',
      [username]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    if (!user.email_verified) {
      return res.status(403).json({ success: false, error: 'Please verify your email before logging in', code: 'EMAIL_NOT_VERIFIED' });
    }

    if (!user.is_active) {
      return res.status(403).json({ success: false, error: 'Your account is pending admin approval', code: 'ACCOUNT_PENDING' });
    }

    const token = jwt.sign(
      { user_id: user.user_id, username: user.username, role: user.role, doctor_id: user.doctor_id, patient_id: user.patient_id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    let doctorInfo = {};
    if (user.role === 'DOCTOR' && user.doctor_id) {
      const docResult = await pool.query(
        'SELECT full_name, unit_id, doctor_type FROM doctor WHERE doctor_id = $1',
        [user.doctor_id]
      );
      if (docResult.rows.length > 0) {
        doctorInfo = {
          doctor_name: docResult.rows[0].full_name,
          unit_id: docResult.rows[0].unit_id,
          doctor_type: docResult.rows[0].doctor_type,
        };
      }
    }

    return res.json({
      success: true,
      data: {
        token,
        user: {
          user_id: user.user_id,
          username: user.username,
          role: user.role,
          doctor_id: user.doctor_id,
          patient_id: user.patient_id,
          email: user.email,
          ...doctorInfo,
        },
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error during login' });
  }
});

// GET /api/auth/verify-email?token=...
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ success: false, error: 'Verification token is required' });
    }

    const result = await pool.query(
      'SELECT user_id, role, is_active FROM app_user WHERE verification_token = $1 AND email_verified = FALSE',
      [token]
    );
    if (result.rows.length === 0) {
      return res.status(400).json({ success: false, error: 'Invalid or expired verification link' });
    }

    const { user_id, role, is_active } = result.rows[0];

    await pool.query(
      'UPDATE app_user SET email_verified = TRUE, verification_token = NULL WHERE user_id = $1',
      [user_id]
    );

    return res.json({ success: true, message: 'Email verified. You can now log in.', role, is_active });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error during verification' });
  }
});

// POST /api/auth/resend-verification
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    const result = await pool.query('SELECT user_id, email_verified FROM app_user WHERE email = $1', [email]);
    if (result.rows.length === 0 || result.rows[0].email_verified) {
      return res.status(400).json({ success: false, error: 'Invalid request' });
    }

    const newToken = crypto.randomBytes(32).toString('hex');
    await pool.query('UPDATE app_user SET verification_token = $1 WHERE user_id = $2', [newToken, result.rows[0].user_id]);
    await sendVerificationEmail(email, newToken);

    return res.json({ success: true, message: 'Verification email resent' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error while resending verification email' });
  }
});

// GET /api/auth/me
router.get('/me', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT user_id, username, role, doctor_id, patient_id, email, is_active FROM app_user WHERE user_id = $1',
      [req.user.user_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
