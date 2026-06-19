-- =====================================================================
-- MMCMS sample data  (PostgreSQL)
-- Doctors/staff = real names from DU Medical Centre roster & staff list.
-- Patients = fictional (medical patient data is never real for privacy).
-- Explicit IDs are used for stable FK references; sequences reset at end.
-- =====================================================================

-- ---------- 1. UNIT ----------
INSERT INTO unit (unit_id, unit_name, unit_type, floor_location, contact_ext) VALUES
 (1,'Outpatient (Male)','OUTPATIENT','Ground Floor','4236'),
 (2,'Outpatient (Female & Child)','OUTPATIENT','Ground Floor','4237'),
 (3,'Dental Unit','DENTAL','1st Floor','4240'),
 (4,'Eye Unit','EYE','1st Floor','4241'),
 (5,'Homeo Unit','HOMEO','1st Floor','4242'),
 (6,'Physiotherapy Unit','PHYSIO','Room 10','4243'),
 (7,'Pathology Lab','PATHOLOGY','Ground Floor','4244'),
 (8,'Radiology (X-ray/USG)','RADIOLOGY','Ground Floor','4245');

-- ---------- 2. DOCTOR ----------
-- Real names. bmdc_reg_no synthetic (not published); phones from staff list where available.
INSERT INTO doctor (doctor_id, full_name, gender, bmdc_reg_no, designation, specialization, doctor_type, is_parttime, phone, email, unit_id, joining_date) VALUES
 (1 ,'Dr. Mohammad Tanvir Ali','M','BMDC-A1001','Chief Medical Officer','General Medicine','GENERAL',FALSE,'01772133301','cmo.dumc@gmail.com',1,'2005-03-01'),
 (2 ,'Mrs. Razia Rahman','F','BMDC-A1002','Senior Medical Officer','General Medicine','GENERAL',FALSE,'01817516559','raziarahman1973@gmail.com',2,'2008-07-15'),
 (3 ,'A.M. Sazzad Hossain','M','BMDC-A1003','Senior Medical Officer','General Medicine','GENERAL',FALSE,'01552470474','sazzadhossain133@gmail.com',1,'2009-01-10'),
 (4 ,'Sharif Qamar Uddin','M','BMDC-A1004','Senior Medical Officer','General Medicine','GENERAL',FALSE,'01712598031','drsharif2002bd@yahoo.com',1,'2007-05-20'),
 (5 ,'Md. Arifur Reza Sikder','M','BMDC-A1005','Senior Medical Officer','General Medicine','GENERAL',FALSE,'01715008055',NULL,1,'2010-02-01'),
 (6 ,'Ferdousi Purabi Chowdhury','F','BMDC-A1006','Senior Medical Officer','General Medicine','GENERAL',FALSE,'01712160744',NULL,2,'2009-09-12'),
 (7 ,'Dr. Sayed Al Amin Anhar','M','BMDC-A1007','Senior Medical Officer','General Medicine','GENERAL',FALSE,'01911364013','dranhar1976@gmail.com',1,'2006-11-03'),
 (8 ,'Mohammad Shariful Islam','M','BMDC-A1008','Senior Medical Officer','General Medicine','GENERAL',FALSE,'01717746726',NULL,1,'2011-04-18'),
 (9 ,'Dr. Shafkat Hasan Jami','M','BMDC-A1009','Senior Medical Officer','General Medicine','GENERAL',FALSE,'01756703110',NULL,1,'2012-08-25'),
 (10,'Md. Omar Al Masud','M','BMDC-A1010','Senior Medical Officer','General Medicine','GENERAL',FALSE,'01700000010',NULL,1,'2013-01-09'),
 (11,'A S M Ashikuzzaman','M','BMDC-A1011','Medical Officer','General Medicine','GENERAL',FALSE,'01700000011',NULL,1,'2014-06-30'),
 (12,'Md. Badruddoza Bayezid','M','BMDC-A1012','Medical Officer','General Medicine','GENERAL',FALSE,'01700000012',NULL,1,'2015-03-14'),
 (13,'Dr. Mahbuba Akter','F','BMDC-A1013','Medical Officer','General Medicine','GENERAL',FALSE,'01552433552','mahbubaakter.dumc444@gmail.com',2,'2016-02-22'),
 (14,'Dr. Md. Marzan Kabir','M','BMDC-A1014','Medical Officer','General Medicine','GENERAL',FALSE,'01765258052',NULL,1,'2017-07-01'),
 (15,'Dr. Abhijit Roy','M','BMDC-A1015','Medical Officer','General Medicine','GENERAL',FALSE,'01913042695',NULL,1,'2018-09-10'),
 (16,'Dr. Md. Nazrul Islam','M','BMDC-A1016','Medical Officer','General Medicine','GENERAL',FALSE,'01556343340',NULL,1,'2016-05-05'),
 (17,'Dr. Rubaida Akhtar','F','BMDC-A1017','Assistant Medical Officer','General Medicine','GENERAL',FALSE,'01675842909','akhterrubaida@gmail.com',2,'2019-01-20'),
 (18,'Dr. Meherin Parosh','F','BMDC-A1018','Assistant Medical Officer','General Medicine','GENERAL',FALSE,'01773779978',NULL,2,'2020-03-01'),
 (19,'Dr. Nazia Jabin','F','BMDC-A1019','Medical Officer','General Medicine','GENERAL',FALSE,'01700000019',NULL,2,'2018-11-11'),
 (20,'Dr. S.M. Shamima Parvin','F','BMDC-A1020','Senior Medical Officer','Dental','DENTAL',FALSE,'01818373258',NULL,3,'2007-10-10'),
 (21,'Dr. Rathindranath Sarkar','M','BMDC-A1021','Senior Medical Officer','Dental','DENTAL',FALSE,'01716226189',NULL,3,'2006-04-04'),
 (22,'Dr. Md. Zakir Hossain','M','BMDC-A1022','Medical Officer','Ophthalmology','EYE',FALSE,'01715026128',NULL,4,'2014-12-01'),
 (23,'Abu Mohammad Musa','M','BMDC-A1023','Junior Consultant','Physiotherapy','PHYSIO',FALSE,'01552433899','ammusa7@yahoo.com',6,'2010-08-08'),
 (24,'Tasnuva Shamarukh Proma','F','BMDC-A1024','Consultant','Physiotherapy','PHYSIO',TRUE,'01700000024',NULL,6,'2021-02-15'),
 (25,'Dr. Md. Zakaria','M','BMDC-A1025','Part-time Medical Officer','ENT','SPECIALIST',TRUE,'01716578378',NULL,1,'2015-01-01'),
 (26,'Dr. Md. Sirajul Haque','M','BMDC-A1026','Part-time Medical Officer','Cardiology','SPECIALIST',TRUE,'01819291182',NULL,1,'2014-01-01'),
 (27,'Dr. Jesmin Ferdous','F','BMDC-A1027','Part-time Medical Officer','Sonology/Ultrasonogram','SPECIALIST',TRUE,'01552473314',NULL,8,'2016-01-01'),
 (28,'Dr. Monirul Islam','M','BMDC-A1028','Part-time Medical Officer','Radiology','SPECIALIST',TRUE,'01912999116',NULL,8,'2015-06-01'),
 (29,'Dr. Nargis Fatema','F','BMDC-A1029','Senior Medical Officer','Pathology','SPECIALIST',FALSE,'01713045169',NULL,7,'2009-03-03'),
 (30,'Dr. Rakhi Pal','F','BMDC-A1030','Part-time Medical Officer','General Medicine','GENERAL',TRUE,'01819810801',NULL,2,'2017-01-01'),
