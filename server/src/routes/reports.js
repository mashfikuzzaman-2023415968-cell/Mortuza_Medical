const express = require('express');
const pool = require('../config/db');
const { verifyToken, authorize } = require('../middleware/auth');

const router = express.Router();

// GET /api/reports/dispensary - daily dispensary revenue (from v_daily_dispensary)
router.get('/dispensary', verifyToken, authorize(), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT dispense_day, items_dispensed, revenue FROM v_daily_dispensary ORDER BY dispense_day DESC`
    );
    return res.json({ success: true, data: result.rows, count: result.rows.length });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// GET /api/reports/workload - doctor workload (from v_doctor_workload)
router.get('/workload', verifyToken, authorize(), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT doctor_id, full_name, doctor_type, visits, prescriptions
       FROM v_doctor_workload
       ORDER BY visits DESC, prescriptions DESC`
    );
    return res.json({ success: true, data: result.rows, count: result.rows.length });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// GET /api/reports/occupancy - bed occupancy (from v_bed_occupancy)
router.get('/occupancy', verifyToken, authorize(), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ward_type, occupied, free, (occupied + free) AS total FROM v_bed_occupancy ORDER BY ward_type`
    );
    return res.json({ success: true, data: result.rows, count: result.rows.length });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// GET /api/reports/ambulance-usage - ambulance usage summary (from v_ambulance_status)
router.get('/ambulance-usage', verifyToken, authorize(), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ambulance_id, registration_no, driver_name, operational_status,
              currently_on_trip, free_to_dispatch, total_trips
       FROM v_ambulance_status ORDER BY ambulance_id`
    );
    return res.json({ success: true, data: result.rows, count: result.rows.length });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// GET /api/reports/summary - high-level summary stats for admin dashboard
router.get('/summary', verifyToken, authorize(), async (req, res) => {
  try {
    const [patients, visitsToday, pendingUsers, occupancy, ambulances] = await Promise.all([
      pool.query('SELECT COUNT(*) AS total FROM patient'),
      pool.query(`SELECT COUNT(*) AS today FROM visit WHERE visit_datetime::date = CURRENT_DATE`),
      pool.query(`SELECT COUNT(*) AS pending FROM app_user WHERE email_verified = TRUE AND is_active = FALSE`),
      pool.query(`SELECT COALESCE(SUM(occupied),0) AS occupied, COALESCE(SUM(free),0) AS free FROM v_bed_occupancy`),
      pool.query(`SELECT COUNT(*) FILTER (WHERE free_to_dispatch) AS free_ambulances FROM v_ambulance_status`),
    ]);
    const revenueToday = await pool.query(
      `SELECT COALESCE(SUM(charged_amount), 0) AS revenue FROM medicine_dispense WHERE dispense_datetime::date = CURRENT_DATE`
    );

    return res.json({
      success: true,
      data: {
        total_patients: Number(patients.rows[0].total),
        visits_today: Number(visitsToday.rows[0].today),
        pending_approvals: Number(pendingUsers.rows[0].pending),
        beds_occupied: Number(occupancy.rows[0].occupied),
        beds_free: Number(occupancy.rows[0].free),
        free_ambulances: Number(ambulances.rows[0].free_ambulances),
        revenue_today: Number(revenueToday.rows[0].revenue),
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
