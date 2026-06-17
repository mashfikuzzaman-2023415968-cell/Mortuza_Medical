const express = require('express');
const pool = require('../config/db');
const { verifyToken, authorize } = require('../middleware/auth');

const router = express.Router();

// All endpoints are PATIENT-only and scoped to the caller's own patient_id.

// GET /api/health-analytics/active-medications
router.get('/active-medications', verifyToken, authorize('PATIENT'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         m.medicine_name,
         m.strength,
         m.dosage_form,
         pi.dosage,
         pi.duration_days,
         pi.quantity_prescribed,
         pi.instruction,
         pr.prescription_date,
         d.full_name AS doctor_name,
         v.diagnosis,
         (pr.prescription_date + pi.duration_days * INTERVAL '1 day')::date AS end_date,
         (pr.prescription_date + pi.duration_days * INTERVAL '1 day')::date - CURRENT_DATE AS days_remaining,
         CASE
           WHEN (pr.prescription_date + pi.duration_days * INTERVAL '1 day')::date < CURRENT_DATE
             THEN 'COMPLETED'
           WHEN (pr.prescription_date + pi.duration_days * INTERVAL '1 day')::date - CURRENT_DATE <= 2
             THEN 'ENDING_SOON'
           ELSE 'ACTIVE'
         END AS medication_status
       FROM prescription_item pi
       JOIN prescription pr ON pi.prescription_id = pr.prescription_id
       JOIN visit v ON pr.visit_id = v.visit_id
       JOIN doctor d ON pr.doctor_id = d.doctor_id
       JOIN medicine m ON pi.medicine_id = m.medicine_id
       WHERE v.patient_id = $1
       ORDER BY
         CASE
           WHEN (pr.prescription_date + pi.duration_days * INTERVAL '1 day')::date >= CURRENT_DATE THEN 0
           ELSE 1
         END,
         (pr.prescription_date + pi.duration_days * INTERVAL '1 day')::date ASC`,
      [req.user.patient_id]
    );

    const rows = result.rows;
    const byEndAsc = (a, b) => new Date(a.end_date) - new Date(b.end_date);
    const byEndDesc = (a, b) => new Date(b.end_date) - new Date(a.end_date);

    const active = rows.filter((r) => r.medication_status === 'ACTIVE').sort(byEndAsc);
    const ending_soon = rows.filter((r) => r.medication_status === 'ENDING_SOON').sort(byEndAsc);
    const completed = rows
      .filter((r) => r.medication_status === 'COMPLETED')
      .sort(byEndDesc)
      .slice(0, 20);

    return res.json({ success: true, data: { active, ending_soon, completed } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// GET /api/health-analytics/follow-ups
router.get('/follow-ups', verifyToken, authorize('PATIENT'), async (req, res) => {
  try {
    const result = await pool.query(
      `WITH follow_ups AS (
        SELECT
          v.visit_id,
          v.follow_up_date,
          v.diagnosis,
          v.visit_datetime,
          d.full_name AS doctor_name,
          EXISTS (
            SELECT 1 FROM visit v2
            WHERE v2.patient_id = v.patient_id
              AND v2.visit_datetime::date BETWEEN (v.follow_up_date - INTERVAL '3 days')::date
                                              AND (v.follow_up_date + INTERVAL '3 days')::date
              AND v2.visit_id != v.visit_id
              AND v2.visit_datetime > v.visit_datetime
          ) AS follow_up_attended,
          (
            SELECT MIN(v2.visit_datetime::date) FROM visit v2
            WHERE v2.patient_id = v.patient_id
              AND v2.visit_datetime::date BETWEEN (v.follow_up_date - INTERVAL '3 days')::date
                                              AND (v.follow_up_date + INTERVAL '3 days')::date
              AND v2.visit_id != v.visit_id
              AND v2.visit_datetime > v.visit_datetime
          ) AS attended_date,
          CASE
            WHEN v.follow_up_date > CURRENT_DATE THEN 'UPCOMING'
            WHEN v.follow_up_date = CURRENT_DATE THEN 'TODAY'
            WHEN EXISTS (
              SELECT 1 FROM visit v2
              WHERE v2.patient_id = v.patient_id
                AND v2.visit_datetime::date BETWEEN (v.follow_up_date - INTERVAL '3 days')::date
                                                AND (v.follow_up_date + INTERVAL '3 days')::date
                AND v2.visit_id != v.visit_id
                AND v2.visit_datetime > v.visit_datetime
            ) THEN 'ATTENDED'
            ELSE 'MISSED'
          END AS follow_up_status,
          v.follow_up_date - CURRENT_DATE AS days_until
        FROM visit v
        JOIN doctor d ON v.doctor_id = d.doctor_id
        WHERE v.patient_id = $1
          AND v.follow_up_date IS NOT NULL
        ORDER BY v.follow_up_date DESC
      )
      SELECT * FROM follow_ups`,
      [req.user.patient_id]
    );

    const rows = result.rows;
    const byDateDesc = (a, b) => new Date(b.follow_up_date) - new Date(a.follow_up_date);
    const byDateAsc = (a, b) => new Date(a.follow_up_date) - new Date(b.follow_up_date);

    const missed = rows.filter((r) => r.follow_up_status === 'MISSED').sort(byDateDesc);
    const today = rows.filter((r) => r.follow_up_status === 'TODAY');
    const upcoming = rows.filter((r) => r.follow_up_status === 'UPCOMING').sort(byDateAsc);
    const attended = rows.filter((r) => r.follow_up_status === 'ATTENDED').sort(byDateDesc);

    return res.json({ success: true, data: { missed, today, upcoming, attended } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// GET /api/health-analytics/vitals
router.get('/vitals', verifyToken, authorize('PATIENT'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         v.visit_id,
         v.visit_datetime::date AS visit_date,
         v.blood_pressure,
         v.temperature_f,
         v.weight_kg,
         v.pulse,
         v.diagnosis,
         d.full_name AS doctor_name,
         LAG(v.temperature_f) OVER (ORDER BY v.visit_datetime) AS prev_temperature,
         LAG(v.weight_kg) OVER (ORDER BY v.visit_datetime) AS prev_weight,
         LAG(v.pulse) OVER (ORDER BY v.visit_datetime) AS prev_pulse,
         LAG(v.blood_pressure) OVER (ORDER BY v.visit_datetime) AS prev_bp,
         v.temperature_f - LAG(v.temperature_f) OVER (ORDER BY v.visit_datetime) AS temp_change,
         v.weight_kg - LAG(v.weight_kg) OVER (ORDER BY v.visit_datetime) AS weight_change,
         v.pulse - LAG(v.pulse) OVER (ORDER BY v.visit_datetime) AS pulse_change
       FROM visit v
       JOIN doctor d ON v.doctor_id = d.doctor_id
       WHERE v.patient_id = $1
         AND (v.blood_pressure IS NOT NULL OR v.temperature_f IS NOT NULL
              OR v.weight_kg IS NOT NULL OR v.pulse IS NOT NULL)
       ORDER BY v.visit_datetime ASC`,
      [req.user.patient_id]
    );

    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// GET /api/health-analytics/test-insights
router.get('/test-insights', verifyToken, authorize('PATIENT'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         t.order_id,
         t.result_value,
         t.result_date,
         t.status,
         t.remarks,
         dt.test_name,
         dt.test_category,
         dt.normal_range,
         d.full_name AS doctor_name,
         LAG(t.result_value) OVER (
           PARTITION BY t.test_id ORDER BY t.order_datetime
         ) AS prev_result,
         LAG(t.result_date) OVER (
           PARTITION BY t.test_id ORDER BY t.order_datetime
         ) AS prev_result_date,
         COUNT(*) OVER (PARTITION BY t.test_id) AS times_tested
       FROM test_order t
       JOIN diagnostic_test dt ON t.test_id = dt.test_id
       LEFT JOIN doctor d ON t.ordered_by = d.doctor_id
       WHERE t.patient_id = $1
         AND t.status = 'COMPLETED'
       ORDER BY dt.test_name, t.order_datetime DESC`,
      [req.user.patient_id]
    );

    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
