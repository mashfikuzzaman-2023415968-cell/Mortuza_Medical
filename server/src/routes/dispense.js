const express = require('express');
const pool = require('../config/db');
const { verifyToken, authorize } = require('../middleware/auth');

const router = express.Router();

// POST /api/dispense - dispense medicines for a prescription (transaction, Section 10.1.5 B)
router.post('/', verifyToken, authorize('PHARMACIST'), async (req, res) => {
  const { prescription_id, items } = req.body;

  if (!prescription_id) {
    return res.status(400).json({ success: false, error: 'prescription_id is required' });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, error: 'At least one item is required' });
  }
  for (const item of items) {
    if (!item.prescription_item_id || !item.dispensed_quantity || item.dispensed_quantity <= 0) {
      return res.status(400).json({ success: false, error: 'Each item requires prescription_item_id and a positive dispensed_quantity' });
    }
    if (!Number.isInteger(item.dispensed_quantity)) {
      return res.status(400).json({ success: false, error: 'dispensed_quantity must be a whole number' });
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const presResult = await client.query(
      `SELECT p.patient_id, p.patient_category, p.guardian_id
       FROM prescription pr
       JOIN visit v ON pr.visit_id = v.visit_id
       JOIN patient p ON v.patient_id = p.patient_id
       WHERE pr.prescription_id = $1`,
      [prescription_id]
    );
    if (presResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Prescription not found' });
    }

    let { patient_category, guardian_id } = presResult.rows[0];
    let effective_category = patient_category;
    if (patient_category === 'FAMILY' && guardian_id) {
      const guardianResult = await client.query(
        'SELECT patient_category FROM patient WHERE patient_id = $1',
        [guardian_id]
      );
      if (guardianResult.rows.length > 0) {
        effective_category = guardianResult.rows[0].patient_category;
      }
    }

    const dispenseRecords = [];
    let totalCharge = 0;

    for (const item of items) {
      const itemResult = await client.query(
        `SELECT pi.item_id, pi.prescription_id, pi.quantity_prescribed, m.medicine_id, m.medicine_name, m.unit_price, m.stock_quantity, m.is_homeo,
                COALESCE((SELECT SUM(md.dispensed_quantity) FROM medicine_dispense md WHERE md.prescription_item_id = pi.item_id), 0) AS already_dispensed
         FROM prescription_item pi
         JOIN medicine m ON pi.medicine_id = m.medicine_id
         WHERE pi.item_id = $1`,
        [item.prescription_item_id]
      );
      if (itemResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, error: `Prescription item ${item.prescription_item_id} not found` });
      }
      const row = itemResult.rows[0];
      if (row.prescription_id !== Number(prescription_id)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, error: `Prescription item ${item.prescription_item_id} does not belong to prescription ${prescription_id}` });
      }
      const remaining = row.quantity_prescribed - Number(row.already_dispensed);
      if (item.dispensed_quantity > remaining) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, error: `Cannot dispense more than prescribed for ${row.medicine_name} (remaining: ${remaining})` });
      }
      if (row.stock_quantity < item.dispensed_quantity) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, error: `Insufficient stock for ${row.medicine_name}` });
      }

      const charged_amount = (effective_category === 'STUDENT' || row.is_homeo)
        ? 0
        : Number(row.unit_price) * item.dispensed_quantity;

      const dispenseResult = await client.query(
        `INSERT INTO medicine_dispense (prescription_item_id, dispensed_quantity, charged_amount, dispensed_by)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [item.prescription_item_id, item.dispensed_quantity, charged_amount, req.user.username]
      );

      await client.query(
        'UPDATE medicine SET stock_quantity = stock_quantity - $1 WHERE medicine_id = $2',
        [item.dispensed_quantity, row.medicine_id]
      );

      dispenseRecords.push({ ...dispenseResult.rows[0], medicine_name: row.medicine_name });
      totalCharge += charged_amount;
    }

    await client.query('COMMIT');

    return res.status(201).json({ success: true, data: { dispenses: dispenseRecords, total_charge: totalCharge } });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    client.release();
  }
});

// Shared SELECT + join chain for history reads. LEFT JOINs so an orphaned
// dispense (broken link) still surfaces rather than vanishing/crashing.
const HISTORY_SELECT = `
  SELECT
    md.dispense_id,
    md.dispensed_quantity,
    md.dispense_datetime,
    md.charged_amount,
    md.dispensed_by,
    m.medicine_id,
    m.medicine_name,
    m.strength,
    m.dosage_form,
    m.unit_price,
    m.is_homeo,
    pi.item_id AS prescription_item_id,
    pi.dosage,
    pi.duration_days,
    pi.quantity_prescribed,
    pi.instruction,
    pr.prescription_id,
    pr.prescription_date,
    pr.advice,
    v.visit_id,
    v.diagnosis,
    v.visit_type,
    d.full_name AS prescribing_doctor,
    p.patient_id,
    p.full_name AS patient_name,
    p.patient_category,
    p.university_id,
    p.academic_dept,
    p.guardian_id
  FROM medicine_dispense md
  LEFT JOIN prescription_item pi ON md.prescription_item_id = pi.item_id
  LEFT JOIN prescription pr ON pi.prescription_id = pr.prescription_id
  LEFT JOIN visit v ON pr.visit_id = v.visit_id
  LEFT JOIN patient p ON v.patient_id = p.patient_id
  LEFT JOIN doctor d ON pr.doctor_id = d.doctor_id
  LEFT JOIN medicine m ON pi.medicine_id = m.medicine_id
`;

// GET /api/dispense/history — searchable, filterable, paginated history
router.get('/history', verifyToken, authorize('PHARMACIST'), async (req, res) => {
  try {
    const { search, date_from, date_to, medicine_id, payment, dispensed_by } = req.query;

    const conditions = [];
    const params = [];

    const trimmed = typeof search === 'string' ? search.trim() : '';
    if (trimmed) {
      params.push(trimmed);
      const i = params.length;
      conditions.push(
        `(p.full_name ILIKE '%' || $${i} || '%' OR m.medicine_name ILIKE '%' || $${i} || '%' OR md.dispense_id::text = $${i})`
      );
    }
    if (date_from) {
      params.push(date_from);
      conditions.push(`md.dispense_datetime::date >= $${params.length}`);
    }
    if (date_to) {
      params.push(date_to);
      conditions.push(`md.dispense_datetime::date <= $${params.length}`);
    }
    if (medicine_id) {
      params.push(medicine_id);
      conditions.push(`m.medicine_id = $${params.length}`);
    }
    if (payment === 'free') {
      conditions.push(`md.charged_amount = 0`);
    } else if (payment === 'paid') {
      conditions.push(`md.charged_amount > 0`);
    }
    if (dispensed_by) {
      params.push(dispensed_by);
      conditions.push(`md.dispensed_by ILIKE '%' || $${params.length} || '%'`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    // pagination
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 25));
    const offset = (page - 1) * limit;

    const countResult = await pool.query(
      `SELECT COUNT(*) AS total
       FROM medicine_dispense md
       LEFT JOIN prescription_item pi ON md.prescription_item_id = pi.item_id
       LEFT JOIN prescription pr ON pi.prescription_id = pr.prescription_id
       LEFT JOIN visit v ON pr.visit_id = v.visit_id
       LEFT JOIN patient p ON v.patient_id = p.patient_id
       LEFT JOIN medicine m ON pi.medicine_id = m.medicine_id
       ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);

    const listParams = [...params, limit, offset];
    const listResult = await pool.query(
      `${HISTORY_SELECT}
       ${where}
       ORDER BY md.dispense_datetime DESC, md.dispense_id DESC
       LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
      listParams
    );

    return res.json({
      success: true,
      data: {
        dispenses: listResult.rows,
        pagination: { page, limit, total, total_pages: Math.ceil(total / limit) },
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// GET /api/dispense/history/summary — overview stats for a date range (defaults to today)
router.get('/history/summary', verifyToken, authorize('PHARMACIST'), async (req, res) => {
  try {
    const date_from = req.query.date_from || null;
    const date_to = req.query.date_to || null;

    // Default both ends to today when not provided.
    const result = await pool.query(
      `SELECT
         COUNT(*) AS total_dispenses,
         COUNT(DISTINCT pr.prescription_id) AS prescriptions_filled,
         COUNT(DISTINCT p.patient_id) AS unique_patients,
         COALESCE(SUM(md.charged_amount), 0) AS total_revenue,
         COUNT(*) FILTER (WHERE md.charged_amount = 0) AS free_dispenses,
         COUNT(*) FILTER (WHERE md.charged_amount > 0) AS paid_dispenses,
         COALESCE(ROUND(AVG(md.charged_amount) FILTER (WHERE md.charged_amount > 0), 2), 0) AS avg_paid_amount
       FROM medicine_dispense md
       LEFT JOIN prescription_item pi ON md.prescription_item_id = pi.item_id
       LEFT JOIN prescription pr ON pi.prescription_id = pr.prescription_id
       LEFT JOIN visit v ON pr.visit_id = v.visit_id
       LEFT JOIN patient p ON v.patient_id = p.patient_id
       WHERE md.dispense_datetime::date BETWEEN COALESCE($1::date, CURRENT_DATE)
                                            AND COALESCE($2::date, CURRENT_DATE)`,
      [date_from, date_to]
    );

    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// GET /api/dispense/history/:id — full detail of one dispense (+ all items in its prescription)
router.get('/history/:id', verifyToken, authorize('PHARMACIST'), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ success: false, error: 'Invalid dispense id' });
    }

    const detailResult = await pool.query(
      `SELECT
         md.dispense_id, md.dispensed_quantity, md.dispense_datetime, md.charged_amount, md.dispensed_by,
         m.medicine_id, m.medicine_name, m.strength, m.dosage_form, m.unit_price, m.is_homeo,
         pi.item_id AS prescription_item_id, pi.dosage, pi.duration_days, pi.quantity_prescribed, pi.instruction,
         pr.prescription_id, pr.prescription_date, pr.advice,
         v.visit_id, v.diagnosis, v.visit_type,
         d.full_name AS prescribing_doctor,
         p.patient_id, p.full_name AS patient_name, p.patient_category, p.university_id, p.academic_dept, p.guardian_id,
         g.full_name AS guardian_name, g.patient_category AS guardian_category
       FROM medicine_dispense md
       LEFT JOIN prescription_item pi ON md.prescription_item_id = pi.item_id
       LEFT JOIN prescription pr ON pi.prescription_id = pr.prescription_id
       LEFT JOIN visit v ON pr.visit_id = v.visit_id
       LEFT JOIN patient p ON v.patient_id = p.patient_id
       LEFT JOIN doctor d ON pr.doctor_id = d.doctor_id
       LEFT JOIN medicine m ON pi.medicine_id = m.medicine_id
       LEFT JOIN patient g ON p.guardian_id = g.patient_id
       WHERE md.dispense_id = $1`,
      [id]
    );

    if (detailResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Dispense record not found' });
    }
    const record = detailResult.rows[0];

    // All items in the same prescription, with running dispensed totals.
    let items = [];
    if (record.prescription_id) {
      const itemsResult = await pool.query(
        `SELECT pi.item_id, pi.dosage, pi.instruction, pi.quantity_prescribed, pi.duration_days,
                m.medicine_id, m.medicine_name, m.strength, m.dosage_form, m.unit_price, m.is_homeo,
                COALESCE(SUM(md.dispensed_quantity), 0) AS dispensed_total,
                COALESCE(SUM(md.charged_amount), 0) AS charged_total
         FROM prescription_item pi
         JOIN medicine m ON pi.medicine_id = m.medicine_id
         LEFT JOIN medicine_dispense md ON md.prescription_item_id = pi.item_id
         WHERE pi.prescription_id = $1
         GROUP BY pi.item_id, m.medicine_id
         ORDER BY pi.item_id`,
        [record.prescription_id]
      );
      items = itemsResult.rows;
    }

    return res.json({ success: true, data: { ...record, items } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
