const express = require('express');
const router  = express.Router();
const crypto  = require('crypto');
const fs      = require('fs');
const path    = require('path');
const { getDB, withTransaction } = require('../config/database');
const { authenticate, authenticateDevice } = require('../middleware/auth');
const { enforceDeviceLimit } = require('../config/license');
const { broadcastViolation, broadcastDeviceStatus, broadcastCameraStatus } = require('../services/websocket');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const FRAMES_DIR = path.join(__dirname, '../../frames');
if (!fs.existsSync(FRAMES_DIR)) fs.mkdirSync(FRAMES_DIR, { recursive: true });

function saveFrame(b64, name) {
  try {
    fs.writeFileSync(path.join(FRAMES_DIR, name), Buffer.from(b64, 'base64'));
    return `/api/v1/frames/${name}`;
  } catch (e) {
    console.error('[FRAME] save failed:', e.message);
    return null;
  }
}

// ═════════════════════════════════════════════════════════════
// DASHBOARD ROUTES (JWT)
// ═════════════════════════════════════════════════════════════

// GET /devices — list with camera counts and capacity
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { rows } = await getDB().query(`
    SELECT d.*,
      a.name AS area_name, p.name AS plant_name,
      (SELECT COUNT(*)::int FROM cameras c WHERE c.edge_device_id = d.id) AS camera_count,
      (SELECT COUNT(*)::int FROM cameras c WHERE c.edge_device_id = d.id AND c.stream_status = 'online') AS cameras_online,
      (SELECT COUNT(*)::int FROM violations v WHERE v.edge_device_id = d.id AND v.occurred_at::date = CURRENT_DATE) AS violations_today,
      (SELECT COUNT(*)::int FROM violations v WHERE v.edge_device_id = d.id AND v.occurred_at > now() - interval '24 hours') AS violations_24h
    FROM edge_devices d
    LEFT JOIN areas  a ON a.id = d.area_id
    LEFT JOIN plants p ON p.id = d.plant_id
    WHERE d.tenant_id = $1
    ORDER BY d.created_at DESC`,
    [req.user.tenantId]
  );
  res.json({ success: true, data: { devices: rows } });
}));

// GET /devices/feed/live
router.get('/feed/live', authenticate, asyncHandler(async (req, res) => {
  const { rows } = await getDB().query(`
    SELECT v.id, v.violation_no, v.violation_type, v.confidence, v.occurred_at,
           v.status, v.severity, v.image_path,
           d.device_code, d.zone_name, c.cam_label, a.name AS area_name
    FROM violations v
    LEFT JOIN edge_devices d ON d.id = v.edge_device_id
    LEFT JOIN cameras c      ON c.id = v.camera_id
    LEFT JOIN areas a        ON a.id = c.area_id
    WHERE v.tenant_id = $1
    ORDER BY v.occurred_at DESC LIMIT 30`,
    [req.user.tenantId]
  );
  res.json({ success: true, data: { violations: rows } });
}));

// GET /devices/config — agent pulls its camera list from the dashboard
router.get('/config', authenticateDevice, asyncHandler(async (req, res) => {
  const { rows } = await getDB().query(`
    SELECT c.id AS camera_id, c.cam_label, c.local_rtsp_url AS rtsp_url,
           c.fps_target, c.enabled, a.name AS area_name
    FROM cameras c LEFT JOIN areas a ON a.id = c.area_id
    WHERE c.edge_device_id = $1 AND c.enabled = TRUE
    ORDER BY c.cam_label`,
    [req.edgeDevice.id]
  );
  res.json({ success: true, data: {
    device_code: req.edgeDevice.device_code,
    zone_name:   req.edgeDevice.zone_name,
    cameras:     rows,
    config_version: Date.now(),
  }});
}));

// GET /devices/:id — device detail with its cameras
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const db = getDB();
  const { rows: devices } = await db.query(`
    SELECT d.*, a.name AS area_name, p.name AS plant_name
    FROM edge_devices d
    LEFT JOIN areas a ON a.id = d.area_id
    LEFT JOIN plants p ON p.id = d.plant_id
    WHERE d.id = $1 AND d.tenant_id = $2`,
    [req.params.id, req.user.tenantId]
  );
  if (!devices.length) throw new AppError('Device not found', 404);

  const { rows: cameras } = await db.query(`
    SELECT c.*, a.name AS area_name,
      COALESCE((SELECT COUNT(*) FROM violations v
        WHERE v.camera_id = c.id AND v.occurred_at::date = CURRENT_DATE), 0) AS violations_today
    FROM cameras c LEFT JOIN areas a ON a.id = c.area_id
    WHERE c.edge_device_id = $1 ORDER BY c.cam_label`,
    [req.params.id]
  );

  const { rows: violations } = await db.query(`
    SELECT v.id, v.violation_no, v.violation_type, v.confidence, v.occurred_at,
           v.status, v.image_path, c.cam_label
    FROM violations v LEFT JOIN cameras c ON c.id = v.camera_id
    WHERE v.edge_device_id = $1 ORDER BY v.occurred_at DESC LIMIT 20`,
    [req.params.id]
  );

  res.json({ success: true, data: {
    device: devices[0], cameras, recentViolations: violations,
    slots_used: cameras.length,
    slots_total: devices[0].max_cameras || 16,
  }});
}));

