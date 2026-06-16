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

module.exports = router;
