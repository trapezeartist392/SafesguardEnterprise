const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { getDB } = require('../config/database');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const authenticate = asyncHandler(async (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) throw new AppError('Authentication required', 401);
  let decoded;
  try { decoded = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET); }
  catch (e) { throw new AppError(e.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token', 401); }
  const { rows } = await getDB().query('SELECT id, tenant_id AS "tenantId", role, is_active FROM users WHERE id = $1', [decoded.sub]);
  if (!rows.length || !rows[0].is_active) throw new AppError('User not found or inactive', 401);
  req.user = rows[0];
  next();
});

const authenticateDevice = asyncHandler(async (req, res, next) => {
  const key = req.headers['x-edge-key'];
  if (!key) throw new AppError('Missing device key', 401);
  const keyHash = crypto.createHash('sha256').update(key).digest('hex');
  const { rows } = await getDB().query('SELECT id, tenant_id, device_code, status FROM edge_devices WHERE api_key_hash = $1', [keyHash]);
  if (!rows.length) throw new AppError('Invalid device key', 401);
  req.edgeDevice = rows[0];
  next();
});

module.exports = { authenticate, authenticateDevice };