// POST /devices — register, with zone/area assignment
router.post('/', authenticate, asyncHandler(async (req, res) => {
  const { device_code, device_type, zone_name, area_id, plant_id, max_cameras, location_note } = req.body;
  if (!device_code) throw new AppError('device_code is required', 400);

  const db = getDB();
  await enforceDeviceLimit(db, req.user.tenantId);

  const plaintextKey = crypto.randomBytes(24).toString('hex');
  const keyHash = crypto.createHash('sha256').update(plaintextKey).digest('hex');

  try {
    const { rows } = await db.query(`
      INSERT INTO edge_devices
        (tenant_id, device_code, device_type, zone_name, area_id, plant_id,
         max_cameras, location_note, api_key_hash, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'provisioned')
      RETURNING id, device_code, device_type, zone_name, area_id, plant_id,
                max_cameras, location_note, status, created_at`,
      [req.user.tenantId, device_code, device_type || 'jetson_nano', zone_name || null,
       area_id || null, plant_id || null, Math.min(parseInt(max_cameras) || 16, 16),
       location_note || null, keyHash]
    );
    res.status(201).json({ success: true, data: { device: rows[0], api_key: plaintextKey } });
  } catch (err) {
    if (err.code === '23505') throw new AppError('device_code already exists', 409);
    throw err;
  }
}));

// PUT /devices/:id — rename, reassign zone, change capacity
router.put('/:id', authenticate, asyncHandler(async (req, res) => {
  const { device_code, device_type, zone_name, area_id, plant_id, max_cameras, location_note } = req.body;
  const { rows } = await getDB().query(`
    UPDATE edge_devices SET
      device_code   = COALESCE($1, device_code),
      device_type   = COALESCE($2, device_type),
      zone_name     = COALESCE($3, zone_name),
      area_id       = COALESCE($4, area_id),
      plant_id      = COALESCE($5, plant_id),
      max_cameras   = COALESCE($6, max_cameras),
      location_note = COALESCE($7, location_note),
      updated_at    = now()
    WHERE id = $8 AND tenant_id = $9
    RETURNING *`,
    [device_code || null, device_type || null, zone_name || null, area_id || null,
     plant_id || null, max_cameras ? Math.min(parseInt(max_cameras), 16) : null,
     location_note || null, req.params.id, req.user.tenantId]
  );
  if (!rows.length) throw new AppError('Device not found', 404);
  res.json({ success: true, data: rows[0] });
}));

// POST /devices/:id/rotate-key — issue a new API key
router.post('/:id/rotate-key', authenticate, asyncHandler(async (req, res) => {
  const plaintextKey = crypto.randomBytes(24).toString('hex');
  const keyHash = crypto.createHash('sha256').update(plaintextKey).digest('hex');
  const { rows } = await getDB().query(
    'UPDATE edge_devices SET api_key_hash = $1, updated_at = now() WHERE id = $2 AND tenant_id = $3 RETURNING device_code',
    [keyHash, req.params.id, req.user.tenantId]
  );
  if (!rows.length) throw new AppError('Device not found', 404);
  res.json({ success: true, data: { device_code: rows[0].device_code, api_key: plaintextKey } });
}));

// DELETE /devices/:id
router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  const { rowCount } = await getDB().query(
    'DELETE FROM edge_devices WHERE id = $1 AND tenant_id = $2',
    [req.params.id, req.user.tenantId]
  );
  if (!rowCount) throw new AppError('Device not found', 404);
  res.json({ success: true, message: 'Device deleted' });
}));

// ═════════════════════════════════════════════════════════════
// EDGE AGENT ROUTES (x-edge-key)
// ═════════════════════════════════════════════════════════════

// POST /devices/heartbeat — agent reports itself AND each camera's stream status
router.post('/heartbeat', authenticateDevice, asyncHandler(async (req, res) => {
  const { model_version, battery_pct, firmware_version, cameras } = req.body;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const db = getDB();

  const { rows } = await db.query(`
    UPDATE edge_devices SET
      status='online', last_heartbeat_at=now(), last_ip_address=$1,
      model_version=COALESCE($2,model_version),
      battery_pct=COALESCE($3,battery_pct),
      firmware_version=COALESCE($4,firmware_version),
      updated_at=now()
    WHERE id=$5
    RETURNING id, device_code, zone_name, status, last_heartbeat_at, model_version`,
    [ip, model_version || null, battery_pct ?? null, firmware_version || null, req.edgeDevice.id]
  );
  if (rows.length) broadcastDeviceStatus(req.edgeDevice.tenant_id, rows[0]);

  // Per-camera status + optional thumbnail
  if (Array.isArray(cameras)) {
    for (const cam of cameras) {
      let framePath = null;
      if (cam.thumb_b64) {
        framePath = saveFrame(cam.thumb_b64, `thumb_${req.edgeDevice.id}_${cam.cam_label}.jpg`);
      }
      const { rows: updated } = await db.query(`
        UPDATE cameras SET
          stream_status   = $1,
          last_frame_at   = CASE WHEN $1 = 'online' THEN now() ELSE last_frame_at END,
          last_frame_path = COALESCE($2, last_frame_path),
          error_message   = $3
        WHERE edge_device_id = $4 AND cam_label = $5
        RETURNING id, cam_label, stream_status, last_frame_at, last_frame_path`,
        [cam.status || 'unknown', framePath, cam.error || null, req.edgeDevice.id, cam.cam_label]
      );
      if (updated.length && typeof broadcastCameraStatus === 'function') {
        broadcastCameraStatus(req.edgeDevice.tenant_id, updated[0]);
      }
    }
  }

  res.json({ success: true, server_time: new Date().toISOString() });
}));

