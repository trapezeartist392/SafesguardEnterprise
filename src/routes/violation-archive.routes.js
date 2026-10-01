const express = require('express');
const router = express.Router();
const { getDB } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

// GET /violations/archive — paginated, filterable
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { dateFrom, dateTo, limit = 200, offset = 0, page, violation_type, severity, status } = req.query;
  const db = getDB();
  let where = 'v.tenant_id = $1';
  const params = [req.user.tenantId];
  let idx = 2;

  if (dateFrom) { where += ` AND v.occurred_at >= $${idx++}::date`; params.push(dateFrom); }
  if (dateTo) { where += ` AND v.occurred_at <= $${idx++}::date + interval '1 day'`; params.push(dateTo.split('T')[0]); }
  if (violation_type) { where += ` AND v.violation_type = $${idx++}`; params.push(violation_type); }
  if (severity) { where += ` AND v.severity = $${idx++}`; params.push(severity); }
  if (status) { where += ` AND v.status = $${idx++}`; params.push(status); }

  const lim = Math.min(parseInt(limit), 1000);
  const off = page ? (parseInt(page) - 1) * lim : (parseInt(offset) || 0);

  const { rows } = await db.query(
    `SELECT v.id, v.violation_no, v.violation_type, v.confidence, v.occurred_at,
            v.image_path AS frame_url, v.severity, v.status, v.corrective_action,
            v.worker_id, v.category,
            d.device_code, d.zone_name AS area_name, c.cam_label AS camera_id
     FROM violations v
     LEFT JOIN edge_devices d ON d.id = v.edge_device_id
     LEFT JOIN cameras c ON c.id = v.camera_id
     WHERE ${where}
     ORDER BY v.occurred_at DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    [...params, lim, off]
  );

  // Total count for pagination
  const { rows: countRows } = await db.query(
    `SELECT COUNT(*) FROM violations v WHERE ${where.replace(/v\.tenant_id = \$1/, 'v.tenant_id = $1')}`,
    params
  );

  res.json({ success: true, data: { violations: rows, total: parseInt(countRows[0].count) } });
}));

// GET /violations/archive/photo/:id
router.get('/photo/:id', authenticate, asyncHandler(async (req, res) => {
  const { rows } = await getDB().query(
    'SELECT image_path FROM violations WHERE id = $1 AND tenant_id = $2',
    [req.params.id, req.user.tenantId]
  );
  if (!rows.length || !rows[0].image_path) {
    return res.status(404).json({ success: false, message: 'Photo not found' });
  }
  res.json({ success: true, data: { url: rows[0].image_path } });
}));

module.exports = router;
