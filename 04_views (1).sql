-- =====================================================================
-- MMCMS views (report requirement 8.h)
-- =====================================================================
DROP VIEW IF EXISTS v_patient_overview, v_doctor_workload, v_daily_dispensary,
                    v_bed_occupancy, v_bed_status, v_ambulance_status CASCADE;

-- V1: patient summary with card status
CREATE VIEW v_patient_overview AS
SELECT p.patient_id, p.full_name, p.patient_category,
       hc.card_number, hc.status AS card_status, hc.expiry_date
FROM patient p LEFT JOIN health_card hc ON p.patient_id = hc.patient_id;

-- V2: doctor workload
CREATE VIEW v_doctor_workload AS
SELECT d.doctor_id, d.full_name, d.doctor_type,
       COUNT(DISTINCT v.visit_id)         AS visits,
       COUNT(DISTINCT pr.prescription_id) AS prescriptions
FROM doctor d
LEFT JOIN visit v        ON v.doctor_id = d.doctor_id
LEFT JOIN prescription pr ON pr.doctor_id = d.doctor_id
GROUP BY d.doctor_id, d.full_name, d.doctor_type;

-- V3: daily dispensary report
CREATE VIEW v_daily_dispensary AS
SELECT md.dispense_datetime::date AS dispense_day,
       COUNT(*)               AS items_dispensed,
       SUM(md.charged_amount)  AS revenue
FROM medicine_dispense md
GROUP BY md.dispense_datetime::date;

-- V5: per-bed live status (occupancy DERIVED from current admissions, not stored)
CREATE VIEW v_bed_status AS
SELECT b.bed_id, b.bed_number, b.ward_type, b.disease_category,
       (a.admission_id IS NOT NULL) AS is_occupied,
       a.patient_id AS current_patient_id
FROM bed b
LEFT JOIN ward_admission a
       ON a.bed_id = b.bed_id AND a.status = 'ADMITTED';

-- V4: bed occupancy summary by ward type (built on the derived status)
CREATE VIEW v_bed_occupancy AS
SELECT ward_type,
       COUNT(*) FILTER (WHERE is_occupied)     AS occupied,
       COUNT(*) FILTER (WHERE NOT is_occupied) AS free
FROM v_bed_status
GROUP BY ward_type;

-- V6: live ambulance status — "on trip" DERIVED from open dispatches (parallels bed occupancy)
CREATE VIEW v_ambulance_status AS
SELECT a.ambulance_id, a.registration_no, a.driver_name,
       a.status AS operational_status,
       EXISTS (SELECT 1 FROM ambulance_dispatch d
               WHERE d.ambulance_id = a.ambulance_id
                 AND d.status = 'DISPATCHED' AND d.return_datetime IS NULL) AS currently_on_trip,
       (a.status = 'IN_SERVICE'
        AND NOT EXISTS (SELECT 1 FROM ambulance_dispatch d
                        WHERE d.ambulance_id = a.ambulance_id
                          AND d.status = 'DISPATCHED' AND d.return_datetime IS NULL)) AS free_to_dispatch,
       (SELECT COUNT(*) FROM ambulance_dispatch d2 WHERE d2.ambulance_id = a.ambulance_id) AS total_trips
FROM ambulance a;
