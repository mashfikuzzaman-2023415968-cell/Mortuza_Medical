# Mortuza Medical Centre Management System (MMCMS)
# Mortuza Medical Centre Management System (MMCMS)
# Mortuza Medical Centre Management System (MMCMS)
# Mortuza Medical Centre Management System (MMCMS)
# Mortuza Medical Centre Management System (MMCMS)
# Mortuza Medical Centre Management System (MMCMS)
# Mortuza Medical Centre Management System (MMCMS)
# Mortuza Medical Centre Management System (MMCMS)
# Mortuza Medical Centre Management System (MMCMS)
# Mortuza Medical Centre Management System (MMCMS)
### CSE-2201 Database Management System — 2nd Year 2nd Semester Lab Project
**Stack:** PostgreSQL (database) · Node.js + Express (REST API) · React (frontend)

> This file is the single source of truth for the project. It is written so an AI coding
> assistant (VS Code + Claude) can scaffold the whole system from it. Build the database
> first (Part I), then the web app (Part II). Every requirement from the course PDF is
> mapped explicitly in Section 11 ("Requirement Coverage Matrix").

---

## 1. Project Overview

**The system.** The Shaheed Buddhijibi Dr. Mohammad Mortuza Medical Centre (University of Dhaka)
serves students, teachers, staff, and the family members of teachers/staff with free medical
care and free pathology. The centre runs 24/7 with ~30 doctors across shifts and contains an
outpatient department, dental unit, eye unit, homeo unit (6 homeo doctors), physiotherapy,
x-ray/diagnostics, a dispensary, a small OT for minor surgery, two ambulances, and a 30-bed
isolation ward for contagious diseases (chicken pox, mumps, etc.).

The **MMCMS** digitizes the core patient journey:
`Health Card → Token → Doctor Visit → Prescription → Dispensary / Diagnostics → (optional) Ward Admission`,
plus administrative duty-roster management and inventory.

**Key real-world business rules (enforce these — they make the project realistic):**
- A patient cannot get a token without a valid (ACTIVE, non-expired) **health card**.
- A patient cannot get medicine without a prescription linked to a visit.
- **Students** get medicine **free** (`charged_amount = 0`); **teachers/staff** pay **cost price**;
  **family members** are billed like the employee they depend on. Homeo medicine is always free.
- **Isolation ward** admissions are restricted to contagious diseases.
- Specialist/part-time doctors only work specific weekdays (see roster). The roster drives
  which doctor is available in which shift/unit on a given date.
- Dispensing medicine must decrement `medicine.stock_quantity` (do this in the API in a
  transaction).

**Application roles (for Part II auth):** `ADMIN`, `DOCTOR`, `RECEPTIONIST` (issues health
cards + tokens), `PHARMACIST` (dispensary), `LAB_TECH` (diagnostics), `PATIENT` (read-only
self-service: view own prescriptions/reports). Roles map to the `app_user` table (Section 4.17).

---

## 2. Technology & Architecture

```
mmcms/
├── db/
│   ├── 01_schema.sql        # all CREATE TABLE (DDL) — Section 5
│   ├── 02_constraints.sql   # extra CHECK/indexes if separated
│   ├── 03_seed.sql          # realistic sample data (Section 6)
│   ├── 04_views.sql         # views (Section 9)
│   └── 05_queries.sql       # the 18 demo queries (Section 8)
├── server/                  # Node.js + Express
│   ├── src/
│   │   ├── config/db.js     # pg Pool connection
│   │   ├── routes/          # one router file per resource
│   │   ├── controllers/
│   │   ├── middleware/auth.js   # JWT + role guard
│   │   └── app.js
│   ├── .env.example         # PGHOST, PGUSER, PGPASSWORD, PGDATABASE, PGPORT, JWT_SECRET
│   └── package.json
├── client/                  # React (Vite) + axios + react-router
│   ├── src/
│   │   ├── api/             # axios instance + endpoint wrappers
│   │   ├── pages/           # per-role dashboards
│   │   ├── components/
│   │   └── App.jsx
│   └── package.json
└── PROJECT_SPEC.md          # this file
```

**Backend rules for the AI:** use the `pg` library with a connection `Pool`; use **parameterized
queries** (`$1, $2 …`) everywhere — never string-concatenate SQL; wrap multi-step writes
(e.g. dispense → decrement stock) in `BEGIN/COMMIT/ROLLBACK`; return JSON; use JWT in an
`Authorization: Bearer` header; protect routes with a role-checking middleware.

---

## 3. Data Model — Entity List (18 core tables)

| # | Table | Purpose |
|---|-------|---------|
| 1 | `unit` | Medical units/departments (outpatient, dental, eye, homeo, physio, pathology, radiology) |
| 2 | `doctor` | All doctors (general, specialist, eye, dental, homeo, physio) |
| 3 | `patient` | Students, teachers, staff, and dependent family members |
| 4 | `health_card` | One card per patient; gate for all services |
| 5 | `shift` | Morning / Afternoon / Night time windows |
| 6 | `duty_roster` | Which doctor works which shift/unit on which date |
| 7 | `token` | Daily serial token a patient takes for a unit |
| 8 | `visit` | A consultation (vitals, complaint, diagnosis) |
| 9 | `prescription` | Prescription created during a visit |
| 10 | `prescription_item` | Line items: medicine + dosage on a prescription |
| 11 | `medicine` | Dispensary inventory |
| 12 | `medicine_dispense` | Actual handover of medicine + billing |
| 13 | `diagnostic_test` | Catalogue of tests (CBC, X-ray, ECG, USG…) |
| 14 | `test_order` | A test ordered for a patient + its result |
| 15 | `bed` | Isolation/observation beds |
| 16 | `ward_admission` | Admission of a patient to a bed |
| 17 | `ambulance` | The centre's ambulances (two vehicles) |
| 18 | `ambulance_dispatch` | Log of each ambulance trip/emergency call |
| 19 | `token_request` | Online token request a patient submits for a unit/date; reviewed (approved → issues a token, or rejected/cancelled) by a receptionist (Part II feature) |

**Application-layer table (add for Part II auth):** `app_user` (auth/roles, Section 4.17).

**Schema additions for Part II features:** `patient.photo_url` (passport photo, Section 4.3), `patient.hall_name` (DU hall affiliation, Sections 4.3 & 10.2.8), `token.status` now also allows `EXPIRED` (48-hour auto-expiry, Section 4.7), and the `token_request` table above (Section 4.20). **Integrity hardening (Section 10.2.11):** CHECK constraints `chk_role_link` (`app_user`) and `chk_student_has_id` (`patient`), the partial unique index `uq_bed_active_admission` (`ward_admission`), and the `visit_token_patient_match` trigger (`visit`).

---

## 4. Detailed Schema (attributes, types, constraints)

