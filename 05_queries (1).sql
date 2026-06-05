-- =====================================================================
-- MMCMS demo queries (report requirement 8.g) -- 21 queries
-- Q2, Q14, Q18 join through to the patient (no redundant patient_id).
-- =====================================================================

-- Q1 natural join: doctors with their unit name
SELECT d.full_name, u.unit_name
FROM doctor d NATURAL JOIN unit u;

-- Q2 JOIN ... USING: each token with its unit name (token keeps unit_id)
SELECT t.token_number, t.token_date, u.unit_name
FROM token t JOIN unit u USING (unit_id)
ORDER BY t.token_date DESC, u.unit_name;

-- Q3 JOIN ... ON (theta): visits with patient and doctor names
SELECT p.full_name AS patient, d.full_name AS doctor, v.diagnosis
FROM visit v
JOIN patient p ON v.patient_id = p.patient_id
JOIN doctor  d ON v.doctor_id  = d.doctor_id;

-- Q4 cross product: general doctor x shift planning grid
SELECT d.full_name, s.shift_name
FROM doctor d CROSS JOIN shift s
WHERE d.doctor_type = 'GENERAL';

-- Q5 LEFT OUTER JOIN + group by + order by: every patient and visit count
SELECT p.full_name, COUNT(v.visit_id) AS total_visits
FROM patient p LEFT OUTER JOIN visit v ON p.patient_id = v.patient_id
GROUP BY p.patient_id, p.full_name
ORDER BY total_visits DESC;

-- Q6 FULL OUTER JOIN: beds reconciled with current admissions
SELECT b.bed_number, b.ward_type, a.status, a.disease
FROM bed b FULL OUTER JOIN ward_admission a
  ON b.bed_id = a.bed_id AND a.status = 'ADMITTED'
ORDER BY b.bed_number;

-- Q7 > ALL: general doctors busier than every homeo doctor
SELECT d.full_name, COUNT(v.visit_id) AS visits
FROM doctor d JOIN visit v ON v.doctor_id = d.doctor_id
WHERE d.doctor_type = 'GENERAL'
GROUP BY d.doctor_id, d.full_name
HAVING COUNT(v.visit_id) > ALL (
  SELECT COUNT(v2.visit_id)
  FROM doctor d2 JOIN visit v2 ON v2.doctor_id = d2.doctor_id
  WHERE d2.doctor_type = 'HOMEO'
  GROUP BY d2.doctor_id);

-- Q8 ANY/SOME: medicines priced above ANY homeo medicine
SELECT medicine_name, unit_price
FROM medicine
WHERE unit_price > ANY (SELECT unit_price FROM medicine WHERE is_homeo = TRUE);

-- Q9 EXISTS: patients with at least one test ordered
SELECT p.full_name, p.patient_category
FROM patient p
WHERE EXISTS (SELECT 1 FROM test_order t WHERE t.patient_id = p.patient_id);

-- Q10 NOT EXISTS: medicines never prescribed
SELECT m.medicine_name
FROM medicine m
WHERE NOT EXISTS (SELECT 1 FROM prescription_item pi WHERE pi.medicine_id = m.medicine_id);

-- Q11 UNIQUE-style: units with no duplicate token number on a day
SELECT u.unit_name, t.token_date
FROM token t JOIN unit u USING (unit_id)
WHERE NOT EXISTS (
  SELECT 1 FROM token t2
  WHERE t2.unit_id = t.unit_id AND t2.token_date = t.token_date
        AND t2.token_number = t.token_number AND t2.token_id <> t.token_id)
GROUP BY u.unit_name, t.token_date;

-- Q12 scalar subquery in SELECT: each doctor with prescription count
SELECT d.full_name,
       (SELECT COUNT(*) FROM prescription pr WHERE pr.doctor_id = d.doctor_id) AS rx_count
FROM doctor d
ORDER BY rx_count DESC, d.full_name;

-- Q13 subquery in FROM (derived table): average visits per unit type
SELECT unit_type, ROUND(AVG(cnt),2) AS avg_visits
FROM (
  SELECT u.unit_type, t.unit_id, COUNT(v.visit_id) AS cnt
  FROM unit u JOIN token t USING (unit_id)
              LEFT JOIN visit v ON v.token_id = t.token_id
  GROUP BY u.unit_type, t.unit_id
) AS per_unit
GROUP BY unit_type;

