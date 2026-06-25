require('dotenv').config();

// ── Fail-fast config validation ──────────────────────────────────────────────
// Catch a misconfigured JWT_SECRET at boot instead of throwing on every login.
// A missing/weak secret would otherwise let jwt.sign crash (500s) or — worse —
// make issued tokens trivially forgeable.
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error(
    'FATAL: JWT_SECRET is missing or too short (need at least 32 characters). ' +
    'Set a strong secret in your environment before starting the server.'
  );
  process.exit(1);
}
// Default the token lifetime so an unset value never means "tokens never expire".
if (!process.env.JWT_EXPIRES_IN) {
  process.env.JWT_EXPIRES_IN = '24h';
}

const app = require('./app');

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`MDC server listening on port ${PORT}`);
});
