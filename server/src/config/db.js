const { Pool, types } = require('pg');

// Return DATE columns as plain ISO strings (YYYY-MM-DD) — not JS Date objects.
// Without this, pg converts midnight-UTC+6 to the prior day when serialized to JSON.
types.setTypeParser(1082, (val) => val);

const pool = new Pool({
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
});

module.exports = pool;
