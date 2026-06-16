const express = require('express');
const pool = require('../config/db');
const { verifyToken, authorize } = require('../middleware/auth');

const router = express.Router();

const STATUSES = ['ORDERED', 'SAMPLE_COLLECTED', 'COMPLETED', 'CANCELLED'];

// GET /api/test-orders - DOCTOR (own), LAB_TECH (?status=), PATIENT (?patient=me)
router.get('/', verifyToken, authorize('DOCTOR', 'LAB_TECH', 'PATIENT'), async (req, res) => {
  try {
    const conditions = [];
    const params = [];

    if (req.user.role === 'PATIENT') {
      if (req.query.patient !== 'me') {
        return res.status(403).json({ success: false, error: 'Forbidden' });
      }
      params.push(req.user.patient_id);
      conditions.push(`t.patient_id = $${params.length}`);
    } else if (req.user.role === 'DOCTOR') {
      params.push(req.user.doctor_id);
      conditions.push(`t.ordered_by = $${params.length}`);
    }

    if (req.query.status) {
      // Accept comma-separated values, e.g. ?status=ORDERED,SAMPLE_COLLECTED
      const requested = req.query.status.split(',').map((s) => s.trim());
      for (const s of requested) {
        if (!STATUSES.includes(s)) {
          return res.status(400).json({ success: false, error: `status must be one of ${STATUSES.join(', ')}` });
        }
      }
      if (requested.length === 1) {
        params.push(requested[0]);
        conditions.push(`t.status = $${params.length}`);
      } else {
        params.push(requested);
        conditions.push(`t.status = ANY($${params.length})`);
      }
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await pool.query(
      `SELECT t.*, dt.test_name, dt.test_category, dt.sample_type, dt.price, dt.normal_range,
              p.full_name AS patient_name, d.full_name AS ordered_by_name
       FROM test_order t
       JOIN diagnostic_test dt ON dt.test_id = t.test_id
       JOIN patient p ON p.patient_id = t.patient_id
       LEFT JOIN doctor d ON d.doctor_id = t.ordered_by
       ${where}
       ORDER BY t.order_datetime DESC`,
      params
    );
    return res.json({ success: true, data: result.rows, count: result.rows.length });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// POST /api/test-orders - order a diagnostic test for a patient
router.post('/', verifyToken, authorize('DOCTOR'), async (req, res) => {
  try {
    const { visit_id, patient_id, test_id } = req.body;

    if (!patient_id || !test_id) {
      return res.status(400).json({ success: false, error: 'patient_id and test_id are required' });
    }

    const patientCheck = await pool.query('SELECT patient_id, full_name FROM patient WHERE patient_id = $1', [patient_id]);
    if (patientCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Patient not found' });
    }

    const testCheck = await pool.query('SELECT test_id, test_name FROM diagnostic_test WHERE test_id = $1', [test_id]);
    if (testCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Diagnostic test not found' });
    }

    if (visit_id) {
      const visitCheck = await pool.query('SELECT visit_id FROM visit WHERE visit_id = $1', [visit_id]);
      if (visitCheck.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Visit not found' });
      }
    }

    const insertResult = await pool.query(
      `INSERT INTO test_order (visit_id, patient_id, test_id, ordered_by)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [visit_id || null, patient_id, test_id, req.user.doctor_id]
    );

    return res.status(201).json({
      success: true,
      data: { ...insertResult.rows[0], patient_name: patientCheck.rows[0].full_name, test_name: testCheck.rows[0].test_name },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// GET /api/test-orders/:id - single order (DOCTOR: own, LAB_TECH: any, PATIENT: own)
router.get('/:id', verifyToken, authorize('DOCTOR', 'LAB_TECH', 'PATIENT'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, dt.test_name, dt.test_category, dt.sample_type, dt.price, dt.normal_range,
              p.full_name AS patient_name, d.full_name AS ordered_by_name
       FROM test_order t
       JOIN diagnostic_test dt ON dt.test_id = t.test_id
       JOIN patient p ON p.patient_id = t.patient_id
       LEFT JOIN doctor d ON d.doctor_id = t.ordered_by
       WHERE t.order_id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Test order not found' });
    }
    const order = result.rows[0];
    if (req.user.role === 'DOCTOR' && order.ordered_by !== req.user.doctor_id) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    if (req.user.role === 'PATIENT' && order.patient_id !== req.user.patient_id) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    return res.json({ success: true, data: order });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// PUT /api/test-orders/:id/result - lab tech enters results
const LAB_ALLOWED_STATUSES = ['SAMPLE_COLLECTED', 'COMPLETED'];

router.put('/:id/result', verifyToken, authorize('LAB_TECH'), async (req, res) => {
  try {
    const { result_value, result_date, remarks, status, sample_collected_at } = req.body;

    const existing = await pool.query('SELECT * FROM test_order WHERE order_id = $1', [req.params.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Test order not found' });
    }
    const current = existing.rows[0];

    if (current.status === 'COMPLETED') {
      return res.status(400).json({ success: false, error: 'Test already completed' });
    }
    if (current.status === 'CANCELLED') {
      return res.status(400).json({ success: false, error: 'Test order has been cancelled' });
    }

    const newStatus = status || current.status;
    if (!LAB_ALLOWED_STATUSES.includes(newStatus)) {
      return res.status(400).json({ success: false, error: `status must be one of ${LAB_ALLOWED_STATUSES.join(', ')}` });
    }

    if (newStatus === 'COMPLETED' && !result_value && !current.result_value) {
      return res.status(400).json({ success: false, error: 'result_value is required when completing a test' });
    }

    // Auto-set sample_collected_at when transitioning to SAMPLE_COLLECTED
    let resolvedSampleAt = current.sample_collected_at;
    if (newStatus === 'SAMPLE_COLLECTED' && !current.sample_collected_at) {
      resolvedSampleAt = sample_collected_at ? new Date(sample_collected_at) : new Date();
    }

    // Auto-set result_date when completing — use CURRENT_DATE (server timezone) not JS Date()
    const suppliedResultDate = result_date || null;
    const useCurrentDate = newStatus === 'COMPLETED' && !suppliedResultDate && !current.result_date;

    const updateResult = await pool.query(
      `UPDATE test_order
       SET result_value = $1,
           result_date  = CASE WHEN $7 THEN CURRENT_DATE ELSE COALESCE($2::date, result_date) END,
           remarks = $3, status = $4, sample_collected_at = $5
       WHERE order_id = $6 RETURNING *`,
      [
        result_value ?? current.result_value,
        suppliedResultDate,
        remarks !== undefined ? remarks : current.remarks,
        newStatus,
        resolvedSampleAt,
        req.params.id,
        useCurrentDate,
      ]
    );

    return res.json({ success: true, data: updateResult.rows[0] });
  } catch (err) {
    if (err.code === '22001') return res.status(400).json({ success: false, error: 'result_value is too long (max 100 characters)' });
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
