const express = require('express');
const pool = require('../config/db');
const { verifyToken, authorize } = require('../middleware/auth');

const router = express.Router();

const DOSAGE_FORMS = ['TABLET', 'CAPSULE', 'SYRUP', 'INJECTION', 'OINTMENT', 'DROPS', 'POWDER'];

// GET /api/medicines - list medicines (DOCTOR for prescribing, PHARMACIST for stock)
router.get('/', verifyToken, authorize('DOCTOR', 'PHARMACIST'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT medicine_id, medicine_name, generic_name, manufacturer, dosage_form, strength,
              unit_price, stock_quantity, reorder_level, expiry_date, is_homeo
       FROM medicine ORDER BY medicine_name`
    );
    return res.json({ success: true, data: result.rows, count: result.rows.length });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// GET /api/medicines/low-stock - medicines at or below reorder level (PHARMACIST)
router.get('/low-stock', verifyToken, authorize('PHARMACIST'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT medicine_id, medicine_name, generic_name, manufacturer, dosage_form, strength,
              unit_price, stock_quantity, reorder_level, expiry_date, is_homeo
       FROM medicine
       WHERE stock_quantity <= reorder_level
       ORDER BY (stock_quantity - reorder_level) ASC, medicine_name`
    );
    return res.json({ success: true, data: result.rows, count: result.rows.length });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// POST /api/medicines - add a new medicine to inventory (PHARMACIST)
router.post('/', verifyToken, authorize('PHARMACIST'), async (req, res) => {
  try {
    const {
      medicine_name, generic_name, manufacturer, dosage_form, strength,
      unit_price, stock_quantity, reorder_level, expiry_date, is_homeo,
    } = req.body;

    if (!medicine_name) {
      return res.status(400).json({ success: false, error: 'medicine_name is required' });
    }
    if (dosage_form && !DOSAGE_FORMS.includes(dosage_form)) {
      return res.status(400).json({ success: false, error: `dosage_form must be one of: ${DOSAGE_FORMS.join(', ')}` });
    }
    if (unit_price !== undefined && unit_price < 0) {
      return res.status(400).json({ success: false, error: 'unit_price must be >= 0' });
    }
    if (stock_quantity !== undefined && stock_quantity < 0) {
      return res.status(400).json({ success: false, error: 'stock_quantity must be >= 0' });
    }

    const result = await pool.query(
      `INSERT INTO medicine (medicine_name, generic_name, manufacturer, dosage_form, strength,
                             unit_price, stock_quantity, reorder_level, expiry_date, is_homeo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        medicine_name, generic_name || null, manufacturer || null, dosage_form || null, strength || null,
        is_homeo ? 0 : (unit_price ?? 0), stock_quantity ?? 0, reorder_level ?? 50, expiry_date || null, is_homeo ?? false,
      ]
    );

    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ success: false, error: 'A medicine with this name, strength and manufacturer already exists' });
    }
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// PUT /api/medicines/:id - update stock quantity / price / other fields (PHARMACIST)
router.put('/:id', verifyToken, authorize('PHARMACIST'), async (req, res) => {
  try {
    const existing = await pool.query('SELECT * FROM medicine WHERE medicine_id = $1', [req.params.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Medicine not found' });
    }
    const current = existing.rows[0];

    const {
      medicine_name, generic_name, manufacturer, dosage_form, strength,
      unit_price, stock_quantity, reorder_level, expiry_date, is_homeo,
    } = req.body;

    if (dosage_form && !DOSAGE_FORMS.includes(dosage_form)) {
      return res.status(400).json({ success: false, error: `dosage_form must be one of: ${DOSAGE_FORMS.join(', ')}` });
    }
    if (unit_price !== undefined && unit_price < 0) {
      return res.status(400).json({ success: false, error: 'unit_price must be >= 0' });
    }
    if (stock_quantity !== undefined && stock_quantity < 0) {
      return res.status(400).json({ success: false, error: 'stock_quantity must be >= 0' });
    }

    const effectiveIsHomeo = is_homeo ?? current.is_homeo;
    const effectiveUnitPrice = effectiveIsHomeo ? 0 : (unit_price ?? current.unit_price);

    const result = await pool.query(
      `UPDATE medicine SET
         medicine_name = $1, generic_name = $2, manufacturer = $3, dosage_form = $4, strength = $5,
         unit_price = $6, stock_quantity = $7, reorder_level = $8, expiry_date = $9, is_homeo = $10
       WHERE medicine_id = $11
       RETURNING *`,
      [
        medicine_name ?? current.medicine_name,
        generic_name !== undefined ? generic_name : current.generic_name,
        manufacturer !== undefined ? manufacturer : current.manufacturer,
        dosage_form !== undefined ? dosage_form : current.dosage_form,
        strength !== undefined ? strength : current.strength,
        effectiveUnitPrice,
        stock_quantity ?? current.stock_quantity,
        reorder_level ?? current.reorder_level,
        expiry_date !== undefined ? expiry_date : current.expiry_date,
        effectiveIsHomeo,
        req.params.id,
      ]
    );

    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ success: false, error: 'A medicine with this name, strength and manufacturer already exists' });
    }
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// DELETE /api/medicines/:id - remove a medicine from inventory (PHARMACIST)
router.delete('/:id', verifyToken, authorize('PHARMACIST'), async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM medicine WHERE medicine_id = $1 RETURNING medicine_id', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Medicine not found' });
    }
    return res.json({ success: true, data: { medicine_id: result.rows[0].medicine_id } });
  } catch (err) {
    if (err.code === '23503') {
      return res.status(409).json({ success: false, error: 'Cannot delete: medicine has been prescribed' });
    }
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