-- Homeo Unit doctors: names not published in the provided sources -> representative entries.
 (31,'Dr. Aminul Haque (Homeo)','M','BMDC-H2001','Homeo Medical Officer','Homeopathy','HOMEO',FALSE,'01700000031',NULL,5,'2012-01-01'),
 (32,'Dr. Sufia Khatun (Homeo)','F','BMDC-H2002','Homeo Medical Officer','Homeopathy','HOMEO',FALSE,'01700000032',NULL,5,'2013-01-01'),
 (33,'Dr. Jamal Uddin (Homeo)','M','BMDC-H2003','Homeo Medical Officer','Homeopathy','HOMEO',FALSE,'01700000033',NULL,5,'2014-01-01'),
 (34,'Dr. Nasrin Akter (Homeo)','F','BMDC-H2004','Homeo Medical Officer','Homeopathy','HOMEO',FALSE,'01700000034',NULL,5,'2015-01-01');

-- ---------- 3. PATIENT (fictional) ----------
INSERT INTO patient (patient_id, full_name, date_of_birth, gender, blood_group, phone, email, address, patient_category, university_id, academic_dept, guardian_id, registration_date) VALUES
 (1 ,'Rakibul Hasan','2003-05-12','M','O+','01710000001','rakib@example.com','Jagannath Hall, DU','STUDENT','BSc-CSE-2101','Computer Science & Engineering',NULL,'2025-01-10'),
 (2 ,'Sadia Afrin','2002-11-23','F','A+','01710000002','sadia@example.com','Rokeya Hall, DU','STUDENT','BSc-EEE-2055','Electrical & Electronic Engineering',NULL,'2025-01-11'),
 (3 ,'Tanvir Ahmed','2001-07-08','M','B+','01710000003',NULL,'Surja Sen Hall, DU','STUDENT','BSc-PHY-1990','Physics',NULL,'2025-01-12'),
 (4 ,'Nusrat Jahan','2003-02-14','F','AB+','01710000004','nusrat@example.com','Shamsun Nahar Hall, DU','STUDENT','BA-ENG-2210','English',NULL,'2025-01-13'),
 (5 ,'Mehedi Hasan','2000-09-30','M','O-','01710000005',NULL,'F.H. Hall, DU','STUDENT','MSc-CHE-1820','Chemistry',NULL,'2025-01-14'),
 (6 ,'Farhana Akter','2002-04-19','F','B-','01710000006','farhana@example.com','Kuwait Maitree Hall, DU','STUDENT','BBA-ACC-2030','Accounting',NULL,'2025-02-01'),
 (7 ,'Imran Khan','2001-12-01','M','A-','01710000007',NULL,'Muktijoddha Hall, DU','STUDENT','BSc-MAT-1955','Mathematics',NULL,'2025-02-02'),
 (8 ,'Sumaiya Islam','2003-08-25','F','O+','01710000008','sumaiya@example.com','Bangladesh-Kuwait Hall, DU','STUDENT','BA-ECO-2300','Economics',NULL,'2025-02-03'),
 (9 ,'Arif Mahmud','2002-06-17','M','B+','01710000009',NULL,'Jagannath Hall, DU','STUDENT','BSc-STA-2120','Statistics',NULL,'2025-02-04'),
 (10,'Tahmina Begum','2000-03-05','F','AB-','01710000010','tahmina@example.com','Rokeya Hall, DU','STUDENT','MSc-BOT-1750','Botany',NULL,'2025-02-05'),
 (11,'Prof. Dr. Kamrul Hasan','1968-01-22','M','O+','01720000011','kamrul@du.ac.bd','Fuller Road, Dhaka','TEACHER','EMP-T-3012','Computer Science & Engineering',NULL,'2024-09-01'),
 (12,'Prof. Shahnaz Parvin','1972-10-10','F','A+','01720000012','shahnaz@du.ac.bd','Nilkhet Road, Dhaka','TEACHER','EMP-T-3045','English',NULL,'2024-09-02'),
 (13,'Dr. Mizanur Rahman','1975-05-15','M','B+','01720000013','mizan@du.ac.bd','Azimpur, Dhaka','TEACHER','EMP-T-3078','Physics',NULL,'2024-09-03'),
 (14,'Abdul Karim','1970-02-28','M','O+','01730000014',NULL,'Palashi Staff Qtr, DU','STAFF','EMP-S-5001','Administration',NULL,'2024-10-01'),
 (15,'Rahima Khatun','1980-07-19','F','A-','01730000015',NULL,'Palashi Staff Qtr, DU','STAFF','EMP-S-5023','Library',NULL,'2024-10-02'),
 (16,'Jasim Uddin','1978-11-11','M','B-','01730000016',NULL,'Nilkhet Staff Qtr, DU','STAFF','EMP-S-5044','Transport',NULL,'2024-10-03'),
 -- Family members (dependents) -> guardian_id points to a teacher/staff
 (17,'Ayesha Kamrul','1972-03-30','F','O+','01720000017',NULL,'Fuller Road, Dhaka','FAMILY',NULL,NULL,11,'2024-09-05'),
 (18,'Sabbir Kamrul','2005-09-09','M','O+','01720000018',NULL,'Fuller Road, Dhaka','FAMILY',NULL,NULL,11,'2024-09-05'),
 (19,'Rezaul Karim','2008-12-12','M','O+',NULL,NULL,'Palashi Staff Qtr, DU','FAMILY',NULL,NULL,14,'2024-10-05'),
 (20,'Salma Mizan','1978-06-06','F','B+','01720000020',NULL,'Azimpur, Dhaka','FAMILY',NULL,NULL,13,'2024-09-06');

