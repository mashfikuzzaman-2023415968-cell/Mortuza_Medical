const express = require('express');
const pool = require('../config/db');
const { verifyToken, authorize } = require('../middleware/auth');

const router = express.Router();

const UNIT_TYPES = ['OUTPATIENT', 'DENTAL', 'EYE', 'HOMEO', 'PHYSIO', 'PATHOLOGY', 'RADIOLOGY'];

// GET /api/units - list units (all authenticated users need this for form dropdowns)
router.get('/', verifyToken, async (req, res) => {
  try {
    const showAll = req.query.all === 'true';
    const where = showAll ? '' : 'WHERE is_active = TRUE';
    const result = await pool.query(
      `SELECT unit_id, unit_name, unit_type, floor_location, contact_ext, is_active
       FROM unit ${where} ORDER BY unit_name`
    );
    return res.json({ success: true, data: result.rows, count: result.rows.length });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// POST /api/units - create unit (ADMIN only)
router.post('/', verifyToken, authorize(), async (req, res) => {
  try {
    const { unit_name, unit_type, floor_location, contact_ext, is_active } = req.body;
    if (!unit_name || !unit_type) {
      return res.status(400).json({ success: false, error: 'unit_name and unit_type are required' });
    }
    if (!UNIT_TYPES.includes(unit_type)) {
      return res.status(400).json({ success: false, error: `unit_type must be one of ${UNIT_TYPES.join(', ')}` });
    }

    const result = await pool.query(
      `INSERT INTO unit (unit_name, unit_type, floor_location, contact_ext, is_active)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [unit_name, unit_type, floor_location || null, contact_ext || null, is_active !== false]
    );
    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ success: false, error: 'Unit name already exists' });
    if (err.code === '23514') return res.status(400).json({ success: false, error: 'Invalid unit_type' });
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// PUT /api/units/:id - update unit (ADMIN only)
router.put('/:id', verifyToken, authorize(), async (req, res) => {
  try {
    const current = await pool.query('SELECT * FROM unit WHERE unit_id = $1', [req.params.id]);
    if (current.rows.length === 0) return res.status(404).json({ success: false, error: 'Unit not found' });
    const unit = current.rows[0];

    const { unit_name, unit_type, floor_location, contact_ext, is_active } = req.body;
    const newType = unit_type || unit.unit_type;
    if (!UNIT_TYPES.includes(newType)) {
      return res.status(400).json({ success: false, error: `unit_type must be one of ${UNIT_TYPES.join(', ')}` });
    }

    const result = await pool.query(
      `UPDATE unit SET unit_name=$1, unit_type=$2, floor_location=$3, contact_ext=$4, is_active=$5
       WHERE unit_id=$6 RETURNING *`,
      [
        unit_name || unit.unit_name,
        newType,
        floor_location !== undefined ? (floor_location || null) : unit.floor_location,
        contact_ext !== undefined ? (contact_ext || null) : unit.contact_ext,
        is_active !== undefined ? !!is_active : unit.is_active,
        req.params.id,
      ]
    );
    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ success: false, error: 'Unit name already exists' });
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// DELETE /api/units/:id - delete unit (ADMIN only)
router.delete('/:id', verifyToken, authorize(), async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM unit WHERE unit_id = $1 RETURNING unit_id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Unit not found' });
    return res.json({ success: true, data: { unit_id: result.rows[0].unit_id } });
  } catch (err) {
    if (err.code === '23503') return res.status(409).json({ success: false, error: 'Cannot delete: unit has doctors or tokens assigned to it' });
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
