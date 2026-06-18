const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const pool = require('./config/db');
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const patientsRoutes = require('./routes/patients');
const healthCardsRoutes = require('./routes/health-cards');
const tokensRoutes = require('./routes/tokens');
const unitsRoutes = require('./routes/units');
const visitsRoutes = require('./routes/visits');
const prescriptionsRoutes = require('./routes/prescriptions');
const testOrdersRoutes = require('./routes/test-orders');
const diagnosticTestsRoutes = require('./routes/diagnostic-tests');
const admissionsRoutes = require('./routes/admissions');
const bedsRoutes = require('./routes/beds');
const rosterRoutes = require('./routes/roster');
const medicinesRoutes = require('./routes/medicines');
const dispenseRoutes = require('./routes/dispense');
const doctorsRoutes = require('./routes/doctors');
const ambulanceRoutes = require('./routes/ambulance');
const reportsRoutes = require('./routes/reports');
const tokenRequestsRoutes = require('./routes/token-requests');
const healthAnalyticsRoutes = require('./routes/health-analytics');
const chatRoutes = require('./routes/chat');

const app = express();

// Security headers (X-Content-Type-Options, X-Frame-Options, HSTS, etc.).
app.use(helmet());

// Restrict cross-origin requests to the known client origin. cors() with no
// options would allow ANY origin; lock it to CLIENT_URL (falls back to the
// Vite dev server in development).
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));

// Cap request body size so a giant JSON payload can't exhaust memory / crash
// the server. 1mb is ample for these JSON APIs (file uploads use multer).
app.use(express.json({ limit: '1mb' }));

// ── Rate limiters ──────────────────────────────────────────────────────────
// Brute-force / abuse protection on the sensitive auth + AI endpoints.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  // Only FAILED logins count toward the limit — brute force is about failed
  // guesses, so legitimate users logging in successfully are never locked out.
  skipSuccessfulRequests: true,
  message: { success: false, error: 'Too many login attempts. Try again in 15 minutes.' },
});
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many registration attempts. Try again later.' },
});
const resendLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests. Try again later.' },
});
const chatLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many messages. Please wait a while before sending more.' },
});

// Apply per-path BEFORE the routers (mount order matters).
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth/register', registerLimiter);
app.use('/api/auth/resend-verification', resendLimiter);
app.use('/api/chat', chatLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/patients', patientsRoutes);
app.use('/api/health-cards', healthCardsRoutes);
app.use('/api/tokens', tokensRoutes);
app.use('/api/units', unitsRoutes);
app.use('/api/visits', visitsRoutes);
app.use('/api/prescriptions', prescriptionsRoutes);
app.use('/api/test-orders', testOrdersRoutes);
app.use('/api/diagnostic-tests', diagnosticTestsRoutes);
app.use('/api/admissions', admissionsRoutes);
app.use('/api/beds', bedsRoutes);
app.use('/api/roster', rosterRoutes);
app.use('/api/medicines', medicinesRoutes);
app.use('/api/dispense', dispenseRoutes);
app.use('/api/doctors', doctorsRoutes);
app.use('/api/ambulances', ambulanceRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/token-requests', tokenRequestsRoutes);
app.use('/api/health-analytics', healthAnalyticsRoutes);
app.use('/api/chat', chatRoutes);

app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() AS server_time, current_database() AS db');
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    // Log internals server-side; never leak err.message (could reveal DB host,
    // credentials, or schema details) to the client.
    console.error('health check failed', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = app;