-- ---------- 4. HEALTH_CARD ----------
INSERT INTO health_card (card_id, card_number, patient_id, issue_date, expiry_date, photo_submitted, status) VALUES
 (1 ,'HC-2025-0001',1 ,'2025-01-10','2027-01-10',TRUE ,'ACTIVE'),
 (2 ,'HC-2025-0002',2 ,'2025-01-11','2027-01-11',TRUE ,'ACTIVE'),
 (3 ,'HC-2025-0003',3 ,'2025-01-12','2027-01-12',TRUE ,'ACTIVE'),
 (4 ,'HC-2025-0004',4 ,'2025-01-13','2027-01-13',TRUE ,'ACTIVE'),
 (5 ,'HC-2025-0005',5 ,'2025-01-14','2027-01-14',FALSE,'ACTIVE'),
 (6 ,'HC-2025-0006',6 ,'2025-02-01','2027-02-01',TRUE ,'ACTIVE'),
 (7 ,'HC-2025-0007',7 ,'2025-02-02','2027-02-02',TRUE ,'ACTIVE'),
 (8 ,'HC-2025-0008',8 ,'2025-02-03','2027-02-03',TRUE ,'ACTIVE'),
 (9 ,'HC-2024-0009',9 ,'2024-02-04','2026-02-04',TRUE ,'ACTIVE'),  -- expiry just past 'today' -> Q19 will flip
 (10,'HC-2024-0010',10,'2024-02-05','2026-05-01',TRUE ,'ACTIVE'),  -- expired by date, still ACTIVE
 (11,'HC-2024-0011',11,'2024-09-01','2026-09-01',TRUE ,'ACTIVE'),
 (12,'HC-2024-0012',12,'2024-09-02','2026-09-02',TRUE ,'ACTIVE'),
 (13,'HC-2024-0013',13,'2024-09-03','2026-09-03',TRUE ,'SUSPENDED'),
 (14,'HC-2024-0014',14,'2024-10-01','2026-10-01',TRUE ,'ACTIVE'),
 (15,'HC-2024-0015',15,'2024-10-02','2026-10-02',FALSE,'ACTIVE'),
 (16,'HC-2024-0016',16,'2024-10-03','2026-10-03',TRUE ,'EXPIRED'),
 (17,'HC-2024-0017',17,'2024-09-05','2026-09-05',TRUE ,'ACTIVE'),
 (18,'HC-2024-0018',18,'2024-09-05','2026-09-05',TRUE ,'ACTIVE'),
 (19,'HC-2024-0019',19,'2024-10-05','2026-10-05',TRUE ,'ACTIVE'),
 (20,'HC-2024-0020',20,'2024-09-06','2026-09-06',TRUE ,'ACTIVE');

-- ---------- 5. SHIFT ----------
INSERT INTO shift (shift_id, shift_name, start_time, end_time) VALUES
 (1,'Morning','08:00','13:00'),
 (2,'Afternoon','13:00','18:00'),
 (3,'Night','18:00','08:00'),
 (4,'Friday Morning','08:30','12:30'),
 (5,'Friday Afternoon','15:30','20:30');

