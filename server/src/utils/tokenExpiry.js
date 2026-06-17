// Marks WAITING tokens older than 48 hours as EXPIRED.
// Call this before any query that reads tokens so stale tokens are cleaned
// up server-side rather than only being hidden client-side.
async function expireStaleTokens(pool) {
  await pool.query(
    "UPDATE token SET status = 'EXPIRED' WHERE status = 'WAITING' AND issue_datetime < NOW() - INTERVAL '48 hours'"
  );
}

module.exports = { expireStaleTokens };
