const express = require('express');
const router = express.Router();
const { getDB } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

// POST /compliance/form18 — file a Form 18 report
router.post('/form18', authenticate, asyncHandler(async (req, res) => {
  const db = getDB();
  const year = new Date().getFullYear();
  const { rows: countRows } = await db.query("SELECT COUNT(*) FROM form18_reports WHERE report_no LIKE $1", [`F18-${year}-%`]);
  const seq = String(parseInt(countRows[0].count, 10) + 1).padStart(3, '0');
  const reportNo = `F18-${year}-${seq}`;

  const { rows } = await db.query(
    `INSERT INTO form18_reports (tenant_id, report_no, report_year, report_month, status, form_data)
     VALUES ($1, $2, $3, $4, 'submitted', $5) RETURNING *`,
    [req.user.tenantId, reportNo, year, new Date().getMonth() + 1, JSON.stringify(req.body)]
  );
  res.status(201).json({ success: true, data: { report: rows[0], report_no: reportNo } });
}));

// POST /compliance/report — compliance summary
router.post('/report', authenticate, asyncHandler(async (req, res) => {
  const db = getDB();
  const { rows: byType } = await db.query(
    `SELECT violation_type, COUNT(*) as count, 
            COUNT(*) FILTER (WHERE status = 'open') AS open_count,
            COUNT(*) FILTER (WHERE status = 'resolved') AS resolved_count
     FROM violations WHERE tenant_id = $1 AND occurred_at > now() - interval '30 days'
     GROUP BY violation_type ORDER BY count DESC`,
    [req.user.tenantId]
  );

  const { rows: byZone } = await db.query(
    `SELECT d.zone_name, COUNT(*) as count
     FROM violations v JOIN edge_devices d ON d.id = v.edge_device_id
     WHERE v.tenant_id = $1 AND v.occurred_at > now() - interval '30 days'
     GROUP BY d.zone_name ORDER BY count DESC`,
    [req.user.tenantId]
  );

  const { rows: totals } = await db.query(
    `SELECT COUNT(*) as total,
            COUNT(*) FILTER (WHERE status = 'open') AS open,
            COUNT(*) FILTER (WHERE status = 'resolved') AS resolved
     FROM violations WHERE tenant_id = $1 AND occurred_at > now() - interval '30 days'`,
    [req.user.tenantId]
  );

  res.json({ success: true, data: {
    summary: byType, byZone, totals: totals[0], period: '30 days'
  }});
}));

// POST /form18/generate — generate Form 18 from template (alias)
router.post('/generate', authenticate, asyncHandler(async (req, res) => {
  // Gather violation data for the period
  const db = getDB();
  const { dateFrom, dateTo } = req.body;
  const from = dateFrom || new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
  const to = dateTo || new Date().toISOString().split('T')[0];

  const { rows: violations } = await db.query(
    `SELECT v.violation_no, v.violation_type, v.confidence, v.occurred_at, v.severity, v.status,
            v.corrective_action, d.zone_name, c.cam_label
     FROM violations v
     LEFT JOIN edge_devices d ON d.id = v.edge_device_id
     LEFT JOIN cameras c ON c.id = v.camera_id
     WHERE v.tenant_id = $1 AND v.occurred_at BETWEEN $2::date AND $3::date + interval '1 day'
     ORDER BY v.occurred_at DESC`,
    [req.user.tenantId, from, to]
  );

  const { rows: tenant } = await db.query('SELECT * FROM tenants WHERE id = $1', [req.user.tenantId]);
  const { rows: plant } = await db.query('SELECT * FROM plants WHERE tenant_id = $1 LIMIT 1', [req.user.tenantId]);

  res.json({ success: true, data: {
    form_data: {
      company: tenant[0]?.company_name || '',
      plant: plant[0]?.name || '',
      period: `${from} to ${to}`,
      total_violations: violations.length,
      violations: violations.slice(0, 50),
      generated_at: new Date().toISOString(),
    }
  }});
}));

// GET /compliance/form18 — list filed reports
router.get('/form18', authenticate, asyncHandler(async (req, res) => {
  const { rows } = await getDB().query(
    'SELECT * FROM form18_reports WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 50',
    [req.user.tenantId]
  );
  res.json({ success: true, data: rows });
}));

module.exports = router;
