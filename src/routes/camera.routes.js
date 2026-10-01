const express = require('express');
const router  = express.Router();
const fs      = require('fs');
const path    = require('path');
const { getDB } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { enforceCameraLimit } = require('../config/license');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const FRAMES_DIR = path.join(__dirname, '../../frames');
if (!fs.existsSync(FRAMES_DIR)) fs.mkdirSync(FRAMES_DIR, { recursive: true });

// ─────────────────────────────────────────────────────────────
// GET /cameras — every camera with device, zone, live status, today's count
// ─────────────────────────────────────────────────────────────
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { rows } = await getDB().query(`
    SELECT
      c.id, c.cam_label, c.local_rtsp_url AS rtsp_url, c.status, c.enabled,
      c.stream_status, c.last_frame_at, c.last_frame_path,
      c.last_violation_at, c.last_violation_type, c.last_violation_frame,
      c.fps_target, c.error_message, c.created_at,
      c.edge_device_id, d.device_code, d.zone_name AS device_zone, d.status AS device_status,
      c.area_id,  a.name  AS area_name,
      c.plant_id, p.name  AS plant_name,
      COALESCE((
        SELECT COUNT(*) FROM violations v
        WHERE v.camera_id = c.id AND v.occurred_at::date = CURRENT_DATE
      ), 0) AS violations_today,
      COALESCE((
        SELECT COUNT(*) FROM violations v
        WHERE v.camera_id = c.id AND v.occurred_at > now() - interval '7 days'
      ), 0) AS violations_7d
    FROM cameras c
    JOIN edge_devices d ON d.id = c.edge_device_id
    LEFT JOIN areas  a ON a.id = c.area_id
    LEFT JOIN plants p ON p.id = c.plant_id
    WHERE d.tenant_id = $1
    ORDER BY d.device_code, c.cam_label
  `, [req.user.tenantId]);

  res.json({ success: true, data: rows });
}));

// ─────────────────────────────────────────────────────────────
// GET /cameras/by-device/:deviceId — cameras attached to one edge device
// ─────────────────────────────────────────────────────────────
router.get('/by-device/:deviceId', authenticate, asyncHandler(async (req, res) => {
  const db = getDB();
  const { rows: dev } = await db.query(
    'SELECT id, device_code, max_cameras FROM edge_devices WHERE id = $1 AND tenant_id = $2',
    [req.params.deviceId, req.user.tenantId]
  );
  if (!dev.length) throw new AppError('Device not found', 404);

  const { rows } = await db.query(`
    SELECT c.*, a.name AS area_name, p.name AS plant_name,
      COALESCE((SELECT COUNT(*) FROM violations v
        WHERE v.camera_id = c.id AND v.occurred_at::date = CURRENT_DATE), 0) AS violations_today
    FROM cameras c
    LEFT JOIN areas  a ON a.id = c.area_id
    LEFT JOIN plants p ON p.id = c.plant_id
    WHERE c.edge_device_id = $1
    ORDER BY c.cam_label
  `, [req.params.deviceId]);

  res.json({ success: true, data: {
    device: dev[0],
    cameras: rows,
    slots_used: rows.length,
    slots_total: dev[0].max_cameras || 16,
    slots_free: (dev[0].max_cameras || 16) - rows.length,
  }});
}));

// ─────────────────────────────────────────────────────────────
// POST /cameras — attach a camera to an edge device
// ─────────────────────────────────────────────────────────────
router.post('/', authenticate, asyncHandler(async (req, res) => {
  const { edge_device_id, cam_label, rtsp_url, local_rtsp_url, area_id, plant_id, fps_target } = req.body;
  const url   = rtsp_url || local_rtsp_url;
  const label = cam_label || req.body.name;

  if (!edge_device_id) throw new AppError('edge_device_id is required', 400);
  if (!label)          throw new AppError('cam_label is required', 400);
  if (!url)            throw new AppError('rtsp_url is required', 400);

  const db = getDB();

  // device must belong to this tenant
  const { rows: dev } = await db.query(
    'SELECT id, max_cameras FROM edge_devices WHERE id = $1 AND tenant_id = $2',
    [edge_device_id, req.user.tenantId]
  );
  if (!dev.length) throw new AppError('Device not found', 404);

  // per-device slot limit (16 by default)
  const cap = dev[0].max_cameras || 16;
  const { rows: cnt } = await db.query(
    'SELECT COUNT(*)::int AS n FROM cameras WHERE edge_device_id = $1', [edge_device_id]
  );
  if (cnt[0].n >= cap) {
    throw new AppError(`This edge device is full (${cnt[0].n}/${cap} cameras). Add another edge device or raise its capacity.`, 409);
  }

  // tenant-wide licence limit
  await enforceCameraLimit(db, req.user.tenantId);

  const { rows } = await db.query(`
    INSERT INTO cameras
      (edge_device_id, cam_label, local_rtsp_url, status, stream_status, area_id, plant_id, fps_target, enabled)
    VALUES ($1,$2,$3,'active','unknown',$4,$5,$6,TRUE)
    RETURNING *`,
    [edge_device_id, label, url, area_id || null, plant_id || null, fps_target || 15]
  );

  res.status(201).json({ success: true, data: rows[0] });
}));

