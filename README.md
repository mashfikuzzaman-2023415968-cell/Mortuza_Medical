<div align="center">

# MDC Web Portal — MMCMS

### Mortuza Medical Centre Management System

**Shaheed Buddhijibi Dr. Mohammad Mortuza Medical Centre — University of Dhaka**

A full-stack, role-based hospital management system digitising the complete patient
journey: registration → health card → token → consultation → prescription →
dispensing → diagnostics → admission → ambulance.

`PostgreSQL` · `Node.js` · `Express` · `React 19` · `Vite` · `Tailwind CSS v4` · `Claude AI`

*CSE-2201 Database Management System — 2nd Year 2nd Semester Lab Project*

</div>

---

## Table of Contents

1. [Overview](#1-overview)
2. [What Makes This Project Stand Out](#2-what-makes-this-project-stand-out)
3. [Tech Stack](#3-tech-stack)
4. [System Architecture](#4-system-architecture)
5. [Database Design](#5-database-design)
6. [Roles & Capabilities](#6-roles--capabilities)
7. [Core Feature Walkthroughs](#7-core-feature-walkthroughs)
8. [The AI Health Assistant](#8-the-ai-health-assistant)
9. [Design System & UI Engineering](#9-design-system--ui-engineering)
10. [Security Model](#10-security-model)
11. [API Reference](#11-api-reference)
12. [Getting Started](#12-getting-started)
13. [Make Command Reference](#13-make-command-reference)
14. [Environment Variables](#14-environment-variables)
15. [Demo Accounts](#15-demo-accounts)
16. [Project Structure](#16-project-structure)
17. [Live Demo / Data-Entry Mode](#17-live-demo--data-entry-mode)
18. [Manual Testing Guide](#18-manual-testing-guide)
19. [Troubleshooting](#19-troubleshooting)
20. [Course Requirement Coverage](#20-course-requirement-coverage)

---

## 1. Overview

The Shaheed Buddhijibi Dr. Mohammad Mortuza Medical Centre serves the students, teachers,
staff, and dependent family members of the University of Dhaka with free medical care and
free pathology. It runs 24/7 across an outpatient department, dental, eye, homeo,
physiotherapy and radiology units, a dispensary, a 30-bed isolation ward for contagious
diseases, and an ambulance fleet.

**MMCMS** turns that operation into software. It is not a CRUD demo — it models the real
clinical workflow, with each role seeing only the slice of the system they actually
operate, and with clinical rules enforced in the database itself rather than trusted to
the UI.

**At a glance**

| | |
|---|---|
| **Tables** | 20 (all in BCNF, lossless-join & dependency-preserving) |
| **Views** | 6 (including a view built on a view) |
| **Demo queries** | 24 (Q1–Q23 + Q8b) covering every required SQL construct |
| **API endpoints** | 92 across 21 routers |
| **Roles** | 6, each with a distinct dashboard and navigation |
| **Frontend pages** | 62 React pages & components |
| **Integrity devices** | CHECK constraints, a partial unique index, a PL/pgSQL trigger |

---

## 2. What Makes This Project Stand Out

These are the decisions that separate this from a standard lab submission.

### 2.1 Derived state instead of stored flags

A typical design stores `bed.is_occupied` and `ambulance.is_available` — then spends the
rest of its life fighting the bugs where those flags drift out of sync with reality.

**This schema stores neither.**

- A bed is occupied **iff** a `ward_admission` row references it with `status = 'ADMITTED'`.
- An ambulance is on a trip **iff** an `ambulance_dispatch` row for it is still open.

Occupancy is computed by `v_bed_status` / `v_ambulance_status`. There is exactly one source
of truth, so the "bed says free but a patient is in it" class of bug is **structurally
impossible**, not merely unlikely.

### 2.2 Rules the application cannot bypass

Integrity is enforced where it cannot be forgotten — in PostgreSQL:

- **`uq_bed_active_admission`** — a *partial* unique index (`ON ward_admission (bed_id) WHERE status = 'ADMITTED'`).
  One live patient per bed, while discharged rows remain for history. Two doctors racing
  for the last bed: one wins, the other gets a clean `409 That bed was just taken.`
- **`chk_role_link`** — a doctor login must point at a `doctor` row, a patient login at a
  `patient` row, and staff logins at neither. A privilege-mismatched account cannot exist.
- **`chk_student_has_id`** — a `STUDENT` patient always carries a `university_id`.
- **`visit_token_patient_match`** — a PL/pgSQL `BEFORE` trigger. A visit recorded against a
  token must belong to that token's patient. This is a cross-table rule a foreign key
  cannot express, so it raises `ERRCODE 23514` and the API turns it into a friendly message.

### 2.3 No redundant foreign keys

`token` deliberately has **no** `patient_id`: the patient is reachable via
`token → health_card → patient`. `medicine_dispense` has none either — the chain is
`dispense → prescription_item → prescription → visit → patient`. Redundant columns are
denormalisation waiting to disagree with itself. Queries Q2, Q14 and Q18 demonstrate the
join-through explicitly.

### 2.4 Identity binding you can't spoof

Patient self-registration is the classic weak point: if knowing a printed University ID is
enough to claim an account, the portal leaks medical records.

Here, the verification link is sent **only to the email already on file** for that patient
record — never to an address typed into the signup form. Knowing the ID gets you nowhere;
you must control the registered inbox. If no email is on file, registration is refused with
instructions to visit reception in person.

### 2.5 An AI assistant grounded in the patient's own records

A Claude-powered health assistant that answers from **this patient's actual database rows**
— their medications, diagnoses, vitals, test results with normal ranges, and missed
follow-ups — while refusing to diagnose, refusing to alter prescriptions, escalating red-flag
symptoms to the emergency number, and speaking English or Bangla to match the patient.

### 2.6 Clinical realism in the workflow split

Bed admission is **doctor-only**, not receptionist-operable — because admission is a clinical
decision, not a clerical one. The clerical half (*which* bed) is automated: the system picks
the lowest-numbered free bed. This mirrors how a real centre works and is defensible under
questioning.

### 2.7 Production-grade frontend engineering

Genuinely hard-won details, not decoration:

- **Print that actually works.** Browsers freeze CSS animations at their *first* keyframe when
  printing — an entrance animation starting at `opacity: 0` prints a blank page. Print rules
  neutralise animation state; the modal backdrop is never `display: none` (that would kill the
  whole subtree); `print-color-adjust: exact` keeps the branding.
- **Transform traps.** A CSS `transform` on an ancestor creates a containing block that traps
  `position: fixed` children. The welcome splash is therefore portalled to `document.body`.
- **Animation that degrades.** `requestAnimationFrame` starves in throttled/background tabs, so
  every count-up carries a safety timer that lands on the exact target value.
- **`prefers-reduced-motion`** is honoured across every animation, including descendants.

---

## 3. Tech Stack

### Database
| Package | Purpose |
|---|---|
| **PostgreSQL 14+** | Relational store; partial indexes, PL/pgSQL triggers, `FILTER`, CTEs, window-free aggregates |

### Backend (`server/`)
| Package | Purpose |
|---|---|
| `express` ^4.19 | HTTP framework |
| `pg` ^8.11 | PostgreSQL driver (connection pool) |
| `jsonwebtoken` ^9 | JWT issue/verify |
| `bcryptjs` ^2.4 | Password hashing (10 rounds) |
| `helmet` ^8.2 | Security headers |
| `cors` ^2.8 | Origin-locked CORS |
| `express-rate-limit` ^8.5 | Brute-force / abuse protection |
| `multer` ^2.2 | Patient photo uploads |
| `nodemailer` ^9 | Verification / approval / result emails |
| `@anthropic-ai/sdk` ^0.111 | Claude Haiku 4.5 health assistant |
| `dotenv` ^16.4 | Config |
| `uuid` ^14 | Upload filenames |
| `nodemon` (dev) | Auto-reload |

### Frontend (`client/`)
| Package | Purpose |
|---|---|
| `react` ^19.2 / `react-dom` | UI runtime |
| `vite` ^5.4 | Dev server + build |
| `tailwindcss` ^4.3 + `@tailwindcss/vite` | Styling (v4 engine) |
| `react-router-dom` ^7.17 | Routing |
| `axios` ^1.18 | HTTP client + interceptors |
| `recharts` ^3.8 | Analytics charts |
| `lucide-react` ^1.18 | Icon set |
| `eslint` ^10 | Linting |

---

## 4. System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│  BROWSER — React 19 SPA (Vite :5173)                             │
│                                                                  │
│  AuthProvider (JWT + user in localStorage)                       │
│  ThemeProvider (light / deep-teal dark, persisted)               │
│         │                                                        │
│  BrowserRouter                                                   │
│    /login /register  → LoginPage (combined journey panel)        │
│    /verify-email     → VerifyEmailPage                           │
│    /                 → ProtectedRoute → DashboardHome            │
│                          │                                       │
│                     DashboardLayout                              │
│                     (sidebar · LiveClock · ⌘K · theme · splash)  │
│                          │                                       │
│                     role → NAV[role] → page component            │
│                     ADMIN │ RECEPTIONIST │ DOCTOR                │
│                     PHARMACIST │ LAB_TECH │ PATIENT              │
└────────────────────────────┬─────────────────────────────────────┘
                             │ axios  (Bearer JWT auto-attached;
                             │         401 → session-expired → /login)
┌────────────────────────────▼─────────────────────────────────────┐
│  API — Node + Express (:5000)                                    │
│                                                                  │
│  helmet → cors(CLIENT_URL) → json(1mb) → rate limiters           │
│                          │                                       │
│  verifyToken  →  authorize(...roles)   (ADMIN bypasses)          │
│                          │                                       │
│  21 routers: auth users patients health-cards tokens units       │
│    visits prescriptions test-orders diagnostic-tests admissions  │
│    beds roster medicines dispense doctors ambulances reports     │
│    token-requests health-analytics chat  (+ /api/health)         │
└────────────────────────────┬─────────────────────────────────────┘
                             │ pg Pool (parameterised SQL only)
┌────────────────────────────▼─────────────────────────────────────┐
│  PostgreSQL — 20 tables · 6 views · CHECKs · partial unique      │
│               index · PL/pgSQL trigger                           │
└──────────────────────────────────────────────────────────────────┘
        │                                    │
        ▼                                    ▼
  Anthropic Claude API                  SMTP (nodemailer)
  (Haiku 4.5, patient-only)             verification · approval · results
```

**Request lifecycle.** Every API call carries `Authorization: Bearer <jwt>`, injected by an
axios interceptor. `verifyToken` validates the signature and attaches the payload
(`user_id`, `username`, `role`, `doctor_id`, `patient_id`) to `req.user`. `authorize(...roles)`
then gates by role. A `401` anywhere clears the session and bounces to `/login` with a
"session expired" notice — but only if the user *was* signed in, so a failed login (also a
401) doesn't produce a misleading message.

---

## 5. Database Design

### 5.1 Entity map

```
unit ──< doctor ──< duty_roster >── shift
 │         │
 │         ├──< visit >── patient ──< health_card ──< token >── unit
 │         │      │                       │
 │         │      ├──< prescription ──< prescription_item >── medicine
 │         │      │                            │
 │         │      │                            └──< medicine_dispense
 │         │      └──< test_order >── diagnostic_test
 │         │
 │         ├──< ward_admission >── bed
 │         └──< ambulance_dispatch >── ambulance
 │
 └──< token_request >── patient          app_user ── doctor / patient
```

### 5.2 The 20 tables

| # | Table | Purpose | Notable constraints |
|---|---|---|---|
| 1 | `unit` | Clinical units (OPD, dental, eye, homeo, physio, pathology, radiology) | `unit_type` CHECK; unique name |
| 2 | `doctor` | Doctors incl. part-time flag | unique `bmdc_reg_no`; `doctor_type` CHECK |
| 3 | `patient` | Students, teachers, staff, family | `chk_student_has_id`; self-FK `guardian_id`; blood-group CHECK |
| 4 | `health_card` | One card per patient | `UNIQUE(patient_id)`; `expiry_date > issue_date` |
| 5 | `shift` | Named time windows | unique name |
| 6 | `duty_roster` | Doctor × shift × date | `UNIQUE(doctor_id, duty_date, shift_id)` |
| 7 | `token` | Queue tokens | `UNIQUE(unit_id, token_date, token_number)`; **no** `patient_id` |
| 8 | `visit` | Consultations + vitals | `UNIQUE(token_id)`; temp/weight CHECKs; **trigger-guarded** |
| 9 | `prescription` | One per visit | `UNIQUE(visit_id)` |
| 10 | `medicine` | Dispensary catalogue | `UNIQUE(name, strength, manufacturer)`; stock ≥ 0 |
| 11 | `prescription_item` | Line items | `UNIQUE(prescription_id, medicine_id)`; qty > 0 |
| 12 | `medicine_dispense` | Dispensing events | **no** `patient_id` (join-through) |
| 13 | `diagnostic_test` | Test catalogue | unique name; category CHECK |
| 14 | `test_order` | Ordered tests | keeps `patient_id` (walk-ins have no visit) |
| 15 | `bed` | 30 isolation beds | **no** `is_occupied` flag |
| 16 | `ward_admission` | Admissions | **`uq_bed_active_admission`** partial unique index |
| 17 | `ambulance` | Fleet | status CHECK |
| 18 | `ambulance_dispatch` | Trips | `return > dispatch` CHECK |
| 19 | `app_user` | Logins | **`chk_role_link`**; email verification fields |
| 20 | `token_request` | Online token requests | status CHECK; reviewer FK |

### 5.3 Normalisation — the deliberate design

Normalisation here is an argued position, not an accident. Every table is in **BCNF**, and the
few places that *look* like redundancy are deliberate decisions with a stated reason.

#### 5.3.1 The progression

**1NF — atomic attributes, no repeating groups.**
Multi-valued facts are separate tables, never delimited strings: a prescription's medicines live
in `prescription_item` (not a `medicines` text column); a doctor's duty days live in `duty_roster`
(not a `days` list). *One documented exception — see §5.3.6.*

**2NF — no partial dependency on part of a composite key.**
Every table has a single-column surrogate `SERIAL` primary key, so no non-key attribute can depend
on *part* of the key — 2NF holds trivially. Where a natural composite candidate key exists
(`token(unit_id, token_date, token_number)`, `prescription_item(prescription_id, medicine_id)`,
`duty_roster(doctor_id, duty_date, shift_id)`) it is declared `UNIQUE`, and the remaining
attributes depend on the whole key, not a prefix.

**3NF — no transitive dependency.**
No non-key attribute determines another. A doctor's `specialization` doesn't determine their
`unit_id`; a patient's `academic_dept` doesn't determine their `hall_name`. Anything that
*would* be transitively derived is either normalised out to its own table or computed in a view.

**BCNF — every determinant is a superkey.**
This is where the design is deliberate. A relation sits in 3NF-but-not-BCNF when some determinant
is *not* a superkey but its dependent is a prime attribute. That case cannot arise here, because
of a rule applied consistently across all 20 tables:

> **Every candidate key is declared.** Each table has a surrogate PK, and *every* alternate
> candidate key carries a `UNIQUE` constraint. So every determinant is, by construction, a
> superkey — which is precisely the BCNF condition.

#### 5.3.2 Functional dependencies of the core relations

| Relation | Functional dependencies | Candidate keys | Form |
|---|---|---|---|
| `unit` | `unit_id → *` ; `unit_name → unit_id` | `unit_id`, `unit_name` | BCNF |
| `doctor` | `doctor_id → *` ; `bmdc_reg_no → doctor_id` ; `email → doctor_id` | all three | BCNF |
| `patient` | `patient_id → *` ; `university_id → patient_id` | both | BCNF |
| `health_card` | `card_id → *` ; `card_number → card_id` ; **`patient_id → card_id`** | all three | BCNF |
| `token` | `token_id → *` ; `(unit_id, token_date, token_number) → token_id` | both | BCNF |
| `visit` | `visit_id → *` ; `token_id → visit_id` | both | BCNF |
| `prescription` | `prescription_id → *` ; `visit_id → prescription_id` | both | BCNF |
| `prescription_item` | `item_id → *` ; `(prescription_id, medicine_id) → item_id` | both | BCNF |
| `medicine` | `medicine_id → *` ; `(medicine_name, strength, manufacturer) → medicine_id` | both | BCNF |
| `duty_roster` | `roster_id → *` ; `(doctor_id, duty_date, shift_id) → roster_id` | both | BCNF |
| `app_user` | `user_id → *` ; `username → user_id` | both | BCNF |

`health_card.patient_id → card_id` is the interesting one: because `patient_id` is `UNIQUE`
(not merely a foreign key), it is a *candidate key*, which is what encodes the
**one-card-per-patient** business rule in the schema itself rather than in application code.

#### 5.3.3 Lossless-join decomposition

Every relationship is decomposed across a foreign key that references the **primary key** of the
parent. The shared attribute is therefore a superkey of the parent relation, which satisfies the
standard lossless-join condition:

> For a decomposition of *R* into *R₁* and *R₂*, the join is lossless if
> *R₁ ∩ R₂ → R₁* **or** *R₁ ∩ R₂ → R₂*.

Here `R₁ ∩ R₂` is always the parent's key, so it functionally determines the whole parent
relation. Rejoining reconstructs the original data exactly — **no spurious tuples**, for any
join path in the schema.

#### 5.3.4 Dependency preservation — and the rules that aren't FDs

Every functional dependency is enforceable **inside a single table** by a `PRIMARY KEY` or
`UNIQUE` constraint. No FD is split across a decomposition, so no FD needs a join to check:
the design is **dependency preserving**, and none of the constraints above would require a
cross-table lookup to validate.

The sharp point is what's left over. Two of the system's genuine business rules are **not
functional dependencies at all** — they're *inter-relational* constraints, which no normal form
addresses and which `UNIQUE`/`CHECK` cannot express:

| Rule | Why an FD can't express it | Enforced by |
|---|---|---|
| One `ADMITTED` patient per bed, but unlimited discharged history | It's a uniqueness rule over a *subset of rows* (`WHERE status='ADMITTED'`), not over the relation | **Partial unique index** `uq_bed_active_admission` |
| A visit's patient must equal its token's patient | Spans `visit → token → health_card → patient`; a FK can only check existence, not agreement | **PL/pgSQL `BEFORE` trigger** `visit_token_patient_match` |

Recognising that these fall *outside* normalisation — rather than trying to normalise them away
— is the design decision. Normal forms remove redundancy; they say nothing about cross-table
agreement, so those two rules are pushed down into PostgreSQL where the application cannot skip them.

#### 5.3.5 Deliberate decisions about redundancy

**(a) No redundant foreign keys — join through instead.**
`token` has **no** `patient_id` (reach it via `token → health_card → patient`), and
`medicine_dispense` has none either (`dispense → prescription_item → prescription → visit → patient`).
Storing the shortcut would mean the same fact in two places — the definition of an update anomaly
waiting to happen. Queries **Q2, Q14 and Q18** demonstrate the join-through paths explicitly.

**(b) Controlled redundancy where a foreign key is nullable — closed by a trigger.**
`visit` holds **both** `token_id` and `patient_id`. If `token_id` were mandatory, `patient_id`
would be transitively derivable and therefore redundant. But `token_id` is **nullable** — emergency
and walk-in visits have no token — so there is no FD `token_id → patient_id` across the whole
relation, and `patient_id` must be stored. That is normalisation-legal.

It does, however, open a *consistency* gap in the rows where both are present: the two could
disagree. Rather than accept it, the schema closes it with the `visit_token_patient_match` trigger.
**This is the single most deliberate decision in the design** — a redundancy that normalisation
permits but reality doesn't, so it's enforced explicitly.

**(c) `test_order.patient_id` — the same shape, for the same reason.**
`test_order.visit_id` is nullable (walk-in tests are ordered without a consultation), so
`patient_id` is stored and is not a normalisation violation. *Known trade-off:* when `visit_id`
**is** present, nothing currently enforces `test_order.patient_id = visit.patient_id`. The fix is
the pattern already established in (b) — the same `BEFORE` trigger shape — and it's the first
thing to add if walk-in and visit-linked orders ever need reconciling.

**(d) Derived state is never stored.**
No `bed.is_occupied`, no `ambulance.is_available`. A stored flag duplicates a fact that
`ward_admission` / `ambulance_dispatch` already hold, and duplicated facts drift. Occupancy is
computed in `v_bed_status` / `v_ambulance_status` (§2.1) — redundancy eliminated by *computation*
rather than by decomposition.

**(e) `token.token_date` is a plain defaulted column, not `GENERATED`.**
Making it `GENERATED ALWAYS AS (issue_datetime::date) STORED` was evaluated and **rejected**.
It looks like a tidy way to remove a derivable column, but it changes token-dating behaviour
around midnight and is a breaking change to queue logic that numbers tokens per
`(unit_id, token_date)`. Correct behaviour beat theoretical purity — deliberately.

#### 5.3.6 Documented 1NF trade-off

`diagnostic_test.available_days` stores values like `'SAT-THU'` and **`'TUE,WED,THU'`**. That
comma-separated form is a multi-valued attribute and therefore **technically violates 1NF**.

It is a contained, conscious trade-off:

- The column is **display-only** — selected once by `GET /api/diagnostic-tests` and rendered
  verbatim in the lab catalogue table. It is never filtered, split, joined, or aggregated on.
- Strict 1NF would require a `test_available_day(test_id, day)` junction table, adding a join to
  every catalogue read to model static reference data that no query interrogates.
- **The moment a requirement like *"which tests run on Tuesday?"* appears, this must be
  decomposed** — a `LIKE '%TUE%'` predicate would be exactly the anomaly 1NF exists to prevent.

Documenting the violation and its boundary is more honest — and more useful — than claiming
perfect normalisation.

### 5.4 Schema design decisions

Normalisation (§5.3) settles *what the relations are*. These are the decisions about *how they're
declared* — each one a choice with an alternative that was rejected for a reason.

#### 5.4.1 Surrogate primary keys — on every table, deliberately

All 20 tables use a `SERIAL` surrogate PK, **even where a perfectly good natural key exists**:
`doctor.bmdc_reg_no`, `health_card.card_number`, `ambulance.registration_no`, `unit.unit_name`,
`diagnostic_test.test_name`, `bed.bed_number`.

| Why not use the natural key as the PK | |
|---|---|
| **Natural keys change** | A BMDC registration gets corrected; a health card is reprinted with a new number. A mutable PK means the change has to ripple through every referencing table. |
| **FK width and uniformity** | `INT` everywhere beats `VARCHAR(20)`/`VARCHAR(30)` foreign keys scattered across the schema. |
| **The BCNF payoff** | The natural key is still declared `UNIQUE` beside the surrogate — so it remains a *candidate key* and still enforces the real-world rule (§5.3.2). |

You get both: the **integrity** of the natural key and the **stability** of the surrogate. This is
also why the schema needs no `ON UPDATE CASCADE` anywhere — primary keys are generated and never
change, so there is nothing to cascade.

#### 5.4.2 `CHECK` constraints instead of `ENUM` types or lookup tables

**34 `CHECK` constraints. Zero `CREATE TYPE`. Zero status lookup tables.** Three options were on
the table for `token.status`, `patient_category`, `doctor_type`, `ward_type`, and the rest:

| Option | Why not |
|---|---|
| **Lookup table** (`token_status(id, name)`) | A join on every read, plus a table and FK, to model six values that change roughly never. Justified only if a status carried *attributes* (label, colour, sort order). |
| **PostgreSQL `ENUM`** | `ALTER TYPE … ADD VALUE` historically couldn't run inside a transaction, *removing* a value is still effectively impossible, and it's non-portable SQL. Rigid for something a hospital's vocabulary might revise. |
| **`VARCHAR` + `CHECK`** ✅ | Visible in `\d`, greppable, portable, altered with one statement, and enforced by the engine. |

The trade-off is honest: `CHECK` doesn't give you a typed domain, and the allowed values are
duplicated in the API's whitelists (§10.2(d)). That duplication is accepted deliberately — the two
lists are written from the same source and serve different purposes (a helpful `400` vs. a
last-line guarantee).

#### 5.4.3 No `ON DELETE CASCADE` — anywhere in the schema

> **There are zero `ON DELETE` and zero `ON UPDATE` clauses in `01_schema (2).sql`.** Every foreign
> key therefore uses the SQL default, `NO ACTION` — deletion of a referenced row is *refused*.

This is the single most consequential default in the schema, and it is a choice:

- **You cannot delete a patient who has visits.** PostgreSQL refuses. To remove them you must
  first deal with their visits, prescriptions, dispensing records, test orders and admissions —
  explicitly, in order.
- In a medical system a cascade is a **catastrophe**, not a convenience. `ON DELETE CASCADE` on
  `visit.patient_id` would mean one careless `DELETE FROM patient` silently erases the clinical
  history of that person across six tables, with no error and no trace.
- **Medical history is immutable by construction**, not by policy or code review.

This is exactly why `demo_reset.sql` must delete child rows before parents, in dependency order
(§17) — the database *forces* the destruction of history to be deliberate and explicit. That
friction is the feature. Where a record must "go away" in normal operation, it is **deactivated
instead** (§5.4.9).

#### 5.4.4 Nullable foreign keys encode business rules

`NULL` vs `NOT NULL` on a foreign key is a modelling statement about the domain. All **13**
nullable FKs are intentional:

| Column | What `NULL` means |
|---|---|
| `doctor.unit_id` | Not yet assigned — the admin assigns the unit at approval time (§7.7) |
| `patient.guardian_id` | Not a dependent; only `FAMILY` patients point at a guardian |
| `duty_roster.unit_id` | On-call duty that isn't tied to one unit |
| `visit.token_id` | **Walk-in or emergency visit** — no queue token was issued |
| `test_order.visit_id` | **Walk-in test** ordered without a consultation |
| `test_order.ordered_by` | No specific ordering doctor recorded |
| `ward_admission.attending_doctor_id` | Attending clinician not yet assigned |
| `ambulance_dispatch.patient_id` | Trip not tied to a patient (a `TRANSFER`/`PICKUP`/`OTHER` run) |
| `ambulance_dispatch.authorized_by` | Not authorised by a specific doctor |
| `app_user.doctor_id` / `app_user.patient_id` | A **staff** login links to neither — policed by `chk_role_link` |
| `token_request.reviewed_by` | Still `PENDING` — nobody has reviewed it |
| `token_request.token_id` | Not approved (yet) — set only when a token is actually issued |

The contrast is the point. In `ward_admission`, `patient_id` and `bed_id` are **`NOT NULL`** (an
admission with no patient or no bed is meaningless), while `attending_doctor_id` is nullable
(a real admission can precede the assignment). The schema says which facts are essential.

#### 5.4.5 `UNIQUE` + `NULL` — modelling "at most one"

SQL's `UNIQUE` permits **multiple `NULL`s**. Two declarations exploit that to express two
different cardinalities with the same keyword:

```sql
visit.token_id       INT UNIQUE REFERENCES token(token_id)              -- nullable + UNIQUE
health_card.patient_id INT NOT NULL UNIQUE REFERENCES patient(patient_id) -- NOT NULL + UNIQUE
```

| Declaration | Cardinality | Effect |
|---|---|---|
| `token_id INT UNIQUE` (nullable) | token → **at most one** visit | Each token yields at most one visit, **and unlimited walk-in visits coexist** with `token_id IS NULL`. `NOT NULL UNIQUE` would have banned walk-ins outright; no constraint would let one token spawn two visits. |
| `patient_id INT NOT NULL UNIQUE` | patient ↔ **exactly one** card | Strict 1:1 — every card has a patient, no patient has two cards. |
| `prescription.visit_id INT NOT NULL UNIQUE` | visit ↔ **exactly one** prescription | One prescription per consultation, enforced structurally |

Same keyword, three different business rules, selected by nullability.

#### 5.4.6 Exact numerics for money and measurements

**5 `NUMERIC` columns. Zero `FLOAT`, `REAL`, `DOUBLE PRECISION` or `MONEY`.**

```sql
unit_price     NUMERIC(8,2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0)
charged_amount NUMERIC(8,2) NOT NULL DEFAULT 0 CHECK (charged_amount >= 0)
price          NUMERIC(8,2) NOT NULL DEFAULT 0
temperature_f  NUMERIC(4,1) CHECK (temperature_f BETWEEN 90 AND 115)
weight_kg      NUMERIC(5,2) CHECK (weight_kg > 0)
```

- **Never binary floating point for money.** `FLOAT` can't represent `0.1` exactly, so
  `0.1 + 0.2 ≠ 0.3` and the dispensary revenue in `v_daily_dispensary` would drift by fractions
  of a taka that compound across every `SUM`. `NUMERIC` is exact decimal.
- **`MONEY` was rejected** — locale-dependent, fixed fractional precision set by a server setting,
  and painful to migrate.
- **Precision is sized to the domain**: `(8,2)` → up to ৳999,999.99; `(5,2)` → 999.99 kg.
- **The `CHECK` does the real validation.** `NUMERIC(4,1)` would happily store a temperature of
  `986.0` — a slipped decimal point on `98.6`. `CHECK (temperature_f BETWEEN 90 AND 115)` catches
  it. Type and constraint do different jobs.

#### 5.4.7 `TIMESTAMP` vs `DATE` — chosen per fact, not by habit

| Type | Columns | Why |
|---|---|---|
| **`TIMESTAMP`** | `issue_datetime`, `visit_datetime`, `dispense_datetime`, `order_datetime`, `sample_collected_at`, `admit_datetime`, `discharge_datetime`, `dispatch_datetime`, `return_datetime`, `created_at`, `reviewed_at` | Clinical and operational events happen at a **moment**, and durations are computed from them — Q22 averages ambulance trip minutes from `return_datetime - dispatch_datetime`, which a `DATE` could never support |
| **`DATE`** | `token_date`, `duty_date`, `prescription_date`, `next_visit_date`, `follow_up_date`, `expiry_date`, `issue_date`, `registration_date`, `joining_date`, `result_date`, `preferred_date` | These are **calendar facts**. A token belongs to a *day's* queue; a card expires on a *day*. Storing a time would invent precision that doesn't exist and break `= CURRENT_DATE` comparisons |

`token` deliberately carries **both** (`issue_datetime` *and* `token_date`) — the queue groups by
day while the audit trail keeps the moment. Why that isn't a `GENERATED` column is explained in
§5.3.5(e).

#### 5.4.8 Status columns are explicit state machines

Six lifecycles, every one `VARCHAR` + `CHECK` + a `DEFAULT` for the initial state:

| Table | Lifecycle |
|---|---|
| `token` | `WAITING` → `SERVED` / `CANCELLED` / `EXPIRED` |
| `test_order` | `ORDERED` → `SAMPLE_COLLECTED` → `COMPLETED` / `CANCELLED` |
| `ward_admission` | `ADMITTED` → `DISCHARGED` |
| `ambulance_dispatch` | `DISPATCHED` → `COMPLETED` / `CANCELLED` |
| `health_card` | `ACTIVE` → `EXPIRED` / `SUSPENDED` |
| `token_request` | `PENDING` → `APPROVED` / `REJECTED` |

Two deliberate properties:

1. **Every status has a `DEFAULT`** — a row cannot be born stateless. `INSERT INTO ward_admission`
   without a status is `ADMITTED`, which is the only sensible initial state.
2. **Terminal states are retained, never deleted.** This is what makes the rest of the design work:
   `status = 'ADMITTED'` *is* the live set, so the partial unique index (§5.3.4) and derived
   occupancy (§2.1) both key off it while `DISCHARGED` rows remain as history in the same table.

#### 5.4.9 Deactivate, don't delete

The mirror image of §5.4.3. Records that must leave circulation are **flagged**, not removed:

| Flag | Meaning |
|---|---|
| `unit.is_active = FALSE` | Unit closed — the API refuses to issue tokens for it, but its historical tokens survive |
| `app_user.is_active = FALSE` | Login disabled or awaiting approval (§7.7) |
| `health_card.status = 'SUSPENDED'` | Card blocked — token issue refused, history intact |
| `ambulance.status = 'RETIRED'` | Out of the fleet, but its dispatch history still reports in Q22 |

A retired ambulance still has trips; a closed unit still has tokens. Deleting either would be
blocked by §5.4.3 anyway — so the schema provides the *correct* mechanism instead, and every read
path filters on the flag.

#### 5.4.10 A re-runnable schema, written in dependency order

The file opens with a single `DROP TABLE IF EXISTS … CASCADE` naming all 20 tables in **reverse
dependency order**, so `make db-reset` is idempotent and the script can be re-run from scratch at
any time. The trigger function uses `CREATE OR REPLACE FUNCTION` for the same reason.

Creation then follows dependency order — and one ordering is load-bearing enough that the schema
comments call it out: **`token_request` is created last, after `app_user`**, because
`token_request.reviewed_by` references `app_user(user_id)`. `app_user` in turn must follow
`doctor` and `patient`. The file's physical order *is* the dependency graph, topologically sorted.

#### 5.4.11 Indexing — correct today, and the honest gap

> **The schema contains exactly one explicit index: `uq_bed_active_admission` — and it exists for
> _correctness_, not speed.** Everything else relies on the indexes PostgreSQL creates
> automatically for `PRIMARY KEY` and `UNIQUE` constraints.

The part that surprises people: **PostgreSQL does not automatically index foreign key columns.**
So `visit.patient_id`, `test_order.patient_id` and `prescription_item.prescription_id` have **no
index** — *"show me this patient's visit history"* is a sequential scan.

That is genuinely correct at this scale: with hundreds of rows the planner will pick a seq scan
over an index anyway, and unused indexes cost write throughput and disk. It is correct now and
wrong later. The first indexes to add when the data grows:

```sql
CREATE INDEX idx_visit_patient        ON visit (patient_id);
CREATE INDEX idx_visit_doctor_date    ON visit (doctor_id, visit_datetime DESC);
CREATE INDEX idx_test_order_patient   ON test_order (patient_id);
CREATE INDEX idx_prescription_item_rx ON prescription_item (prescription_id);
CREATE INDEX idx_ward_admission_pt    ON ward_admission (patient_id);
-- token(unit_id, token_date) already benefits from the UNIQUE(unit_id, token_date, token_number) index
```

Note that the usual second argument for indexing FK columns — *un-indexed FKs make parent
`DELETE`s slow, because each one scans the child table* — **does not apply here**: nothing
cascades and parent deletes are refused outright (§5.4.3), so that cost is never paid.

#### 5.4.12 Audit trail — a scoped-out gap, stated plainly

`created_at` exists on **two** tables (`app_user`, `token_request`). There is **no `updated_at`
anywhere**, and no history or audit table.

The consequence, stated honestly: you can see that a visit's diagnosis *is* X. You cannot see that
it said Y yesterday, when it changed, or who changed it.

For a course project that is a defensible scope line. **For a real medical system it is not** —
clinical records are legally required to be effectively append-only with a full audit trail. The
three standard shapes, in increasing order of rigour:

1. `created_at` / `updated_at` / `updated_by` on every clinical table, maintained by a
   `BEFORE UPDATE` trigger.
2. An append-only shadow table (`visit_history`) written by an `AFTER INSERT OR UPDATE` trigger —
   the same trigger machinery already proven by `visit_token_patient_match`.
3. System-versioned temporal tables (via an extension such as `temporal_tables`).

It is documented here rather than left for a reader to discover in the schema's silence.

### 5.5 The six views

| View | What it gives you |
|---|---|
| `v_patient_overview` | Patient + card number/status/expiry (LEFT JOIN — cardless patients still appear) |
| `v_doctor_workload` | Visits and prescriptions per doctor (`COUNT(DISTINCT …)` over two LEFT JOINs) |
| `v_daily_dispensary` | Items dispensed and revenue per day |
| `v_bed_status` | **Per-bed live occupancy, derived** from `ward_admission` |
| `v_bed_occupancy` | Occupied/free per ward type — **a view built on `v_bed_status`** |
| `v_ambulance_status` | On-trip / free-to-dispatch / total trips, derived from open dispatches |

### 5.6 The 24 demo queries

`05_queries (1).sql` covers every construct the course requires:

| Query | Construct |
|---|---|
| Q1 | `NATURAL JOIN` |
| Q2 | `JOIN … USING` (+ join-through to unit) |
| Q3 | `JOIN … ON` (theta) |
| Q4 | `CROSS JOIN` |
| Q5 | `LEFT OUTER JOIN` + `GROUP BY` + `ORDER BY` |
| Q6 | `FULL OUTER JOIN` |
| Q7 | `> ALL` |
| Q8 | `> ANY` |
| **Q8b** | `< SOME` (ANY synonym) |
| Q9 | `EXISTS` |
| Q10 | `NOT EXISTS` |
| Q11 | UNIQUE-style duplicate check |
| Q12 | Scalar subquery in `SELECT` |
| Q13 | Subquery in `FROM` (derived table) |
| Q14 | Subquery in `WHERE` + `HAVING` + join-through |
| Q15 | `GROUP BY` + `HAVING` + `ORDER BY` |
| Q16 | `WITH` (CTE) + `LIMIT` |
| Q17 | String functions (`INITCAP`, `SUBSTRING`, `ILIKE`, `AGE`) |
| Q18 | `UNION` / `INTERSECT` / `EXCEPT` |
| Q19 | `UPDATE` |
| Q20 | `DELETE` |
| Q21 | Aggregate suite + `FILTER` |
| Q22 | Ambulance utilisation (LEFT JOIN + `FILTER` + date math) |
| Q23 | `CASE` + multi-join + LEFT JOINs over token requests |

Plus queries **on views**. Run them all with `make db-queries`.

---

## 6. Roles & Capabilities

Six roles, each with its own dashboard, navigation set, and colour identity.
**ADMIN bypasses `authorize(...)` app-wide** by design.

### Admin — *violet*
Dashboard · Pending Requests · Doctors · Units · Duty roster · Ambulances · **Reports** · Users

Approves/rejects pending staff registrations (assigning a unit to doctors at approval time),
full CRUD on doctors/units/roster/ambulances, creates any account including other admins,
and owns the analytics suite.

### Receptionist — *sky*
Dashboard · Patients · Health cards · Token queue · Token Requests · Units · Doctors · Ambulance

The front desk: registers patients (with photo upload), issues/suspends health cards, issues
tokens, reviews online token requests, and dispatches ambulances.
**Cannot touch bed admission** — that is a clinical decision.

### Doctor — *emerald*
Dashboard · Token queue · My visits · Test orders · **Admissions**

Calls tokens, records visits (complaint, diagnosis, vitals, follow-up), writes prescriptions,
orders diagnostic tests, and admits/discharges patients to the isolation ward.

### Pharmacist — *amber*
Dashboard · Dispense · Stock · Low stock · Dispense History

Works the dispense queue, manages the medicine catalogue and stock, monitors reorder levels.
Charging is automatic: students pay ৳0, homeo medicines are free for everyone, and family
members inherit their guardian's category (§7.5).

### Lab Technician — *rose*
Dashboard · Pending tests · Enter results · Catalogue

Collects samples, enters results against normal ranges — which **emails the patient a branded
report** automatically.

### Patient — *slate*
Overview · Visits · Prescriptions · Test results · **Health Analytics** · Health card ·
**Request Token** · Units · Doctors · **AI Assistant**

Sees only their own records. Requests tokens online, tracks vitals over time, and chats with
the AI health assistant.

---

## 7. Core Feature Walkthroughs

### 7.1 Token lifecycle

1. **Issue** — reception picks patient + unit. The API refuses if there is no health card, or
   the card is not `ACTIVE`, or it has expired.
2. **Number** — `COALESCE(MAX(token_number), 0) + 1` scoped to `(unit_id, token_date)`, so
   numbering restarts per unit per day. `UNIQUE(unit_id, token_date, token_number)` is the
   backstop; a race returns `409 Token number conflict, please retry`.
3. **Print** — a print-hardened token card modal.
4. **Serve** — the doctor calls the token and records the visit against it. The trigger
   guarantees the visit's patient matches the token's patient.
5. **Expire** — `expireStaleTokens()` flips `WAITING` tokens older than **48 hours** to
   `EXPIRED`, server-side, before any token read. Stale tokens are genuinely expired, not
   merely hidden by the UI.

### 7.2 Online token requests

Patient submits (unit + preferred date + reason) → reception sees it in a pending queue →
**approve** issues a real token and links it back via `token_request.token_id`, or **reject**
records a reason. The patient can cancel while pending. Q23 reports the full outcome trail
with the reviewer's name.

### 7.3 Bed admission

Doctor-only. The system **auto-picks the lowest-numbered free ISOLATION bed**, so the doctor
makes the clinical call and the clerical allocation is automatic. Occupancy is derived from
live admissions; the partial unique index makes double-booking impossible. Discharge stamps
`discharge_datetime` and flips status, freeing the bed instantly — and the historical row
stays.

### 7.4 Ambulance dispatch

Availability is derived: an ambulance is dispatchable iff its `status = 'IN_SERVICE'` **and**
it has no open dispatch. Reception or a doctor dispatches; marking the return closes the trip
and returns the vehicle to the pool.

### 7.5 Prescribing & dispensing

Doctor writes a prescription against a visit (one per visit, enforced by `UNIQUE(visit_id)`),
with line items unique per medicine. The pharmacist dispenses from the queue: stock decrements
and the event lands in `medicine_dispense`, feeding `v_daily_dispensary` and the revenue chart.

**The charging rule** encodes the centre's real policy:

| Condition | Charge |
|---|---|
| Patient category is `STUDENT` | **Free** (৳0) |
| Medicine is homeo (`is_homeo = TRUE`) | **Free for everyone** |
| Anyone else | `unit_price × quantity` (cost price) |

`FAMILY` patients **inherit their guardian's category** — the code resolves
`guardian_id → patient.patient_category` and charges on that *effective* category, so a
student's dependent is treated as a student. This is why `patient.guardian_id` is a self-referencing
foreign key rather than a loose text field.

### 7.6 Diagnostics

Doctor orders a test → lab collects the sample → lab enters the result with the normal range →
the patient is **emailed a branded HTML report** and sees it in the portal.

### 7.7 Staff & doctor onboarding

- **Staff** (receptionist/pharmacist/lab tech) self-register → verify email → wait for admin
  approval (`is_active = FALSE` until then).
- **Doctors** use an *apply* flow: the `doctor` clinical record and the linked `app_user` login
  are created together **in one transaction** (rolled back atomically on any failure). The
  admin assigns the unit at approval time. This is why `chk_role_link` can be trusted.

### 7.8 Health cards

One per patient, with photo. Cards can be suspended/expired; an inactive or expired card
blocks token issue at the API level. Photos upload via multer to `server/uploads/patients/`
and are served through an authorised endpoint (fetched as a blob and object-URL'd client-side,
so images are never publicly hotlinkable).

### 7.9 Duty roster

Doctor × shift × date, unique per combination. Seeded relative to `CURRENT_DATE` (a Sunday–Thursday
week plus the upcoming Friday), with today's coverage guaranteed so **"doctors available now"
always demos correctly**. Availability uses `LOCALTIME` (not `CURRENT_TIME`, whose `timetz`
type misbehaves with `to_char` comparisons).

---

## 8. The AI Health Assistant

A floating chat widget on the patient portal, powered by **Claude Haiku 4.5**
(`claude-haiku-4-5`) via the official Anthropic SDK.

### How it's grounded

On every message the server runs **8 parallel queries** and injects the results into the
system prompt:

| Block | Content |
|---|---|
| Profile | Name, category, gender, blood group, DOB, department |
| Health card | Number, status, issue/expiry, expiry warnings |
| Active medications | Courses still running (`prescription_date + duration_days ≥ today`) |
| Completed courses | Recent finished courses with diagnosis |
| Recent visits | Last 10 — complaint, diagnosis, full vitals, follow-up |
| Test results | Last 15 with **normal ranges** and remarks |
| Upcoming follow-ups | Scheduled and still ahead |
| **Missed follow-ups** | Past follow-up dates with **no attending visit within ±3 days** |

That missed-follow-up query is the clever one — it uses `NOT EXISTS` over a ±3-day window to
infer non-attendance, letting the assistant proactively nudge the patient.

### Behavioural rules (enforced in the system prompt)

- Warm, plain language a university student understands
- **Answers in English or Bangla**, matching the patient
- Red-flag symptoms (chest pain, breathing difficulty, severe bleeding, fever >103°F, loss of
  consciousness, anaphylaxis) → *"visit the Medical Centre emergency immediately or call 01798762920"*
- **Never diagnoses definitively** — "this could suggest…"
- **Never advises stopping/changing medication** — "consult your doctor"
- **Never discusses other patients** — it only ever has this patient's rows
- Off-topic questions are politely redirected back to health
- Test results are always explained against their normal range
- Proactively flags an expired/suspended card and missed follow-ups
- Knows the centre's real timings, emergency numbers, and the free-medicine-for-students policy

### Engineering

- **`PATIENT`-only, twice.** `authorize('PATIENT')` plus an explicit re-check, because ADMIN
  bypasses `authorize()` app-wide but has no `patient_id` and must never reach a personal-data
  endpoint.
- **Graceful degradation.** If the patient-data read fails, the assistant still answers general
  health questions and says records are temporarily unavailable.
- **Rate limited** to 30 messages/hour.
- **Refusals and errors** map to friendly copy; the SDK handles 429/5xx retries with backoff.
- **Provider-swappable.** Behaviour lives entirely in the system prompt, so migrating from the
  previous Gemini integration changed only the transport — the assistant's answers are identical.
  The widget still speaks the old `{role, parts}` history shape; the server translates it.

---

## 9. Design System & UI Engineering

> *"Attractive and mature"* was an explicit goal. Every effect below is deliberate, consistent,
> and reduced-motion-safe.

### Foundations

- **Typography** — *Space Grotesk* for display (headings, stat numbers, brand) + *Inter* for
  body. Loaded via `<link>` in `index.html` with preconnect — **not** a CSS `@import`, which
  browsers ignore after Tailwind's expansion.
- **Brand gradient** — `#2563eb → #0d9488` (blue → teal), the single primary accent.
- **Role identity** — each role owns a gradient (`roles.js`), used consistently across avatar,
  sidebar and dashboard.
- **Dark mode** — a calm **deep-teal** palette (page `#0e181d`, cards `#16232a`) with soft
  off-white text (`#cdd9e5`, never pure white — avoids halation). Implemented as `.dark`
  CSS overrides outside `@layer` so they outrank Tailwind utilities without `!important`.
  Persisted to `localStorage`.

### Component library (`components/ui.jsx`)

`AnimatedNumber` · `Sparkline` · `StatCard` · `Gauge` · `GaugeCard` · `StatusPill` ·
`PatientChip` · `EmptyState` · `Skeleton` / `SkeletonRows` · `AttentionRow` · `timeAgo` ·
`money` · `CATEGORY_STYLES`

One visual language across all six roles — a status pill means the same thing everywhere.

### Motion

| Effect | Detail |
|---|---|
| **Count-up stats** | rAF + `easeOutCubic`, with a safety timer that lands on target if rAF starves |
| **Staggered entry** | Grid children cascade 50 ms apart (`.03s`–`.38s`) |
| **Welcome splash** | Post-login, once per session, portalled to `document.body` |
| **Donut gauges** | `stroke-dashoffset` sweep from empty on mount |
| **Odometer queue board** | Keyed on the token number — a new number slides in like a flip-board |
| **Hover-lift** | `.lift` — gentle raise + shadow-grow on cards |
| **Shimmer skeletons** | Moving highlight while data loads |
| **Toasts** | Slide-in notifications |
| **Pulse dots** | Live "available now" indicators |

All of it collapses cleanly under `prefers-reduced-motion: reduce`.

### Analytics visuals

- **Patient — Health Analytics**: temperature, weight, pulse and blood-pressure line charts with
  **reference bands and normal lines** (e.g. 98.6°F marked).
- **Admin — Reports**: gradient revenue area chart, grouped doctor-workload bars, stacked ward
  occupancy, ambulance trips coloured by status, and KPI cards with count-up + inline sparklines.
  Charts sit **above** their tables, which remain as the detail view.

> **Gotcha worth knowing:** PostgreSQL returns integer columns as *strings* over the wire.
> Recharts silently plots nothing for string values — all chart series are explicitly
> `Number()`-coerced.

### Interaction

- **⌘K / Ctrl+K command palette** — jump to any page for your role.
- **Queue board** — fullscreen waiting-room TV mode, 15-second auto-refresh, "Now serving" per unit.
- **Live clock**, mobile drawer navigation, sticky sidebar, keyboard-visible focus rings,
  horizontally scrollable tables on mobile.
- **Print** — token cards and prescriptions print cleanly (see §2.7).

---

## 10. Security Model

### 10.1 Overview

| Layer | Control |
|---|---|
| **Headers** | `helmet()` — X-Content-Type-Options, X-Frame-Options, HSTS, … |
| **CORS** | Locked to `CLIENT_URL` (bare `cors()` would allow *any* origin) |
| **Body size** | `express.json({ limit: '1mb' })` — a giant payload can't exhaust memory |
| **Passwords** | `bcrypt`, 10 rounds; the hash is selected only for comparison, never returned |
| **JWT** | HS256; **fail-fast at boot** if `JWT_SECRET` is missing or < 32 chars; `JWT_EXPIRES_IN` defaults to `24h` so unset never means "never expires" |
| **AuthZ** | `verifyToken` → `authorize(...roles)`; `authorize()` with no args = ADMIN-only |
| **SQL injection** | **Parameterised queries everywhere** — see §10.2 |
| **Error leakage** | Internals logged server-side; clients get generic messages (no DB host/schema disclosure) |
| **Login limiter** | 10 / 15 min, **`skipSuccessfulRequests`** — only *failed* attempts count, so real users are never locked out |
| **Register limiter** | 5 / hour |
| **Resend limiter** | 3 / hour |
| **Chat limiter** | 30 / hour |
| **Email verification** | 32-byte `crypto.randomBytes` token; cleared on use |
| **Staff approval** | Staff are `is_active = FALSE` until an admin approves |
| **Admin creation** | Blocked from public registration — admins can only be made by admins |
| **Patient identity** | Verification link goes **only** to the on-file email (§2.4) |
| **File uploads** | UUID filenames, MIME allowlist, 2 MB cap — see §10.3 |
| **IDOR** | Ownership re-checked server-side on every personal-data route |

---

### 10.2 SQL injection prevention

> **Audit result:** across **215** query call sites in the backend, there is **not one** instance
> of a value interpolated into SQL. Verify it yourself:
> ```bash
> grep -rnE '(query|sql)\s*\(\s*`[^`]*\$\{' server/src --include=*.js   # → no matches
> ```

#### (a) Parameterised queries, without exception

Every query passes values as a separate parameter array. The driver (`pg`) sends the SQL text and
the values to PostgreSQL **separately**, so a value is never parsed as SQL — it can only ever be
data. There is no escaping to get wrong, because no escaping happens.

```js
// ✅ The pattern used everywhere in this codebase
await pool.query(
  'SELECT patient_id, full_name, email FROM patient WHERE university_id = $1',
  [university_id.trim()]
);

// ❌ Never appears anywhere in this repo
await pool.query(
  `SELECT * FROM patient WHERE university_id = '${university_id}'`
);
```

With the second form, a `university_id` of `' OR '1'='1` dumps the patient table. With the first,
that same input is looked up **as a literal string** — it simply matches no rows.

#### (b) Dynamic filters — the subtle case, done right

Search and filter endpoints must build a `WHERE` clause at runtime. That's where most injection
bugs are born. The pattern used here (`patients.js`, `doctors.js`, `users.js`, `roster.js`) keeps
user input strictly out of the SQL string:

```js
const conditions = [];
const params = [];

if (search) {
  params.push(`%${search}%`);                       // the VALUE goes in the params array
  conditions.push(`(full_name ILIKE $${params.length} OR university_id ILIKE $${params.length})`);
}                                                   //  ↑ only the placeholder INDEX is interpolated

const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

await pool.query(`SELECT … FROM patient ${where} ORDER BY patient_id DESC`, params);
```

The distinction that matters:

| Goes into the SQL **string** | Goes into the **params array** |
|---|---|
| Developer-authored fragments (`full_name ILIKE $1`) | Every user-supplied value |
| `$${params.length}` — a **placeholder number** the code computes | Even the `%…%` wildcard, pushed as a *value* |

So the SQL text is assembled **only from constants the developer wrote**; its shape is chosen by
which filters are present, never by what the user typed. Note that even the `ILIKE` wildcard is
part of the *parameter*, not the query — a search for `%` matches a literal percent sign rather
than acting as a wildcard injection.

#### (c) `ORDER BY` is never user-controlled

Sort order is the classic hole in dynamic queries, because `ORDER BY` **cannot** be parameterised —
`$1` is only valid where a *value* is legal, not an identifier. Rather than build an identifier
whitelist, every endpoint here uses a **fixed, developer-chosen** `ORDER BY` (e.g.
`ORDER BY patient_id DESC`). Sorting is done client-side. No user input reaches an identifier
position, so the hole never opens.

#### (d) Defence in depth — whitelists that mirror the CHECK constraints

Enum-like inputs are validated against explicit allowlists in the API *before* they reach the
database, mirroring the `CHECK` constraints already in the schema:

```js
const CATEGORIES   = ['STUDENT', 'TEACHER', 'STAFF', 'FAMILY'];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const DOCTOR_TYPES = ['GENERAL', 'SPECIALIST', 'EYE', 'DENTAL', 'HOMEO', 'PHYSIO'];
const STATUSES     = ['ORDERED', 'SAMPLE_COLLECTED', 'COMPLETED', 'CANCELLED'];
```

Two independent gates: the app rejects a bad value with a helpful **400**, and if the app were
ever bypassed the `CHECK` constraint rejects it anyway. The database is the last line, not the
only line — and the two agree because they're written from the same list.

#### (e) The database can't be probed through error messages

A failed query logs its details **server-side** and returns a generic message. Even the
`/api/health` probe does this:

```js
catch (err) {
  console.error('health check failed', err);            // full detail stays in the logs
  res.status(500).json({ success: false, error: 'Internal server error' });
}
```

Raw driver errors leak table names, column names, constraint names and sometimes the DB host —
a free schema map for an attacker probing for injection. Where a constraint violation *is*
meaningful to the user, it's translated by **code**, not passed through: `23505` on
`uq_bed_active_admission` becomes `409 That bed was just taken.`, and the trigger's `23514`
becomes a readable sentence.

#### (f) Least privilege — honest gap

The connection uses the `PGUSER` from `.env`, which in the development setup is the `postgres`
superuser. **For a real deployment this should be a dedicated role** with only what the app needs:

```sql
CREATE ROLE mmcms_app LOGIN PASSWORD '…';
GRANT CONNECT ON DATABASE medical TO mmcms_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO mmcms_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO mmcms_app;
-- deliberately NOT granted: DROP, TRUNCATE, ALTER, CREATE
```

This is documented rather than glossed over: parameterisation makes injection the wrong tool
against this app, but privilege separation is what limits the blast radius of *any* future
mistake. It is the top item on the production-hardening list.

---

### 10.3 File upload security

Photo upload is the other classic injection/traversal surface. Four independent controls:

| Control | Implementation |
|---|---|
| **Filename** | `crypto.randomUUID()` — the user's filename is **discarded entirely**, so `../../etc/passwd` and `evil.php.jpg` are both impossible |
| **Extension** | Derived from the **MIME type** (`image/png → .png`), never from the upload |
| **Type** | `fileFilter` allowlist: `image/jpeg`, `image/jpg`, `image/png` only |
| **Size** | 2 MB cap → friendly `400 Photo must be under 2 MB` |

On the way back out, `path.basename(filename)` is applied before `path.join` — defence in depth
against traversal *even if* a bad value somehow reached the database — and patients may only
fetch their own photo:

```js
if (req.user.role === 'PATIENT' && Number(req.user.patient_id) !== Number(req.params.id)) {
  return res.status(403).json({ success: false, error: 'Forbidden' });
}
```

Photos are served through this authorised endpoint and fetched client-side as blobs
(`usePatientPhoto`), so medical photographs are never publicly hotlinkable URLs.

---

### 10.4 Documented trade-offs

**JWT in `localStorage`.** Convenient, and fine for a course project, but readable by JavaScript —
a successful XSS could exfiltrate it. Production would use an `httpOnly; Secure; SameSite` cookie.
This is called out in `client/src/api/axios.js`. The server is the real boundary: it re-verifies
signature and role on **every** request; frontend role checks are UX only.

**Database privileges.** See §10.2(f).

**Secrets.** `.env` is gitignored and never committed; `.env.example` documents every variable.
The seed ships *placeholder* password hashes so no working credential is ever in version control.

---

## 11. API Reference

Base URL `http://localhost:5000/api`. All routes except registration/login/verification require
`Authorization: Bearer <jwt>`. Responses are `{ success, data }` or `{ success: false, error }`.

> **Legend** — `ADMIN` bypasses every `authorize(...)`. `authorize()` (no args) = **ADMIN only**.

### Auth — `/api/auth`
| Method | Path | Access |
|---|---|---|
| POST | `/register` | Public *(rate-limited 5/hr)* |
| POST | `/login` | Public *(rate-limited 10/15min, failures only)* |
| GET | `/verify-email?token=` | Public |
| POST | `/resend-verification` | Public *(3/hr)* |
| GET | `/me` | Any authenticated |

### Users — `/api/users`
| Method | Path | Access |
|---|---|---|
| GET | `/` · PUT `/:id` | ADMIN |
| GET | `/pending` · PUT `/:id/approve` · PUT `/:id/reject` · POST `/` | ADMIN |

### Patients — `/api/patients`
| Method | Path | Access |
|---|---|---|
| GET | `/me` | PATIENT |
| GET | `/` · GET `/:id` | RECEPTIONIST, DOCTOR |
| GET | `/:id/photo` | RECEPTIONIST, DOCTOR, PATIENT |
| POST | `/` · POST `/:id/photo` · PUT `/:id` | RECEPTIONIST |

### Health cards — `/api/health-cards`
| Method | Path | Access |
|---|---|---|
| GET | `/` · POST `/` · PUT `/:id/status` | RECEPTIONIST |
| GET | `/me` | PATIENT |
| GET | `/patient/:patientId` | RECEPTIONIST, DOCTOR |

### Tokens — `/api/tokens`
| Method | Path | Access |
|---|---|---|
| GET | `/` | RECEPTIONIST, DOCTOR |
| POST | `/` | RECEPTIONIST |
| GET | `/mine` | PATIENT |
| GET | `/:id/details` | RECEPTIONIST, DOCTOR, PATIENT |

### Token requests — `/api/token-requests`
| Method | Path | Access |
|---|---|---|
| POST | `/` · GET `/my` · PUT `/:id/cancel` | PATIENT |
| GET | `/pending` · GET `/processed` · PUT `/:id/approve` · PUT `/:id/reject` | RECEPTIONIST |
| GET | `/` | ADMIN |

### Visits — `/api/visits`
| Method | Path | Access |
|---|---|---|
| GET | `/` · GET `/:id` | DOCTOR, PATIENT |
| POST | `/` · PUT `/:id` | DOCTOR |

### Prescriptions — `/api/prescriptions`
| Method | Path | Access |
|---|---|---|
| GET | `/` | PHARMACIST, PATIENT |
| GET | `/:id` | DOCTOR, PHARMACIST, PATIENT |
| POST | `/` | DOCTOR |

### Medicines & dispensing
| Method | Path | Access |
|---|---|---|
| GET | `/api/medicines` | DOCTOR, PHARMACIST |
| GET | `/api/medicines/low-stock` · POST · PUT `/:id` · DELETE `/:id` | PHARMACIST |
| POST | `/api/dispense` · GET `/history` · `/history/summary` · `/history/:id` | PHARMACIST |

### Diagnostics
| Method | Path | Access |
|---|---|---|
| GET | `/api/diagnostic-tests` | DOCTOR, LAB_TECH, RECEPTIONIST |
| GET | `/api/test-orders` · `/:id` | DOCTOR, LAB_TECH, PATIENT |
| POST | `/api/test-orders` | DOCTOR |
| PUT | `/api/test-orders/:id/result` | LAB_TECH *(emails the patient)* |

### Admissions & beds
| Method | Path | Access |
|---|---|---|
| GET | `/api/admissions` · POST `/` · PUT `/:id/discharge` | **DOCTOR** |
| GET | `/api/beds` | **DOCTOR** |

### Ambulances — `/api/ambulances`
| Method | Path | Access |
|---|---|---|
| GET | `/` | RECEPTIONIST, DOCTOR |
| POST | `/` · PUT `/:id` · PUT `/dispatches/:id/return` | ADMIN |
| GET | `/dispatches` | RECEPTIONIST |
| POST | `/dispatches` | RECEPTIONIST, DOCTOR |

### Doctors, units, roster
| Method | Path | Access |
|---|---|---|
| GET | `/api/doctors` · `/available-now` | RECEPTIONIST, DOCTOR, PATIENT |
| GET | `/api/doctors/:id` | RECEPTIONIST, DOCTOR |
| POST/PUT/DELETE | `/api/doctors…` | ADMIN |
| GET | `/api/units` | Any authenticated |
| POST/PUT/DELETE | `/api/units…` | ADMIN |
| GET | `/api/roster` · `/shifts` | RECEPTIONIST, DOCTOR |
| POST | `/api/roster` · `/bulk` · PUT `/:id` · DELETE `/:id` | ADMIN |

### Reports, analytics, AI
| Method | Path | Access |
|---|---|---|
| GET | `/api/reports/dispensary` · `/workload` · `/occupancy` · `/ambulance-usage` · `/summary` | **ADMIN** |
| GET | `/api/health-analytics/active-medications` · `/follow-ups` · `/vitals` · `/test-insights` | PATIENT |
| POST | `/api/chat` | **PATIENT** *(30/hr)* |
| GET | `/api/health` | Public — DB connectivity probe |

---

## 12. Getting Started

### Prerequisites

| | Version |
|---|---|
| Node.js | 18+ |
| PostgreSQL | 14+ (with `psql` and `createdb` on `PATH`) |
| GNU Make | any *(optional but recommended)* |

### Setup (5 steps)

```bash
# 1 — Clone
git clone https://github.com/mashfikuzzaman-2023415968-cell/Mortuza_Medical.git
cd Mortuza_Medical

# 2 — Configure the backend
cp server/.env.example server/.env
#    Edit server/.env — set PGPASSWORD and a JWT_SECRET of 32+ characters:
#    node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# 3 — Install dependencies (backend + frontend)
make install

# 4 — Create the database and load schema + seed + views
make db

# 5 — Set real passwords for the seeded demo accounts
node server/db/fix_passwords.js
```

> **Step 5 is required.** The seed ships *placeholder* bcrypt hashes so that no real password
> is ever committed to version control. `fix_passwords.js` replaces them with working hashes
> for the demo accounts in §15. Skip it and no seeded account can log in.

### Run

```bash
make run          # backend :5000 + frontend :5173 together (Ctrl+C stops both)
```

Open **http://localhost:5173**.

<details>
<summary><b>Without Make</b></summary>

```bash
# Database
createdb medical
psql -d medical -f "01_schema (2).sql"
psql -d medical -f "03_seed (2).sql"
psql -d medical -f "04_views (1).sql"
node server/db/fix_passwords.js

# Backend  (terminal 1)
cd server && npm install && npm start

# Frontend (terminal 2)
cd client && npm install && npm run dev
```
</details>

> **Note on filenames.** The SQL files contain spaces and parentheses
> (`01_schema (2).sql`) because they are the graded submission artefacts. The Makefile quotes
> them correctly; quote them yourself if invoking `psql` directly.

### Optional: enable email and the AI assistant

Both are **optional** — the app runs fully without them.

- **Email** — leave `SMTP_USER` empty and verification links are printed to the server console
  instead of being sent. Perfect for local development.
- **AI assistant** — without `ANTHROPIC_API_KEY` the chat endpoint returns a friendly
  "temporarily unavailable"; everything else works.

### Verify the install

```bash
curl http://localhost:5000/api/health
# {"success":true,"data":{"server_time":"…","db":"medical"}}
```

---

## 13. Make Command Reference

Run `make` or `make help` to see this list. Database targets read `PGHOST`/`PGPORT`/`PGUSER`/
`PGPASSWORD`/`PGDATABASE` straight from `server/.env` — you never type credentials.

| Target | What it does |
|---|---|
| `make help` | Show all commands *(default)* |
| `make install` | Install backend + frontend dependencies |
| `make install-server` / `install-client` | Install one side only |
| `make db` | Create the DB if needed, then load schema → seed → views |
| `make db-create` | Create the database only |
| `make db-drop` | **Drop the database** (destroys all data) |
| `make db-reset` | Drop + rebuild from scratch |
| `make db-queries` | Run all 24 demo queries and print results |
| `make demo-reset` | Clear transactional data for a live demo *(confirmation prompt)* |
| `make backend` | Backend only (:5000) |
| `make backend-dev` | Backend with nodemon auto-reload |
| `make frontend` | Frontend only (:5173) |
| `make run` / `make dev` | **Both together** — Ctrl+C stops both |
| `make stop` | Stop backend/frontend started outside `make run` |

---

## 14. Environment Variables

### `server/.env` — never committed

| Variable | Required | Default | Notes |
|---|---|---|---|
| `PORT` | no | `5000` | API port |
| `PGHOST` | yes | `localhost` | |
| `PGPORT` | yes | `5432` | |
| `PGUSER` | yes | — | |
| `PGPASSWORD` | yes | — | |
| `PGDATABASE` | yes | `medical` | Also read by the Makefile |
| `JWT_SECRET` | **yes** | — | **≥ 32 chars — the server refuses to boot otherwise** |
| `JWT_EXPIRES_IN` | no | `24h` | Defaulted in code if unset |
| `CLIENT_URL` | yes | `http://localhost:5173` | CORS origin + email link base |
| `SMTP_HOST` | no | — | Leave `SMTP_USER` empty to log links to console |
| `SMTP_PORT` | no | `587` | `465` switches to TLS |
| `SMTP_USER` / `SMTP_PASS` | no | — | Gmail requires an **App Password** |
| `SMTP_FROM` | no | — | e.g. `MDC <no-reply@…>` |
| `ANTHROPIC_API_KEY` | no | — | Enables the AI assistant |

### `client/.env`

| Variable | Default |
|---|---|
| `VITE_API_URL` | `http://localhost:5000/api` |

---

## 15. Demo Accounts

Available after `node server/db/fix_passwords.js`. **Development credentials only.**

| Role | Username | Password |
|---|---|---|
| Admin | `mashfikuzzaman` | `admin123` |
| Doctor | `dr.tanvir` | `doctor123` |
| Doctor | `dr.razia` | `doctor123` |
| Receptionist | `reception1` | `reception123` |
| Pharmacist | `pharm.rubel` | `pharma123` |
| Lab Technician | `lab.faruque` | `lab123` |
| Patient | `patient.rakib` | `patient123` |

You can log in with **either the username or the email** on the account.

---

## 16. Project Structure

```
Mortuza_Medical/
├── 01_schema (2).sql          # 20 tables, CHECKs, partial unique index, trigger
├── 03_seed (2).sql            # Master + demo data; roster is CURRENT_DATE-relative
├── 04_views (1).sql           # 6 views (incl. a view on a view)
├── 05_queries (1).sql         # 24 demo queries (Q1–Q23 + Q8b)
├── demo_reset.sql             # Clear transactional data, keep master data
├── Makefile                   # Task runner — reads PG* from server/.env
├── PROJECT_SPEC (3).md        # Full specification & requirement matrix
├── MDC_database_export.pdf    # Generated table dump (gitignored)
├── Ui_details.txt             # UI notes
├── mmcms_prototype (2).jsx    # Original single-file prototype
│
├── server/
│   ├── .env.example           # Documents every variable
│   ├── db/fix_passwords.js    # Replaces placeholder seed hashes
│   ├── uploads/patients/      # Runtime photo uploads (gitignored)
│   └── src/
│       ├── index.js           # Boot + fail-fast JWT_SECRET validation
│       ├── app.js             # Middleware, rate limiters, router mounting
│       ├── config/db.js       # pg Pool
│       ├── middleware/auth.js # verifyToken + authorize
│       ├── utils/
│       │   ├── email.js       # Verification / approval / branded result emails
│       │   └── tokenExpiry.js # 48-hour WAITING → EXPIRED sweep
│       └── routes/            # 21 routers
│           ├── auth.js        #   incl. patient identity binding + doctor apply txn
│           ├── chat.js        #   Claude Haiku 4.5 assistant
│           ├── admissions.js  #   DOCTOR-only; auto-picks lowest free bed
│           └── … (18 more)
│
└── client/
    ├── index.html             # Fonts via <link> (not @import), theme-color
    ├── vite.config.js         # React + Tailwind v4 plugins, port 5173
    └── src/
        ├── main.jsx           # Providers
        ├── App.jsx           # Routes + ProtectedRoute / PublicOnlyRoute
        ├── index.css          # Design system, dark palette, motion, print rules
        ├── api/axios.js       # JWT interceptor + 401 session handling
        ├── config/roles.js    # ROLES, NAV, role gradients — single source of truth
        ├── context/           # AuthContext, ThemeContext
        ├── hooks/             # usePatientPhoto (authorised blob → object URL)
        ├── components/        # ui.jsx, DashboardLayout, ChatWidget, QueueBoard,
        │                      # CommandPalette, toast, ConfirmDialog, print modals…
        └── pages/
            ├── LoginPage.jsx  # Combined login/register journey panel
            ├── DashboardHome.jsx
            ├── admin/ receptionist/ doctor/ pharmacist/ lab-tech/ patient/
```

---

## 17. Live Demo / Data-Entry Mode

For a viva where you enter data **live through the app** rather than showing seeded rows:

```bash
make demo-reset     # asks for confirmation first
```

**Keeps** (so the app is immediately operable): `unit`, `shift`, `medicine`, `doctor`,
`diagnostic_test`, `ambulance`, `bed`, `duty_roster`, and **all staff logins**.

**Clears** (and resets IDs to 1, so your first patient is `patient_id = 1`): `patient`,
`health_card`, `token`, `token_request`, `visit`, `prescription`, `prescription_item`,
`medicine_dispense`, `test_order`, `ward_admission`, `ambulance_dispatch`, and patient logins.

It uses **ordered DELETEs, not TRUNCATE** (the retained `app_user` table has an FK to
`patient`), wrapped in a transaction so it is all-or-nothing, and resets sequences via
`pg_get_serial_sequence`.

---

## 18. Manual Testing Guide

A demo path that exercises the whole system end-to-end:

1. **Receptionist** → Patients → register a patient (with photo) → issue a health card.
2. **Receptionist** → Token queue → issue a token → print the token card.
3. **Doctor** → Token queue → call the token → record the visit (complaint, diagnosis, vitals,
   follow-up) → write a prescription → order a diagnostic test.
4. **Pharmacist** → Dispense → dispense the prescription → watch stock drop and the low-stock
   gauge react. *(Student = ৳0.)*
5. **Lab tech** → Pending tests → enter the result → the patient receives a branded email.
6. **Doctor** → Admissions → admit the patient (a free bed is auto-picked) → confirm the bed
   shows occupied → discharge → confirm it frees instantly.
7. **Receptionist** → Ambulance → dispatch → the vehicle leaves the free pool → mark returned.
8. **Patient** → Overview, Prescriptions, Test results, Health Analytics (vitals charts) →
   Request Token → chat with the **AI assistant** ("What medications am I taking?").
9. **Receptionist** → Token Requests → approve it → a real token is issued.
10. **Admin** → Reports → revenue, workload, occupancy and ambulance charts reflect every step
    above.

**Integrity checks worth demonstrating**

- Try to admit two patients to the same bed → `409 That bed was just taken.` (partial unique index)
- Try to issue a token on an expired card → rejected at the API
- Register a patient with an unknown University ID → refused, with instructions to visit reception
- `⌘K` / `Ctrl+K` → command palette; the queue board fullscreens for a waiting-room TV

---

## 19. Troubleshooting

<details>
<summary><b>Server exits immediately: "FATAL: JWT_SECRET is missing or too short"</b></summary>

Working as designed — a weak secret makes tokens forgeable, so the server refuses to boot.

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```
Put the result in `server/.env` as `JWT_SECRET`.
</details>

<details>
<summary><b>Seeded accounts won't log in</b></summary>

Run `node server/db/fix_passwords.js`. The seed contains placeholder hashes on purpose so no
real password is committed.
</details>

<details>
<summary><b>"Please verify your email before logging in"</b></summary>

With `SMTP_USER` empty, the verification link is printed to the **server console**. Copy and
open it. Or verify directly:
```sql
UPDATE app_user SET email_verified = TRUE WHERE username = 'your.user';
```
</details>

<details>
<summary><b>"Your account is pending admin approval"</b></summary>

Correct for staff roles. Log in as admin → **Pending Requests** → approve (assigning a unit for
doctors).
</details>

<details>
<summary><b>EADDRINUSE on :5000 or :5173</b></summary>

```bash
make stop
# or
lsof -ti :5000 | xargs kill
```
</details>

<details>
<summary><b>psql: "No such file or directory" for the SQL files</b></summary>

The filenames contain spaces and parentheses. Quote them: `psql -d medical -f "01_schema (2).sql"`,
or just use `make db`.
</details>

<details>
<summary><b>make db fails: database does not exist / auth failed</b></summary>

Check `PGUSER`/`PGPASSWORD`/`PGDATABASE` in `server/.env` and that PostgreSQL is running
(`pg_isready`). `make db-create` runs against the `postgres` maintenance DB.
</details>

<details>
<summary><b>AI assistant says "temporarily unavailable"</b></summary>

`ANTHROPIC_API_KEY` is missing/invalid in `server/.env`, or you have exceeded 30 messages/hour.
Restart the backend after adding the key.
</details>

<details>
<summary><b>Charts render axes but no bars</b></summary>

PostgreSQL returns integers as strings and Recharts won't plot strings — coerce with `Number()`.
Already handled throughout; worth knowing if you add a chart.
</details>

<details>
<summary><b>Printing produces a blank page</b></summary>

Two causes, both already fixed: an ancestor with `display: none` (kills the subtree), and CSS
animations freezing at their first keyframe (`opacity: 0`). See §2.7 before adding print views.
</details>

<details>
<summary><b>IDE flags SQL errors that psql accepts</b></summary>

Generic SQL linters don't understand PostgreSQL's `ILIKE`, `FILTER`, or derived-table aliases.
`make db` / `make db-queries` are the real validators.
</details>

---

## 20. Course Requirement Coverage

| Requirement | Where |
|---|---|
| ER model & relational schema | `01_schema (2).sql`, `PROJECT_SPEC (3).md` |
| **Normalisation (1NF → BCNF)** | **§5.3** — progression, FD tables, candidate keys |
| **Lossless-join decomposition** | **§5.3.3** — with the formal condition and why it holds |
| **Dependency preservation** | **§5.3.4** — plus the two rules that are *not* FDs |
| **Deliberate redundancy decisions** | **§5.3.5** — join-through, nullable-FK redundancy, derived state |
| **Documented 1NF trade-off** | **§5.3.6** — `available_days`, why it's accepted and when to fix |
| **Schema design decisions** | **§5.4** — 12 documented choices with rejected alternatives |
| **Key design (surrogate vs natural)** | **§5.4.1** |
| **Domain modelling (CHECK vs ENUM vs lookup)** | **§5.4.2** — 34 CHECK constraints |
| **Referential integrity / delete policy** | **§5.4.3** — no `ON DELETE CASCADE` anywhere |
| **Cardinality modelling** | **§5.4.4** nullable FKs · **§5.4.5** `UNIQUE`+`NULL` |
| **Data types (exact numerics, TIMESTAMP vs DATE)** | **§5.4.6**, **§5.4.7** |
| **Indexing strategy** | **§5.4.11** — with the honest gap |
| Constraints (PK/FK/CHECK/UNIQUE/NOT NULL) | Every table; §5.2, §5.4 |
| Advanced integrity | Partial unique index + PL/pgSQL trigger — §2.2, §5.3.4 |
| **SQL injection prevention** | **§10.2** — parameterisation, safe dynamic filters, static `ORDER BY` |
| **Database security & least privilege** | **§10.2(d)–(f)**, §10.3 |
| **8.g — SQL queries** | `05_queries (1).sql` — 24 queries; §5.6 maps each construct |
| **8.h — Views** | `04_views (1).sql` — 6 views incl. a view on a view |
| Joins (natural/using/on/cross/outer/full) | Q1–Q6 |
| Subqueries (ALL/ANY/SOME/EXISTS/scalar/derived) | Q7–Q14 |
| Aggregates, GROUP BY, HAVING, CTE | Q15, Q16, Q21 |
| String & date functions | Q17 |
| Set operations | Q18 |
| UPDATE / DELETE | Q19, Q20 |
| Application front-end | React 19 SPA — 6 role dashboards |
| Application back-end | Express REST API — 92 endpoints across 21 routers |

---

<div align="center">

### Built for CSE-2201 · Department of Computer Science and Engineering · University of Dhaka

**Shaheed Buddhijibi Dr. Mohammad Mortuza Medical Centre**
🚑 Emergency & Ambulance (24/7): **01798762920**

</div>
