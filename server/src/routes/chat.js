const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const pool = require('../config/db');
const { verifyToken, authorize } = require('../middleware/auth');

const router = express.Router();

// Claude Haiku 4.5 via the official Anthropic SDK. The SDK auto-retries
// 429/5xx with backoff, so no hand-rolled retry loop is needed.
const CLAUDE_MODEL = 'claude-haiku-4-5';

function fmtDate(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Build the full system prompt with the patient's data injected.
function buildSystemPrompt(data) {
  const { profile, card, visits, activeMeds, completedMeds, tests, upcomingFollowups, missedFollowups, dataError } = data;

  const base = `You are the AI Health Assistant for Shaheed Buddhijibi Dr. Mohammad Mortuza Medical Centre, University of Dhaka. You are chatting with a logged-in patient through their secure portal.

YOUR TWO CAPABILITIES:
1. PERSONAL MEDICAL DATA — Answer questions about this patient's own medical records using the data provided below. This includes their visits, prescriptions, medications, test results, follow-ups, and health card status.
2. GENERAL HEALTH KNOWLEDGE — Answer health questions from your medical knowledge: symptoms, medications, side effects, first aid, nutrition, exercise, common illnesses, disease prevention, and when to seek emergency care.

RULES YOU MUST FOLLOW:
- Be warm, empathetic, and professional. Use simple language a university student understands.
- You can respond in both English and Bangla — match the language the patient uses.
- Keep responses concise: 2-3 paragraphs max unless the patient asks for more detail.
- For SERIOUS symptoms (chest pain, difficulty breathing, severe bleeding, high fever >103°F, loss of consciousness, severe allergic reaction), ALWAYS say: "Please visit the Medical Centre emergency immediately or call 01798762920"
- NEVER diagnose conditions definitively. Say "this could suggest..." or "you may want to discuss with your doctor..."
- NEVER recommend stopping or changing prescribed medication. Say "please consult your doctor before making changes to your medication."
- NEVER provide information about other patients. You only have THIS patient's data.
- If asked about something outside health/medical topics, politely redirect: "I'm your health assistant — I can help with medical questions and your health records."
- When commenting on test results, always reference the normal range and explain what the value means in simple terms.
- When discussing medications, mention common side effects if relevant and remind the patient to follow their doctor's instructions.
- If the patient's health card is expired or suspended, mention it proactively when relevant.
- If there are missed follow-ups, gently remind the patient about them when appropriate.

MEDICAL CENTRE INFORMATION:
- Emergency (24/7): call 01798762920 or IP phone 88-09666911463 (ext 4236)
- Ambulance: same number, 24/7
- OPD: Morning 8:00 AM - 1:00 PM, Afternoon 1:00 PM - 6:00 PM
- Pathology samples: 8:00 AM - 10:30 AM (Saturday-Thursday)
- X-ray / ECG: 8:15 AM - 2:00 PM (working days)
- Ultrasound: Tuesday, Wednesday, Thursday 9:00 AM - 12:00 PM
- Dental / Eye: 8:15 AM - 2:00 PM (working days)
- Homeo Unit: 8:15 AM - 8:00 PM (working days)
- Physiotherapy: Sunday-Thursday 8:15 AM - 2:00 PM
- Dispensary: 8:00 AM - 8:00 PM daily
- Students get free medicine; teachers/staff pay cost price
- Health card required for medicine (get from reception, 2nd floor, with university ID + 2 photos)
- Tokens can be requested online through the patient portal`;

  if (dataError) {
    return `${base}

====== THIS PATIENT'S DATA ======
Patient data is currently unavailable due to a temporary system issue. Answer general health questions only, and let the patient know their personal records can't be loaded right now.`;
  }

  const profileBlock = `PROFILE:
- Name: ${profile.full_name}
- Category: ${profile.patient_category}
- Gender: ${profile.gender === 'M' ? 'Male' : profile.gender === 'F' ? 'Female' : 'Not recorded'}
- Blood Group: ${profile.blood_group || 'Not recorded'}
- Date of Birth: ${fmtDate(profile.date_of_birth) || 'Not recorded'}
- Department: ${profile.academic_dept || 'Not recorded'}`;

  const cardBlock = `HEALTH CARD:
${card
  ? `- Card Number: ${card.card_number}
- Status: ${card.status}
- Issued: ${fmtDate(card.issue_date)}
- Expires: ${fmtDate(card.expiry_date)}${card.status !== 'ACTIVE' ? '\n- ⚠ CARD IS NOT ACTIVE — patient cannot get tokens or medicine until renewed' : ''}${card.is_expired ? '\n- ⚠ CARD HAS EXPIRED' : ''}`
  : '- No health card on record — patient needs to visit reception (2nd floor)'}`;

  const activeBlock = `ACTIVE MEDICATIONS (currently taking):
${activeMeds.length > 0
  ? activeMeds.map((m) => `- ${m.medicine_name} ${m.strength || ''} (${m.dosage || 'dosage n/a'}${m.instruction ? ', ' + m.instruction : ''}) — prescribed ${fmtDate(m.prescription_date)} by ${m.doctor_name}, ends ${fmtDate(m.end_date)}`).join('\n')
  : 'No active medications'}`;

  const completedBlock = `COMPLETED MEDICATION COURSES (recent):
${completedMeds.length > 0
  ? completedMeds.map((m) => `- ${m.medicine_name} ${m.strength || ''} (${m.dosage || 'dosage n/a'}) — for ${m.diagnosis || 'n/a'}, prescribed ${fmtDate(m.prescription_date)} by ${m.doctor_name}`).join('\n')
  : 'No recent completed courses'}`;

  const visitsBlock = `RECENT VISITS:
${visits.length > 0
  ? visits.map((v) => `- ${fmtDate(v.visit_datetime)}: ${v.visit_type} visit with ${v.doctor_name}
    Complaint: ${v.chief_complaint || 'Not recorded'}
    Diagnosis: ${v.diagnosis || 'Not recorded'}
    Vitals: BP ${v.blood_pressure || '-'}, Temp ${v.temperature_f || '-'}°F, Weight ${v.weight_kg || '-'}kg, Pulse ${v.pulse || '-'}${v.follow_up_date ? '\n    Follow-up: ' + fmtDate(v.follow_up_date) : ''}`).join('\n')
  : 'No visits on record'}`;

  const testsBlock = `TEST RESULTS:
${tests.length > 0
  ? tests.map((t) => `- ${t.test_name} (${t.test_category}): ${t.status === 'COMPLETED' ? (t.result_value || 'n/a') + ' [Normal range: ' + (t.normal_range || 'n/a') + ']' : 'Status: ' + t.status} — ${fmtDate(t.result_date) || 'pending'}, ordered by ${t.doctor_name || 'n/a'}${t.remarks ? ', Note: ' + t.remarks : ''}`).join('\n')
  : 'No test results'}`;

  const upcomingBlock = `UPCOMING FOLLOW-UPS:
${upcomingFollowups.length > 0
  ? upcomingFollowups.map((f) => `- ${fmtDate(f.follow_up_date)}: for ${f.diagnosis || 'n/a'} with ${f.doctor_name}`).join('\n')
  : 'No upcoming follow-ups'}`;

  const missedBlock = `MISSED FOLLOW-UPS:
${missedFollowups.length > 0
  ? missedFollowups.map((f) => `- ${fmtDate(f.follow_up_date)}: for ${f.diagnosis || 'n/a'} with ${f.doctor_name} — NOT ATTENDED`).join('\n')
  : 'No missed follow-ups'}`;

  return `${base}

====== THIS PATIENT'S DATA ======
${profileBlock}

${cardBlock}

${activeBlock}

${completedBlock}

${visitsBlock}

${testsBlock}

${upcomingBlock}

${missedBlock}`;
}

async function fetchPatientData(patientId) {
  const [profileR, cardR, visitsR, activeR, completedR, testsR, upcomingR, missedR] = await Promise.all([
    pool.query(
      `SELECT full_name, patient_category, blood_group, date_of_birth, gender, academic_dept, phone
       FROM patient WHERE patient_id = $1`, [patientId]),
    pool.query(
      `SELECT card_number, status, expiry_date, issue_date, (expiry_date < CURRENT_DATE) AS is_expired
       FROM health_card WHERE patient_id = $1`, [patientId]),
    pool.query(
      `SELECT v.visit_datetime, v.visit_type, v.chief_complaint, v.diagnosis,
              v.blood_pressure, v.temperature_f, v.weight_kg, v.pulse,
              v.follow_up_date, d.full_name AS doctor_name
       FROM visit v JOIN doctor d ON v.doctor_id = d.doctor_id
       WHERE v.patient_id = $1 ORDER BY v.visit_datetime DESC LIMIT 10`, [patientId]),
    pool.query(
      `SELECT m.medicine_name, m.strength, pi.dosage, pi.duration_days, pi.instruction, pr.prescription_date,
              (pr.prescription_date + pi.duration_days * INTERVAL '1 day')::date AS end_date,
              d.full_name AS doctor_name
       FROM prescription_item pi
       JOIN prescription pr ON pi.prescription_id = pr.prescription_id
       JOIN visit v ON pr.visit_id = v.visit_id
       JOIN doctor d ON pr.doctor_id = d.doctor_id
       JOIN medicine m ON pi.medicine_id = m.medicine_id
       WHERE v.patient_id = $1
         AND (pr.prescription_date + pi.duration_days * INTERVAL '1 day')::date >= CURRENT_DATE
       ORDER BY end_date ASC LIMIT 20`, [patientId]),
    pool.query(
      `SELECT m.medicine_name, m.strength, pi.dosage, pi.duration_days, pi.instruction,
              pr.prescription_date, pr.advice, d.full_name AS doctor_name, v.diagnosis
       FROM prescription_item pi
       JOIN prescription pr ON pi.prescription_id = pr.prescription_id
       JOIN visit v ON pr.visit_id = v.visit_id
       JOIN doctor d ON pr.doctor_id = d.doctor_id
       JOIN medicine m ON pi.medicine_id = m.medicine_id
       WHERE v.patient_id = $1
         AND (pr.prescription_date + pi.duration_days * INTERVAL '1 day')::date < CURRENT_DATE
       ORDER BY pr.prescription_date DESC LIMIT 10`, [patientId]),
    pool.query(
      `SELECT dt.test_name, dt.test_category, dt.normal_range,
              t.result_value, t.result_date, t.status, t.remarks, d.full_name AS doctor_name
       FROM test_order t
       JOIN diagnostic_test dt ON t.test_id = dt.test_id
       LEFT JOIN doctor d ON t.ordered_by = d.doctor_id
       WHERE t.patient_id = $1 ORDER BY t.order_datetime DESC LIMIT 15`, [patientId]),
    pool.query(
      `SELECT v.follow_up_date, v.diagnosis, d.full_name AS doctor_name
       FROM visit v JOIN doctor d ON v.doctor_id = d.doctor_id
       WHERE v.patient_id = $1 AND v.follow_up_date IS NOT NULL AND v.follow_up_date >= CURRENT_DATE
       ORDER BY v.follow_up_date ASC`, [patientId]),
    pool.query(
      `SELECT v.follow_up_date, v.diagnosis, d.full_name AS doctor_name
       FROM visit v JOIN doctor d ON v.doctor_id = d.doctor_id
       WHERE v.patient_id = $1 AND v.follow_up_date IS NOT NULL AND v.follow_up_date < CURRENT_DATE
         AND NOT EXISTS (
           SELECT 1 FROM visit v2
           WHERE v2.patient_id = v.patient_id
             AND v2.visit_datetime::date BETWEEN (v.follow_up_date - 3)::date AND (v.follow_up_date + 3)::date
             AND v2.visit_id != v.visit_id AND v2.visit_datetime > v.visit_datetime
         )
       ORDER BY v.follow_up_date DESC`, [patientId]),
  ]);

  return {
    profile: profileR.rows[0],
    card: cardR.rows[0] || null,
    visits: visitsR.rows,
    activeMeds: activeR.rows,
    completedMeds: completedR.rows,
    tests: testsR.rows,
    upcomingFollowups: upcomingR.rows,
    missedFollowups: missedR.rows,
  };
}

// POST /api/chat — PATIENT-only AI health assistant
router.post('/', verifyToken, authorize('PATIENT'), async (req, res) => {
  // Strictly patient-only: ADMIN passes authorize() app-wide but has no
  // patient_id and must not reach this personal-data endpoint.
  if (req.user.role !== 'PATIENT') {
    return res.status(403).json({ success: false, error: 'Forbidden' });
  }

  const { message, history } = req.body;

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ success: false, error: 'Message is required' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ success: false, error: 'Health assistant is temporarily unavailable. Please try again.' });
  }

  // 1-2. Gather patient data (degrade gracefully if the DB read fails).
  let patientData;
  try {
    patientData = await fetchPatientData(req.user.patient_id);
  } catch (err) {
    console.error('chat: patient data fetch failed', err);
    patientData = { dataError: true };
  }

  const systemPrompt = buildSystemPrompt(patientData);

  // The widget still sends Gemini-style history ({role: 'user'|'model',
  // parts: [{text}]}); keep that contract and translate to Anthropic's
  // {role: 'user'|'assistant', content} here so the frontend is untouched.
  const safeHistory = Array.isArray(history)
    ? history
        .filter((h) => h && (h.role === 'user' || h.role === 'model') && Array.isArray(h.parts))
        .slice(-20)
        .map((h) => ({
          role: h.role === 'model' ? 'assistant' : 'user',
          content: h.parts.map((p) => p?.text || '').join('\n').trim() || '…',
        }))
    : [];

  try {
    const anthropic = new Anthropic(); // reads ANTHROPIC_API_KEY; retries 429/5xx itself

    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      temperature: 0.7,
      system: systemPrompt,
      messages: [...safeHistory, { role: 'user', content: message }],
    });

    // Safety refusal — same friendly copy the widget already handles.
    if (response.stop_reason === 'refusal') {
      return res.status(200).json({ success: false, error: "I'm unable to respond to that question. Please rephrase." });
    }

    const reply = response.content.find((b) => b.type === 'text')?.text;
    if (!reply || !reply.trim()) {
      return res.status(200).json({ success: false, error: "I couldn't generate a response. Please try again." });
    }

    return res.json({ success: true, data: { reply } });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      console.error('chat: Anthropic API key rejected');
      return res.status(503).json({ success: false, error: 'Health assistant is temporarily unavailable. Please try again.' });
    }
    if (err instanceof Anthropic.RateLimitError) {
      return res.status(502).json({ success: false, error: 'The assistant is busy right now. Please try again in a moment.' });
    }
    console.error('chat: Claude call failed', err.status || '', err.message);
    return res.status(502).json({ success: false, error: 'Health assistant is temporarily unavailable. Please try again.' });
  }
});

module.exports = router;