-- ---------- 6. DUTY_ROSTER (sample week 04-08 Jan 2026, Sun-Thu) ----------
INSERT INTO duty_roster (roster_id, doctor_id, shift_id, unit_id, duty_date, is_oncall) VALUES
 (1 ,6 ,1,2,'2026-01-04',FALSE),
 (2 ,2 ,1,2,'2026-01-04',FALSE),
 (3 ,4 ,1,1,'2026-01-04',FALSE),
 (4 ,13,2,2,'2026-01-04',FALSE),
 (5 ,11,2,1,'2026-01-04',FALSE),
 (6 ,7 ,3,1,'2026-01-04',TRUE),
 (7 ,20,1,3,'2026-01-05',FALSE),
 (8 ,22,1,4,'2026-01-05',FALSE),
 (9 ,3 ,1,1,'2026-01-05',FALSE),
 (10,18,2,2,'2026-01-05',FALSE),
 (11,3 ,3,1,'2026-01-05',TRUE),
 (12,25,1,1,'2026-01-05',FALSE),  -- ENT specialist (Mon)
 (13,21,1,3,'2026-01-06',FALSE),
 (14,26,1,1,'2026-01-07',FALSE),  -- Cardiology (Wed)
 (15,27,1,8,'2026-01-06',FALSE);  -- USG (Tue)

-- ---------- 7. TOKEN (patient derived via health_card) ----------
INSERT INTO token (token_id, token_number, health_card_id, unit_id, issue_datetime, token_date, status) VALUES
 (1 ,1,1 ,1,'2026-01-04 08:20','2026-01-04','SERVED'),
 (2 ,2,3 ,1,'2026-01-04 08:35','2026-01-04','SERVED'),
 (3 ,1,2 ,2,'2026-01-04 08:40','2026-01-04','SERVED'),
 (4 ,2,4 ,2,'2026-01-04 09:05','2026-01-04','SERVED'),
 (5 ,3,1 ,1,'2026-01-04 09:30','2026-01-04','CANCELLED'),
 (6 ,1,5 ,1,'2026-01-05 08:15','2026-01-05','SERVED'),
 (7 ,1,6 ,2,'2026-01-05 08:25','2026-01-05','SERVED'),
 (8 ,1,7 ,3,'2026-01-05 09:00','2026-01-05','SERVED'),
 (9 ,1,8 ,4,'2026-01-05 09:20','2026-01-05','SERVED'),
 (10,2,9 ,1,'2026-01-05 09:45','2026-01-05','SERVED'),
 (11,1,11,1,'2026-01-06 10:00','2026-01-06','SERVED'),
 (12,2,12,1,'2026-01-06 10:15','2026-01-06','SERVED'),
 (13,1,17,2,'2026-01-06 10:30','2026-01-06','SERVED'),
 (14,3,18,1,'2026-01-06 11:00','2026-01-06','WAITING'),
 (15,1,14,5,'2026-01-07 08:30','2026-01-07','SERVED'),
 (16,1,15,6,'2026-01-07 09:00','2026-01-07','SERVED'),
 (17,1,10,1,'2026-01-07 09:30','2026-01-07','SERVED'),
 (18,1,20,2,'2026-01-08 08:45','2026-01-08','WAITING');

-- ---------- 8. VISIT (some EMERGENCY have NULL token) ----------
INSERT INTO visit (visit_id, token_id, patient_id, doctor_id, visit_datetime, visit_type, chief_complaint, diagnosis, blood_pressure, temperature_f, weight_kg, pulse, follow_up_date) VALUES
 (1 ,1 ,1 ,4 ,'2026-01-04 08:50','NEW','Fever and headache for 3 days','Viral fever','110/70',101.4,62.50,88,'2026-01-09'),
 (2 ,2 ,3 ,4 ,'2026-01-04 09:00','NEW','Sore throat, cough','Acute pharyngitis','115/75',100.2,68.00,80,NULL),
 (3 ,3 ,2 ,6 ,'2026-01-04 09:10','NEW','Abdominal pain','Gastritis','100/65',98.6,55.20,76,'2026-01-11'),
 (4 ,4 ,4 ,2 ,'2026-01-04 09:30','NEW','Migraine','Migraine without aura','105/70',98.4,58.00,72,NULL),
 (5 ,6 ,5 ,3 ,'2026-01-05 08:40','NEW','Body ache, weakness','Anaemia, suspected','120/80',98.8,70.00,82,'2026-01-15'),
 (6 ,7 ,6 ,13,'2026-01-05 08:55','FOLLOWUP','Follow-up gastritis','Gastritis resolving','110/72',98.6,54.00,74,NULL),
 (7 ,8 ,7 ,20,'2026-01-05 09:20','NEW','Toothache lower molar','Dental caries','118/76',98.6,72.00,78,'2026-01-19'),
 (8 ,9 ,8 ,22,'2026-01-05 09:40','NEW','Red itchy eyes','Allergic conjunctivitis','112/74',98.6,50.00,70,NULL),
 (9 ,10,9 ,7 ,'2026-01-05 10:00','NEW','Loose motion','Acute gastroenteritis','108/68',99.6,66.00,90,'2026-01-08'),
 (10,11,11,4 ,'2026-01-06 10:20','NEW','Chest discomfort','Hypertension follow-up','140/90',98.6,80.00,84,'2026-01-13'),
 (11,12,12,2 ,'2026-01-06 10:35','NEW','Persistent cough 2 weeks','Bronchitis','120/78',99.0,65.00,80,'2026-01-13'),
 (12,15,14,31,'2026-01-07 08:50','NEW','Joint pain, weakness','Arthralgia (homeo care)','130/85',98.6,75.00,78,'2026-01-21'),
 (13,NULL,16,7 ,'2026-01-07 23:40','EMERGENCY','Severe abdominal pain at night','Renal colic','135/88',99.2,78.00,96,NULL),
 (14,NULL,19,13,'2026-01-08 02:15','EMERGENCY','High fever in child','Febrile illness','100/60',103.1,32.00,110,'2026-01-09');

