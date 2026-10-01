const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

const { notFound, errorHandler } = require('./middleware/errorHandler');
const { requireLicense, loadAndVerify } = require('./config/license');

const authRoutes = require('./routes/auth.routes');
const deviceRoutes = require('./routes/device.routes');
const violationRoutes = require('./routes/violation.routes');
const violationArchiveRoutes = require('./routes/violation-archive.routes');
const cameraRoutes = require('./routes/camera.routes');
const licenseRoutes = require('./routes/license.routes');
const plantRoutes = require('./routes/plant.routes');
const areaRoutes = require('./routes/area.routes');
const complianceRoutes = require('./routes/compliance.routes');
const trialRoutes = require('./routes/trial.routes');
const roiRoutes = require('./routes/roi.routes');
const adminRoutes = require('./routes/admin.routes');

const app = express();

// Frames directory
const FRAMES_DIR = path.join(__dirname, '../frames');
if (!fs.existsSync(FRAMES_DIR)) fs.mkdirSync(FRAMES_DIR, { recursive: true });

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
}));
app.use(express.json({ limit: '50mb' })); // increased for base64 frames
app.use(morgan('dev'));

// ── Health — works without license ──
app.get('/api/health', (req, res) => {
  let licenseOk = false;
  try { loadAndVerify(); licenseOk = true; } catch {}
  res.json({ status: 'ok', service: 'safeguardiq-enterprise', license: licenseOk ? 'valid' : 'invalid' });
});

// ── Serve evidence frames (no auth needed for img src) ──
app.use('/api/v1/frames', express.static(FRAMES_DIR));

const v1 = '/api/v1';

// ── Auth ──
app.use(`${v1}/auth`, authRoutes);
app.use(`${v1}/trial`, trialRoutes);

// ── Protected routes ──
app.use(`${v1}/devices`, requireLicense, deviceRoutes);
app.use(`${v1}/violations/archive`, requireLicense, violationArchiveRoutes);
app.use(`${v1}/violations`, requireLicense, violationRoutes);
app.use(`${v1}/cameras`, requireLicense, cameraRoutes);
app.use(`${v1}/plants`, requireLicense, plantRoutes);
app.use(`${v1}/areas`, requireLicense, areaRoutes);
app.use(`${v1}/compliance`, requireLicense, complianceRoutes);
app.use(`${v1}/form18`, requireLicense, complianceRoutes);
app.use(`${v1}/roi`, requireLicense, roiRoutes);
app.use(`${v1}/license`, requireLicense, licenseRoutes);

// ── Admin ──
app.use('/api/admin', adminRoutes);

// ── AI stream stubs ──
app.get(`${v1}/ai/health`, (req, res) => res.json({ status: 'edge_mode' }));
app.get(`${v1}/ai/stream/status`, (req, res) => res.json({ success: true, data: { status: 'edge_mode', active_streams: 0 } }));
app.post(`${v1}/ai/stream/start`, (req, res) => res.json({ success: true }));
app.post(`${v1}/ai/stream/stop`, (req, res) => res.json({ success: true }));
app.post(`${v1}/ai/stream/clear`, (req, res) => res.json({ success: true }));
app.post(`${v1}/ai/detect`, (req, res) => res.json({ success: true }));

// ── Payment stubs ──
app.post(`${v1}/payments/create-order`, (req, res) => res.json({ success: true, data: { message: 'Enterprise — license-based' } }));
app.post(`${v1}/payments/verify`, (req, res) => res.json({ success: true, data: { verified: true } }));
app.post(`${v1}/payments/validate-coupon`, (req, res) => res.json({ success: true, data: { valid: false } }));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
