const express = require('express');
const pool = require('../config/db');
const { verifyToken, authorize } = require('../middleware/auth');

const router = express.Router();

// GET /api/prescriptions - list (PHARMACIST: dispense queue; PATIENT: ?patient=me own prescriptions)
router.get('/', verifyToken, authorize('PHARMACIST', 'PATIENT'), async (req, res) => {
  try {
    const conditions = [];
    const params = [];

    if (req.user.role === 'PATIENT') {
      if (req.query.patient !== 'me') {
        return res.status(403).json({ success: false, error: 'Forbidden' });
      }
      params.push(req.user.patient_id);
      conditions.push(`p.patient_id = $${params.length}`);
    }

    const pendingCondition = `EXISTS (
      SELECT 1 FROM prescription_item pi
      WHERE pi.prescription_id = pr.prescription_id
        AND NOT EXISTS (SELECT 1 FROM medicine_dispense md WHERE md.prescription_item_id = pi.item_id)
    )`;
    if (req.user.role === 'PHARMACIST') {
      conditions.push(pendingCondition);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT pr.prescription_id, pr.visit_id, pr.prescription_date, pr.advice, pr.next_visit_date,
              p.patient_id, p.full_name AS patient_name, p.patient_category,
              d.full_name AS doctor_name
       FROM prescription pr
       JOIN visit v ON v.visit_id = pr.visit_id
       JOIN patient p ON p.patient_id = v.patient_id
       JOIN doctor d ON d.doctor_id = pr.doctor_id
       ${whereClause}
       ORDER BY pr.prescription_date DESC, pr.prescription_id DESC`,
      params
    );

    return res.json({ success: true, data: result.rows, count: result.rows.length });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// GET /api/prescriptions/:id - prescription with items (DOCTOR, PHARMACIST, PATIENT-own)
router.get('/:id', verifyToken, authorize('DOCTOR', 'PHARMACIST', 'PATIENT'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT pr.*, v.visit_id, v.patient_id, v.doctor_id AS visit_doctor_id, v.diagnosis,
              p.full_name AS patient_name, p.patient_category, p.guardian_id,
              d.full_name AS doctor_name
       FROM prescription pr
       JOIN visit v ON v.visit_id = pr.visit_id
       JOIN patient p ON p.patient_id = v.patient_id
       JOIN doctor d ON d.doctor_id = pr.doctor_id
       WHERE pr.prescription_id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Prescription not found' });
    }
    const prescription = result.rows[0];

    if (req.user.role === 'DOCTOR' && prescription.visit_doctor_id !== req.user.doctor_id) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    if (req.user.role === 'PATIENT' && prescription.patient_id !== req.user.patient_id) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const itemsResult = await pool.query(
      `SELECT pi.*, m.medicine_name, m.strength, m.dosage_form, m.unit_price, m.is_homeo, m.stock_quantity,
              COALESCE((SELECT SUM(md.dispensed_quantity) FROM medicine_dispense md WHERE md.prescription_item_id = pi.item_id), 0) AS already_dispensed
       FROM prescription_item pi
       JOIN medicine m ON m.medicine_id = pi.medicine_id
       WHERE pi.prescription_id = $1`,
      [req.params.id]
    );

    return res.json({ success: true, data: { ...prescription, items: itemsResult.rows } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// POST /api/prescriptions - write a prescription with items for a visit
router.post('/', verifyToken, authorize('DOCTOR'), async (req, res) => {
  const client = await pool.connect();
  try {
    const { visit_id, advice, next_visit_date, items } = req.body;

    if (!visit_id) {
      return res.status(400).json({ success: false, error: 'visit_id is required' });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'At least one prescription item is required' });
    }
    for (const item of items) {
      if (!item.medicine_id || !item.quantity_prescribed || item.quantity_prescribed <= 0) {
        return res.status(400).json({ success: false, error: 'Each item requires medicine_id and a positive quantity_prescribed' });
      }
      if (item.duration_days !== undefined && item.duration_days !== null && item.duration_days !== '' && item.duration_days <= 0) {
        return res.status(400).json({ success: false, error: 'duration_days must be greater than 0' });
      }
    }

    const visitResult = await client.query('SELECT visit_id, doctor_id FROM visit WHERE visit_id = $1', [visit_id]);
    if (visitResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Visit not found' });
    }
    if (visitResult.rows[0].doctor_id !== req.user.doctor_id) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const existing = await client.query('SELECT prescription_id FROM prescription WHERE visit_id = $1', [visit_id]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, error: 'A prescription already exists for this visit' });
    }

    await client.query('BEGIN');

    const prescriptionResult = await client.query(
      `INSERT INTO prescription (visit_id, doctor_id, advice, next_visit_date)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [visit_id, req.user.doctor_id, advice || null, next_visit_date || null]
    );
    const prescription = prescriptionResult.rows[0];

    const insertedItems = [];
    for (const item of items) {
      const itemResult = await client.query(
        `INSERT INTO prescription_item (prescription_id, medicine_id, dosage, duration_days, quantity_prescribed, instruction)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [
          prescription.prescription_id, item.medicine_id, item.dosage || null,
          item.duration_days || null, item.quantity_prescribed, item.instruction || null,
        ]
      );
      insertedItems.push(itemResult.rows[0]);
    }

    await client.query('COMMIT');

    return res.status(201).json({ success: true, data: { ...prescription, items: insertedItems } });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      return res.status(409).json({ success: false, error: 'Duplicate medicine in prescription items' });
    }
    if (err.code === '23503') {
      return res.status(400).json({ success: false, error: 'Invalid medicine_id' });
    }
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    client.release();
  }
});

module.exports = router;