-- ---------- 9. MEDICINE ----------
INSERT INTO medicine (medicine_id, medicine_name, generic_name, manufacturer, dosage_form, strength, unit_price, stock_quantity, reorder_level, expiry_date, is_homeo) VALUES
 (1 ,'Napa','Paracetamol','Beximco','TABLET','500mg',1.20,5000,500,'2027-06-30',FALSE),
 (2 ,'Ace','Paracetamol','Square','TABLET','500mg',1.50,300,500,'2027-03-31',FALSE),  -- below reorder
 (3 ,'Seclo','Omeprazole','Square','CAPSULE','20mg',6.00,2000,300,'2026-12-31',FALSE),
 (4 ,'Losectil','Omeprazole','Eskayef','CAPSULE','20mg',5.50,1500,300,'2026-11-30',FALSE),
 (5 ,'Histacin','Chlorpheniramine','ACME','TABLET','4mg',0.80,4000,400,'2027-01-31',FALSE),
 (6 ,'Fexo','Fexofenadine','Square','TABLET','120mg',7.00,1200,200,'2027-04-30',FALSE),
 (7 ,'Monas','Montelukast','Square','TABLET','10mg',12.00,800,150,'2026-10-31',FALSE),
 (8 ,'Amodis','Metronidazole','Square','TABLET','400mg',2.50,2500,300,'2027-02-28',FALSE),
 (9 ,'Moxacil','Amoxicillin','Square','CAPSULE','500mg',4.00,1800,300,'2026-09-30',FALSE),
 (10,'Zithrin','Azithromycin','Renata','TABLET','500mg',28.00,600,100,'2026-12-31',FALSE),
 (11,'Cef-3','Cefixime','Square','CAPSULE','400mg',35.00,40,100,'2026-08-31',FALSE), -- below reorder
 (12,'Orsaline-N','Oral Rehydration Salt','SMC','POWDER','20.5g',5.00,3000,500,'2027-05-31',FALSE),
 (13,'Ceevit','Vitamin C','Square','TABLET','250mg',1.00,5000,500,'2027-07-31',FALSE),
 (14,'Maxpro','Esomeprazole','Renata','TABLET','20mg',7.50,900,200,'2026-12-31',FALSE),
 (15,'Sergel','Esomeprazole','Healthcare','TABLET','20mg',7.00,1100,200,'2027-01-31',FALSE),
 (16,'Antazol','Antazoline (eye drops)','Opsonin','DROPS','0.5%',22.00,150,50,'2026-10-31',FALSE),
 (17,'Benadryl','Diphenhydramine','Opsonin','SYRUP','100ml',45.00,250,50,'2026-11-30',FALSE),
 (18,'Diclofen','Diclofenac','Square','TABLET','50mg',1.80,2200,300,'2027-03-31',FALSE),
 (19,'Tory','Etoricoxib','Beximco','TABLET','90mg',15.00,500,100,'2026-12-31',FALSE),
 (20,'Filmet','Metronidazole','Beximco','TABLET','400mg',2.40,1900,300,'2027-02-28',FALSE),
 -- Homeo medicines (always free)
 (21,'Arnica Montana','Arnica Montana','Homeo Lab','DROPS','30C',0.00,400,50,'2027-12-31',TRUE),
 (22,'Nux Vomica','Nux Vomica','Homeo Lab','DROPS','30C',0.00,400,50,'2027-12-31',TRUE),
 (23,'Belladonna','Belladonna','Homeo Lab','DROPS','30C',0.00,350,50,'2027-12-31',TRUE),
 (24,'Rhus Tox','Rhus Toxicodendron','Homeo Lab','DROPS','30C',0.00,300,50,'2027-12-31',TRUE),
 (25,'Bryonia Alba','Bryonia Alba','Homeo Lab','DROPS','30C',0.00,300,50,'2027-12-31',TRUE);

-- ---------- 10. PRESCRIPTION ----------
INSERT INTO prescription (prescription_id, visit_id, doctor_id, prescription_date, advice, next_visit_date) VALUES
 (1 ,1 ,4 ,'2026-01-04','Plenty of fluids and rest','2026-01-09'),
 (2 ,2 ,4 ,'2026-01-04','Warm saline gargle',NULL),
 (3 ,3 ,6 ,'2026-01-04','Avoid spicy food','2026-01-11'),
 (4 ,4 ,2 ,'2026-01-04','Avoid screen strain',NULL),
 (5 ,5 ,3 ,'2026-01-05','Iron-rich diet; do CBC','2026-01-15'),
 (6 ,6 ,13,'2026-01-05','Continue PPI 1 more week',NULL),
 (7 ,7 ,20,'2026-01-05','Dental filling advised','2026-01-19'),
 (8 ,8 ,22,'2026-01-05','Use eye drops as directed',NULL),
 (9 ,9 ,7 ,'2026-01-05','ORS after each motion','2026-01-08'),
 (10,10,4 ,'2026-01-06','Low salt diet; monitor BP','2026-01-13'),
 (11,11,2 ,'2026-01-06','Steam inhalation','2026-01-13'),
 (12,12,31,'2026-01-07','Homeopathic course',  '2026-01-21');

