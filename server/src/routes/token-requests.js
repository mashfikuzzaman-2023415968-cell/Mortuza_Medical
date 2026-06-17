const express = require('express');
const pool = require('../config/db');
const { verifyToken, authorize } = require('../middleware/auth');

const router = express.Router();

// Helper: validate a patient's health card for a given date
async function validateCard(client, patientId, preferredDate) {
  const r = await client.query(
    'SELECT card_id, status, expiry_date FROM health_card WHERE patient_id = $1',
    [patientId]
  );
  if (r.rows.length === 0) return { ok: false, reason: "You don't have a health card. Visit reception first." };
  const card = r.rows[0];
  const expStr = card.expiry_date.toISOString().slice(0, 10);
  if (card.status !== 'ACTIVE') return { ok: false, reason: 'Your health card is not active' };
  if (expStr < preferredDate) return { ok: false, reason: 'Your health card will be expired by that date' };
  return { ok: true, card };
}

// POST /api/token-requests — Patient creates a request
router.post('/', verifyToken, authorize('PATIENT'), async (req, res) => {
  try {
    const { unit_id, preferred_date, reason } = req.body;
    const patient_id = req.user.patient_id;

    if (!unit_id || !preferred_date) {
      return res.status(400).json({ success: false, error: 'unit_id and preferred_date are required' });
    }

    const unitResult = await pool.query(
      'SELECT unit_id, unit_name, is_active FROM unit WHERE unit_id = $1',
      [unit_id]
    );
    if (unitResult.rows.length === 0 || !unitResult.rows[0].is_active) {
      return res.status(400).json({ success: false, error: 'Invalid or inactive unit' });
    }

    const today = new Date().toISOString().slice(0, 10);
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30);
    const maxDateStr = maxDate.toISOString().slice(0, 10);

    if (preferred_date < today) {
      return res.status(400).json({ success: false, error: 'Preferred date must be today or later' });
    }
    if (preferred_date > maxDateStr) {
      return res.status(400).json({ success: false, error: 'Cannot request more than 30 days in advance' });
    }

    const cardCheck = await validateCard(pool, patient_id, preferred_date);
    if (!cardCheck.ok) {
      return res.status(400).json({ success: false, error: cardCheck.reason });
    }

    const dupCheck = await pool.query(
      `SELECT 1 FROM token_request
       WHERE patient_id = $1 AND unit_id = $2 AND preferred_date = $3 AND status = 'PENDING'`,
      [patient_id, unit_id, preferred_date]
    );
    if (dupCheck.rows.length > 0) {
      return res.status(409).json({ success: false, error: 'You already have a pending request for this unit on this date' });
    }

    const tokenCheck = await pool.query(
      `SELECT 1 FROM token t
       JOIN health_card hc ON t.health_card_id = hc.card_id
       WHERE hc.patient_id = $1 AND t.unit_id = $2 AND t.token_date = $3 AND t.status != 'CANCELLED'`,
      [patient_id, unit_id, preferred_date]
    );
    if (tokenCheck.rows.length > 0) {
      return res.status(409).json({ success: false, error: 'You already have a token for this unit on this date' });
    }

    const result = await pool.query(
      `INSERT INTO token_request (patient_id, unit_id, preferred_date, reason)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [patient_id, unit_id, preferred_date, reason || null]
    );

    return res.status(201).json({
      success: true,
      data: { ...result.rows[0], unit_name: unitResult.rows[0].unit_name },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// GET /api/token-requests/my — Patient views own requests (must come before /:id)
router.get('/my', verifyToken, authorize('PATIENT'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT tr.*, u.unit_name, t.token_number
       FROM token_request tr
       JOIN unit u ON u.unit_id = tr.unit_id
       LEFT JOIN token t ON t.token_id = tr.token_id
       WHERE tr.patient_id = $1
       ORDER BY tr.created_at DESC`,
      [req.user.patient_id]
    );
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// GET /api/token-requests/pending — RECEPTIONIST views pending requests (must come before /:id)
router.get('/pending', verifyToken, authorize('RECEPTIONIST'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT tr.*, u.unit_name,
              p.full_name AS patient_name, p.patient_category,
              hc.card_number, hc.status AS card_status, hc.expiry_date AS card_expiry
       FROM token_request tr
       JOIN unit u ON u.unit_id = tr.unit_id
       JOIN patient p ON p.patient_id = tr.patient_id
       LEFT JOIN health_card hc ON hc.patient_id = tr.patient_id
       WHERE tr.status = 'PENDING'
       ORDER BY tr.preferred_date ASC, tr.created_at ASC`
    );
    return res.json({ success: true, data: result.rows, count: result.rows.length });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// GET /api/token-requests/processed — RECEPTIONIST views approved + rejected requests
router.get('/processed', verifyToken, authorize('RECEPTIONIST'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT tr.*, u.unit_name,
              p.full_name AS patient_name, p.patient_category,
              t.token_number,
              au.username AS reviewed_by_name
       FROM token_request tr
       JOIN unit u ON u.unit_id = tr.unit_id
       JOIN patient p ON p.patient_id = tr.patient_id
       LEFT JOIN token t ON t.token_id = tr.token_id
       LEFT JOIN app_user au ON au.user_id = tr.reviewed_by
       WHERE tr.status IN ('APPROVED','REJECTED')
       ORDER BY tr.reviewed_at DESC
       LIMIT 100`
    );
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// GET /api/token-requests — ADMIN views all requests
router.get('/', verifyToken, authorize(), async (req, res) => {
  try {
    const { status } = req.query;
    const conditions = [];
    const params = [];
    if (status) {
      if (!['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
        return res.status(400).json({ success: false, error: 'Invalid status filter' });
      }
      conditions.push(`tr.status = $${params.length + 1}`);
      params.push(status);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await pool.query(
      `SELECT tr.*, u.unit_name,
              p.full_name AS patient_name, p.patient_category,
              t.token_number,
              au.username AS reviewed_by_name
       FROM token_request tr
       JOIN unit u ON u.unit_id = tr.unit_id
       JOIN patient p ON p.patient_id = tr.patient_id
       LEFT JOIN token t ON t.token_id = tr.token_id
       LEFT JOIN app_user au ON au.user_id = tr.reviewed_by
       ${where}
       ORDER BY tr.created_at DESC`,
      params
    );
    return res.json({ success: true, data: result.rows, count: result.rows.length });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// PUT /api/token-requests/:id/approve — RECEPTIONIST + ADMIN
router.put('/:id/approve', verifyToken, authorize('RECEPTIONIST'), async (req, res) => {
  const client = await pool.connect();
  try {
    const reqResult = await client.query(
      `SELECT tr.*, u.unit_name FROM token_request tr
       JOIN unit u ON u.unit_id = tr.unit_id
       WHERE tr.request_id = $1`,
      [req.params.id]
    );
    if (reqResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Token request not found' });
    }
    const tokenReq = reqResult.rows[0];

    if (tokenReq.status !== 'PENDING') {
      return res.status(400).json({ success: false, error: 'Request has already been processed' });
    }

    const prefDateStr = tokenReq.preferred_date.toISOString().slice(0, 10);

    // Re-validate health card
    const cardCheck = await validateCard(client, tokenReq.patient_id, prefDateStr);
    if (!cardCheck.ok) {
      // Auto-reject
      const rejResult = await client.query(
        `UPDATE token_request
         SET status = 'REJECTED', reject_reason = $1, reviewed_by = $2, reviewed_at = NOW()
         WHERE request_id = $3 RETURNING *`,
        ['Health card no longer valid', req.user.user_id, req.params.id]
      );
      return res.json({ success: true, auto_rejected: true, data: rejResult.rows[0] });
    }

    await client.query('BEGIN');

    const nextResult = await client.query(
      `SELECT COALESCE(MAX(token_number), 0) + 1 AS next_number
       FROM token WHERE unit_id = $1 AND token_date = $2`,
      [tokenReq.unit_id, prefDateStr]
    );
    const nextNumber = nextResult.rows[0].next_number;

    const newToken = await client.query(
      `INSERT INTO token (token_number, health_card_id, unit_id, token_date, status)
       VALUES ($1, $2, $3, $4, 'WAITING') RETURNING *`,
      [nextNumber, cardCheck.card.card_id, tokenReq.unit_id, prefDateStr]
    );

    const updResult = await client.query(
      `UPDATE token_request
       SET status = 'APPROVED', reviewed_by = $1, reviewed_at = NOW(), token_id = $2
       WHERE request_id = $3 RETURNING *`,
      [req.user.user_id, newToken.rows[0].token_id, req.params.id]
    );

    await client.query('COMMIT');

    return res.json({
      success: true,
      data: {
        ...updResult.rows[0],
        unit_name: tokenReq.unit_name,
        token_number: newToken.rows[0].token_number,
        token_id: newToken.rows[0].token_id,
      },
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    client.release();
  }
});

// PUT /api/token-requests/:id/reject — RECEPTIONIST + ADMIN
router.put('/:id/reject', verifyToken, authorize('RECEPTIONIST'), async (req, res) => {
  try {
    const { reject_reason } = req.body;
    if (!reject_reason || !reject_reason.trim()) {
      return res.status(400).json({ success: false, error: 'Please provide a reason for rejection' });
    }

    const existing = await pool.query(
      'SELECT status FROM token_request WHERE request_id = $1',
      [req.params.id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Token request not found' });
    }
    if (existing.rows[0].status !== 'PENDING') {
      return res.status(400).json({ success: false, error: 'Request has already been processed' });
    }

    const result = await pool.query(
      `UPDATE token_request
       SET status = 'REJECTED', reject_reason = $1, reviewed_by = $2, reviewed_at = NOW()
       WHERE request_id = $3 RETURNING *`,
      [reject_reason.trim(), req.user.user_id, req.params.id]
    );

    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
