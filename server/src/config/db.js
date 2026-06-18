const { Pool, types } = require('pg');

// Return DATE columns as plain ISO strings (YYYY-MM-DD) — not JS Date objects.
// Without this, pg converts midnight-UTC+6 to the prior day when serialized to JSON.
types.setTypeParser(1082, (val) => val);

// NOTE: in production, PGUSER should be a limited-privilege role
// (SELECT/INSERT/UPDATE/DELETE only — no DROP/CREATE), not the 'postgres'
// superuser. The superuser is acceptable only for local/course development.
const pool = new Pool({
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  max: 20,                       // cap concurrent connections so the pool can't be exhausted
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Log pool-level errors (e.g. a dropped connection) instead of letting an
// unhandled 'error' event crash the whole server process.
pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err.message);
});

module.exports = pool;