-- ---------- 11. PRESCRIPTION_ITEM ----------
INSERT INTO prescription_item (item_id, prescription_id, medicine_id, dosage, duration_days, quantity_prescribed, instruction) VALUES
 (1 ,1 ,1 ,'1+1+1',5,15,'After meal'),
 (2 ,1 ,5 ,'0+0+1',5,5 ,'At night'),
 (3 ,2 ,9 ,'1+0+1',7,14,'After meal'),
 (4 ,2 ,1 ,'1+0+1',3,6 ,'If fever'),
 (5 ,3 ,3 ,'1+0+0',14,14,'Before breakfast'),
 (6 ,3 ,18,'1+0+1',5,10,'After meal'),
 (7 ,4 ,19,'0+0+1',5,5 ,'At night'),
 (8 ,5 ,13,'1+0+1',30,60,'After meal'),
 (9 ,6 ,3 ,'1+0+0',7,7 ,'Before breakfast'),
 (10,7 ,8 ,'1+1+1',5,15,'After meal'),
 (11,7 ,1 ,'1+1+1',3,9 ,'For pain'),
 (12,8 ,16,'1 drop x3',7,1 ,'Both eyes'),
 (13,9 ,12,'1 sachet',3,9 ,'After loose motion'),
 (14,9 ,8 ,'1+0+1',5,10,'After meal'),
 (15,10,14,'1+0+0',30,30,'Before breakfast'),
 (16,11,6 ,'0+0+1',7,7 ,'At night'),
 (17,11,7 ,'0+0+1',10,10,'At night'),
 (18,12,21,'5 drops x2',15,1,'In water'),
 (19,12,24,'5 drops x2',15,1,'In water');

-- ---------- 12. MEDICINE_DISPENSE (patient derived via item->prescription->visit) ----------
-- Students & homeo = 0 charge; teachers/staff/family = cost price * qty.
INSERT INTO medicine_dispense (dispense_id, prescription_item_id, dispensed_quantity, dispense_datetime, charged_amount, dispensed_by) VALUES
 (1 ,1 ,15,'2026-01-04 09:10',0.00 ,'Md. Rubel Mahmud'),     -- student (v1, p1) free
 (2 ,2 ,5 ,'2026-01-04 09:10',0.00 ,'Md. Rubel Mahmud'),
 (3 ,3 ,14,'2026-01-04 09:20',0.00 ,'Mst. Fahima Akter'),    -- student (v2, p3) free
 (4 ,5 ,14,'2026-01-04 09:45',0.00 ,'Mst. Fahima Akter'),    -- student (v3, p2) free
 (5 ,10,15,'2026-01-05 09:35',0.00 ,'Bisawjit Talukdar'),    -- student (v7, p7) free
 (6 ,13,9 ,'2026-01-05 10:10',0.00 ,'Md. Rubel Mahmud'),     -- student (v9, p9) free
 (7 ,15,30,'2026-01-06 10:40',225.00,'Md. Rubel Mahmud'),    -- teacher (v10, p11): 30 * 7.50
 (8 ,16,7 ,'2026-01-06 10:55',49.00 ,'Mst. Fahima Akter'),   -- teacher (v11, p12): 7 * 7.00
 (9 ,17,10,'2026-01-06 10:55',120.00,'Mst. Fahima Akter'),   -- teacher (v11, p12): 10 * 12.00
 (10,18,1 ,'2026-01-07 09:05',0.00 ,'Md. Rubel Mahmud'),     -- homeo free (v12, staff p14)
 (11,19,1 ,'2026-01-07 09:05',0.00 ,'Md. Rubel Mahmud');

-- ---------- 13. DIAGNOSTIC_TEST ----------
INSERT INTO diagnostic_test (test_id, test_name, test_category, sample_type, price, normal_range, available_days) VALUES
 (1 ,'CBC','PATHOLOGY','Blood',0.00,'WBC 4-11 x10^9/L','SAT-THU'),
 (2 ,'PBF','PATHOLOGY','Blood',0.00,'-','SAT-THU'),
 (3 ,'FBS','PATHOLOGY','Blood',0.00,'3.9-5.5 mmol/L','SAT-THU'),
 (4 ,'RBS','PATHOLOGY','Blood',0.00,'<7.8 mmol/L','SAT-THU'),
 (5 ,'Blood Sugar 2hrs ABF','PATHOLOGY','Blood',0.00,'<7.8 mmol/L','SAT-THU'),
 (6 ,'Serum Bilirubin','PATHOLOGY','Blood',0.00,'0.3-1.2 mg/dL','SAT-THU'),
 (7 ,'SGPT','PATHOLOGY','Blood',0.00,'7-56 U/L','SAT-THU'),
 (8 ,'Serum Creatinine','PATHOLOGY','Blood',0.00,'0.6-1.3 mg/dL','SAT-THU'),
 (9 ,'Lipid Profile (F)','PATHOLOGY','Blood',0.00,'-','SAT-THU'),
 (10,'Urine R/E','PATHOLOGY','Urine',0.00,'-','SAT-THU'),
 (11,'Stool R/E','PATHOLOGY','Stool',0.00,'-','SAT-THU'),
 (12,'HbA1C','PATHOLOGY','Blood',0.00,'<5.7%','SAT-THU'),
 (13,'X-ray Chest P/A','RADIOLOGY',NULL,0.00,'-','SAT-THU'),
 (14,'ECG','ECG',NULL,0.00,'-','SAT-THU'),
 (15,'Ultrasonogram W/A','ULTRASOUND',NULL,0.00,'-','TUE,WED,THU');

