const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const pool = require('../config/db');
const { verifyToken, authorize } = require('../middleware/auth');

const router = express.Router();

const CATEGORIES = ['STUDENT', 'TEACHER', 'STAFF', 'FAMILY'];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// ── Photo upload setup ──────────────────────────────────────────────────────
const UPLOAD_DIR = path.join(__dirname, '../../uploads/patients');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = file.mimetype === 'image/png' ? '.png' : '.jpg';
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (['image/jpeg', 'image/jpg', 'image/png'].includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG and PNG images are accepted'), false);
  }
};

const upload = multer({ storage, limits: { fileSize: 2 * 1024 * 1024 }, fileFilter });

function handleUpload(req, res, next) {
  upload.single('photo')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, error: 'Photo must be under 2 MB' });
      }
      return res.status(400).json({ success: false, error: err.message });
    }
    if (err) return res.status(400).json({ success: false, error: err.message });
    next();
  });
}
// ───────────────────────────────────────────────────────────────────────────

// GET /api/patients/me - patient views their own profile
router.get('/me', verifyToken, authorize('PATIENT'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, g.full_name AS guardian_name, g.patient_category AS guardian_category
       FROM patient p
       LEFT JOIN patient g ON g.patient_id = p.guardian_id
       WHERE p.patient_id = $1`,
      [req.user.patient_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Patient record not found' });
    }
    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// GET /api/patients?search= - list/search patients
router.get('/', verifyToken, authorize('RECEPTIONIST', 'DOCTOR'), async (req, res) => {
  try {
    const { search, without_card } = req.query;
    const conditions = [];
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(full_name ILIKE $${params.length} OR university_id ILIKE $${params.length} OR phone ILIKE $${params.length})`);
    }
    if (without_card === 'true') {
      conditions.push(`NOT EXISTS (SELECT 1 FROM health_card hc WHERE hc.patient_id = patient.patient_id)`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await pool.query(
      `SELECT patient_id, full_name, date_of_birth, gender, blood_group, phone, email, address,
              patient_category, university_id, academic_dept, guardian_id, registration_date, photo_url
       FROM patient
       ${where}
       ORDER BY patient_id DESC`,
      params
    );
    return res.json({ success: true, data: result.rows, count: result.rows.length });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// GET /api/patients/:id/photo - serve patient photo securely (JWT required)
router.get('/:id/photo', verifyToken, authorize('RECEPTIONIST', 'DOCTOR', 'PATIENT'), async (req, res) => {
  try {
    // Patients may only view their own photo
    if (req.user.role === 'PATIENT' && Number(req.user.patient_id) !== Number(req.params.id)) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const result = await pool.query('SELECT photo_url FROM patient WHERE patient_id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Patient not found' });

    const filename = result.rows[0].photo_url;
    if (!filename) return res.status(404).json({ success: false, error: 'No photo on file' });

    // path.basename prevents any path traversal even if a bad value somehow got into the DB
    const filePath = path.join(UPLOAD_DIR, path.basename(filename));
    if (!fs.existsSync(filePath)) return res.status(404).json({ success: false, error: 'Photo file not found' });

    res.setHeader('Cache-Control', 'private, max-age=86400');
    return res.sendFile(filePath);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// GET /api/patients/:id - profile + health card status
router.get('/:id', verifyToken, authorize('RECEPTIONIST', 'DOCTOR'), async (req, res) => {
  try {
    const patientResult = await pool.query(
      `SELECT patient_id, full_name, date_of_birth, gender, blood_group, phone, email, address,
              patient_category, university_id, academic_dept, guardian_id, registration_date, photo_url
       FROM patient WHERE patient_id = $1`,
      [req.params.id]
    );
    if (patientResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Patient not found' });
    }

    const cardResult = await pool.query(
      `SELECT card_id, card_number, issue_date, expiry_date, photo_submitted, status
       FROM health_card WHERE patient_id = $1`,
      [req.params.id]
    );

    const patient = patientResult.rows[0];
    patient.health_card = cardResult.rows[0] || null;

    return res.json({ success: true, data: patient });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// POST /api/patients - register a new patient
router.post('/', verifyToken, authorize('RECEPTIONIST'), async (req, res) => {
  try {
    const {
      full_name, date_of_birth, gender, blood_group, phone, email, address,
      patient_category, university_id, academic_dept, guardian_id,
    } = req.body;

    if (!full_name || !patient_category) {
      return res.status(400).json({ success: false, error: 'full_name and patient_category are required' });
    }
    if (!CATEGORIES.includes(patient_category)) {
      return res.status(400).json({ success: false, error: 'Invalid patient_category' });
    }
    if (gender && !['M', 'F'].includes(gender)) {
      return res.status(400).json({ success: false, error: 'Invalid gender' });
    }
    if (blood_group && !BLOOD_GROUPS.includes(blood_group)) {
      return res.status(400).json({ success: false, error: 'Invalid blood_group' });
    }
    if (patient_category === 'FAMILY' && !guardian_id) {
      return res.status(400).json({ success: false, error: 'guardian_id is required for FAMILY category' });
    }
    if (patient_category !== 'FAMILY' && !university_id) {
      return res.status(400).json({ success: false, error: 'university_id is required for STUDENT/TEACHER/STAFF' });
    }

    if (patient_category === 'FAMILY' && guardian_id) {
      const guardian = await pool.query(
        `SELECT patient_id, patient_category FROM patient WHERE patient_id = $1`,
        [guardian_id]
      );
      if (guardian.rows.length === 0) return res.status(400).json({ success: false, error: 'Guardian not found' });
      if (!['TEACHER', 'STAFF'].includes(guardian.rows[0].patient_category)) {
        return res.status(400).json({ success: false, error: 'Guardian must be a TEACHER or STAFF patient' });
      }
    }

    const result = await pool.query(
      `INSERT INTO patient (full_name, date_of_birth, gender, blood_group, phone, email, address,
                             patient_category, university_id, academic_dept, guardian_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        full_name,
        date_of_birth || null,
        gender || null,
        blood_group || null,
        phone || null,
        email || null,
        address || null,
        patient_category,
        patient_category === 'FAMILY' ? null : university_id,
        academic_dept || null,
        patient_category === 'FAMILY' ? guardian_id : null,
      ]
    );

    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ success: false, error: 'University ID is already registered' });
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// POST /api/patients/:id/photo - upload patient photo (RECEPTIONIST + ADMIN)
router.post('/:id/photo', verifyToken, authorize('RECEPTIONIST'), handleUpload, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No photo file provided' });

    const existing = await pool.query('SELECT photo_url FROM patient WHERE patient_id = $1', [req.params.id]);
    if (existing.rows.length === 0) {
      fs.unlink(req.file.path, () => {});
      return res.status(404).json({ success: false, error: 'Patient not found' });
    }

    // Delete the old photo file to avoid orphaned files on disk
    const oldFilename = existing.rows[0].photo_url;
    if (oldFilename) {
      const oldPath = path.join(UPLOAD_DIR, path.basename(oldFilename));
      fs.unlink(oldPath, () => {});
    }

    await pool.query('UPDATE patient SET photo_url = $1 WHERE patient_id = $2', [req.file.filename, req.params.id]);
    return res.json({ success: true, message: 'Photo uploaded successfully' });
  } catch (err) {
    if (req.file) fs.unlink(req.file.path, () => {});
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// PUT /api/patients/:id - update patient info
router.put('/:id', verifyToken, authorize('RECEPTIONIST'), async (req, res) => {
  try {
    const {
      full_name, date_of_birth, gender, blood_group, phone, email, address,
      patient_category, university_id, academic_dept, guardian_id,
    } = req.body;

    if (!full_name || !patient_category) {
      return res.status(400).json({ success: false, error: 'full_name and patient_category are required' });
    }
    if (!CATEGORIES.includes(patient_category)) {
      return res.status(400).json({ success: false, error: 'Invalid patient_category' });
    }
    if (gender && !['M', 'F'].includes(gender)) {
      return res.status(400).json({ success: false, error: 'Invalid gender' });
    }
    if (blood_group && !BLOOD_GROUPS.includes(blood_group)) {
      return res.status(400).json({ success: false, error: 'Invalid blood_group' });
    }
    if (patient_category === 'FAMILY' && !guardian_id) {
      return res.status(400).json({ success: false, error: 'guardian_id is required for FAMILY category' });
    }
    if (patient_category !== 'FAMILY' && !university_id) {
      return res.status(400).json({ success: false, error: 'university_id is required for STUDENT/TEACHER/STAFF' });
    }

    if (patient_category === 'FAMILY' && guardian_id) {
      const guardian = await pool.query(
        `SELECT patient_id, patient_category FROM patient WHERE patient_id = $1`,
        [guardian_id]
      );
      if (guardian.rows.length === 0) return res.status(400).json({ success: false, error: 'Guardian not found' });
      if (!['TEACHER', 'STAFF'].includes(guardian.rows[0].patient_category)) {
        return res.status(400).json({ success: false, error: 'Guardian must be a TEACHER or STAFF patient' });
      }
    }

    const result = await pool.query(
      `UPDATE patient SET
         full_name = $1, date_of_birth = $2, gender = $3, blood_group = $4, phone = $5,
         email = $6, address = $7, patient_category = $8, university_id = $9,
         academic_dept = $10, guardian_id = $11
       WHERE patient_id = $12
       RETURNING *`,
      [
        full_name,
        date_of_birth || null,
        gender || null,
        blood_group || null,
        phone || null,
        email || null,
        address || null,
        patient_category,
        patient_category === 'FAMILY' ? null : university_id,
        academic_dept || null,
        patient_category === 'FAMILY' ? guardian_id : null,
        req.params.id,
      ]
    );

    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Patient not found' });
    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ success: false, error: 'University ID is already registered' });
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
