const express = require('express');
const pool = require('../config/db');
const { verifyToken, authorize } = require('../middleware/auth');

const router = express.Router();

// GET /api/diagnostic-tests - catalogue of available tests
router.get('/', verifyToken, authorize('DOCTOR', 'LAB_TECH', 'RECEPTIONIST'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT test_id, test_name, test_category, sample_type, price, normal_range, available_days
       FROM diagnostic_test ORDER BY test_category, test_name`
    );
    return res.json({ success: true, data: result.rows, count: result.rows.length });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