-- Q14 subquery in WHERE + join-through to patient (no redundant patient_id)
SELECT p.full_name, SUM(md.charged_amount) AS total_charge
FROM medicine_dispense md
JOIN prescription_item pi ON md.prescription_item_id = pi.item_id
JOIN prescription pr      ON pi.prescription_id = pr.prescription_id
JOIN visit v              ON pr.visit_id = v.visit_id
JOIN patient p            ON v.patient_id = p.patient_id
GROUP BY p.patient_id, p.full_name
HAVING SUM(md.charged_amount) > (SELECT AVG(charged_amount) FROM medicine_dispense);

-- Q15 group by + having + order by: units with > 2 tokens
SELECT u.unit_name, COUNT(*) AS token_count
FROM token t JOIN unit u USING (unit_id)
GROUP BY u.unit_id, u.unit_name
HAVING COUNT(*) > 2
ORDER BY token_count DESC;

-- Q16 WITH clause: top-3 busiest doctors by visits in current month
WITH monthly_visits AS (
  SELECT doctor_id, COUNT(*) AS visits
  FROM visit
  WHERE visit_datetime >= date_trunc('month', DATE '2026-01-15')
    AND visit_datetime <  date_trunc('month', DATE '2026-01-15') + INTERVAL '1 month'
  GROUP BY doctor_id)
SELECT d.full_name, mv.visits
FROM monthly_visits mv JOIN doctor d USING (doctor_id)
ORDER BY mv.visits DESC, d.full_name
LIMIT 3;

-- Q17 string manipulation + functions
SELECT INITCAP(full_name)                       AS proper_name,
       UPPER(SUBSTRING(full_name FROM 1 FOR 3))  AS code,
       full_name || ' (' || patient_category || ')' AS label,
       EXTRACT(YEAR FROM AGE(date_of_birth))     AS age_years
FROM patient
WHERE full_name ILIKE '%a%'
ORDER BY age_years DESC NULLS LAST;

-- Q18 set operations (join-through replaces removed token.patient_id)
SELECT patient_id FROM test_order
UNION
SELECT patient_id FROM ward_admission
ORDER BY patient_id;

SELECT patient_id FROM visit
INTERSECT
SELECT patient_id FROM test_order
ORDER BY patient_id;

SELECT patient_id FROM health_card
EXCEPT
SELECT hc.patient_id
FROM token t JOIN health_card hc ON t.health_card_id = hc.card_id
ORDER BY patient_id;

-- Q19 UPDATE: expire health cards past expiry
UPDATE health_card SET status = 'EXPIRED'
WHERE expiry_date < DATE '2026-05-31' AND status = 'ACTIVE';

-- Q20 DELETE: purge cancelled tokens older than 30 days
DELETE FROM token
WHERE status = 'CANCELLED' AND token_date < DATE '2026-05-31' - INTERVAL '30 days';

-- Q21 aggregate suite
SELECT COUNT(*)                       AS dispense_events,
       SUM(charged_amount)            AS total_revenue,
       ROUND(AVG(charged_amount),2)   AS avg_charge,
       MIN(charged_amount)            AS min_charge,
       MAX(charged_amount)            AS max_charge,
       COALESCE(SUM(charged_amount) FILTER (WHERE charged_amount > 0),0) AS paid_revenue
FROM medicine_dispense;

-- queries on views
SELECT doctor_type, SUM(visits) AS total_visits
FROM v_doctor_workload GROUP BY doctor_type ORDER BY total_visits DESC;

SELECT full_name, card_status FROM v_patient_overview
WHERE card_status <> 'ACTIVE';

SELECT * FROM v_bed_occupancy;

-- Q22 ambulance utilisation: trips and average trip duration per vehicle
-- (LEFT JOIN + aggregate + FILTER + date math)
SELECT a.registration_no, a.status,
       COUNT(d.dispatch_id) AS trips,
       ROUND(AVG(EXTRACT(EPOCH FROM (d.return_datetime - d.dispatch_datetime))/60)
             FILTER (WHERE d.return_datetime IS NOT NULL), 1) AS avg_trip_minutes
FROM ambulance a
LEFT JOIN ambulance_dispatch d ON d.ambulance_id = a.ambulance_id
GROUP BY a.ambulance_id, a.registration_no, a.status
ORDER BY trips DESC;

SELECT * FROM v_ambulance_status;
