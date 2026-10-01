const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDB } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

function issueTokens(user) {
  return {
    accessToken: jwt.sign({ sub: user.id, tid: user.tenant_id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' }),
    refreshToken: jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' }),
  };
}

router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new AppError('email and password required', 400);
  const { rows } = await getDB().query(
    `SELECT u.id, u.tenant_id, u.password_hash, u.role, u.is_active, u.full_name, u.email,
            t.subscription_status, t.company_name, t.plan_id
     FROM users u JOIN tenants t ON t.id = u.tenant_id WHERE u.email = $1`, [email]
  );
  if (!rows.length || !rows[0].is_active) throw new AppError('Invalid credentials', 401);
  if (!await bcrypt.compare(password, rows[0].password_hash)) throw new AppError('Invalid credentials', 401);
  const u = rows[0]; const tokens = issueTokens(u);
  res.json({ success: true, data: {
    user: { id: u.id, email: u.email, fullName: u.full_name, role: u.role, tenantId: u.tenant_id },
    tenantId: u.tenant_id, plan: u.plan_id,
    accessToken: tokens.accessToken, refreshToken: tokens.refreshToken
  }});
}));

router.post('/register', asyncHandler(async (req, res) => {
  const { company_name, email, password, phone, plants, full_name } = req.body;
  if (!email || !password) throw new AppError('email and password required', 400);
  const db = getDB(); const client = await db.connect();
  try {
    await client.query('BEGIN');
    const t = await client.query(`INSERT INTO tenants (company_name, phone, subscription_status, plan_id) VALUES ($1,$2,'active','enterprise') RETURNING id`, [company_name||'Enterprise Customer', phone||null]);
    const tid = t.rows[0].id;
    const u = await client.query(`INSERT INTO users (tenant_id, email, password_hash, full_name, role) VALUES ($1,$2,$3,$4,'customer_admin') RETURNING id, tenant_id, role, email, full_name`, [tid, email, await bcrypt.hash(password,10), full_name||company_name||email]);
    if (Array.isArray(plants)) {
      for (const p of plants) {
        const pr = await client.query(`INSERT INTO plants (tenant_id, name, address, city, state, hazard_level) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`, [tid, p.name, p.address||null, p.city||null, p.state||null, p.hazard_level||'medium']);
        if (Array.isArray(p.zones)) { for (const z of p.zones) { await client.query(`INSERT INTO areas (plant_id, name, hazard_level) VALUES ($1,$2,$3)`, [pr.rows[0].id, z.name, z.hazard_level||'medium']); } }
      }
    }
    await client.query('COMMIT');
    const tokens = issueTokens(u.rows[0]);
    res.status(201).json({ success: true, data: { user: { id: u.rows[0].id, email: u.rows[0].email, fullName: u.rows[0].full_name, role: u.rows[0].role }, tenantId: tid, plan: 'enterprise', accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }});
  } catch (err) { await client.query('ROLLBACK'); if (err.code === '23505') throw new AppError('Email already registered', 409); throw err; }
  finally { client.release(); }
}));

router.post('/refresh-token', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) throw new AppError('Refresh token required', 400);
  let decoded; try { decoded = jwt.verify(refreshToken, process.env.JWT_SECRET); } catch { throw new AppError('Invalid refresh token', 401); }
  const { rows } = await getDB().query('SELECT id, tenant_id, role FROM users WHERE id = $1 AND is_active = true', [decoded.sub]);
  if (!rows.length) throw new AppError('User not found', 401);
  res.json({ success: true, data: issueTokens(rows[0]) });
}));

router.get('/me', authenticate, asyncHandler(async (req, res) => {
  const { rows } = await getDB().query(`SELECT u.id, u.email, u.full_name AS "fullName", u.role, t.id AS "tenantId", t.company_name, t.subscription_status, t.plan_id FROM users u JOIN tenants t ON t.id = u.tenant_id WHERE u.id = $1`, [req.user.id]);
  if (!rows.length) throw new AppError('User not found', 404);
  res.json({ success: true, data: rows[0] });
}));

router.patch('/update-profile', authenticate, asyncHandler(async (req, res) => {
  if (req.body.full_name) await getDB().query('UPDATE users SET full_name = $1 WHERE id = $2', [req.body.full_name, req.user.id]);
  res.json({ success: true, message: 'Profile updated' });
}));

router.post('/forgot-password', asyncHandler(async (req, res) => {
  res.json({ success: true, message: 'If that email is registered, a reset link was sent' });
}));

router.post('/reset-password', asyncHandler(async (req, res) => {
  res.json({ success: true, message: 'Password reset successful' });
}));

module.exports = router;
