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

**Application-layer table (add for Part II auth):** `app_user` (auth/roles, Section 4.17).

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
| guardian_id | INT | FK → patient(patient_id) — set only when category = FAMILY |
| registration_date | DATE | NOT NULL, DEFAULT CURRENT_DATE |

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
| status | VARCHAR(10) | NOT NULL, DEFAULT 'WAITING', CHECK IN (WAITING, SERVED, CANCELLED) |
|  | | UNIQUE (unit_id, token_date, token_number) |

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

### 4.17 `app_user` (Part II auth — application layer)
| Column | Type | Constraints |
|---|---|---|
| user_id | SERIAL | PK |
| username | VARCHAR(40) | UNIQUE, NOT NULL |
| password_hash | VARCHAR(200) | NOT NULL (bcrypt) |
| role | VARCHAR(15) | NOT NULL, CHECK IN (ADMIN, DOCTOR, RECEPTIONIST, PHARMACIST, LAB_TECH, PATIENT) |
| doctor_id | INT | FK → doctor (when role = DOCTOR) |
| patient_id | INT | FK → patient (when role = PATIENT) |
| is_active | BOOLEAN | DEFAULT TRUE |

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
  guardian_id       INT REFERENCES patient(patient_id),
  registration_date DATE NOT NULL DEFAULT CURRENT_DATE
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
                 CHECK (status IN ('WAITING','SERVED','CANCELLED')),
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
  user_id       SERIAL PRIMARY KEY,
  username      VARCHAR(40) NOT NULL UNIQUE,
  password_hash VARCHAR(200) NOT NULL,
  role          VARCHAR(15) NOT NULL
                CHECK (role IN ('ADMIN','DOCTOR','RECEPTIONIST','PHARMACIST','LAB_TECH','PATIENT')),
  doctor_id     INT REFERENCES doctor(doctor_id),
  patient_id    INT REFERENCES patient(patient_id),
  is_active     BOOLEAN DEFAULT TRUE
);
```

---

## 6. Sample Data Plan (`db/03_seed.sql`)

Populate realistic volumes so aggregates and `HAVING` are meaningful:

- **unit:** 7 rows (Outpatient-Male, Outpatient-Female&Child, Dental, Eye, Homeo, Physiotherapy, Pathology, Radiology).
- **shift:** Morning `08:00–13:00`, Afternoon `13:00–18:00`, Night `18:00–08:00`.
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

---

## 7. Functional Dependencies & Normalization (report item 8.i)

**Result: all 18 tables are in BCNF** (hence 3NF, 2NF, 1NF). The test for BCNF is: for every
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

---

## 8. Queries (`db/05_queries.sql`) — 22 queries covering every 8.g criterion

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

**Q8 — Subquery with ANY / SOME.** *Medicines priced above ANY homeo medicine.*
```sql
SELECT medicine_name, unit_price
FROM medicine
WHERE unit_price > ANY (SELECT unit_price FROM medicine WHERE is_homeo = TRUE);
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

**Q15 — GROUP BY + HAVING + ORDER BY.** *Units that issued more than 5 tokens, busiest first.*
RA: `τ_{cnt desc} ( σ_{cnt>5} ( 𝒢_{unit_id; count→cnt} token ) )`
```sql
SELECT u.unit_name, COUNT(*) AS token_count
FROM token t JOIN unit u USING (unit_id)
GROUP BY u.unit_id, u.unit_name
HAVING COUNT(*) > 5
ORDER BY token_count DESC;
```

**Q16 — WITH clause (CTE).** *Top-3 busiest doctors by visits this month.*
```sql
WITH monthly_visits AS (
  SELECT doctor_id, COUNT(*) AS visits
  FROM visit
  WHERE visit_datetime >= date_trunc('month', CURRENT_DATE)
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
WHERE expiry_date < CURRENT_DATE AND status = 'ACTIVE';
```

**Q20 — DELETE (DML).** *Purge cancelled tokens older than 30 days.*
```sql
DELETE FROM token
WHERE status = 'CANCELLED'
  AND token_date < CURRENT_DATE - INTERVAL '30 days';
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

> That is **22 queries**, comfortably above the required 15, and every sub-item of 8.g
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
    "dotenv": "^16.3"
  }
}
```

**Frontend (`client/package.json` — Vite + React):**
```json
{
  "dependencies": {
    "react": "^18",
    "react-dom": "^18",
    "react-router-dom": "^6",
    "axios": "^1.6"
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
```

#### 10.1.3 Authentication flow (step-by-step)

**Login (server):**
1. Client sends `POST /api/auth/login` with `{ username, password }`.
2. Server queries `SELECT * FROM app_user WHERE username = $1 AND is_active = TRUE`.
3. If no row → `401 { error: "Invalid credentials" }`.
4. Compare `bcryptjs.compare(password, row.password_hash)`.
5. If mismatch → `401 { error: "Invalid credentials" }`.
6. Sign a JWT: `jwt.sign({ user_id, role, doctor_id, patient_id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })`.
7. Return `200 { token, user: { user_id, username, role } }`.

**Client-side (React):**
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
4. In `App.jsx`, read the token, decode the role (without verifying — server already verified),
   and render the role's routes. Unauthenticated users see only `/login`.

**Role-guard middleware (server, `middleware/auth.js`):**
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

## 11. Requirement Coverage Matrix (course PDF → where it's satisfied)

| Course requirement | Where satisfied |
|---|---|
| ≥ 8 tables | **18** tables (Sec 3–5) |
| All general data types | INT, VARCHAR, CHAR, TEXT, NUMERIC, DATE, TIME, TIMESTAMP, BOOLEAN (Sec 4–5) |
| PK / FK / UNIQUE / CHECK / NOT NULL | every table (Sec 5) |
| Implement in a DBMS | PostgreSQL (Sec 5–6) |
| ≥ 15 queries (covering 8.g) | **22 queries** (Sec 8) |
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

1. Create the Postgres database; run `01_schema.sql`, then `03_seed.sql`, then `04_views.sql`.
2. Verify all 22 queries in `05_queries.sql` return rows.
3. Scaffold `server/` following Section 10.1: install packages (10.1.1), create `.env` (10.1.2),
   implement auth (10.1.3), standard response format (10.1.4), then all routes with the role-guard
   middleware from the access matrix. Implement the three critical endpoints exactly as described
   in 10.1.5 (token issuance, dispense transaction, admission). Use parameterized queries only.
4. Scaffold `client/` (Vite + React + Tailwind): install packages (10.1.1), set up axios with
   JWT interceptor (10.1.3), implement the route table (10.1.6), and build each page/form using
   the field specifications in 10.1.6.
5. Wire role-based login and the report pages to the database views.
6. Keep the database the centre of gravity — business rules (card validity, free-vs-paid medicine,
   stock decrement, isolation-ward restriction, ambulance availability) enforced in SQL constraints
   + server transactions, not just the UI.
