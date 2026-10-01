const express = require('express');
const router = express.Router();
const { getDB } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { getLicense } = require('../config/license');
const asyncHandler = require('../utils/asyncHandler');

// GET /admin/customers
router.get('/customers', authenticate, asyncHandler(async (req, res) => {
  const { rows } = await getDB().query(
    `SELECT t.id, t.company_name, t.subscription_status, t.plan_id, t.created_at,
            COUNT(DISTINCT u.id) AS user_count,
            COUNT(DISTINCT d.id) AS device_count
     FROM tenants t
     LEFT JOIN users u ON u.tenant_id = t.id
     LEFT JOIN edge_devices d ON d.tenant_id = t.id
     GROUP BY t.id ORDER BY t.created_at DESC LIMIT 20`
  );
  res.json({ success: true, data: rows });
}));

// GET /admin/system
router.get('/system', authenticate, asyncHandler(async (req, res) => {
  const db = getDB();
  const { rows: counts } = await db.query(`
    SELECT
      (SELECT COUNT(*) FROM tenants) AS tenants,
      (SELECT COUNT(*) FROM users) AS users,
      (SELECT COUNT(*) FROM edge_devices) AS devices,
      (SELECT COUNT(*) FROM cameras) AS cameras,
      (SELECT COUNT(*) FROM violations) AS violations
  `);
  let license = null;
  try { license = getLicense(); } catch {}
  res.json({ success: true, data: { ...counts[0], license } });
}));

// GET /admin/payments/stats — enterprise has no payments, return stubs
router.get('/payments/stats', authenticate, asyncHandler(async (req, res) => {
  res.json({ success: true, data: { totalRevenue: 0, activeSubscriptions: 0, message: 'Enterprise — license-based, no online payments' } });
}));

// GET /admin/payments
router.get('/payments', authenticate, asyncHandler(async (req, res) => {
  res.json({ success: true, data: [] });
}));

module.exports = router;
