-- MMCMS schema (PostgreSQL)
DROP TABLE IF EXISTS app_user, ambulance_dispatch, ambulance, ward_admission, bed,
  test_order, diagnostic_test, medicine_dispense, prescription_item, medicine,
  prescription, visit, token, duty_roster, shift, health_card, patient, doctor, unit CASCADE;

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
  created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
