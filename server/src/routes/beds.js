const express = require('express');
const pool = require('../config/db');
const { verifyToken, authorize } = require('../middleware/auth');

const router = express.Router();

// GET /api/beds - bed occupancy status (derived from ward_admission)
router.get('/', verifyToken, authorize('DOCTOR'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT bs.*, p.full_name AS current_patient_name
       FROM v_bed_status bs
       LEFT JOIN patient p ON p.patient_id = bs.current_patient_id
       ORDER BY bs.bed_id`
    );
    return res.json({ success: true, data: result.rows, count: result.rows.length });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
