const express = require('express');
const router = express.Router();
const { getDB } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

// GET /plants
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { rows } = await getDB().query(
    'SELECT * FROM plants WHERE tenant_id = $1 ORDER BY created_at', [req.user.tenantId]
  );
  res.json({ success: true, data: rows });
}));

// POST /plants/setup — create plant (with optional zones)
router.post('/setup', authenticate, asyncHandler(async (req, res) => {
  const { name, address, city, state, hazard_level, zones } = req.body;
  if (!name) throw new AppError('Plant name is required', 400);
  const db = getDB();
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO plants (tenant_id, name, address, city, state, hazard_level)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.user.tenantId, name, address||null, city||null, state||null, hazard_level||'medium']
    );
    const plant = rows[0];
    if (Array.isArray(zones)) {
      for (const z of zones) {
        await client.query(
          'INSERT INTO areas (plant_id, name, hazard_level) VALUES ($1,$2,$3)',
          [plant.id, z.name, z.hazard_level||'medium']
        );
      }
    }
    await client.query('COMMIT');
    res.status(201).json({ success: true, data: plant });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally { client.release(); }
}));

// GET /plants/:id/dashboard — KPI stats for a specific plant
router.get('/:id/dashboard', authenticate, asyncHandler(async (req, res) => {
  const db = getDB();
  const today = new Date().toISOString().split('T')[0];

  const { rows: stats } = await db.query(`
    SELECT
      COUNT(*) FILTER (WHERE v.status = 'open') AS open_count,
      COUNT(*) FILTER (WHERE v.status = 'acknowledged') AS pending_count,
      COUNT(*) FILTER (WHERE v.status = 'resolved' AND v.occurred_at::date = $2) AS closed_today,
      COUNT(*) AS total_month,
      COUNT(*) FILTER (WHERE v.occurred_at::date = $2) AS today_count
    FROM violations v
    JOIN edge_devices d ON d.id = v.edge_device_id
    WHERE d.tenant_id = $1
      AND v.occurred_at > now() - interval '30 days'
  `, [req.user.tenantId, today]);

  const s = stats[0] || {};
  const totalMonth = parseInt(s.total_month) || 0;
  const todayCount = parseInt(s.today_count) || 0;

  // Compliance score: each violation today costs 2%, floor 50%
  const compliance = todayCount === 0 ? 100 : Math.max(50, 100 - todayCount * 2);

  // Violation breakdown by type
  const { rows: byType } = await db.query(`
    SELECT violation_type, COUNT(*) as count
    FROM violations v
    JOIN edge_devices d ON d.id = v.edge_device_id
    WHERE d.tenant_id = $1 AND v.occurred_at > now() - interval '30 days'
    GROUP BY violation_type ORDER BY count DESC
  `, [req.user.tenantId]);

  // Active devices count
  const { rows: deviceStats } = await db.query(`
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE status = 'online') AS online
    FROM edge_devices WHERE tenant_id = $1
  `, [req.user.tenantId]);

  res.json({ success: true, data: {
    openCount: parseInt(s.open_count) || 0,
    pendingCount: parseInt(s.pending_count) || 0,
    closedToday: parseInt(s.closed_today) || 0,
    totalMonth,
    todayCount,
    compliance,
    violationsByType: byType,
    devices: {
      total: parseInt(deviceStats[0]?.total) || 0,
      online: parseInt(deviceStats[0]?.online) || 0,
    },
  }});
}));

module.exports = router;