// ─────────────────────────────────────────────────────────────
// PUT /cameras/:id — rename, re-point, reassign zone, enable/disable
// ─────────────────────────────────────────────────────────────
router.put('/:id', authenticate, asyncHandler(async (req, res) => {
  const { cam_label, name, rtsp_url, local_rtsp_url, status, area_id, plant_id,
          fps_target, enabled, edge_device_id } = req.body;

  const db = getDB();

  // if moving to another device, verify ownership + capacity
  if (edge_device_id) {
    const { rows: dev } = await db.query(
      'SELECT id, max_cameras FROM edge_devices WHERE id = $1 AND tenant_id = $2',
      [edge_device_id, req.user.tenantId]
    );
    if (!dev.length) throw new AppError('Target device not found', 404);
    const { rows: cnt } = await db.query(
      'SELECT COUNT(*)::int AS n FROM cameras WHERE edge_device_id = $1 AND id <> $2',
      [edge_device_id, req.params.id]
    );
    if (cnt[0].n >= (dev[0].max_cameras || 16)) {
      throw new AppError('Target edge device is full', 409);
    }
  }

  const { rows } = await db.query(`
    UPDATE cameras SET
      cam_label      = COALESCE($1, cam_label),
      local_rtsp_url = COALESCE($2, local_rtsp_url),
      status         = COALESCE($3, status),
      area_id        = COALESCE($4, area_id),
      plant_id       = COALESCE($5, plant_id),
      fps_target     = COALESCE($6, fps_target),
      enabled        = COALESCE($7, enabled),
      edge_device_id = COALESCE($8, edge_device_id)
    FROM edge_devices d
    WHERE cameras.id = $9
      AND cameras.edge_device_id = d.id
      AND d.tenant_id = $10
    RETURNING cameras.*`,
    [cam_label || name || null, rtsp_url || local_rtsp_url || null, status || null,
     area_id || null, plant_id || null, fps_target || null,
     typeof enabled === 'boolean' ? enabled : null,
     edge_device_id || null, req.params.id, req.user.tenantId]
  );

  if (!rows.length) throw new AppError('Camera not found', 404);
  res.json({ success: true, data: rows[0] });
}));

// ─────────────────────────────────────────────────────────────
// DELETE /cameras/:id
// ─────────────────────────────────────────────────────────────
router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  const { rowCount } = await getDB().query(`
    DELETE FROM cameras USING edge_devices d
    WHERE cameras.id = $1 AND cameras.edge_device_id = d.id AND d.tenant_id = $2`,
    [req.params.id, req.user.tenantId]
  );
  if (!rowCount) throw new AppError('Camera not found', 404);
  res.json({ success: true, message: 'Camera deleted' });
}));

// ─────────────────────────────────────────────────────────────
// GET /cameras/:id/thumbnail — latest frame for this camera
// ─────────────────────────────────────────────────────────────
router.get('/:id/thumbnail', authenticate, asyncHandler(async (req, res) => {
  const { rows } = await getDB().query(`
    SELECT c.last_frame_path FROM cameras c
    JOIN edge_devices d ON d.id = c.edge_device_id
    WHERE c.id = $1 AND d.tenant_id = $2`,
    [req.params.id, req.user.tenantId]
  );
  if (!rows.length || !rows[0].last_frame_path) {
    return res.status(404).json({ success: false, message: 'No frame yet' });
  }
  const file = path.join(FRAMES_DIR, path.basename(rows[0].last_frame_path));
  if (!fs.existsSync(file)) {
    return res.status(404).json({ success: false, message: 'Frame file missing' });
  }
  res.sendFile(file);
}));

// ─────────────────────────────────────────────────────────────
// GET /cameras/:id/violations — recent violations for one camera
// ─────────────────────────────────────────────────────────────
router.get('/:id/violations', authenticate, asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 200);
  const { rows } = await getDB().query(`
    SELECT v.id, v.violation_no, v.violation_type, v.confidence,
           v.occurred_at, v.severity, v.status, v.image_path
    FROM violations v
    JOIN cameras c      ON c.id = v.camera_id
    JOIN edge_devices d ON d.id = c.edge_device_id
    WHERE c.id = $1 AND d.tenant_id = $2
    ORDER BY v.occurred_at DESC LIMIT $3`,
    [req.params.id, req.user.tenantId, limit]
  );
  res.json({ success: true, data: rows });
}));

// ─────────────────────────────────────────────────────────────
// POST /cameras/:id/test-connection
// ─────────────────────────────────────────────────────────────
router.post('/:id/test-connection', authenticate, asyncHandler(async (req, res) => {
  const { rows } = await getDB().query(`
    SELECT c.stream_status, c.last_frame_at, c.error_message, c.local_rtsp_url
    FROM cameras c JOIN edge_devices d ON d.id = c.edge_device_id
    WHERE c.id = $1 AND d.tenant_id = $2`,
    [req.params.id, req.user.tenantId]
  );
  if (!rows.length) throw new AppError('Camera not found', 404);

  const c = rows[0];
  const fresh = c.last_frame_at && (Date.now() - new Date(c.last_frame_at).getTime()) < 60000;

  res.json({ success: true, data: {
    status : fresh ? 'ok' : 'stale',
    message: fresh
      ? 'Edge agent is receiving frames from this camera'
      : 'No frame received in the last 60 seconds. Check the edge agent and the RTSP URL.',
    stream_status: c.stream_status,
    last_frame_at: c.last_frame_at,
    error_message: c.error_message,
  }});
}));

// discovery stubs (Enterprise adds cameras by proxy URL)
router.post('/discover', authenticate, asyncHandler(async (req, res) => {
  res.json({ success: true, data: { cameras: [], message: 'Enterprise mode — add cameras by RTSP proxy URL' } });
}));
router.get('/discover/status/:sid', authenticate, asyncHandler(async (req, res) => {
  res.json({ success: true, data: { status: 'complete', cameras: [] } });
}));

module.exports = router;
