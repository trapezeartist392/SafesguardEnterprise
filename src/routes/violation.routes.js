const express = require('express');
const router = express.Router();
const { getDB } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

// GET /violations — simple list
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 500);
  const { rows } = await getDB().query(
    `SELECT v.id, v.violation_no, v.violation_type, v.confidence, v.occurred_at,
            v.image_path, v.severity, v.status, v.corrective_action, v.worker_id, v.category,
            d.device_code, d.zone_name, c.cam_label
     FROM violations v
     LEFT JOIN edge_devices d ON d.id = v.edge_device_id
     LEFT JOIN cameras c ON c.id = v.camera_id
     WHERE v.tenant_id = $1 ORDER BY v.occurred_at DESC LIMIT $2`,
    [req.user.tenantId, limit]
  );
  res.json({ success: true, data: { violations: rows } });
}));

// PATCH /violations/:id — update status, assign owner, add corrective action
router.patch('/:id', authenticate, asyncHandler(async (req, res) => {
  const { status, corrective_action, worker_id, severity } = req.body;
  const db = getDB();
  const sets = []; const vals = []; let idx = 1;
  if (status)             { sets.push(`status = $${idx++}`);             vals.push(status); }
  if (corrective_action)  { sets.push(`corrective_action = $${idx++}`);  vals.push(corrective_action); }
  if (worker_id)          { sets.push(`worker_id = $${idx++}`);          vals.push(worker_id); }
  if (severity)           { sets.push(`severity = $${idx++}`);           vals.push(severity); }

  if (!sets.length) throw new AppError('No fields to update', 400);

  vals.push(req.params.id, req.user.tenantId);
  const { rows } = await db.query(
    `UPDATE violations SET ${sets.join(', ')} WHERE id = $${idx++} AND tenant_id = $${idx} RETURNING *`,
    vals
  );
  if (!rows.length) throw new AppError('Violation not found', 404);
  res.json({ success: true, data: rows[0] });
}));

module.exports = router;