-- ---------- 14. TEST_ORDER ----------
INSERT INTO test_order (order_id, visit_id, patient_id, test_id, ordered_by, order_datetime, sample_collected_at, status, result_value, result_date, remarks) VALUES
 (1 ,5 ,5 ,1 ,3 ,'2026-01-05 08:45','2026-01-05 09:30','COMPLETED','Hb 9.8 g/dL (low)','2026-01-05','Anaemia confirmed'),
 (2 ,5 ,5 ,2 ,3 ,'2026-01-05 08:45','2026-01-05 09:30','COMPLETED','Microcytic hypochromic','2026-01-05',NULL),
 (3 ,10,11,9 ,4 ,'2026-01-06 10:25','2026-01-06 08:10','COMPLETED','LDL 165 mg/dL (high)','2026-01-06','Advise statin'),
 (4 ,10,11,14,4 ,'2026-01-06 10:25',NULL,'ORDERED',NULL,NULL,'ECG pending'),
 (5 ,13,16,8 ,7 ,'2026-01-07 23:50','2026-01-08 06:30','COMPLETED','1.1 mg/dL (normal)','2026-01-08',NULL),
 (6 ,13,16,15,7 ,'2026-01-07 23:50',NULL,'ORDERED',NULL,NULL,'USG KUB on Tue'),
 (7 ,11,12,13,2 ,'2026-01-06 10:40','2026-01-06 11:00','COMPLETED','Mild bronchovascular markings','2026-01-06',NULL),
 (8 ,9 ,9 ,11,7 ,'2026-01-05 10:05','2026-01-05 10:40','COMPLETED','Pus cells present','2026-01-05',NULL),
 (9 ,1 ,1 ,4 ,4 ,'2026-01-04 08:55','2026-01-04 09:20','COMPLETED','5.6 mmol/L (normal)','2026-01-04',NULL),
 (10,14,19,1 ,13,'2026-01-08 02:30','2026-01-08 03:00','SAMPLE_COLLECTED',NULL,NULL,'Child, urgent'),
 (11,6 ,6 ,3 ,13,'2026-01-05 09:00',NULL,'CANCELLED',NULL,NULL,'Patient declined'),
 (12,12,14,12,31,'2026-01-07 08:55','2026-01-07 09:20','COMPLETED','5.9% (pre-diabetic)','2026-01-07',NULL);

-- ---------- 15. BED (30 isolation beds; occupancy is derived, not stored) ----------
INSERT INTO bed (bed_id, bed_number, ward_type, disease_category)
SELECT g,
       'ISO-' || lpad(g::text,2,'0'),
       'ISOLATION',
       CASE WHEN g<=10 THEN 'Chicken Pox' WHEN g<=20 THEN 'Mumps' ELSE 'General Contagious' END
FROM generate_series(1,30) g;

-- ---------- 16. WARD_ADMISSION ----------
INSERT INTO ward_admission (admission_id, patient_id, bed_id, attending_doctor_id, admit_datetime, discharge_datetime, disease, status) VALUES
 (1,3 ,1 ,4 ,'2026-01-02 11:00','2026-01-06 10:00','Chicken Pox','DISCHARGED'),
 (2,8 ,2 ,6 ,'2026-01-05 12:00',NULL,'Chicken Pox','ADMITTED'),
 (3,19,11,13,'2026-01-08 03:30',NULL,'Mumps','ADMITTED'),
 (4,7 ,12,20,'2026-01-03 09:00','2026-01-05 09:00','Mumps','DISCHARGED'),
 (5,9 ,3 ,7 ,'2026-01-05 14:00',NULL,'Chicken Pox','ADMITTED'),
 (6,4 ,4 ,2 ,'2026-01-01 10:00','2026-01-04 10:00','Measles','DISCHARGED');

-- (bed occupancy is now derived from ward_admission via the v_bed_occupancy view)

-- ---------- 17. AMBULANCE (the centre operates two ambulances) ----------
-- Reg/driver details are representative (not published); emergency mobile 01798762920 is real.
INSERT INTO ambulance (ambulance_id, registration_no, model, capacity, driver_name, driver_phone, status) VALUES
 (1,'Dhaka Metro-Ga-13-2045','Toyota Hiace',2,'Md. Jashim Uddin','01798762920','IN_SERVICE'),
 (2,'Dhaka Metro-Ga-11-7788','Nissan Urvan',2,'Md. Sohel Rana','01711000022','MAINTENANCE');

-- ---------- 18. AMBULANCE_DISPATCH (trip log; patient/authorizer may be NULL) ----------
INSERT INTO ambulance_dispatch (dispatch_id, ambulance_id, patient_id, authorized_by, dispatch_datetime, return_datetime, origin, destination, trip_type, requested_by, status, remarks) VALUES
 (1,1,16,7 ,'2026-01-07 23:55','2026-01-08 01:30','Medical Centre','Dhaka Medical College Hospital','EMERGENCY','Night duty MO','COMPLETED','Renal colic transfer'),
 (2,1,19,13,'2026-01-08 02:30','2026-01-08 03:45','Medical Centre','BSMMU','EMERGENCY','Night duty MO','COMPLETED','Child high fever'),
 (3,2,NULL,NULL,'2026-01-05 14:00','2026-01-05 16:00','Medical Centre','Square Hospital','TRANSFER','Hall authority (call slip)','COMPLETED','Staff family member'),
 (4,1,8 ,2 ,'2026-01-06 09:30','2026-01-06 10:30','Surja Sen Hall','Medical Centre','PICKUP','Hall authority (call slip)','COMPLETED','Chicken pox admission'),
 (5,1,NULL,7 ,'2026-01-09 09:15',NULL,'Medical Centre','Holy Family Hospital','EMERGENCY','Emergency desk','DISPATCHED','Currently on call'),
 (6,2,3 ,4 ,'2026-01-02 11:20',NULL,'Medical Centre','Birdem Hospital','REFERRAL','Hall authority (call slip)','CANCELLED','Patient declined transfer');

