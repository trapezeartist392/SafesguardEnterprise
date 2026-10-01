const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const AppError = require('../utils/AppError');

const PUBLIC_KEY_PATH = path.join(__dirname, 'syyaim_public.pem');
const LICENSE_PATH = process.env.LICENSE_PATH || '/data/license/safeguardsiq.lic';

let _license = null;  // cached after first successful validation
let _error = null;     // cached error if license is invalid

function loadAndVerify() {
  if (_license) return _license;
  if (_error) throw _error;

  try {
    if (!fs.existsSync(LICENSE_PATH)) {
      _error = new Error(`License file not found at ${LICENSE_PATH}`);
      throw _error;
    }

    const raw = JSON.parse(fs.readFileSync(LICENSE_PATH, 'utf8'));
    const publicKey = fs.readFileSync(PUBLIC_KEY_PATH, 'utf8');
    const payloadJson = JSON.stringify(raw.payload);

    const valid = crypto.verify(
      'sha256',
      Buffer.from(payloadJson),
      publicKey,
      Buffer.from(raw.signature, 'base64')
    );

    if (!valid) {
      _error = new Error('License signature verification failed — file may have been tampered with');
      throw _error;
    }

    if (new Date() > new Date(raw.payload.expires_at)) {
      _error = new Error(`License expired on ${raw.payload.expires_at}. Contact Syyaim Enterprises for renewal.`);
      throw _error;
    }

    _license = raw.payload;
    return _license;
  } catch (err) {
    if (!_error) _error = err;
    throw _error;
  }
}

function getLicense() {
  return loadAndVerify();
}

// Express middleware — blocks all requests if license is invalid
function requireLicense(req, res, next) {
  try {
    loadAndVerify();
    next();
  } catch (err) {
    res.status(403).json({
      success: false,
      message: `License error: ${err.message}`,
      license_required: true,
    });
  }
}

// Enforcement: checks device count against license limit
async function enforceDeviceLimit(db, tenantId) {
  const license = getLicense();
  const { rows } = await db.query(
    'SELECT COUNT(*) FROM edge_devices WHERE tenant_id = $1',
    [tenantId]
  );
  const current = parseInt(rows[0].count, 10);
  if (current >= license.max_devices) {
    throw new AppError(
      `License limit reached: ${license.max_devices} devices allowed, ${current} registered. Contact Syyaim Enterprises to expand.`,
      403
    );
  }
}

// Enforcement: checks camera count against license limit
async function enforceCameraLimit(db, tenantId) {
  const license = getLicense();
  const { rows } = await db.query(
    `SELECT COUNT(*) FROM cameras c
     JOIN edge_devices d ON d.id = c.edge_device_id
     WHERE d.tenant_id = $1`,
    [tenantId]
  );
  const current = parseInt(rows[0].count, 10);
  if (current >= license.max_cameras) {
    throw new AppError(
      `License limit reached: ${license.max_cameras} cameras allowed, ${current} attached. Contact Syyaim Enterprises to expand.`,
      403
    );
  }
}

module.exports = { getLicense, requireLicense, enforceDeviceLimit, enforceCameraLimit, loadAndVerify };