Data-type coverage across the schema (requirement #2): `SERIAL/INT`, `VARCHAR/CHAR/TEXT`,
`NUMERIC(p,s)`, `DATE`, `TIME`, `TIMESTAMP`, `BOOLEAN`. Constraint coverage (requirement #3):
`PRIMARY KEY`, `FOREIGN KEY`, `UNIQUE`, `CHECK`, `NOT NULL`, `DEFAULT`.

### 4.1 `unit`
| Column | Type | Constraints |
|---|---|---|
| unit_id | SERIAL | PK |
| unit_name | VARCHAR(80) | NOT NULL, UNIQUE |
| unit_type | VARCHAR(20) | NOT NULL, CHECK IN (OUTPATIENT, DENTAL, EYE, HOMEO, PHYSIO, PATHOLOGY, RADIOLOGY) |
| floor_location | VARCHAR(30) | |
| contact_ext | VARCHAR(15) | |
| is_active | BOOLEAN | DEFAULT TRUE |

### 4.2 `doctor`
| Column | Type | Constraints |
|---|---|---|
| doctor_id | SERIAL | PK |
| full_name | VARCHAR(100) | NOT NULL |
| gender | CHAR(1) | CHECK (gender IN ('M','F')) |
| bmdc_reg_no | VARCHAR(20) | UNIQUE, NOT NULL |
| designation | VARCHAR(60) | |
| specialization | VARCHAR(60) | (General, ENT, Cardiology, Eye, Dental, Sonologist, Homeo, Physiotherapy) |
| doctor_type | VARCHAR(20) | NOT NULL, CHECK IN (GENERAL, SPECIALIST, EYE, DENTAL, HOMEO, PHYSIO) |
| is_parttime | BOOLEAN | DEFAULT FALSE |
| phone | VARCHAR(15) | |
| email | VARCHAR(100) | UNIQUE |
| unit_id | INT | FK → unit(unit_id) |
| joining_date | DATE | |

### 4.3 `patient`
| Column | Type | Constraints |
|---|---|---|
| patient_id | SERIAL | PK |
| full_name | VARCHAR(100) | NOT NULL |
| date_of_birth | DATE | |
| gender | CHAR(1) | CHECK (gender IN ('M','F')) |
| blood_group | VARCHAR(5) | CHECK (blood_group IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')) |
| phone | VARCHAR(15) | |
| email | VARCHAR(100) | |
| address | TEXT | |
| patient_category | VARCHAR(10) | NOT NULL, CHECK IN (STUDENT, TEACHER, STAFF, FAMILY) |
| university_id | VARCHAR(20) | UNIQUE (NULL for family members) |
| academic_dept | VARCHAR(60) | |
| hall_name | VARCHAR(60) | Attached DU hall (students only); stored separately from `address` (Section 10.2.8) |
| guardian_id | INT | FK → patient(patient_id) — set only when category = FAMILY |
| registration_date | DATE | NOT NULL, DEFAULT CURRENT_DATE |
| photo_url | VARCHAR(255) | Passport photo filename; uploaded by reception, served only through a JWT-guarded endpoint (a patient may fetch only their own) |
| | | CHECK `chk_student_has_id` (patient_category <> 'STUDENT' OR university_id IS NOT NULL) — a student must have a University ID (Section 10.2.11) |

### 4.4 `health_card`
| Column | Type | Constraints |
|---|---|---|
| card_id | SERIAL | PK |
| card_number | VARCHAR(20) | UNIQUE, NOT NULL |
| patient_id | INT | UNIQUE, NOT NULL, FK → patient |
| issue_date | DATE | NOT NULL, DEFAULT CURRENT_DATE |
| expiry_date | DATE | NOT NULL, CHECK (expiry_date > issue_date) |
| photo_submitted | BOOLEAN | NOT NULL, DEFAULT FALSE |
| status | VARCHAR(10) | NOT NULL, DEFAULT 'ACTIVE', CHECK IN (ACTIVE, EXPIRED, SUSPENDED) |

### 4.5 `shift`
| Column | Type | Constraints |
|---|---|---|
| shift_id | SERIAL | PK |
| shift_name | VARCHAR(20) | UNIQUE, NOT NULL (Morning/Afternoon/Night) |
| start_time | TIME | NOT NULL |
| end_time | TIME | NOT NULL |

### 4.6 `duty_roster`
| Column | Type | Constraints |
|---|---|---|
| roster_id | SERIAL | PK |
| doctor_id | INT | NOT NULL, FK → doctor |
| shift_id | INT | NOT NULL, FK → shift |
| unit_id | INT | FK → unit |
| duty_date | DATE | NOT NULL |
| is_oncall | BOOLEAN | NOT NULL, DEFAULT FALSE |
|  | | UNIQUE (doctor_id, duty_date, shift_id) |

### 4.7 `token`
| Column | Type | Constraints |
|---|---|---|
| token_id | SERIAL | PK |
| token_number | INT | NOT NULL, CHECK (token_number > 0) |
| health_card_id | INT | NOT NULL, FK → health_card |
| unit_id | INT | NOT NULL, FK → unit |
| issue_datetime | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP |
| token_date | DATE | NOT NULL, DEFAULT CURRENT_DATE |
| status | VARCHAR(10) | NOT NULL, DEFAULT 'WAITING', CHECK IN (WAITING, SERVED, CANCELLED, EXPIRED) |
|  | | UNIQUE (unit_id, token_date, token_number) |

> *Token lifecycle (Part II):* a `WAITING` token becomes `SERVED` when a doctor records the visit, `CANCELLED` if voided, or `EXPIRED` automatically once it is older than 48 hours. The expiry is applied server-side (a sweep runs before every token read) — see Section 10.2.

> *No `patient_id` here:* the patient is reached through `health_card` (`health_card_id → card.patient_id`). Storing it would create the transitive dependency `health_card_id → patient_id`, breaking BCNF.

### 4.8 `visit`
| Column | Type | Constraints |
|---|---|---|
| visit_id | SERIAL | PK |
| token_id | INT | UNIQUE, FK → token |
| patient_id | INT | NOT NULL, FK → patient |
| doctor_id | INT | NOT NULL, FK → doctor |
| visit_datetime | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP |
| visit_type | VARCHAR(10) | NOT NULL, DEFAULT 'NEW', CHECK IN (NEW, FOLLOWUP, EMERGENCY) |
| chief_complaint | TEXT | |
| diagnosis | TEXT | |
| blood_pressure | VARCHAR(10) | |
| temperature_f | NUMERIC(4,1) | CHECK (temperature_f BETWEEN 90 AND 115) |
| weight_kg | NUMERIC(5,2) | CHECK (weight_kg > 0) |
| pulse | INT | |
| follow_up_date | DATE | |

> *Integrity trigger `visit_token_patient_match` (Part II):* a `BEFORE INSERT/UPDATE`
> trigger ensures that when `token_id` is set, `patient_id` equals the token's patient
> (`token → health_card → patient`) — a cross-table rule no FK can express (Section 10.2.11).

### 4.9 `prescription`
| Column | Type | Constraints |
|---|---|---|
| prescription_id | SERIAL | PK |
| visit_id | INT | UNIQUE, NOT NULL, FK → visit |
| doctor_id | INT | NOT NULL, FK → doctor |
| prescription_date | DATE | NOT NULL, DEFAULT CURRENT_DATE |
| advice | TEXT | |
| next_visit_date | DATE | |

### 4.10 `medicine`
| Column | Type | Constraints |
|---|---|---|
| medicine_id | SERIAL | PK |
| medicine_name | VARCHAR(100) | NOT NULL |
| generic_name | VARCHAR(100) | |
| manufacturer | VARCHAR(80) | |
| dosage_form | VARCHAR(20) | CHECK IN (TABLET, CAPSULE, SYRUP, INJECTION, OINTMENT, DROPS, POWDER) |
| strength | VARCHAR(30) | |
| unit_price | NUMERIC(8,2) | NOT NULL, DEFAULT 0, CHECK (unit_price >= 0) |
| stock_quantity | INT | NOT NULL, DEFAULT 0, CHECK (stock_quantity >= 0) |
| reorder_level | INT | NOT NULL, DEFAULT 50 |
| expiry_date | DATE | |
| is_homeo | BOOLEAN | NOT NULL, DEFAULT FALSE |
|  | | UNIQUE (medicine_name, strength, manufacturer) |

### 4.11 `prescription_item`
| Column | Type | Constraints |
|---|---|---|
| item_id | SERIAL | PK |
| prescription_id | INT | NOT NULL, FK → prescription |
| medicine_id | INT | NOT NULL, FK → medicine |
| dosage | VARCHAR(30) | (e.g. '1+0+1') |
| duration_days | INT | CHECK (duration_days > 0) |
| quantity_prescribed | INT | NOT NULL, CHECK (quantity_prescribed > 0) |
| instruction | VARCHAR(100) | |
|  | | UNIQUE (prescription_id, medicine_id) |

### 4.12 `medicine_dispense`
| Column | Type | Constraints |
|---|---|---|
| dispense_id | SERIAL | PK |
| prescription_item_id | INT | NOT NULL, FK → prescription_item |
| dispensed_quantity | INT | NOT NULL, CHECK (dispensed_quantity > 0) |
| dispense_datetime | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP |
| charged_amount | NUMERIC(8,2) | NOT NULL, DEFAULT 0, CHECK (charged_amount >= 0) |
| dispensed_by | VARCHAR(80) | |

> *No `patient_id` here:* reached via `prescription_item → prescription → visit → patient`. Storing it would create the transitive dependency `prescription_item_id → patient_id`, breaking BCNF.

### 4.13 `diagnostic_test`
| Column | Type | Constraints |
|---|---|---|
| test_id | SERIAL | PK |
| test_name | VARCHAR(80) | NOT NULL, UNIQUE |
| test_category | VARCHAR(15) | NOT NULL, CHECK IN (PATHOLOGY, RADIOLOGY, ECG, ULTRASOUND) |
| sample_type | VARCHAR(30) | (Blood, Urine, Stool, NULL) |
| price | NUMERIC(8,2) | NOT NULL, DEFAULT 0 |
| normal_range | VARCHAR(50) | |
| available_days | VARCHAR(50) | (e.g. 'TUE,WED,THU') |

### 4.14 `test_order`
| Column | Type | Constraints |
|---|---|---|
| order_id | SERIAL | PK |
| visit_id | INT | FK → visit |
| patient_id | INT | NOT NULL, FK → patient |
| test_id | INT | NOT NULL, FK → diagnostic_test |
| ordered_by | INT | FK → doctor |
| order_datetime | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP |
| sample_collected_at | TIMESTAMP | |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'ORDERED', CHECK IN (ORDERED, SAMPLE_COLLECTED, COMPLETED, CANCELLED) |
| result_value | VARCHAR(100) | |
| result_date | DATE | |
| remarks | TEXT | |

> *`patient_id` is retained here on purpose:* `visit_id` is **nullable** (a test can be ordered without a recorded visit), so the patient cannot always be derived from it. `patient_id` is therefore a base attribute, not a transitive dependency — this keeps `test_order` in BCNF (see Section 7).

### 4.15 `bed`
| Column | Type | Constraints |
|---|---|---|
| bed_id | SERIAL | PK |
| bed_number | VARCHAR(10) | UNIQUE, NOT NULL |
| ward_type | VARCHAR(15) | NOT NULL, DEFAULT 'ISOLATION', CHECK IN (ISOLATION, OBSERVATION, GENERAL) |
| disease_category | VARCHAR(40) | (Chicken Pox, Mumps, Measles…) |

> *No `is_occupied` flag:* occupancy is **derived** from `ward_admission` (a bed is occupied iff it has an admission with status `ADMITTED`). See views `v_bed_status` / `v_bed_occupancy`. Storing the flag would duplicate data already in `ward_admission` and could drift out of sync.

### 4.16 `ward_admission`
| Column | Type | Constraints |
|---|---|---|
| admission_id | SERIAL | PK |
| patient_id | INT | NOT NULL, FK → patient |
| bed_id | INT | NOT NULL, FK → bed |
| attending_doctor_id | INT | FK → doctor |
| admit_datetime | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP |
| discharge_datetime | TIMESTAMP | CHECK (discharge_datetime IS NULL OR discharge_datetime > admit_datetime) |
| disease | VARCHAR(60) | |
| status | VARCHAR(12) | NOT NULL, DEFAULT 'ADMITTED', CHECK IN (ADMITTED, DISCHARGED) |

> *Partial unique index `uq_bed_active_admission` (Part II):* `UNIQUE (bed_id) WHERE
> status = 'ADMITTED'` — at most one admitted patient per bed at a time, while
> discharged history is retained (Section 10.2.11).

### 4.17 `app_user` (Part II auth — application layer)
| Column | Type | Constraints |
|---|---|---|
| user_id | SERIAL | PK |
| username | VARCHAR(40) | UNIQUE, NOT NULL |
| password_hash | VARCHAR(200) | NOT NULL (bcrypt) |
| role | VARCHAR(15) | NOT NULL, CHECK IN (ADMIN, DOCTOR, RECEPTIONIST, PHARMACIST, LAB_TECH, PATIENT) |
| doctor_id | INT | FK → doctor (when role = DOCTOR) |
| patient_id | INT | FK → patient (when role = PATIENT) |
| email | VARCHAR(100) | user's email for verification |
| verification_token | VARCHAR(100) | random token sent in verification email (NULL after verified) |
| email_verified | BOOLEAN | NOT NULL, DEFAULT FALSE — must be TRUE before login is allowed |
| is_active | BOOLEAN | DEFAULT TRUE |
| created_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP |
| | | CHECK `chk_role_link`: DOCTOR ⇒ doctor_id only; PATIENT ⇒ patient_id only; staff roles ⇒ neither (Section 10.2.11) |

### 4.18 `ambulance`
| Column | Type | Constraints |
|---|---|---|
| ambulance_id | SERIAL | PK |
| registration_no | VARCHAR(30) | NOT NULL, UNIQUE |
| model | VARCHAR(60) | |
| capacity | INT | CHECK (capacity > 0) |
| driver_name | VARCHAR(80) | |
| driver_phone | VARCHAR(15) | |
| status | VARCHAR(15) | NOT NULL, DEFAULT 'IN_SERVICE', CHECK IN (IN_SERVICE, MAINTENANCE, RETIRED) |

> *`status` is the vehicle's intrinsic fitness only* (in service / under maintenance / retired). Whether it is **out on a call right now** is *derived* from open rows in `ambulance_dispatch` — see view `v_ambulance_status` (`free_to_dispatch` column). This mirrors the `bed`/`ward_admission` decision: no stored flag that could drift.

### 4.19 `ambulance_dispatch`
| Column | Type | Constraints |
|---|---|---|
| dispatch_id | SERIAL | PK |
| ambulance_id | INT | NOT NULL, FK → ambulance |
| patient_id | INT | FK → patient (NULL for non-registered/emergency calls) |
| authorized_by | INT | FK → doctor (the MO who authorised the call) |
| dispatch_datetime | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP |
| return_datetime | TIMESTAMP | (NULL = still out) |
| origin | VARCHAR(80) | |
| destination | VARCHAR(80) | |
| trip_type | VARCHAR(15) | NOT NULL, DEFAULT 'EMERGENCY', CHECK IN (EMERGENCY, TRANSFER, REFERRAL, PICKUP, OTHER) |
| requested_by | VARCHAR(80) | (e.g. hall authority / call slip) |
| status | VARCHAR(12) | NOT NULL, DEFAULT 'DISPATCHED', CHECK IN (DISPATCHED, COMPLETED, CANCELLED) |
| remarks | TEXT | |
|  | | CHECK (return_datetime IS NULL OR return_datetime > dispatch_datetime) |

### 4.20 `token_request` (Part II feature — online token request)
| Column | Type | Constraints |
|---|---|---|
| request_id | SERIAL | PK |
| patient_id | INT | NOT NULL, FK → patient |
| unit_id | INT | NOT NULL, FK → unit |
| preferred_date | DATE | NOT NULL (0–30 days out; enforced at the app layer) |
| reason | TEXT | Patient's symptom/reason (optional) |
| status | VARCHAR(12) | NOT NULL, DEFAULT 'PENDING', CHECK IN (PENDING, APPROVED, REJECTED) |
| reject_reason | TEXT | Set on rejection / auto-rejection / patient cancellation |
| created_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP |
| reviewed_by | INT | FK → app_user(user_id) — the receptionist who processed it |
| reviewed_at | TIMESTAMP | When processed |
| token_id | INT | FK → token(token_id) — set when APPROVED (links to the issued token) |

> *Reviewed_by references `app_user`, so this table is created AFTER `app_user` in the DDL.* Approval is atomic (`UPDATE … WHERE status='PENDING' RETURNING *`) so two receptionists cannot double-issue; a request whose `preferred_date` has passed is auto-rejected instead of issuing a stale token; a patient may cancel only their own `PENDING` request. See Section 10.2.

---

## 5. SQL DDL (`db/01_schema.sql`)

Create in this order so FKs resolve. (This is the exact DDL the report's snapshots come from.)

```sql
CREATE TABLE unit (
  unit_id        SERIAL PRIMARY KEY,
  unit_name      VARCHAR(80) NOT NULL UNIQUE,
  unit_type      VARCHAR(20) NOT NULL
                 CHECK (unit_type IN ('OUTPATIENT','DENTAL','EYE','HOMEO','PHYSIO','PATHOLOGY','RADIOLOGY')),
  floor_location VARCHAR(30),
  contact_ext    VARCHAR(15),
  is_active      BOOLEAN DEFAULT TRUE
);

CREATE TABLE doctor (
  doctor_id      SERIAL PRIMARY KEY,
  full_name      VARCHAR(100) NOT NULL,
  gender         CHAR(1) CHECK (gender IN ('M','F')),
  bmdc_reg_no    VARCHAR(20) NOT NULL UNIQUE,
  designation    VARCHAR(60),
  specialization VARCHAR(60),
  doctor_type    VARCHAR(20) NOT NULL
                 CHECK (doctor_type IN ('GENERAL','SPECIALIST','EYE','DENTAL','HOMEO','PHYSIO')),
  is_parttime    BOOLEAN DEFAULT FALSE,
  phone          VARCHAR(15),
  email          VARCHAR(100) UNIQUE,
  unit_id        INT REFERENCES unit(unit_id),
  joining_date   DATE
);

CREATE TABLE patient (
  patient_id        SERIAL PRIMARY KEY,
  full_name         VARCHAR(100) NOT NULL,
  date_of_birth     DATE,
  gender            CHAR(1) CHECK (gender IN ('M','F')),
  blood_group       VARCHAR(5)
                    CHECK (blood_group IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  phone             VARCHAR(15),
  email             VARCHAR(100),
  address           TEXT,
  patient_category  VARCHAR(10) NOT NULL
                    CHECK (patient_category IN ('STUDENT','TEACHER','STAFF','FAMILY')),
  university_id     VARCHAR(20) UNIQUE,
  academic_dept     VARCHAR(60),
  hall_name         VARCHAR(60),            -- attached DU hall (students); stored separately from address
  guardian_id       INT REFERENCES patient(patient_id),
  registration_date DATE NOT NULL DEFAULT CURRENT_DATE,
  photo_url         VARCHAR(255),           -- passport photo filename (uploaded by reception; served via JWT-guarded endpoint)
  -- A student is identified by their university ID, so it must be present.
  CONSTRAINT chk_student_has_id CHECK (patient_category <> 'STUDENT' OR university_id IS NOT NULL)
);

CREATE TABLE health_card (
  card_id         SERIAL PRIMARY KEY,
  card_number     VARCHAR(20) NOT NULL UNIQUE,
  patient_id      INT NOT NULL UNIQUE REFERENCES patient(patient_id),
  issue_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date     DATE NOT NULL,
  photo_submitted BOOLEAN NOT NULL DEFAULT FALSE,
  status          VARCHAR(10) NOT NULL DEFAULT 'ACTIVE'
                  CHECK (status IN ('ACTIVE','EXPIRED','SUSPENDED')),
  CHECK (expiry_date > issue_date)
);

CREATE TABLE shift (
  shift_id   SERIAL PRIMARY KEY,
  shift_name VARCHAR(20) NOT NULL UNIQUE,
  start_time TIME NOT NULL,
  end_time   TIME NOT NULL
);

CREATE TABLE duty_roster (
  roster_id SERIAL PRIMARY KEY,
  doctor_id INT NOT NULL REFERENCES doctor(doctor_id),
  shift_id  INT NOT NULL REFERENCES shift(shift_id),
  unit_id   INT REFERENCES unit(unit_id),
  duty_date DATE NOT NULL,
  is_oncall BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (doctor_id, duty_date, shift_id)
);

CREATE TABLE token (
  token_id       SERIAL PRIMARY KEY,
  token_number   INT NOT NULL CHECK (token_number > 0),
  health_card_id INT NOT NULL REFERENCES health_card(card_id),
  unit_id        INT NOT NULL REFERENCES unit(unit_id),
  issue_datetime TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  token_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  status         VARCHAR(10) NOT NULL DEFAULT 'WAITING'
                 CHECK (status IN ('WAITING','SERVED','CANCELLED','EXPIRED')),
  UNIQUE (unit_id, token_date, token_number)
);

CREATE TABLE visit (
  visit_id       SERIAL PRIMARY KEY,
  token_id       INT UNIQUE REFERENCES token(token_id),
  patient_id     INT NOT NULL REFERENCES patient(patient_id),
  doctor_id      INT NOT NULL REFERENCES doctor(doctor_id),
  visit_datetime TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  visit_type     VARCHAR(10) NOT NULL DEFAULT 'NEW'
                 CHECK (visit_type IN ('NEW','FOLLOWUP','EMERGENCY')),
  chief_complaint TEXT,
  diagnosis      TEXT,
  blood_pressure VARCHAR(10),
  temperature_f  NUMERIC(4,1) CHECK (temperature_f BETWEEN 90 AND 115),
  weight_kg      NUMERIC(5,2) CHECK (weight_kg > 0),
  pulse          INT,
  follow_up_date DATE
);

-- A visit attached to a token must belong to that token's patient. A foreign key
-- cannot express this cross-table rule, so a BEFORE trigger enforces it.
CREATE OR REPLACE FUNCTION trg_visit_token_patient_match() RETURNS trigger AS $$
DECLARE
  tok_patient INT;
BEGIN
  IF NEW.token_id IS NOT NULL THEN
    SELECT hc.patient_id INTO tok_patient
    FROM token t JOIN health_card hc ON hc.card_id = t.health_card_id
    WHERE t.token_id = NEW.token_id;
    IF tok_patient IS NOT NULL AND tok_patient <> NEW.patient_id THEN
      RAISE EXCEPTION 'Visit patient does not match the token''s patient'
        USING ERRCODE = '23514', CONSTRAINT = 'visit_token_patient_match';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER visit_token_patient_match
  BEFORE INSERT OR UPDATE ON visit
  FOR EACH ROW EXECUTE FUNCTION trg_visit_token_patient_match();

CREATE TABLE prescription (
  prescription_id   SERIAL PRIMARY KEY,
  visit_id          INT NOT NULL UNIQUE REFERENCES visit(visit_id),
  doctor_id         INT NOT NULL REFERENCES doctor(doctor_id),
  prescription_date DATE NOT NULL DEFAULT CURRENT_DATE,
  advice            TEXT,
  next_visit_date   DATE
);

CREATE TABLE medicine (
  medicine_id    SERIAL PRIMARY KEY,
  medicine_name  VARCHAR(100) NOT NULL,
  generic_name   VARCHAR(100),
  manufacturer   VARCHAR(80),
  dosage_form    VARCHAR(20)
                 CHECK (dosage_form IN ('TABLET','CAPSULE','SYRUP','INJECTION','OINTMENT','DROPS','POWDER')),
  strength       VARCHAR(30),
  unit_price     NUMERIC(8,2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  stock_quantity INT NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  reorder_level  INT NOT NULL DEFAULT 50,
  expiry_date    DATE,
  is_homeo       BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (medicine_name, strength, manufacturer)
);

CREATE TABLE prescription_item (
  item_id             SERIAL PRIMARY KEY,
  prescription_id     INT NOT NULL REFERENCES prescription(prescription_id),
  medicine_id         INT NOT NULL REFERENCES medicine(medicine_id),
  dosage              VARCHAR(30),
  duration_days       INT CHECK (duration_days > 0),
  quantity_prescribed INT NOT NULL CHECK (quantity_prescribed > 0),
  instruction         VARCHAR(100),
  UNIQUE (prescription_id, medicine_id)
);

CREATE TABLE medicine_dispense (
  dispense_id          SERIAL PRIMARY KEY,
  prescription_item_id INT NOT NULL REFERENCES prescription_item(item_id),
  dispensed_quantity   INT NOT NULL CHECK (dispensed_quantity > 0),
  dispense_datetime    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  charged_amount       NUMERIC(8,2) NOT NULL DEFAULT 0 CHECK (charged_amount >= 0),
  dispensed_by         VARCHAR(80)
);

CREATE TABLE diagnostic_test (
  test_id        SERIAL PRIMARY KEY,
  test_name      VARCHAR(80) NOT NULL UNIQUE,
  test_category  VARCHAR(15) NOT NULL
                 CHECK (test_category IN ('PATHOLOGY','RADIOLOGY','ECG','ULTRASOUND')),
  sample_type    VARCHAR(30),
  price          NUMERIC(8,2) NOT NULL DEFAULT 0,
  normal_range   VARCHAR(50),
  available_days VARCHAR(50)
);

CREATE TABLE test_order (
  order_id            SERIAL PRIMARY KEY,
  visit_id            INT REFERENCES visit(visit_id),
  patient_id          INT NOT NULL REFERENCES patient(patient_id),
  test_id             INT NOT NULL REFERENCES diagnostic_test(test_id),
  ordered_by          INT REFERENCES doctor(doctor_id),
  order_datetime      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sample_collected_at TIMESTAMP,
  status              VARCHAR(20) NOT NULL DEFAULT 'ORDERED'
                      CHECK (status IN ('ORDERED','SAMPLE_COLLECTED','COMPLETED','CANCELLED')),
  result_value        VARCHAR(100),
  result_date         DATE,
  remarks             TEXT
);

CREATE TABLE bed (
  bed_id           SERIAL PRIMARY KEY,
  bed_number       VARCHAR(10) NOT NULL UNIQUE,
  ward_type        VARCHAR(15) NOT NULL DEFAULT 'ISOLATION'
                   CHECK (ward_type IN ('ISOLATION','OBSERVATION','GENERAL')),
  disease_category VARCHAR(40)
);

CREATE TABLE ward_admission (
  admission_id        SERIAL PRIMARY KEY,
  patient_id          INT NOT NULL REFERENCES patient(patient_id),
  bed_id              INT NOT NULL REFERENCES bed(bed_id),
  attending_doctor_id INT REFERENCES doctor(doctor_id),
  admit_datetime      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  discharge_datetime  TIMESTAMP,
  disease             VARCHAR(60),
  status              VARCHAR(12) NOT NULL DEFAULT 'ADMITTED'
                      CHECK (status IN ('ADMITTED','DISCHARGED')),
  CHECK (discharge_datetime IS NULL OR discharge_datetime > admit_datetime)
);

-- A bed can hold at most one ADMITTED patient at a time (discharged rows are
-- kept for history, so this is a partial unique index rather than a constraint).
CREATE UNIQUE INDEX uq_bed_active_admission
  ON ward_admission (bed_id) WHERE status = 'ADMITTED';

CREATE TABLE ambulance (
  ambulance_id    SERIAL PRIMARY KEY,
  registration_no VARCHAR(30) NOT NULL UNIQUE,
  model           VARCHAR(60),
  capacity        INT CHECK (capacity > 0),
  driver_name     VARCHAR(80),
  driver_phone    VARCHAR(15),
  status          VARCHAR(15) NOT NULL DEFAULT 'IN_SERVICE'
                  CHECK (status IN ('IN_SERVICE','MAINTENANCE','RETIRED'))
);

CREATE TABLE ambulance_dispatch (
  dispatch_id       SERIAL PRIMARY KEY,
  ambulance_id      INT NOT NULL REFERENCES ambulance(ambulance_id),
  patient_id        INT REFERENCES patient(patient_id),
  authorized_by     INT REFERENCES doctor(doctor_id),
  dispatch_datetime TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  return_datetime   TIMESTAMP,
  origin            VARCHAR(80),
  destination       VARCHAR(80),
  trip_type         VARCHAR(15) NOT NULL DEFAULT 'EMERGENCY'
                    CHECK (trip_type IN ('EMERGENCY','TRANSFER','REFERRAL','PICKUP','OTHER')),
  requested_by      VARCHAR(80),
  status            VARCHAR(12) NOT NULL DEFAULT 'DISPATCHED'
                    CHECK (status IN ('DISPATCHED','COMPLETED','CANCELLED')),
  remarks           TEXT,
  CHECK (return_datetime IS NULL OR return_datetime > dispatch_datetime)
);

CREATE TABLE app_user (
  user_id            SERIAL PRIMARY KEY,
  username           VARCHAR(40) NOT NULL UNIQUE,
  password_hash      VARCHAR(200) NOT NULL,
  role               VARCHAR(15) NOT NULL
                     CHECK (role IN ('ADMIN','DOCTOR','RECEPTIONIST','PHARMACIST','LAB_TECH','PATIENT')),
  doctor_id          INT REFERENCES doctor(doctor_id),
  patient_id         INT REFERENCES patient(patient_id),
  email              VARCHAR(100),
  verification_token VARCHAR(100),
  email_verified     BOOLEAN NOT NULL DEFAULT FALSE,
  is_active          BOOLEAN DEFAULT TRUE,
  created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- A login's role must match its linked record: DOCTOR -> doctor_id only,
  -- PATIENT -> patient_id only, and pure-staff roles link to neither.
  CONSTRAINT chk_role_link CHECK (
    (role = 'DOCTOR'  AND doctor_id IS NOT NULL AND patient_id IS NULL) OR
    (role = 'PATIENT' AND patient_id IS NOT NULL AND doctor_id IS NULL) OR
    (role IN ('ADMIN','RECEPTIONIST','PHARMACIST','LAB_TECH') AND doctor_id IS NULL AND patient_id IS NULL)
  )
);

-- Online token request (Part II feature). Created AFTER app_user because
-- reviewed_by references app_user(user_id). A patient submits a request; a
-- receptionist approves it (which issues a token and links token_id) or rejects
-- it. A patient may also cancel a PENDING request (status -> REJECTED, reason
-- 'Cancelled by patient').
CREATE TABLE token_request (
  request_id     SERIAL PRIMARY KEY,
  patient_id     INT NOT NULL REFERENCES patient(patient_id),
  unit_id        INT NOT NULL REFERENCES unit(unit_id),
  preferred_date DATE NOT NULL,
  reason         TEXT,
  status         VARCHAR(12) NOT NULL DEFAULT 'PENDING'
                 CHECK (status IN ('PENDING','APPROVED','REJECTED')),
  reject_reason  TEXT,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_by    INT REFERENCES app_user(user_id),
  reviewed_at    TIMESTAMP,
  token_id       INT REFERENCES token(token_id)   -- set when APPROVED
);
```

---

## 6. Sample Data Plan (`db/03_seed.sql`)

Populate realistic volumes so aggregates and `HAVING` are meaningful:

- **unit:** 7 rows (Outpatient-Male, Outpatient-Female&Child, Dental, Eye, Homeo, Physiotherapy, Pathology, Radiology).
- **shift:** Morning `08:00–13:00`, Afternoon `13:00–18:00`, Night `18:00–08:00`,
  plus (Part II) Friday Morning `08:30–12:30` and Friday Afternoon `15:30–20:30` — 5 rows.
- **doctor:** ~30 rows. Use the real roster names — e.g. female doctors *Ferdousi Purabi Chowdhury,
  Shamima Parvin, Rakhi Pal, Razia Rahman, Mahbuba Akter, Nazia Jabin*; male doctors *Sharif
  Kamaruddin, Md Omar Al Masud, A.M. Sajjad Hossain, Md Arifur Reza Sikder, Safkat Hasan Jami,
  Md Shariful Islam, A S M Ashikuzzaman, Md Marzan Kabir, Md Badruddoza Bayezid, Abhijit Roy,
  Sayeed Al Amin Anhar*; chief *Mohammad Tanvir Ali*; specialists *Sirajul Islam (Cardiology),
  Zakaria (ENT), Sani Biswas (Sonologist), Md Zakir Hossain (Eye), Rathindranath Sarkar (Dental)*;
  physio *Abu Mohammad Musa, Tasnuva Shamarukh Proma*. Give 6 doctors `doctor_type='HOMEO'`.
  Make specialists/physio `is_parttime = TRUE`.
- **patient:** ~40 rows mixing STUDENT/TEACHER/STAFF/FAMILY; family rows point `guardian_id`
  to a teacher/staff row.
- **health_card:** one per patient; make a few `EXPIRED`/`SUSPENDED` and a couple expired-by-date
  so the UPDATE query (Q17) has work to do.
- **duty_roster:** generate a week of rows from the roster pattern (morning/afternoon/night).
- **token / visit / prescription / prescription_item / medicine_dispense:** ~60 tokens → ~50 visits
  → prescriptions with 2–4 items each. Charge students 0, employees cost price.
- **medicine:** ~25 rows (Napa/Paracetamol, Seclo/Omeprazole, Histacin, Amoxicillin, Metronidazole,
  ORS, Vitamin-C, plus a few `is_homeo=TRUE`). Set some below `reorder_level`.
- **diagnostic_test:** CBC, PBF, FBS, RBS, Serum Bilirubin, SGPT, Serum Creatinine, Lipid Profile,
  Urine R/E, Stool R/E, HbA1C, X-ray Chest, ECG, Ultrasonogram (set `available_days='TUE,WED,THU'`).
- **test_order:** ~30 rows across statuses; some COMPLETED with results.
- **bed:** 30 isolation beds; **ward_admission:** ~10 rows, a few currently ADMITTED for chicken pox/mumps.
- **token_request (Part II):** 6 rows covering every status — APPROVED ones linked to an issued
  `token_id`, a REJECTED one with a reason, and PENDING ones awaiting review (`token_request_request_id_seq`
  is reset with `setval` after the explicit-id inserts).
- **patient.photo_url (Part II):** populated for patients whose passport photo has been uploaded
  by reception; uploaded image files live under `server/uploads/patients/` (UUID filenames), not in the DB.
- **patient.hall_name (Part II):** set for STUDENT rows (the attached DU hall); blank for
  TEACHER/STAFF/FAMILY. Backfilled from `address` for students whose address named a hall.

---

## 7. Functional Dependencies & Normalization (report item 8.i)

**Result: all base tables are in BCNF** (hence 3NF, 2NF, 1NF) — the 18 core tables below, plus
the Part II `token_request` (candidate key `request_id`; every attribute depends only on it) and
`app_user`. The test for BCNF is: for every
non-trivial FD `X → Y`, `X` must be a superkey. Below, each table's candidate key(s) and its
non-trivial FDs are listed; in every case the only determinants are candidate keys.

**Candidate keys and non-trivial FDs (per table):**

```
unit              CK {unit_id}, {unit_name}
                  unit_id → (all);  unit_name → (all)
doctor            CK {doctor_id}, {bmdc_reg_no}, {email}
                  doctor_id → (all);  bmdc_reg_no → (all);  email → (all)
patient           CK {patient_id};  {university_id} unique for non-NULL rows
                  patient_id → (all);  university_id → patient_id
health_card       CK {card_id}, {card_number}, {patient_id}
                  card_id → (all);  card_number → (all);  patient_id → (all)
shift             CK {shift_id}, {shift_name}
                  shift_id → (all);  shift_name → (all)
duty_roster       CK {roster_id}, {doctor_id, duty_date, shift_id}
                  roster_id → (all);  (doctor_id,duty_date,shift_id) → unit_id, is_oncall
token             CK {token_id}, {unit_id, token_date, token_number}
                  token_id → health_card_id, unit_id, token_date, token_number, issue_datetime, status
                  (unit_id,token_date,token_number) → (all)
visit             CK {visit_id}        (token_id is UNIQUE but NULLABLE -> not a CK)
                  visit_id → (all)
prescription      CK {prescription_id}, {visit_id}
                  prescription_id → (all);  visit_id → (all)
prescription_item CK {item_id}, {prescription_id, medicine_id}
                  item_id → (all);  (prescription_id,medicine_id) → dosage, duration_days, quantity_prescribed, instruction
medicine          CK {medicine_id}, {medicine_name, strength, manufacturer}
                  medicine_id → (all);  (medicine_name,strength,manufacturer) → (all)
medicine_dispense CK {dispense_id}
                  dispense_id → prescription_item_id, dispensed_quantity, dispense_datetime, charged_amount, dispensed_by
diagnostic_test   CK {test_id}, {test_name}
                  test_id → (all);  test_name → (all)
test_order        CK {order_id}
                  order_id → (all)     (visit_id is NULLABLE; patient_id is a base attribute)
bed               CK {bed_id}, {bed_number}
                  bed_id → (all);  bed_number → (all)
ward_admission    CK {admission_id}
                  admission_id → (all)
ambulance         CK {ambulance_id}, {registration_no}
                  ambulance_id → (all);  registration_no → (all)
ambulance_dispatch CK {dispatch_id}
                  dispatch_id → (all)   (patient_id / authorized_by are NULLABLE base attributes)
```

In every line, each determinant is a candidate key → **BCNF holds for all tables.**

**Why the three "obvious" redundancies were removed (the part that actually mattered).**
Three columns would have introduced FDs whose determinant is *not* a key, breaking 3NF/BCNF.
They were dropped during design:

| Removed column | Offending FD | Fix |
|---|---|---|
| `token.patient_id` | `health_card_id → patient_id` (a card has exactly one patient) | drop it; reach patient via `token ⋈ health_card` |
| `medicine_dispense.patient_id` | `prescription_item_id → patient_id` (item → prescription → visit → patient) | drop it; reach patient via the chain |
| `bed.is_occupied` | duplicated `ward_admission` state (cross-table redundancy) | drop it; derive in view `v_bed_status` |

`test_order.patient_id` is **kept on purpose** and does *not* violate BCNF: its potential
determinant `visit_id` is NULLABLE (orders can exist with no visit), so `visit_id → patient_id`
is not a relation-wide FD and `patient_id` stands as an independent base attribute.

The same discipline was applied to the ambulances: `ambulance.status` stores only the vehicle's
intrinsic fitness (`IN_SERVICE` / `MAINTENANCE` / `RETIRED`); "currently out on a call" is not
stored but derived from open `ambulance_dispatch` rows (view `v_ambulance_status`), exactly as bed
occupancy is derived — no duplicated state to drift.

**Canonical-cover worked example — `health_card` (before normalization split).**
Start from the natural FD set
`F = { card_id → card_number, card_id → patient_id, card_id → expiry_date, card_id → status,
card_number → patient_id, patient_id → expiry_date }`.

1. *Singleton right-hand sides:* already singletons.
2. *Extraneous LHS attributes:* every LHS is a single attribute — none extraneous.
3. *Redundant FDs:* `card_id → patient_id` follows from `card_id → card_number → patient_id`
   (drop it); `card_id → expiry_date` follows from `card_id → patient_id → expiry_date` (drop it).

Canonical cover
`Fc = { card_id → card_number, card_id → status, card_number → patient_id, patient_id → expiry_date }`.
Each determinant (`card_id`, `card_number`, `patient_id`) is a candidate key → **BCNF**. The same
mechanical argument applies to the composite-key tables (`token`, `duty_roster`,
`prescription_item`, `medicine`): the whole composite key determines every other attribute and no
proper subset of it does, so there is no partial dependency, and no non-prime attribute determines
another → BCNF.

> **Design note:** all repeating lookup data (unit, shift, medicine, doctor) lives in its own
> table referenced by FK, never duplicated into `visit`/`token`/`prescription`. Combined with the
> three removals above, that is what keeps the whole schema in BCNF rather than collapsing into an
> update-anomaly-prone "one big table."

**Dependency preservation (and why there is no BCNF/3NF trade-off here).** BCNF guarantees a
lossless-join decomposition but *not*, in general, dependency preservation — that can fail when a
decomposition splits an FD's determinant across two relations. It does **not** fail here: every
relation keeps its candidate key(s) — the surrogate PK *and* the natural key as a `UNIQUE`
(including the composite keys of `token`, `duty_roster`, `medicine`, `prescription_item`) —
**within the same table**. So every non-trivial FD is of the form *candidate-key → attributes* and
is enforced locally by a single PK/UNIQUE; cross-table FDs ride on foreign keys whose determinant
(the parent PK) lives in the parent table. The union of the projected FDs therefore equals the
original set: the schema is simultaneously **lossless-join, BCNF, and dependency-preserving**.

> *Integrity beyond normalization (Part II, Section 10.2.11):* a few invariants are not functional
> dependencies and so are enforced by explicit constraints/trigger rather than by the schema's
> normal form — `chk_role_link`, `chk_student_has_id`, `uq_bed_active_admission`, and the
> `visit_token_patient_match` trigger. Note also that `token_date` was deliberately **not** turned
> into a generated column: it is the appointment date (can be future-dated via an approved token
> request), so it is genuinely independent of `issue_datetime`, not a redundancy.

---

## 8. Queries (`db/05_queries.sql`) — 24 queries covering every 8.g criterion

Each query below gives: **(a)** the question, **(b)** relational algebra, **(c)** SQL.
RA symbols: σ select, π project, ⋈ natural/theta join, ⟕/⟗ left/full outer join, × cross product,
ρ rename, ∪/∩/− set ops, 𝒢 grouping-with-aggregation.

---

**Q1 — Natural join.** *Doctors with the name of the unit they belong to.*
RA: `π doctor.full_name, unit.unit_name ( doctor ⋈ unit )`
```sql
SELECT d.full_name, u.unit_name
FROM doctor d NATURAL JOIN unit u;   -- both share unit_id
```

**Q2 — JOIN … USING.** *Each token with its unit name* (token shares `unit_id` with `unit`).
RA: `π token.token_number, token.token_date, unit.unit_name ( token ⋈ unit )`
```sql
SELECT t.token_number, t.token_date, u.unit_name
FROM token t JOIN unit u USING (unit_id)
ORDER BY t.token_date DESC, u.unit_name;
```

**Q3 — JOIN … ON (theta).** *Visits with doctor and patient names.*
RA: `π p.full_name, d.full_name, v.diagnosis ( σ ... ( visit ⋈_{visit.patient_id=patient.patient_id ∧ visit.doctor_id=doctor.doctor_id} (patient × doctor) ) )`
```sql
SELECT p.full_name AS patient, d.full_name AS doctor, v.diagnosis
FROM visit v
JOIN patient p ON v.patient_id = p.patient_id
JOIN doctor  d ON v.doctor_id  = d.doctor_id;
```

**Q4 — Cross product.** *All possible doctor × shift duty combinations (planning grid).*
RA: `π doctor.full_name, shift.shift_name ( doctor × shift )`
```sql
SELECT d.full_name, s.shift_name
FROM doctor d CROSS JOIN shift s
WHERE d.doctor_type = 'GENERAL';
```

**Q5 — LEFT OUTER JOIN.** *Every patient and their visit count, including patients who never visited.*
RA: `π patient.full_name, count(visit_id) ( patient ⟕ visit )` (with grouping)
```sql
SELECT p.full_name, COUNT(v.visit_id) AS total_visits
FROM patient p LEFT OUTER JOIN visit v ON p.patient_id = v.patient_id
GROUP BY p.patient_id, p.full_name
ORDER BY total_visits DESC;
```

**Q6 — FULL OUTER JOIN.** *Reconcile beds and current admissions (free beds + admissions).*
```sql
SELECT b.bed_number, b.ward_type, a.status, a.disease
FROM bed b FULL OUTER JOIN ward_admission a
  ON b.bed_id = a.bed_id AND a.status = 'ADMITTED';
```

**Q7 — Subquery with > ALL.** *General doctors busier than every homeo doctor.*
RA (informal): doctors whose visit-count exceeds max over homeo doctors.
```sql
SELECT d.full_name, COUNT(v.visit_id) AS visits
FROM doctor d JOIN visit v ON v.doctor_id = d.doctor_id
WHERE d.doctor_type = 'GENERAL'
GROUP BY d.doctor_id, d.full_name
HAVING COUNT(v.visit_id) > ALL (
  SELECT COUNT(v2.visit_id)
  FROM doctor d2 JOIN visit v2 ON v2.doctor_id = d2.doctor_id
  WHERE d2.doctor_type = 'HOMEO'
  GROUP BY d2.doctor_id
);
```

**Q8 — Subquery with ANY.** *Medicines priced above ANY homeo medicine.*
```sql
SELECT medicine_name, unit_price
FROM medicine
WHERE unit_price > ANY (SELECT unit_price FROM medicine WHERE is_homeo = TRUE);
```

**Q8b — Subquery with SOME** (synonym of ANY). *Medicines cheaper than some antibiotic.*
```sql
SELECT medicine_name, unit_price
FROM medicine
WHERE unit_price < SOME (SELECT unit_price FROM medicine WHERE generic_name IN ('Azithromycin','Cefixime'));
```

**Q9 — EXISTS.** *Patients who have at least one diagnostic test ordered.*
RA: `π patient.full_name ( σ ∃ test_order ( patient ) )`
```sql
SELECT p.full_name, p.patient_category
FROM patient p
WHERE EXISTS (SELECT 1 FROM test_order t WHERE t.patient_id = p.patient_id);
```

**Q10 — NOT EXISTS.** *Medicines never prescribed.*
```sql
SELECT m.medicine_name
FROM medicine m
WHERE NOT EXISTS (
  SELECT 1 FROM prescription_item pi WHERE pi.medicine_id = m.medicine_id);
```

**Q11 — UNIQUE-style check (no duplicate token per unit/day).** *Detect units that have NOT issued
duplicate token numbers on a day* (Postgres lacks the SQL `UNIQUE` predicate, so express it with a
correlated `NOT EXISTS` over duplicates — note this in the report).
```sql
SELECT u.unit_name, t.token_date
FROM token t JOIN unit u USING (unit_id)
WHERE NOT EXISTS (
  SELECT 1 FROM token t2
  WHERE t2.unit_id = t.unit_id AND t2.token_date = t.token_date
        AND t2.token_number = t.token_number AND t2.token_id <> t.token_id)
GROUP BY u.unit_name, t.token_date;
```

**Q12 — Scalar subquery in SELECT.** *Each doctor with a scalar count of prescriptions written.*
```sql
SELECT d.full_name,
       (SELECT COUNT(*) FROM prescription pr WHERE pr.doctor_id = d.doctor_id) AS rx_count
FROM doctor d
ORDER BY rx_count DESC;
```

**Q13 — Subquery in FROM (derived table).** *Average number of visits per unit type.*
```sql
SELECT unit_type, AVG(cnt) AS avg_visits
FROM (
  SELECT u.unit_type, t.unit_id, COUNT(v.visit_id) AS cnt
  FROM unit u JOIN token t USING (unit_id)
              LEFT JOIN visit v ON v.token_id = t.token_id
  GROUP BY u.unit_type, t.unit_id
) AS per_unit
GROUP BY unit_type;
```

**Q14 — Subquery in WHERE.** *Patients whose total medicine charge exceeds the overall average charge.*
The patient is reached by joining through the prescription chain (no redundant `patient_id`).
```sql
SELECT p.full_name, SUM(md.charged_amount) AS total_charge
FROM medicine_dispense md
JOIN prescription_item pi ON md.prescription_item_id = pi.item_id
JOIN prescription pr      ON pi.prescription_id = pr.prescription_id
JOIN visit v              ON pr.visit_id = v.visit_id
JOIN patient p            ON v.patient_id = p.patient_id
GROUP BY p.patient_id, p.full_name
HAVING SUM(md.charged_amount) > (SELECT AVG(charged_amount) FROM medicine_dispense);
```

**Q15 — GROUP BY + HAVING + ORDER BY.** *Units that issued more than 2 tokens, busiest first.*
RA: `τ_{cnt desc} ( σ_{cnt>2} ( 𝒢_{unit_id; count→cnt} token ) )`
```sql
SELECT u.unit_name, COUNT(*) AS token_count
FROM token t JOIN unit u USING (unit_id)
GROUP BY u.unit_id, u.unit_name
HAVING COUNT(*) > 2
ORDER BY token_count DESC;
```

**Q16 — WITH clause (CTE).** *Top-3 busiest doctors by visits in the seed month (fixed date so the snapshot is reproducible).*
```sql
WITH monthly_visits AS (
  SELECT doctor_id, COUNT(*) AS visits
  FROM visit
  WHERE visit_datetime >= date_trunc('month', DATE '2026-01-15')
    AND visit_datetime <  date_trunc('month', DATE '2026-01-15') + INTERVAL '1 month'
  GROUP BY doctor_id
)
SELECT d.full_name, mv.visits
FROM monthly_visits mv JOIN doctor d USING (doctor_id)
ORDER BY mv.visits DESC
LIMIT 3;
```

**Q17 — String manipulation + functions.** *Search patients, normalized names, age in years.*
```sql
SELECT INITCAP(full_name)                      AS proper_name,
       UPPER(SUBSTRING(full_name FROM 1 FOR 3)) AS code,
       full_name || ' (' || patient_category || ')' AS label,
       EXTRACT(YEAR FROM AGE(date_of_birth))    AS age_years
FROM patient
WHERE full_name ILIKE '%a%'
ORDER BY age_years DESC NULLS LAST;
```

**Q18 — Set operations (UNION / INTERSECT / EXCEPT).** *Patients who took a test, were admitted, or
only ever consulted.*
```sql
-- everyone who used diagnostics OR was admitted
SELECT patient_id FROM test_order
UNION
SELECT patient_id FROM ward_admission;

-- patients who both had a visit AND took a test
SELECT patient_id FROM visit
INTERSECT
SELECT patient_id FROM test_order;

-- patients with a card but who never took a token (token's patient via health_card)
SELECT patient_id FROM health_card
EXCEPT
SELECT hc.patient_id
FROM token t JOIN health_card hc ON t.health_card_id = hc.card_id;
```

**Q19 — UPDATE (DML).** *Expire health cards past their expiry date.*
```sql
UPDATE health_card
SET status = 'EXPIRED'
WHERE expiry_date < DATE '2026-05-31' AND status = 'ACTIVE';
```

**Q20 — DELETE (DML).** *Purge cancelled tokens older than 30 days.*
```sql
DELETE FROM token
WHERE status = 'CANCELLED'
  AND token_date < DATE '2026-05-31' - INTERVAL '30 days';
```

**Q21 — Aggregate suite.** *Dispensary financial summary (COUNT, SUM, AVG, MIN, MAX, COALESCE).*
```sql
SELECT COUNT(*)              AS dispense_events,
       SUM(charged_amount)   AS total_revenue,
       ROUND(AVG(charged_amount),2) AS avg_charge,
       MIN(charged_amount)   AS min_charge,
       MAX(charged_amount)   AS max_charge,
       COALESCE(SUM(charged_amount) FILTER (WHERE charged_amount > 0),0) AS paid_revenue
FROM medicine_dispense;
```

**Q22 — Ambulance utilisation.** *Trips and average trip duration per vehicle* (LEFT JOIN +
aggregate + `FILTER` + date arithmetic on timestamps).
```sql
SELECT a.registration_no, a.status,
       COUNT(d.dispatch_id) AS trips,
       ROUND(AVG(EXTRACT(EPOCH FROM (d.return_datetime - d.dispatch_datetime))/60)
             FILTER (WHERE d.return_datetime IS NOT NULL), 1) AS avg_trip_minutes
FROM ambulance a
LEFT JOIN ambulance_dispatch d ON d.ambulance_id = a.ambulance_id
GROUP BY a.ambulance_id, a.registration_no, a.status
ORDER BY trips DESC;
```

**Q23 — Online token requests.** *Review outcome per request with reviewer and issued token*
(CASE expression + multi-join + LEFT JOINs across `token_request`, `patient`, `unit`, `token`, `app_user`).
```sql
SELECT tr.request_id, p.full_name AS patient, un.unit_name, tr.preferred_date,
       tr.status,
       CASE tr.status
         WHEN 'APPROVED' THEN 'Token #' || t.token_number
         WHEN 'REJECTED' THEN tr.reject_reason
         ELSE 'Awaiting review'
       END AS outcome,
       au.username AS reviewed_by
FROM token_request tr
JOIN patient p  ON p.patient_id = tr.patient_id
JOIN unit un    ON un.unit_id = tr.unit_id
LEFT JOIN token t    ON t.token_id = tr.token_id
LEFT JOIN app_user au ON au.user_id = tr.reviewed_by
ORDER BY tr.request_id;
```

> That is **24 queries** (incl. Q8b using SOME and Q23 on token_request), comfortably above the required 15, and every sub-item of 8.g
> (i–viii) is covered (see matrix in Section 11).

---

## 9. Views (`db/04_views.sql`) — report item 8.h

```sql
-- V1: patient summary with card status
CREATE VIEW v_patient_overview AS
SELECT p.patient_id, p.full_name, p.patient_category,
       hc.card_number, hc.status AS card_status, hc.expiry_date
FROM patient p LEFT JOIN health_card hc ON p.patient_id = hc.patient_id;

-- V2: doctor workload
CREATE VIEW v_doctor_workload AS
SELECT d.doctor_id, d.full_name, d.doctor_type,
       COUNT(DISTINCT v.visit_id)       AS visits,
       COUNT(DISTINCT pr.prescription_id) AS prescriptions
FROM doctor d
LEFT JOIN visit v ON v.doctor_id = d.doctor_id
LEFT JOIN prescription pr ON pr.doctor_id = d.doctor_id
GROUP BY d.doctor_id, d.full_name, d.doctor_type;

-- V3: daily dispensary report
CREATE VIEW v_daily_dispensary AS
SELECT md.dispense_datetime::date AS dispense_day,
       COUNT(*) AS items_dispensed,
       SUM(md.charged_amount) AS revenue
FROM medicine_dispense md
GROUP BY md.dispense_datetime::date;

-- V5: per-bed live status — occupancy DERIVED from current admissions, not stored
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

-- V6: live ambulance status — "on trip" and "free to dispatch" DERIVED from open dispatches
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
```

**Queries that USE the views (include in report):**
```sql
-- busiest doctor types via V2
SELECT doctor_type, SUM(visits) AS total_visits
FROM v_doctor_workload GROUP BY doctor_type ORDER BY total_visits DESC;

-- patients with expired/suspended cards via V1
SELECT full_name, card_status FROM v_patient_overview
WHERE card_status <> 'ACTIVE';
```

---

## 10. Part II — Web Application

**Auth:** `POST /api/auth/login` → JWT; middleware reads role from token and guards routes.

**REST endpoints (resource → methods):**
| Resource | Endpoints |
|---|---|
| patients | `GET/POST /api/patients`, `GET/PUT /api/patients/:id` |
| health-cards | `POST /api/health-cards`, `PUT /api/health-cards/:id/status` |
| tokens | `POST /api/tokens` (validates active card), `GET /api/tokens?date=` |
| visits | `POST /api/visits`, `GET /api/visits/:id` |
| prescriptions | `POST /api/prescriptions` (with items), `GET /api/prescriptions/:id` |
| dispense | `POST /api/dispense` (transaction: insert + decrement stock + compute charge) |
| medicines | `GET/POST /api/medicines`, `PUT /api/medicines/:id`, `GET /api/medicines/low-stock` |
| tests | `POST /api/test-orders`, `PUT /api/test-orders/:id/result`, `GET /api/test-orders` |
| diagnostic-tests | `GET /api/diagnostic-tests` (catalogue) |
| roster | `GET/POST /api/roster?date=` |
| admissions | `POST /api/admissions`, `PUT /api/admissions/:id/discharge` |
| ambulance | `GET /api/ambulances` (with live status), `POST /api/ambulance-dispatch`, `PUT /api/ambulance-dispatch/:id/return` |
| reports | `GET /api/reports/dispensary`, `/workload`, `/occupancy`, `/ambulance-usage` (read the views) |

**Role → endpoint access matrix (use this to implement the role-guard middleware):**

Each role lists the *exact* endpoints it may call and the HTTP method. If an endpoint is not
listed under a role, that role gets `403 Forbidden`. The `ADMIN` role has full access and is
not repeated per endpoint. The `PATIENT` role is read-only and restricted to *own* records —
the server must enforce `WHERE patient_id = :jwtPatientId`.

```
ROLE: ADMIN
  All endpoints, all methods. Full unrestricted access.

ROLE: RECEPTIONIST
  POST /api/patients                    — register new patient
  GET  /api/patients                    — search / list patients
  PUT  /api/patients/:id                — update patient info
  POST /api/health-cards                — issue health card
  PUT  /api/health-cards/:id/status     — suspend / activate / expire card
  POST /api/tokens                      — issue token (must validate active card first)
  GET  /api/tokens?date=                — view today's token queue
  GET  /api/roster                      — check which doctor is on duty (read-only)
  GET  /api/ambulances                  — view ambulance live status
  POST /api/ambulance-dispatch          — log ambulance call (with call slip info)

ROLE: DOCTOR
  GET  /api/tokens?unit=&date=          — own unit's token queue for today
  POST /api/visits                      — create visit (vitals, complaint, diagnosis)
  GET  /api/visits/:id                  — view visit details
  POST /api/prescriptions               — write prescription (with prescription_items)
  POST /api/test-orders                 — order diagnostic tests for a patient
  GET  /api/test-orders                 — view ordered tests and their results
  POST /api/admissions                  — admit patient to isolation ward
  PUT  /api/admissions/:id/discharge    — discharge patient from ward
  GET  /api/roster                      — view duty roster (read-only)
  POST /api/ambulance-dispatch          — authorize ambulance dispatch

ROLE: PHARMACIST
  GET  /api/prescriptions/:id           — view a prescription (to know what to dispense)
  POST /api/dispense                    — dispense medicine (transaction)
  GET  /api/medicines                   — view full stock list
  POST /api/medicines                   — add new medicine to inventory
  PUT  /api/medicines/:id               — update stock quantity / price
  GET  /api/medicines/low-stock         — low-stock / reorder alerts

ROLE: LAB_TECH
  GET  /api/test-orders?status=ORDERED  — view pending test orders
  PUT  /api/test-orders/:id/result      — enter results and update status
  GET  /api/diagnostic-tests            — view test catalogue (names, categories, normal ranges)

ROLE: PATIENT  (read-only; server enforces own-data-only via JWT patient_id)
  GET  /api/patients/:id                — own profile only
  GET  /api/visits?patient=me           — own visits only
  GET  /api/prescriptions?patient=me    — own prescriptions only
  GET  /api/test-orders?patient=me      — own test results only
  GET  /api/health-cards/me             — own card status
```

**React pages by role:**
- **Receptionist:** register patient, issue health card, issue token.
- **Doctor:** queue of today's tokens for their unit → open visit form (vitals, diagnosis) → write prescription + order tests.
- **Pharmacist:** dispense queue, stock list, low-stock alerts (uses `reorder_level`).
- **Lab Tech:** pending test orders → enter results.
- **Admin:** manage doctors/units/roster, log/track ambulance dispatches (live `free_to_dispatch` status), view all report views (charts).
- **Patient:** view own visits, prescriptions, and test results (read-only).

**Charge logic (server, on dispense):** `charged_amount = (category = 'STUDENT' OR is_homeo) ? 0
: medicine.unit_price * dispensed_quantity`; for `FAMILY`, follow the guardian's category.

### 10.1 Implementation detail (for the AI coding assistant)

Everything below is written so the assistant can generate working code without guessing.

#### 10.1.1 Package dependencies

**Backend (`server/package.json`):**
```json
{
  "dependencies": {
    "express": "^4.18",
    "pg": "^8.11",
    "bcryptjs": "^2.4",
    "jsonwebtoken": "^9.0",
    "cors": "^2.8",
    "dotenv": "^16.3",
    "nodemailer": "^6.9",
    "multer": "^2.2"
  }
}
```
> Part II additions: **`multer`** for passport-photo uploads. The AI Health
> Assistant uses the built-in global `fetch` (Node 18+) to call the Gemini REST
> API — no extra SDK package is required.

**Frontend (`client/package.json` — Vite + React):**
```json
{
  "dependencies": {
    "react": "^18",
    "react-dom": "^18",
    "react-router-dom": "^6",
    "axios": "^1.6",
    "lucide-react": "^0.4",
    "recharts": "^3.8"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4",
    "vite": "^5",
    "tailwindcss": "^3",
    "autoprefixer": "^10",
    "postcss": "^8"
  }
}
```

#### 10.1.2 Environment variables (`server/.env.example`)

```
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=yourpassword
PGDATABASE=mmcms
JWT_SECRET=a-random-secret-key-change-in-production
JWT_EXPIRES_IN=24h
PORT=5000

# Email verification (use Gmail App Password or any SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=MMCMS <noreply@mmcms.du.ac.bd>
CLIENT_URL=http://localhost:5173

# AI Health Assistant (Part II) — get a key at https://aistudio.google.com/apikey
# Server-side only; never exposed to the frontend. If unset, the assistant
# degrades gracefully ("temporarily unavailable") instead of crashing.
GEMINI_API_KEY=your-gemini-api-key
```

#### 10.1.3 Authentication flow (step-by-step, with email verification)

**A. Email utility (`server/src/utils/email.js`):**
Create a reusable email sender using nodemailer:
```js
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
});

async function sendVerificationEmail(email, token) {
  const verifyUrl = `${process.env.CLIENT_URL}/verify-email?token=${token}`;
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: 'MMCMS — Verify your email',
    html: `<h2>Welcome to MMCMS</h2>
           <p>Click the link below to verify your email:</p>
           <a href="${verifyUrl}">${verifyUrl}</a>
           <p>This link expires in 24 hours.</p>`
  });
}
```

**B. User registration / account creation (server, `POST /api/auth/register` or admin creates):**
1. Client sends `{ username, password, email, role }` (and optionally `doctor_id` or `patient_id`).
2. Server validates: username not taken, email not empty.
3. Hash password: `bcryptjs.hash(password, 10)`.
4. Generate verification token: `const crypto = require('crypto'); const token = crypto.randomBytes(32).toString('hex');`
5. INSERT into `app_user` with `email_verified = FALSE`, `verification_token = token`.
6. Call `sendVerificationEmail(email, token)`.
7. Return `201 { success: true, message: "Account created. Check your email to verify." }`.

> **Role-specific onboarding (Part II, Section 10.2.9):** DOCTOR self-applications create the
> `doctor` record + linked login in one transaction (admin assigns the unit at approval); PATIENT
> self-registration looks the patient up by University ID / health-card number and sends the
> verification link to the **email on file** (never a typed one); the admin Users form links logins
> via **unlinked-record dropdowns**. The `JWT_SECRET`/`JWT_EXPIRES_IN` fail-fast guard is in
> Section 10.2.10, and `chk_role_link` keeps every login's role consistent with its link
> (Section 10.2.11).

**C. Email verification endpoint (`GET /api/auth/verify-email?token=...`):**
1. Server queries: `SELECT user_id FROM app_user WHERE verification_token = $1 AND email_verified = FALSE`.
2. If no row → `400 { error: "Invalid or expired verification link" }`.
3. UPDATE: `SET email_verified = TRUE, verification_token = NULL WHERE user_id = $id`.
4. Return `200 { success: true, message: "Email verified. You can now log in." }`.
5. Frontend `VerifyEmailPage` calls this on mount (reads token from URL query param), shows
   success/error message with a link to `/login`.

**D. Login (server, `POST /api/auth/login`):**
1. Client sends `{ username, password }`.
2. Server queries `SELECT * FROM app_user WHERE username = $1 AND is_active = TRUE`.
3. If no row → `401 { error: "Invalid credentials" }`.
4. Compare `bcryptjs.compare(password, row.password_hash)`.
5. If mismatch → `401 { error: "Invalid credentials" }`.
6. **Check email verification:** if `email_verified = FALSE` → `403 { error: "Please verify your email before logging in" }`.
7. Sign a JWT: `jwt.sign({ user_id, role, doctor_id, patient_id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })`.
8. Return `200 { token, user: { user_id, username, role } }`.

**E. Resend verification (`POST /api/auth/resend-verification`):**
1. Client sends `{ email }`.
2. Server queries: `SELECT user_id, email_verified FROM app_user WHERE email = $1`.
3. If no row or already verified → `400 { error: "Invalid request" }` (don't reveal whether email exists).
4. Generate a new token, update `verification_token` in the database.
5. Call `sendVerificationEmail(email, newToken)`.
6. Return `200 { success: true, message: "Verification email resent" }`.

**F. Client-side (React):**
1. On successful login, store `token` in `localStorage.setItem('token', token)`.
2. Create an axios instance (`client/src/api/axios.js`) with a request interceptor:
   ```js
   api.interceptors.request.use(config => {
     const token = localStorage.getItem('token');
     if (token) config.headers.Authorization = `Bearer ${token}`;
     return config;
   });
   ```
3. On `401` response (interceptor), clear token and redirect to `/login`.
4. On `403` with "verify your email" message, show the verification reminder with a
   "Resend verification email" button.
5. In `App.jsx`, read the token, decode the role (without verifying — server already verified),
   and render the role's routes. Unauthenticated users see only `/login` and `/verify-email`.

**G. Frontend routes for auth:**
```
/login              → LoginPage (username + password + submit)
/verify-email       → VerifyEmailPage (reads ?token= from URL, calls verify endpoint on mount)
```
The LoginPage shows an error message if login returns 403 (unverified email), with a
"Resend verification email" link/button that calls the resend endpoint.

**H. Role-guard middleware (server, `middleware/auth.js`):**
```js
// verifyToken — attach user to req
// authorize(...roles) — check req.user.role is in the allowed list
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role) && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}
```
Use on routes: `router.post('/tokens', verifyToken, authorize('RECEPTIONIST'), tokenController.create);`

ADMIN always passes (the check `req.user.role !== 'ADMIN'`). PATIENT routes additionally
enforce `req.user.patient_id === req.params.id` or add `WHERE patient_id = $jwt_patient_id`
to every query.

#### 10.1.4 Standard response format

All API responses follow this shape:

```
Success: 200/201 { success: true, data: { ... } }
List:    200     { success: true, data: [ ... ], count: N }
Error:   4xx/5xx { success: false, error: "Human-readable message" }
```

HTTP status codes: `200` OK, `201` Created, `400` Bad Request (validation), `401` Unauthorized,
`403` Forbidden (wrong role), `404` Not Found, `409` Conflict (duplicate), `500` Internal Error.

#### 10.1.5 Critical business-logic sequences

These are the three non-trivial endpoints. Implement them exactly as described — they contain
the business rules that make the project realistic, not just CRUD.

**A. Token issuance (`POST /api/tokens`)**

```
Input: { patient_id, unit_id }
Steps:
  1. Look up the patient's health card:
     SELECT card_id, status, expiry_date FROM health_card WHERE patient_id = $1
  2. Validate:
     - If no card → 400 "Patient has no health card"
     - If status ≠ 'ACTIVE' → 400 "Health card is not active"
     - If expiry_date < CURRENT_DATE → 400 "Health card has expired"
  3. Compute next token number for (unit, today):
     SELECT COALESCE(MAX(token_number), 0) + 1 FROM token
     WHERE unit_id = $unit_id AND token_date = CURRENT_DATE
  4. INSERT INTO token (token_number, health_card_id, unit_id) VALUES ($next, $card_id, $unit_id)
     RETURNING *
  5. Return 201 with the new token (include patient name for display).
```

**B. Dispense transaction (`POST /api/dispense`)**

This is the hardest endpoint. It must run inside a database transaction.

```
Input: { prescription_id, items: [{ prescription_item_id, dispensed_quantity }] }
Steps:
  1. BEGIN transaction.
  2. Resolve the patient via the join chain (no redundant patient_id):
     SELECT p.patient_id, p.patient_category, p.guardian_id
     FROM prescription pr
     JOIN visit v ON pr.visit_id = v.visit_id
     JOIN patient p ON v.patient_id = p.patient_id
     WHERE pr.prescription_id = $1
  3. Determine the billing category:
     - If patient_category = 'FAMILY' → look up guardian:
       SELECT patient_category FROM patient WHERE patient_id = $guardian_id
       Use the guardian's category for charging.
     - effective_category = resolved category (STUDENT, TEACHER, or STAFF).
  4. For each item in items[]:
     a. Look up the medicine:
        SELECT m.unit_price, m.stock_quantity, m.is_homeo
        FROM prescription_item pi JOIN medicine m ON pi.medicine_id = m.medicine_id
        WHERE pi.item_id = $item_id
     b. Check stock: if stock_quantity < dispensed_quantity → ROLLBACK, 400 "Insufficient stock for [medicine_name]"
     c. Compute charge:
        if effective_category = 'STUDENT' OR is_homeo → charged_amount = 0
        else → charged_amount = unit_price × dispensed_quantity
     d. INSERT INTO medicine_dispense (prescription_item_id, dispensed_quantity, charged_amount, dispensed_by)
     e. UPDATE medicine SET stock_quantity = stock_quantity - $qty WHERE medicine_id = $mid
  5. COMMIT.
  6. Return 201 with all dispense records + total charge.
  On any error → ROLLBACK and return 400/500.
```

**C. Patient admission (`POST /api/admissions`)**

```
Input: { patient_id, disease }
Steps:
  1. Validate the disease is contagious (optional: CHECK against a list or free text).
  2. Find a free isolation bed:
     SELECT bed_id FROM bed b
     WHERE b.ward_type = 'ISOLATION'
       AND NOT EXISTS (SELECT 1 FROM ward_admission a WHERE a.bed_id = b.bed_id AND a.status = 'ADMITTED')
     ORDER BY b.bed_id LIMIT 1
  3. If no free bed → 400 "No isolation bed available"
  4. INSERT INTO ward_admission (patient_id, bed_id, attending_doctor_id, disease)
     VALUES ($patient_id, $bed_id, $jwt_doctor_id, $disease) RETURNING *
  5. Return 201 with admission + bed info.
```

#### 10.1.6 Frontend setup

**Styling:** use **Tailwind CSS** with the Vite plugin. Standard config, no custom theme needed.
Use simple utility classes. Do not install a component library (MUI, Chakra, etc.) — Tailwind
alone keeps the bundle small and the code readable for the AI.

**Auth-aware routing (`App.jsx`):**
```
If no token → show <LoginPage /> only.
If token → decode role → render <DashboardLayout> with role-specific <Routes>:
  role === 'ADMIN'        → admin routes
  role === 'RECEPTIONIST' → receptionist routes
  role === 'DOCTOR'       → doctor routes
  role === 'PHARMACIST'   → pharmacist routes
  role === 'LAB_TECH'     → lab tech routes
  role === 'PATIENT'      → patient routes
```

**Frontend route table:**

```
Public:
  /login                          → LoginPage

ADMIN:
  /admin                          → AdminDashboard (summary cards: total patients, visits today, revenue today, bed occupancy, ambulance status)
  /admin/doctors                  → DoctorList + DoctorForm (CRUD)
  /admin/units                    → UnitList
  /admin/roster                   → RosterCalendar (view/add duty assignments)
  /admin/ambulances               → AmbulanceStatus + DispatchLog
  /admin/reports                  → ReportsDashboard (dispensary revenue chart, doctor workload, bed occupancy, ambulance usage)

RECEPTIONIST:
  /reception                      → ReceptionDashboard (tokens issued today, pending queue count)
  /reception/patients             → PatientList + search + RegisterPatientForm
  /reception/patients/:id         → PatientDetail + EditPatientForm
  /reception/health-cards         → IssueHealthCardForm
  /reception/tokens               → TokenQueue + IssueTokenForm
  /reception/ambulance            → AmbulanceStatus + DispatchForm

DOCTOR:
  /doctor                         → DoctorDashboard (today's queue count, patients seen)
  /doctor/queue                   → TokenQueue (own unit, today, WAITING tokens)
  /doctor/visits/new/:tokenId     → CreateVisitForm
  /doctor/visits/emergency        → CreateVisitForm (no token, visit_type=EMERGENCY)
  /doctor/visits/:id              → VisitDetail
  /doctor/prescriptions/new/:visitId → WritePrescriptionForm
  /doctor/test-orders             → TestOrderList (own ordered tests + results)
  /doctor/admissions/new          → AdmitPatientForm

PHARMACIST:
  /pharmacy                       → PharmacyDashboard (pending dispenses count, low-stock alerts count)
  /pharmacy/dispense              → DispenseQueue (undispensed prescriptions)
  /pharmacy/dispense/:prescriptionId → DispenseForm
  /pharmacy/medicines             → MedicineList + AddMedicineForm + EditStock
  /pharmacy/low-stock             → LowStockReport

LAB_TECH:
  /lab                            → LabDashboard (pending tests count)
  /lab/pending                    → PendingTestOrders
  /lab/test-orders/:id            → EnterResultsForm

PATIENT:
  /patient                        → PatientDashboard (next follow-up, card status)
  /patient/visits                 → OwnVisitHistory
  /patient/prescriptions          → OwnPrescriptions
  /patient/test-results           → OwnTestResults
  /patient/health-card            → OwnCardStatus
```

**Form fields per page (editable fields only; auto-generated fields like IDs, timestamps, defaults are handled by the server):**

**RegisterPatientForm (Receptionist):**
- `full_name` — text input, required
- `date_of_birth` — date picker
- `gender` — select: M / F, required
- `blood_group` — select: A+ / A- / B+ / B- / AB+ / AB- / O+ / O-
- `phone` — text input
- `email` — email input
- `address` — textarea
- `patient_category` — select: STUDENT / TEACHER / STAFF / FAMILY, required
- `university_id` — text input, required when category is STUDENT/TEACHER/STAFF; hidden when FAMILY
- `academic_dept` — text input
- `guardian_id` — searchable dropdown of existing TEACHER/STAFF patients; visible and required only when category = FAMILY

**IssueHealthCardForm (Receptionist):**
- `patient_id` — searchable dropdown (show only patients who do NOT already have a card)
- `expiry_date` — date picker, required (suggest default: 2 years from today)
- `photo_submitted` — checkbox

**IssueTokenForm (Receptionist):**
- `patient_id` — searchable dropdown (show patient name; server validates active card)
- `unit_id` — select from active units

**CreateVisitForm (Doctor):**
- For non-emergency: select a WAITING token from the doctor's unit queue (dropdown shows token# + patient name). `patient_id` and `token_id` are resolved from the selection.
- For emergency: `patient_id` searchable dropdown (token_id sent as null).
- `visit_type` — select: NEW / FOLLOWUP / EMERGENCY (auto-set to EMERGENCY if no token)
- `chief_complaint` — textarea, required
- `blood_pressure` — text input (e.g. "120/80")
- `temperature_f` — number input (range 90–115)
- `weight_kg` — number input
- `pulse` — number input
- `diagnosis` — textarea
- `follow_up_date` — date picker, optional

**WritePrescriptionForm (Doctor):**
- Linked to a visit via route param (visit_id auto-set, not editable).
- `advice` — textarea
- `next_visit_date` — date picker, optional
- **Prescription items** — repeatable row group with an "Add item" button:
  - `medicine_id` — searchable dropdown from the medicine table (show name + strength)
  - `dosage` — text input (e.g. "1+0+1")
  - `duration_days` — number input
  - `quantity_prescribed` — number input
  - `instruction` — text input (e.g. "After meal")
  Each row has a remove button. At least 1 item required.

**DispenseForm (Pharmacist):**
- Shows the prescription details (patient name, doctor, items) read-only at the top.
- For each prescription item:
  - Medicine name + prescribed qty (read-only display)
  - `dispensed_quantity` — number input, pre-filled with prescribed qty, editable
  - Computed `charged_amount` shown beside each row (server computes on submit)
- `dispensed_by` — auto-filled from JWT username, editable
- Submit triggers the dispense transaction (Section 10.1.5 B).

**EnterResultsForm (Lab Tech):**
- Shows test order details (patient, test name, ordered by, date) read-only.
- `sample_collected_at` — datetime picker (if not already set)
- `status` — select: SAMPLE_COLLECTED / COMPLETED
- `result_value` — text input (when status = COMPLETED)
- `result_date` — date picker (auto today when COMPLETED)
- `remarks` — textarea

**AdmitPatientForm (Doctor):**
- `patient_id` — searchable dropdown
- `disease` — text input, required (e.g. "Chicken Pox", "Mumps")
- Bed is auto-assigned by the server (first free isolation bed). Show the assigned bed number in the response.

**AmbulanceDispatchForm (Receptionist / Doctor / Admin):**
- `ambulance_id` — select from ambulances; show registration_no + status; warn if currently on trip
- `patient_id` — searchable dropdown, optional
- `authorized_by` — auto-set from JWT if role=DOCTOR; otherwise select a doctor from dropdown
- `origin` — text input, default "Medical Centre"
- `destination` — text input, required
- `trip_type` — select: EMERGENCY / TRANSFER / REFERRAL / PICKUP / OTHER
- `requested_by` — text input (e.g. "Hall authority (call slip)")
- `remarks` — textarea

---

## 10.2 Part II — Feature Additions (built after the original spec)

These features extend the Part II web application. They add **one new table**
(`token_request`), **one new column** (`patient.photo_url`), and **one new token
status** (`EXPIRED`) — all documented in Sections 3–6 above — plus several new
backend endpoints and frontend pages/components. No existing feature was removed.

### 10.2.1 Patient passport photo
- **Schema:** `patient.photo_url` stores a UUID image filename; files live under
  `server/uploads/patients/`, never in the DB.
- **Backend (`routes/patients.js`):** `POST /api/patients/:id/photo` (RECEPTIONIST/ADMIN)
  uploads/replaces a photo via **multer** — MIME-validated (`jpeg/jpg/png`), 2 MB
  cap, UUID filename (`crypto.randomUUID()`), old file deleted on replace.
  `GET /api/patients/:id/photo` is **JWT-guarded** (no `express.static`): a PATIENT
  may fetch only their own photo (403 otherwise); `path.basename()` + `fs.existsSync`
  guard against traversal; `Cache-Control: private`.
- **Frontend:** reception registration/edit form has a photo picker with preview;
  the patient dashboard shows the photo as the profile avatar; the health-card page
  shows a click-to-zoom overlay (Escape/backdrop to close). Protected images are
  fetched as blobs (`responseType:'blob'` → `URL.createObjectURL`).

### 10.2.2 Online token request + printable token card
- **Schema:** `token_request` (Section 4.20).
- **Backend (`routes/token-requests.js`, mounted at `/api/token-requests`):**
  - `POST /` (PATIENT) — submit a request; validates active/non-expired health
    card, unit active, date 0–30 days out, no duplicate PENDING, no existing token
    for that unit/date.
  - `GET /my` (PATIENT) — own requests (joins the issued token + its live status).
  - `GET /pending`, `GET /processed` (RECEPTIONIST) — review queues; `/pending`
    also returns `rostered_doctors` (a `duty_roster` count for the unit+date) so the
    UI can warn when **no doctor is rostered** (informational; does not block).
  - `PUT /:id/approve` (RECEPTIONIST) — **atomic** issue: re-validates the card,
    auto-rejects if the card is invalid or the **preferred date has passed**
    (compared via DB `CURRENT_DATE`), otherwise inserts the token and links it with
    a single `UPDATE … WHERE status='PENDING' RETURNING *` (concurrency-safe — two
    receptionists cannot double-issue).
  - `PUT /:id/reject` (RECEPTIONIST) — reject with a required reason.
  - `PUT /:id/cancel` (PATIENT) — cancel **own** `PENDING` request (403 if not the
    owner, 400 if not pending) → status `REJECTED`, reason `Cancelled by patient`.
- **Printable card** — `GET /api/tokens/:id/details` (RECEPTIONIST/DOCTOR/PATIENT;
  a patient may view only their own) feeds `TokenCardModal`, a shared print-ready,
  zoomable card with `window.print()` and an `EXPIRED`/`CANCELLED` watermark.
- **Frontend:** patient "Request a Token" page (form + unified *My Tokens* list);
  receptionist "Token Requests" page (approve/reject with the no-doctor warning,
  collapsible processed history); the Token Queue auto-opens the printable card
  after issuing.

### 10.2.3 Token lifecycle & server-side expiry
- A `WAITING` token → `SERVED` (doctor records the visit), `CANCELLED` (voided), or
  `EXPIRED` automatically once older than 48 hours.
- **`utils/tokenExpiry.js → expireStaleTokens(pool)`** runs
  `UPDATE token SET status='EXPIRED' WHERE status='WAITING' AND issue_datetime < NOW() - INTERVAL '48 hours'`
  **before every token read** (`GET /api/tokens`, `/api/tokens/mine`,
  `/api/tokens/:id/details`, `/api/token-requests/my`).
- **Patient "My Tokens"** unifies directly-issued and online tokens with source
  labels (*Online – Pending / Online – Accepted / Directly Issued / Online –
  Rejected*); active = `WAITING` within 48 h, everything else (served/cancelled/
  expired/rejected) drops to a collapsible *Past* section.
- **Receptionist Token Queue** gains a Today / All-history toggle (`GET /api/tokens?scope=all`)
  and an Active/Past split; the default (today-only) behaviour is unchanged for the
  doctor queue and dashboards.

### 10.2.4 Patient Health Analytics (`routes/health-analytics.js`, PATIENT-only)
Four computed read-only views (charts via **recharts**):
- `GET /active-medications` — course end-date & days-remaining via date arithmetic,
  grouped active / ending-soon / completed.
- `GET /follow-ups` — a self-join detecting **attended vs missed** follow-ups
  (±3-day window, subsequent visits only), grouped missed/today/upcoming/attended.
- `GET /vitals` — `LAG()` window functions for per-visit BP/temp/weight/pulse deltas.
- `GET /test-insights` — `LAG()`/`COUNT()` partitioned by test for per-test trends,
  with normal-range parsing on the frontend.

### 10.2.5 Pharmacist Dispense History (`routes/dispense.js`, ADMIN + PHARMACIST)
- `GET /api/dispense/history` — fully **parameterized** search (patient name /
  medicine name / exact dispense_id), date-range, payment (free/paid), `medicine_id`
  and `dispensed_by` filters, with pagination + total count. LEFT joins so an
  orphaned dispense still surfaces ("Unknown patient") instead of vanishing.
- `GET /api/dispense/history/summary` — `COUNT/SUM/FILTER` overview stats for a date
  range (defaults to today); distinct prescriptions & patients; avg excludes free.
- `GET /api/dispense/history/:id` — one dispense + all items in its prescription
  (per-item dispensed/charged totals) + guardian resolution for FAMILY billing.
- **Frontend:** searchable/filterable/paginated table with an expandable detail
  panel (prescription context, billing breakdown, "records are permanent" note).

### 10.2.6 AI Health Assistant chatbot (`routes/chat.js`, PATIENT-only)
- `POST /api/chat` (`{ message, history }`) fetches the patient's own records
  directly from the DB (profile, health card, last 10 visits, active/completed
  meds, tests, upcoming + missed follow-ups), injects them into a comprehensive
  system prompt, and calls the **Gemini API** (`gemini-2.5-flash`) server-side.
- **Security:** `patient_id` comes from the JWT only; an explicit role check returns
  **403** for every non-PATIENT (including ADMIN); the API key is server-side only.
- **Resilience:** missing key → friendly 503; Gemini 503/429 → retried (3 attempts,
  backoff) then a friendly message; safety block → "please rephrase"; empty
  candidate → "couldn't generate a response"; DB-fetch failure → still answers
  general health questions with a "data unavailable" note.
- **Frontend (`components/ChatWidget.jsx`):** a floating bottom-right widget
  rendered by `DashboardLayout` **for the PATIENT role only**. Conversation lives in
  React state (no storage — lost on refresh, preserved across page navigation);
  hardcoded welcome message (not sent to the API); Enter-to-send, typing dots,
  lightweight bold/list/line-break formatting; English & Bangla.

### 10.2.7 Duty roster upgrade (Friday shifts, live availability, bulk entry, gender)
No schema change beyond **two new `shift` rows** — `Friday Morning` (08:30–12:30)
and `Friday Afternoon` (15:30–20:30); the `shift` table structure is unchanged.

- **Friday shifts:** the admin roster form loads shifts from the DB via a new
  `GET /api/roster/shifts`, so the Friday shifts appear automatically. On a Friday
  it shows an info note (Friday hours) and, if a *regular* Morning/Afternoon shift
  is chosen for a Friday, a non-blocking warning to consider the Friday shifts.
  Shift times are always rendered from the `shift` table, never hardcoded.
- **`GET /api/doctors/available-now`** (ADMIN/RECEPTIONIST/DOCTOR/PATIENT): doctors
  on shift *right now* (UNION on-call-today), computed against the server clock
  with overnight-shift wrap handled (`LOCALTIME` vs `start_time`/`end_time`; note
  `CURRENT_TIME` is `timetz` and cannot be used with `to_char`). A doctor who is
  both on-shift and on-call is de-duplicated (keeps ON_SHIFT); **phone numbers are
  stripped for the PATIENT role**. Returns `meta` (date, time, day, current shift,
  on-shift/on-call counts). Empty result (e.g. 3 AM) is a normal empty list, not an error.
- **Shared `DoctorsAvailableNow` component** (`compact` + full modes): a green
  pulsing "live" dot, 60-second auto-refresh (interval cleared on unmount; keeps
  last-known data with a warning if a refresh fails), client-side **gender filter**
  (All/Male/Female), per-doctor "ends in Xh Ym" countdown, units-with-no-doctor
  notes, and on-call badges. Mounted on the receptionist dashboard (compact),
  the receptionist + patient doctor pages (full), and the admin dashboard (compact).
- **`POST /api/roster/bulk`** (ADMIN): create one entry per selected weekday across
  a date range — validated (doctor/shift/unit exist, end ≥ start, start today-or-
  future via DB `CURRENT_DATE`, ≤ 90 days, ≥ 1 weekday) — using
  `INSERT … ON CONFLICT (doctor_id, duty_date, shift_id) DO NOTHING`, returning
  `{ created, skipped, total_days }`. A "Bulk Add" form on the admin roster page
  (7 weekday checkboxes, Select/Clear all, Friday warning) sits alongside the
  unchanged single-entry create/edit/delete.
- **Gender grouping:** pill filters (All/Male/Female) on the admin roster table,
  the availability component, and the doctor directory (`DoctorsReadOnly`). The
  doctors-list endpoint now also returns the non-sensitive `gender` field.

### 10.2.8 Patient hall name (DU hall affiliation)
- **Schema:** new column **`patient.hall_name VARCHAR(60)`** (Section 4.3) — the DU
  hall a student is attached to, stored **separately from `address`**. A student
  living in hall has both a hall and (optionally) a home address; a student living
  off-campus still has an attached hall. Blank for TEACHER/STAFF/FAMILY.
- **BCNF:** `hall_name` depends only on `patient_id` (the PK), so it is a plain base
  attribute and the table stays in BCNF — no new functional dependency is introduced.
- **Backend (`routes/patients.js`):** `POST`/`PUT` accept `hall_name` but persist it
  **only when `patient_category = 'STUDENT'`** (forced to `NULL` otherwise); the
  list/detail SELECTs return it.
- **Frontend:** the reception register/edit form shows a "Hall name" field for
  students; the patient profile/health-card views display it.

### 10.2.9 Account onboarding & patient identity binding
Three onboarding paths, all converging on the `app_user` ⇄ `doctor`/`patient` links.

- **Doctor self-application (`POST /api/auth/register`, `role=DOCTOR`):** creates the
  clinical `doctor` record **and** its linked `app_user` in **one transaction**
  (`unit_id` left NULL, `email_verified=FALSE`, `is_active=FALSE`). The applicant
  supplies professional details (full name, BMDC reg no, doctor type, specialization,
  designation, gender, phone, part-time); uniqueness of username/email/BMDC is
  pre-checked and the `23505` race is caught. After email verification an admin
  reviews the application, **assigns the unit at approval** (`PUT /api/users/:id/approve`
  accepts an optional `unit_id` → updates `doctor.unit_id` then activates), and a
  rejection (`PUT /:id/reject`) deletes the orphaned `doctor` record.
- **Admin-driven account creation (`POST /api/users`):** the admin Users form links a
  login to an existing record through a **dropdown, never a raw ID lookup** —
  `GET /api/doctors?unlinked=true` and `GET /api/patients?unlinked=true`
  (`NOT EXISTS` an `app_user` already linked) populate "Link to doctor / patient"
  pickers. The link is **bound strictly to the role** server-side (a DOCTOR carries
  only `doctor_id`, a PATIENT only `patient_id`, staff neither), so the row always
  satisfies `chk_role_link` (Section 10.2.11) regardless of stray IDs in the body.
- **Patient self-registration identity binding (Option B):** a patient registers with
  their **University ID or Health Card number** (no typed email). The verification
  link is sent to the **email already on file** for the matched `patient` record —
  *never* a user-supplied address — so knowing the (printed) ID is not enough; the
  applicant must control the registered inbox. If the record has **no email on file**,
  registration is refused with a message to visit reception. The stored `app_user.email`
  is the on-file address; any `email` in the request body is ignored for patients.

### 10.2.10 JWT configuration hardening
- **Fail-fast startup guard (`src/index.js`):** the server **aborts at boot**
  (`process.exit(1)`) if `JWT_SECRET` is missing or shorter than 32 characters —
  preventing both unverifiable 500s at login time and trivially-forgeable tokens.
- **Default token lifetime:** if `JWT_EXPIRES_IN` is unset it defaults to `24h`, so an
  empty value can never mean "tokens never expire."

### 10.2.11 Database integrity hardening (constraints + trigger)
Invariants that foreign keys alone cannot express are now enforced **in the database**,
with the app producing compliant rows and translating any violation into a friendly
4xx instead of a 500.

- **`chk_role_link` (CHECK on `app_user`):** a login's role must match its link —
  `DOCTOR`→`doctor_id` only, `PATIENT`→`patient_id` only, pure-staff roles
  (`ADMIN`/`RECEPTIONIST`/`PHARMACIST`/`LAB_TECH`)→neither. (Three pre-existing
  orphan logins from the earlier broken self-signup were cleaned up before adding it.)
- **`uq_bed_active_admission` (partial unique index on `ward_admission`):**
  `UNIQUE (bed_id) WHERE status = 'ADMITTED'` — a bed can hold at most one admitted
  patient at a time, while discharged rows are kept for history. Catches the
  concurrency race two admissions could otherwise win.
- **`chk_student_has_id` (CHECK on `patient`):** a `STUDENT` must carry a
  `university_id` (mirrors the app-layer rule that already requires it).
- **`visit_token_patient_match` (BEFORE INSERT/UPDATE trigger on `visit`):** a visit
  attached to a token must belong to **that token's patient** (resolved via
  `token → health_card → patient`) — a cross-table rule no FK can state.
- **Design decision — `token_date` is NOT a generated column.** It was considered
  (to remove an apparent `issue_datetime → token_date` redundancy) and **rejected**:
  an approved online request issues a token for a **future `preferred_date`**, so
  `token_date` is the *appointment date*, genuinely independent of `issue_datetime`.
  Generating it would have broken future-dated tokens and the per-day token counter.
- **Dependency preservation:** every relation keeps its candidate key(s) — surrogate
  PK plus the natural key as a `UNIQUE` — **within the same table**, so each FD is
  enforced locally and no determinant is split across relations. The decomposition is
  therefore **lossless-join, BCNF, *and* dependency-preserving**, avoiding the usual
  BCNF/3NF trade-off. The constraints/trigger above are integrity enforcement, not
  normalization changes.

---

## 11. Requirement Coverage Matrix (course PDF → where it's satisfied)

| Course requirement | Where satisfied |
|---|---|
| ≥ 8 tables | **18** tables (Sec 3–5) |
| All general data types | INT, VARCHAR, CHAR, TEXT, NUMERIC, DATE, TIME, TIMESTAMP, BOOLEAN (Sec 4–5) |
| PK / FK / UNIQUE / CHECK / NOT NULL | every table (Sec 5) |
| Implement in a DBMS | PostgreSQL (Sec 5–6) |
| ≥ 15 queries (covering 8.g) | **24 queries** (Sec 8) |
| Non-trivial / canonical-cover FDs | Sec 7 |
| 8.a description | Sec 1 |
| 8.b schemas + attributes | Sec 4 |
| 8.c schema diagram | render FK graph from Sec 5 (relational diagram) |
| 8.d E-R diagram | entities Sec 3 + relationships in FKs |
| 8.e DDL snapshots | Sec 5 |
| 8.f instance snapshots | Sec 6 seed data |
| 8.g.i natural/cross/outer/using/on | Q1, Q2, Q3, Q4, Q5, Q6 |
| 8.g.ii some/all/any/exists/unique | Q7, Q8, Q9, Q10, Q11 |
| 8.g.iii subquery in from/where/select | Q12 (select), Q13 (from), Q14 (where) |
| 8.g.iv order by/group by/having | Q5, Q15 |
| 8.g.v with clause | Q16 |
| 8.g.vi string manipulation / set ops | Q17, Q18 |
| 8.g.vii update / delete | Q19, Q20 |
| 8.g.viii aggregate + other functions | Q21 (and AGE/EXTRACT/COALESCE in Q17) |
| 8.h views + queries on views | Sec 9 |
| 8.i FD list + normal-form proof | Sec 7 (BCNF) |
| 8.j conclusion | write in report |
| Part II web app | Sec 10 |
| Part III demo/presentation | demo the role dashboards + run Sec 8 queries live |

---

## 12. Build Order (instructions for the AI assistant)

Build the project in **phases**, one at a time. Complete and test each phase before starting
the next. Each phase is a self-contained vertical slice — its own backend endpoints, its own
frontend pages — small enough to get right in one pass. The phases follow the natural dependency
order of the patient journey: you can't issue a token without a patient, can't write a
prescription without a visit, can't dispense without a prescription.

**IMPORTANT:** after each phase, manually test every endpoint and page before proceeding. Fix
bugs in the current phase first — don't carry broken code forward.

---

### Phase 0 — Database setup (run once)

Create the PostgreSQL database and load the SQL files in order:
```
psql -U postgres -c "CREATE DATABASE mmcms;"
psql -U postgres -d mmcms -f db/01_schema.sql
psql -U postgres -d mmcms -f db/03_seed.sql
psql -U postgres -d mmcms -f db/04_views.sql
```
Verify with: `psql -U postgres -d mmcms -f db/05_queries.sql` — all 22 queries should return rows.

---

### Phase 1 — Authentication + email verification + landing page

**This phase produces a working login screen with email verification and role-based routing.
No data pages yet — just the skeleton that every future phase plugs into.**

**Backend:**
1. Initialize `server/` — `npm init`, install packages (Section 10.1.1): `express`, `pg`, `cors`,
   `dotenv`, `bcryptjs`, `jsonwebtoken`, `nodemailer`.
2. Create `server/.env` from Section 10.1.2 (includes SMTP config).
3. Create `server/src/config/db.js` — a `pg.Pool` using the env variables. Export the pool.
4. Create `server/src/utils/email.js` — nodemailer transporter + `sendVerificationEmail(email, token)`
   (Section 10.1.3 A). Uses SMTP env vars from `.env`.
5. Create `server/src/middleware/auth.js` — two functions:
   - `verifyToken(req, res, next)` — reads `Authorization: Bearer <token>` from the header,
     verifies with `jwt.verify`, attaches `{ user_id, role, doctor_id, patient_id }` to `req.user`.
     Returns 401 on failure.
   - `authorize(...allowedRoles)` — returns a middleware that checks `req.user.role` is in the
     list OR is `'ADMIN'` (admin always passes). Returns 403 on failure.
6. Create `server/src/routes/auth.js` — four routes:
   - `POST /api/auth/login` — Section 10.1.3 D: query by username → bcrypt compare →
     **check email_verified = TRUE** (reject 403 if not) → sign JWT → return token.
   - `POST /api/auth/register` — Section 10.1.3 B: hash password → generate verification token
     via `crypto.randomBytes(32).toString('hex')` → INSERT with `email_verified = FALSE` →
     send verification email → return 201.
   - `GET /api/auth/verify-email?token=` — Section 10.1.3 C: look up by verification_token →
     set `email_verified = TRUE, verification_token = NULL` → return success.
   - `POST /api/auth/resend-verification` — Section 10.1.3 E: look up by email → generate new
     token → send email → return success.
7. Create `server/src/app.js` — Express app with `cors()`, `express.json()`, mounts
   `/api/auth` router, listens on `PORT`.
8. **Fix seed passwords:** write a one-time script (`db/fix_passwords.js`) that updates
   `app_user.password_hash` with real bcrypt hashes. Seed users already have
   `email_verified = TRUE` so they can log in immediately. Suggested dev passwords:
   `admin123`, `doctor123`, `reception123`, `pharma123`, `lab123`, `patient123`.

**Frontend:**
1. Initialize `client/` — `npm create vite@latest client -- --template react`, install packages
   (Section 10.1.1): `react-router-dom`, `axios`, `tailwindcss`, `autoprefixer`, `postcss`.
   Configure Tailwind.
2. Create `client/src/api/axios.js` — axios instance with `baseURL: 'http://localhost:5000/api'`,
   request interceptor that attaches `Authorization: Bearer` from localStorage, response
   interceptor that clears token and redirects to `/login` on 401.
3. Create `client/src/pages/LoginPage.jsx` — username + password fields + submit button.
   On success → store token → redirect to role dashboard.
   On 403 ("verify your email") → show message + "Resend verification email" button.
4. Create `client/src/pages/VerifyEmailPage.jsx` — reads `?token=` from the URL on mount,
   calls `GET /api/auth/verify-email?token=...`, shows success ("Email verified! You can now
   log in.") or error ("Invalid or expired link"), with a link to `/login`.
5. Create `client/src/App.jsx` — reads token from localStorage. If no token → show public
   routes only (`/login`, `/verify-email`). If token → decode role → render `<DashboardLayout>`
   with role-specific sidebar + `<Routes>`. For now, each role's routes render placeholder
   `<div>Coming soon</div>`.
6. Create `client/src/components/DashboardLayout.jsx` — the sidebar + header + content area
   shell. Sidebar shows nav items based on role. Header shows role name, username, sign-out.

**Test this phase:**
- Start backend + frontend.
- Open app → see login page → log in as `admin` / `admin123` → land on admin shell → sign out.
- Log in as each of the 6 roles → verify correct shell + sidebar items.
- Wrong password → error message.
- Create a new user (via Postman or admin UI later) → check email → click verification link →
  email verified → can now log in.
- Try logging in before verifying → see "Please verify your email" with resend option.

---

### Phase 2 — Receptionist (patient registration, health cards, tokens)

**Why first:** the receptionist creates patients and tokens — every other role depends on this
data existing.

**Backend — add these route files:**
- `routes/patients.js`:
  - `GET /api/patients` — list all (with search). Accessible by: ADMIN, RECEPTIONIST, DOCTOR.
  - `POST /api/patients` — register. Accessible by: ADMIN, RECEPTIONIST.
  - `GET /api/patients/:id` — get profile.
  - `PUT /api/patients/:id` — update info. Accessible by: ADMIN, RECEPTIONIST.
- `routes/health-cards.js`:
  - `POST /api/health-cards` — issue card. Accessible by: ADMIN, RECEPTIONIST.
  - `PUT /api/health-cards/:id/status` — change status. Accessible by: ADMIN, RECEPTIONIST.
  - `GET /api/health-cards/patient/:patientId` — get patient's card.
- `routes/tokens.js`:
  - `POST /api/tokens` — **implement token issuance from Section 10.1.5 A** (validate active
    card → compute next number → insert). Accessible by: ADMIN, RECEPTIONIST.
  - `GET /api/tokens?date=&unit_id=` — get tokens. Accessible by: ADMIN, RECEPTIONIST, DOCTOR.

**Frontend — build these pages (Section 10.1.6):**
- `/reception` → ReceptionDashboard (stat cards + quick-action buttons).
- `/reception/patients` → PatientList + RegisterPatientForm (conditional guardian for FAMILY).
- `/reception/patients/:id` → PatientDetail + EditPatientForm.
- `/reception/health-cards` → IssueHealthCardForm + AllCardsTable with status buttons.
- `/reception/tokens` → IssueTokenForm + TodayTokenQueue.

**Test:** register → card → token → see in queue. Expired card → error. No card → error.

---

### Phase 3 — Doctor (visits, prescriptions, test orders, admissions)

**Why second:** consumes tokens (Phase 2), produces data for Phases 4–5.

**Backend — add:** `routes/visits.js`, `routes/prescriptions.js`, `routes/test-orders.js`,
`routes/admissions.js`, `routes/roster.js`. See Section 10 role-access matrix for exact
methods and permissions. Implement admission logic from Section 10.1.5 C.

**Frontend — build:** `/doctor` dashboard, `/doctor/queue`, `/doctor/visits/new/:tokenId`,
`/doctor/visits/emergency`, `/doctor/visits/:id`, `/doctor/prescriptions/new/:visitId`,
`/doctor/test-orders`, `/doctor/admissions/new`, `/doctor/admissions`.

**Test:** receptionist issues token → doctor sees it → starts visit → writes prescription →
orders test → admits patient → discharges.

---

### Phase 4 — Pharmacist (dispense + stock management)

**Why third:** depends on prescriptions from Phase 3.

**Backend — add:** `routes/dispense.js` (**implement dispense transaction from Section 10.1.5 B
exactly**), `routes/medicines.js`. See role-access matrix for permissions.

**Frontend — build:** `/pharmacy` dashboard, `/pharmacy/dispense`, `/pharmacy/medicines`,
`/pharmacy/low-stock`.

**Test:** doctor writes prescription → pharmacist dispenses → stock decrements → student
charged 0 → teacher charged cost price. Insufficient stock → error.

---

### Phase 5 — Lab Technician (test results)

**Why fourth:** depends on test orders from Phase 3.

**Backend — add to `routes/test-orders.js`:** `PUT /api/test-orders/:id/result`,
`GET /api/diagnostic-tests`.

**Frontend — build:** `/lab` dashboard, `/lab/pending`, `/lab/test-orders/:id`, `/lab/catalogue`.

**Test:** doctor orders test → lab tech sees it → marks sample → enters result → doctor sees result.

---

### Phase 6 — Patient (read-only self-service)

**Why fifth:** read-only views of all previous phases' data. No new routes — just own-data filtering.

**Frontend — build:** `/patient` dashboard, `/patient/visits`, `/patient/prescriptions`,
`/patient/test-results`, `/patient/health-card`. All read-only, server enforces
`WHERE patient_id = $jwt_patient_id`.

**Test:** patient sees only own data. URL manipulation → 403.

---

### Phase 7 — Admin (management + reports + ambulance)

**Why last:** management layer on top of everything.

**Backend — add:** `routes/doctors.js`, `routes/units.js`, `routes/roster.js` (extend),
`routes/ambulance.js`, `routes/reports.js` (read views), `routes/users.js`.

**Frontend — build:** `/admin` dashboard, `/admin/doctors`, `/admin/units`, `/admin/roster`,
`/admin/ambulances`, `/admin/reports`, `/admin/users`.

**Test:** full admin CRUD + reports show real data from all phases.

---

### Phase 8 — Polish and demo prep

- Loading spinners, toast notifications, delete confirmations, responsive sidebar.
- End-to-end walkthrough: register → card → token → visit → prescription → dispense → test → result → admission → discharge.
- Report screenshots (DDL, populated tables, query outputs).
- 5-minute presentation.

---

### Rules for every phase

- **Parameterized queries only** (`$1, $2, ...`) — never concatenate SQL.
- **Transactions** for multi-step writes (dispense, prescription with items).
- **Role guard on every route** — `verifyToken` + `authorize(...)`.
- **Standard response format** — `{ success, data }` or `{ success, error }`.
- **No business logic in the frontend** — server validates and enforces all rules.
- **Database is the centre of gravity** — constraints catch what the app misses.
