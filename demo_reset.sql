-- ─────────────────────────────────────────────────────────────────────────────
--  demo_reset.sql — clear transactional data for a live data-entry demo.
--
--  KEEPS (master / reference data + the means to operate the app):
--    unit, shift, medicine, doctor, diagnostic_test, ambulance, bed,
--    duty_roster, and ALL staff logins (app_user where role <> 'PATIENT').
--
--  CLEARS (everything you will re-enter through the app), resetting IDs to 1:
--    patient, health_card, token, token_request, visit, prescription,
--    prescription_item, medicine_dispense, test_order, ward_admission,
--    ambulance_dispatch, and patient logins (app_user where role = 'PATIENT').
--
--  Uses ordered DELETEs (not TRUNCATE) because the kept app_user table has a FK
--  to patient. Wrapped in a transaction so it is all-or-nothing.
--
--  Run with:   make demo-reset      (recommended — has a confirmation prompt)
--  or:         psql ... -f demo_reset.sql
-- ─────────────────────────────────────────────────────────────────────────────
BEGIN;

-- Delete child rows before parents so every foreign key stays satisfied.
DELETE FROM medicine_dispense;
DELETE FROM prescription_item;
DELETE FROM prescription;
DELETE FROM test_order;
DELETE FROM visit;
DELETE FROM token_request;
DELETE FROM token;
DELETE FROM ward_admission;
DELETE FROM ambulance_dispatch;
DELETE FROM health_card;
DELETE FROM app_user WHERE role = 'PATIENT';   -- patient logins only; staff kept
DELETE FROM patient;

-- Reset SERIAL counters so re-entered rows start at id 1 (insert-friendly).
-- pg_get_serial_sequence resolves the sequence name regardless of how it's named.
SELECT setval(pg_get_serial_sequence('patient','patient_id'), 1, false);
SELECT setval(pg_get_serial_sequence('health_card','card_id'), 1, false);
SELECT setval(pg_get_serial_sequence('token','token_id'), 1, false);
SELECT setval(pg_get_serial_sequence('token_request','request_id'), 1, false);
SELECT setval(pg_get_serial_sequence('visit','visit_id'), 1, false);
SELECT setval(pg_get_serial_sequence('prescription','prescription_id'), 1, false);
SELECT setval(pg_get_serial_sequence('prescription_item','item_id'), 1, false);
SELECT setval(pg_get_serial_sequence('medicine_dispense','dispense_id'), 1, false);
SELECT setval(pg_get_serial_sequence('test_order','order_id'), 1, false);
SELECT setval(pg_get_serial_sequence('ward_admission','admission_id'), 1, false);
SELECT setval(pg_get_serial_sequence('ambulance_dispatch','dispatch_id'), 1, false);

COMMIT;
