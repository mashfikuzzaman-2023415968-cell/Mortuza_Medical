const express = require('express');
const pool = require('../config/db');
const { verifyToken, authorize } = require('../middleware/auth');

const router = express.Router();

const TRIP_TYPES = ['EMERGENCY', 'TRANSFER', 'REFERRAL', 'PICKUP', 'OTHER'];
const AMBULANCE_STATUSES = ['IN_SERVICE', 'MAINTENANCE', 'RETIRED'];

// GET /api/ambulances - list ambulances with live status (ADMIN, RECEPTIONIST, DOCTOR)
router.get('/', verifyToken, authorize('RECEPTIONIST', 'DOCTOR'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT v.*, a.model, a.driver_phone
       FROM v_ambulance_status v
       JOIN ambulance a ON a.ambulance_id = v.ambulance_id
       ORDER BY v.ambulance_id`
    );
    return res.json({ success: true, data: result.rows, count: result.rows.length });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// POST /api/ambulances - create ambulance (ADMIN only)
router.post('/', verifyToken, authorize(), async (req, res) => {
  try {
    const { registration_no, model, capacity, driver_name, driver_phone, status } = req.body;
    if (!registration_no) {
      return res.status(400).json({ success: false, error: 'registration_no is required' });
    }
    const amb_status = status || 'IN_SERVICE';
    if (!AMBULANCE_STATUSES.includes(amb_status)) {
      return res.status(400).json({ success: false, error: `status must be one of ${AMBULANCE_STATUSES.join(', ')}` });
    }
    if (capacity !== undefined && capacity !== null && capacity !== '' && Number(capacity) <= 0) {
      return res.status(400).json({ success: false, error: 'capacity must be greater than 0' });
    }

    const result = await pool.query(
      `INSERT INTO ambulance (registration_no, model, capacity, driver_name, driver_phone, status)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [registration_no, model || null, capacity || null, driver_name || null, driver_phone || null, amb_status]
    );
    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ success: false, error: 'Registration number already exists' });
    if (err.code === '23514') return res.status(400).json({ success: false, error: 'capacity must be greater than 0' });
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// PUT /api/ambulances/:id - update ambulance (ADMIN only)
router.put('/:id', verifyToken, authorize(), async (req, res) => {
  try {
    const current = await pool.query('SELECT * FROM ambulance WHERE ambulance_id = $1', [req.params.id]);
    if (current.rows.length === 0) return res.status(404).json({ success: false, error: 'Ambulance not found' });
    const amb = current.rows[0];

    const { registration_no, model, capacity, driver_name, driver_phone, status } = req.body;
    const newStatus = status || amb.status;
    if (!AMBULANCE_STATUSES.includes(newStatus)) {
      return res.status(400).json({ success: false, error: `status must be one of ${AMBULANCE_STATUSES.join(', ')}` });
    }
    const newCapacity = capacity !== undefined ? capacity : amb.capacity;
    if (newCapacity !== null && newCapacity !== '' && Number(newCapacity) <= 0) {
      return res.status(400).json({ success: false, error: 'capacity must be greater than 0' });
    }

    const result = await pool.query(
      `UPDATE ambulance SET registration_no=$1, model=$2, capacity=$3, driver_name=$4, driver_phone=$5, status=$6
       WHERE ambulance_id=$7 RETURNING *`,
      [
        registration_no || amb.registration_no,
        model !== undefined ? (model || null) : amb.model,
        newCapacity || null,
        driver_name !== undefined ? (driver_name || null) : amb.driver_name,
        driver_phone !== undefined ? (driver_phone || null) : amb.driver_phone,
        newStatus,
        req.params.id,
      ]
    );
    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ success: false, error: 'Registration number already exists' });
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// GET /api/ambulances/dispatches - dispatch log (ADMIN, RECEPTIONIST)
router.get('/dispatches', verifyToken, authorize('RECEPTIONIST'), async (req, res) => {
  try {
    const { ambulance_id } = req.query;
    const conditions = [];
    const params = [];

    if (ambulance_id) {
      params.push(ambulance_id);
      conditions.push(`d.ambulance_id = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await pool.query(
      `SELECT d.*, a.registration_no, a.model,
              p.full_name AS patient_name, doc.full_name AS authorized_by_name
       FROM ambulance_dispatch d
       JOIN ambulance a ON a.ambulance_id = d.ambulance_id
       LEFT JOIN patient p ON p.patient_id = d.patient_id
       LEFT JOIN doctor doc ON doc.doctor_id = d.authorized_by
       ${where}
       ORDER BY d.dispatch_datetime DESC`,
      params
    );
    return res.json({ success: true, data: result.rows, count: result.rows.length });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// POST /api/ambulances/dispatches - log ambulance dispatch (ADMIN, RECEPTIONIST, DOCTOR)
router.post('/dispatches', verifyToken, authorize('RECEPTIONIST', 'DOCTOR'), async (req, res) => {
  try {
    const { ambulance_id, patient_id, authorized_by, origin, destination, trip_type, requested_by, remarks } = req.body;

    if (!ambulance_id) {
      return res.status(400).json({ success: false, error: 'ambulance_id is required' });
    }

    const ambCheck = await pool.query('SELECT ambulance_id, status FROM ambulance WHERE ambulance_id = $1', [ambulance_id]);
    if (ambCheck.rows.length === 0) return res.status(404).json({ success: false, error: 'Ambulance not found' });
    if (ambCheck.rows[0].status !== 'IN_SERVICE') {
      return res.status(400).json({ success: false, error: 'Ambulance is not in service' });
    }

    // Check if already on a trip — allow but include a warning in response
    const onTrip = await pool.query(
      `SELECT dispatch_id FROM ambulance_dispatch WHERE ambulance_id = $1 AND status = 'DISPATCHED' AND return_datetime IS NULL`,
      [ambulance_id]
    );
    const alreadyOnTrip = onTrip.rows.length > 0;

    const effectiveTripType = trip_type || 'EMERGENCY';
    if (!TRIP_TYPES.includes(effectiveTripType)) {
      return res.status(400).json({ success: false, error: `trip_type must be one of ${TRIP_TYPES.join(', ')}` });
    }
    if (!destination) {
      return res.status(400).json({ success: false, error: 'destination is required' });
    }

    const result = await pool.query(
      `INSERT INTO ambulance_dispatch (ambulance_id, patient_id, authorized_by, origin, destination, trip_type, requested_by, remarks)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        ambulance_id,
        patient_id || null,
        authorized_by || null,
        origin || 'Medical Centre',
        destination,
        effectiveTripType,
        requested_by || null,
        remarks || null,
      ]
    );

    // Enrich with registration_no and patient name for the UI
    const enriched = await pool.query(
      `SELECT ad.*, a.registration_no, p.full_name AS patient_name
       FROM ambulance_dispatch ad
       JOIN ambulance a ON a.ambulance_id = ad.ambulance_id
       LEFT JOIN patient p ON p.patient_id = ad.patient_id
       WHERE ad.dispatch_id = $1`,
      [result.rows[0].dispatch_id]
    );

    return res.status(201).json({
      success: true,
      data: enriched.rows[0],
      ...(alreadyOnTrip && { warning: 'This ambulance was already on an active trip when this dispatch was logged.' }),
    });
  } catch (err) {
    if (err.code === '23503') return res.status(400).json({ success: false, error: 'Invalid ambulance_id, patient_id, or authorized_by' });
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// PUT /api/ambulances/dispatches/:id/return - record ambulance return (ADMIN only)
router.put('/dispatches/:id/return', verifyToken, authorize(), async (req, res) => {
  try {
    const { return_datetime, remarks } = req.body;

    const existing = await pool.query('SELECT * FROM ambulance_dispatch WHERE dispatch_id = $1', [req.params.id]);
    if (existing.rows.length === 0) return res.status(404).json({ success: false, error: 'Dispatch not found' });
    if (existing.rows[0].status !== 'DISPATCHED') {
      return res.status(400).json({ success: false, error: 'Dispatch is not currently active' });
    }

    let result;
    if (return_datetime) {
      // Validate in SQL to avoid Node/DB timezone mismatch
      const check = await pool.query(
        `SELECT ($1::timestamp > dispatch_datetime) AS ok FROM ambulance_dispatch WHERE dispatch_id = $2`,
        [return_datetime, req.params.id]
      );
      if (!check.rows[0].ok) {
        return res.status(400).json({ success: false, error: 'return_datetime must be after dispatch_datetime' });
      }
      result = await pool.query(
        `UPDATE ambulance_dispatch SET return_datetime=$1::timestamp, status='COMPLETED', remarks=COALESCE($2,remarks)
         WHERE dispatch_id=$3 RETURNING *`,
        [return_datetime, remarks || null, req.params.id]
      );
    } else {
      // CURRENT_TIMESTAMP is always DB-local, always valid
      result = await pool.query(
        `UPDATE ambulance_dispatch SET return_datetime=CURRENT_TIMESTAMP, status='COMPLETED', remarks=COALESCE($1,remarks)
         WHERE dispatch_id=$2 RETURNING *`,
        [remarks || null, req.params.id]
      );
    }

    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