-- ---------- 19. APP_USER (passwords are placeholder bcrypt hashes) ----------
-- email_verified = TRUE for seed users so login works immediately.
-- In production, new users start with email_verified = FALSE until they click the verification link.
INSERT INTO app_user (user_id, username, password_hash, role, doctor_id, patient_id, email, verification_token, email_verified, is_active) VALUES
 (1,'mashfikuzzaman','$2b$10$placeholderhashadminxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx','ADMIN',NULL,NULL,'mashfikuzzaman-2023415968@cs.du.ac.bd',NULL,TRUE,TRUE),
 (2,'dr.tanvir',   '$2b$10$placeholderhashdoc1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx','DOCTOR',1,NULL,'cmo.dumc@gmail.com',NULL,TRUE,TRUE),
 (3,'dr.razia',    '$2b$10$placeholderhashdoc2xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx','DOCTOR',2,NULL,'raziarahman1973@gmail.com',NULL,TRUE,TRUE),
 (4,'reception1',  '$2b$10$placeholderhashrecpxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx','RECEPTIONIST',NULL,NULL,'reception@mmcms.du.ac.bd',NULL,TRUE,TRUE),
 (5,'pharm.rubel', '$2b$10$placeholderhashpharxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx','PHARMACIST',NULL,NULL,'rubel@mmcms.du.ac.bd',NULL,TRUE,TRUE),
 (6,'lab.faruque', '$2b$10$placeholderhashlabxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx','LAB_TECH',NULL,NULL,'faruque355.du@gmail.com',NULL,TRUE,TRUE),
 (7,'patient.rakib','$2b$10$placeholderhashpat1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx','PATIENT',NULL,1,'rakib@example.com',NULL,TRUE,TRUE);

-- ---------- reset all sequences so future inserts don't collide ----------
SELECT setval('unit_unit_id_seq',             (SELECT MAX(unit_id) FROM unit));
SELECT setval('doctor_doctor_id_seq',         (SELECT MAX(doctor_id) FROM doctor));
SELECT setval('patient_patient_id_seq',       (SELECT MAX(patient_id) FROM patient));
SELECT setval('health_card_card_id_seq',      (SELECT MAX(card_id) FROM health_card));
SELECT setval('shift_shift_id_seq',           (SELECT MAX(shift_id) FROM shift));
SELECT setval('duty_roster_roster_id_seq',    (SELECT MAX(roster_id) FROM duty_roster));
SELECT setval('token_token_id_seq',           (SELECT MAX(token_id) FROM token));
SELECT setval('visit_visit_id_seq',           (SELECT MAX(visit_id) FROM visit));
SELECT setval('prescription_prescription_id_seq',(SELECT MAX(prescription_id) FROM prescription));
SELECT setval('medicine_medicine_id_seq',     (SELECT MAX(medicine_id) FROM medicine));
SELECT setval('prescription_item_item_id_seq',(SELECT MAX(item_id) FROM prescription_item));
SELECT setval('medicine_dispense_dispense_id_seq',(SELECT MAX(dispense_id) FROM medicine_dispense));
SELECT setval('diagnostic_test_test_id_seq',  (SELECT MAX(test_id) FROM diagnostic_test));
SELECT setval('test_order_order_id_seq',      (SELECT MAX(order_id) FROM test_order));
SELECT setval('bed_bed_id_seq',               (SELECT MAX(bed_id) FROM bed));
SELECT setval('ward_admission_admission_id_seq',(SELECT MAX(admission_id) FROM ward_admission));
SELECT setval('ambulance_ambulance_id_seq',   (SELECT MAX(ambulance_id) FROM ambulance));
SELECT setval('ambulance_dispatch_dispatch_id_seq',(SELECT MAX(dispatch_id) FROM ambulance_dispatch));
SELECT setval('app_user_user_id_seq',         (SELECT MAX(user_id) FROM app_user));

-- ---------- token_request ----------
INSERT INTO token_request (request_id, patient_id, unit_id, preferred_date, reason, status, reject_reason, created_at, reviewed_by, reviewed_at, token_id) VALUES
 (1, 1, 1, '2026-01-04', 'Fever and headache for 3 days', 'APPROVED', NULL, '2026-01-03 20:00', 4, '2026-01-04 07:50', 1),
 (2, 4, 2, '2026-01-04', 'Recurring migraine', 'APPROVED', NULL, '2026-01-03 21:00', 4, '2026-01-04 07:55', 4),
 (3, 5, 1, '2026-01-05', 'Body ache and weakness', 'APPROVED', NULL, '2026-01-04 19:00', 4, '2026-01-05 07:45', 6),
 (4, 10, 1, '2026-01-10', 'Routine checkup', 'REJECTED', 'Health card expired. Please renew at reception.', '2026-01-09 18:00', 4, '2026-01-09 19:00', NULL),
 (5, 3, 3, '2026-01-12', 'Toothache lower molar', 'PENDING', NULL, '2026-01-11 22:00', NULL, NULL, NULL),
 (6, 2, 4, '2026-01-12', 'Red itchy eyes for 2 days', 'PENDING', NULL, '2026-01-11 23:30', NULL, NULL, NULL);

SELECT setval('token_request_request_id_seq', (SELECT MAX(request_id) FROM token_request));