// POST /devices/sync — violations, each tagged with its camera
router.post('/sync', authenticateDevice, asyncHandler(async (req, res) => {
  const events = Array.isArray(req.body.events) ? req.body.events : [];
  if (!events.length) throw new AppError('events array is required', 400);

  const results = await withTransaction(async (client) => {
    const out = [];

    // cam_label → camera row, so each violation links to the right camera + zone
    const { rows: camRows } = await client.query(
      `SELECT c.id, c.cam_label, c.area_id, a.name AS area_name
       FROM cameras c LEFT JOIN areas a ON a.id = c.area_id
       WHERE c.edge_device_id = $1`,
      [req.edgeDevice.id]
    );
    const camByLabel = {};
    camRows.forEach(c => { camByLabel[c.cam_label] = c; });

    for (const evt of events) {
      const qr = await client.query(`
        INSERT INTO edge_sync_queue
          (edge_device_id, local_event_id, violation_type, confidence, occurred_at, image_path, raw_payload)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        ON CONFLICT (edge_device_id, local_event_id) DO NOTHING RETURNING id`,
        [req.edgeDevice.id, evt.local_event_id, evt.violation_type, evt.confidence,
         evt.occurred_at, null, evt.raw_payload ? JSON.stringify(evt.raw_payload) : null]
      );
      if (!qr.rows.length) { out.push({ local_event_id: evt.local_event_id, status: 'duplicate' }); continue; }

      const cam = evt.cam_label ? camByLabel[evt.cam_label] : null;

      let imagePath = null;
      if (evt.frame_b64) {
        imagePath = saveFrame(evt.frame_b64, `${req.edgeDevice.id}_${evt.local_event_id}.jpg`);
      }

      const vn  = await nextViolationNo(client);
      const sev = evt.confidence >= 90 ? 'high' : evt.confidence >= 75 ? 'medium' : 'low';

      const vr = await client.query(`
        INSERT INTO violations
          (violation_no, tenant_id, edge_device_id, camera_id, violation_type,
           confidence, occurred_at, image_path, severity, status, category)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'open','ppe')
        RETURNING id, violation_no, violation_type, confidence, occurred_at, severity, status, image_path`,
        [vn, req.edgeDevice.tenant_id, req.edgeDevice.id, cam ? cam.id : null,
         evt.violation_type, evt.confidence, evt.occurred_at, imagePath, sev]
      );

      await client.query('UPDATE edge_sync_queue SET resolved_violation_id=$1 WHERE id=$2',
        [vr.rows[0].id, qr.rows[0].id]);

      // keep the camera card fresh
      if (cam) {
        await client.query(`
          UPDATE cameras SET
            last_violation_at    = $1,
            last_violation_type  = $2,
            last_violation_frame = COALESCE($3, last_violation_frame)
          WHERE id = $4`,
          [evt.occurred_at, evt.violation_type, imagePath, cam.id]
        );
        await client.query(`
          INSERT INTO camera_daily_stats (camera_id, stat_date, violations)
          VALUES ($1, CURRENT_DATE, 1)
          ON CONFLICT (camera_id, stat_date)
          DO UPDATE SET violations = camera_daily_stats.violations + 1`,
          [cam.id]
        );
      }

      broadcastViolation(req.edgeDevice.tenant_id, {
        ...vr.rows[0],
        device_code: req.edgeDevice.device_code,
        zone_name:   req.edgeDevice.zone_name || null,
        cam_label:   evt.cam_label || null,
        area_name:   cam ? cam.area_name : null,
      });

      out.push({ local_event_id: evt.local_event_id, status: 'synced', violation_id: vr.rows[0].id });
    }
    return out;
  });

  res.json({ success: true, data: { results } });
}));

async function nextViolationNo(client) {
  const year = new Date().getFullYear();
  const { rows } = await client.query(
    'SELECT COUNT(*) FROM violations WHERE violation_no LIKE $1', [`VIO-${year}-%`]
  );
  return `VIO-${year}-${String(parseInt(rows[0].count, 10) + 1).padStart(3, '0')}`;
}

module.exports = router;
