const express = require('express');
const cors = require('cors');
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

const app = express();
app.use(cors());
app.use(express.json());

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

app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() AS server_time, current_database() AS db');
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = app;
