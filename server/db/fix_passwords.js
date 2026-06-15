// One-time script: replace placeholder bcrypt hashes in the seeded app_user rows
// with real hashes for the dev passwords listed in PROJECT_SPEC Section 12, Phase 1.
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const pool = require('../src/config/db');

const DEV_PASSWORDS = {
  mashfikuzzaman: 'admin123',
  'dr.tanvir': 'doctor123',
  'dr.razia': 'doctor123',
  reception1: 'reception123',
  'pharm.rubel': 'pharma123',
  'lab.faruque': 'lab123',
  'patient.rakib': 'patient123',
};

async function main() {
  for (const [username, password] of Object.entries(DEV_PASSWORDS)) {
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query('UPDATE app_user SET password_hash = $1 WHERE username = $2', [hash, username]);
    console.log(`${username}: ${result.rowCount ? 'updated' : 'NOT FOUND'} -> password = ${password}`);
  }
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
