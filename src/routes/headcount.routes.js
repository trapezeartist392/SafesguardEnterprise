const express     = require('express');
const router      = express.Router();
const { getDB }   = require('../config/database');
const { authenticate, authenticateDevice } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

// ── helpers ──────────────────────────────────────────────────────────────────
async function upsertState(db, tenantId, plantId, direction, count = 1) {
  const col = direction === 'assembly_in' ? 'assembly_count' : null;
  if (col) {
    await db.query(`
      INSERT INTO headcount_state (tenant_id, plant_id, assembly_count, last_event_at, last_direction, updated_at)
      VALUES ($1,$2,$3,now(),$4,now())
      ON CONFLICT (tenant_id, plant_id) DO UPDATE SET
        assembly_count = headcount_state.assembly_count + $3,
        last_event_at  = now(),
        last_direction = $4,
        updated_at     = now()
    `, [tenantId, plantId, count, direction]);
  } else {
    const delta = direction === 'in' ? count : -count;
    await db.query(`
      INSERT INTO headcount_state (tenant_id, plant_id, current_count, peak_count, last_event_at, last_direction, updated_at)
      VALUES ($1,$2,GREATEST(0,$3),GREATEST(0,$3),now(),$4,now())
      ON CONFLICT (tenant_id, plant_id) DO UPDATE SET
        current_count = GREATEST(0, headcount_state.current_count + $3),
        peak_count    = GREATEST(headcount_state.peak_count, headcount_state.current_count + $3),
        last_event_at = now(),
        last_direction= $4,
        updated_at    = now()
    `, [tenantId, plantId, delta, direction]);
  }
}

// ── EDGE: POST /headcount/event ──────────────────────────────────────────────
// Called by edge agent for every ingress / egress / assembly_in
router.post('/event', authenticateDevice, asyncHandler(async (req, res) => {
  const db = getDB();
  const { plant_id, events } = req.body;   // events: [{direction, count, occurred_at, local_event_id, camera_id}]
  if (!Array.isArray(events) || events.length === 0)
    return res.json({ success: true, inserted: 0 });

  const tenantId = req.edgeDevice.tenant_id;
  const deviceId = req.edgeDevice.id;
  let resolvedPlantId = plant_id || req.edgeDevice.plant_id || null;
  // If plant_id not supplied, resolve it from the first camera in this batch
  if (!resolvedPlantId && events.length > 0) {
    const firstCamId = events.find(e => e.camera_id)?.camera_id;
    if (firstCamId) {
      const { rows: camRows } = await db.query(
        `SELECT plant_id FROM cameras WHERE id = $1`, [firstCamId]
      );
      resolvedPlantId = camRows[0]?.plant_id || null;
    }
  }

  let inserted = 0;
  for (const ev of events) {
    const { direction, count = 1, occurred_at, local_event_id, camera_id } = ev;
    if (!['in','out','assembly_in'].includes(direction)) continue;
    try {
      await db.query(`
        INSERT INTO headcount_events
          (tenant_id, plant_id, camera_id, edge_device_id, direction, count, occurred_at, local_event_id)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        ON CONFLICT (tenant_id, local_event_id) DO NOTHING
      `, [tenantId, resolvedPlantId, camera_id || null, deviceId,
          direction, count, occurred_at || new Date(), local_event_id || null]);
      inserted++;
      if (resolvedPlantId) await upsertState(db, tenantId, resolvedPlantId, direction, count);
    } catch (err) { console.error("[HC-INSERT-ERR]", err.message); }
  }

  // Broadcast via WebSocket
  try {
    const ws = require('../services/websocket');
    const { rows: [state] } = await db.query(
      'SELECT * FROM headcount_state WHERE tenant_id=$1 AND plant_id=$2',
      [tenantId, resolvedPlantId]
    );
    if (state) ws.broadcastToTenant(tenantId, { type: 'headcount_update', data: state });
  } catch {}

  res.json({ success: true, inserted });
}));

// ── DASHBOARD: GET /headcount/live ──────────────────────────────────────────
router.get('/live', authenticate, asyncHandler(async (req, res) => {
  const { rows } = await getDB().query(`
    SELECT s.*,
           p.name,
           (SELECT json_agg(e ORDER BY e.occurred_at DESC) FROM (
              SELECT direction, count, occurred_at,
                     c.cam_label, c.camera_role
              FROM headcount_events e2
              LEFT JOIN cameras c ON c.id = e2.camera_id
              WHERE e2.tenant_id = s.tenant_id AND e2.plant_id = s.plant_id
              ORDER BY e2.occurred_at DESC LIMIT 50
           ) e) AS recent_events,
           (SELECT json_agg(es ORDER BY es.level) FROM headcount_escalation es
            WHERE es.tenant_id = s.tenant_id AND es.plant_id = s.plant_id AND es.active) AS escalation
    FROM headcount_state s
    JOIN plants p ON p.id = s.plant_id
    WHERE s.tenant_id = $1
    ORDER BY p.name
  `, [req.user.tenantId]);
  res.json({ success: true, data: rows });
}));

// ── DASHBOARD: POST /headcount/emergency ────────────────────────────────────
router.post('/emergency', authenticate, asyncHandler(async (req, res) => {
  const { plant_id, action } = req.body;   // action: 'declare' | 'all_clear'
  const db = getDB();
  if (action === 'declare') {
    await db.query(`
      UPDATE headcount_state SET
        emergency_mode = TRUE, emergency_at = now(),
        emergency_by = $3, assembly_count = 0, updated_at = now()
      WHERE tenant_id=$1 AND plant_id=$2
    `, [req.user.tenantId, plant_id, req.user.sub]);
  } else {
    await db.query(`
      UPDATE headcount_state SET
        emergency_mode = FALSE, all_clear_at = now(), updated_at = now()
      WHERE tenant_id=$1 AND plant_id=$2
    `, [req.user.tenantId, plant_id]);
  }
  const { rows: [state] } = await db.query(
    'SELECT * FROM headcount_state WHERE tenant_id=$1 AND plant_id=$2',
    [req.user.tenantId, plant_id]
  );
  try {
    const ws = require('../services/websocket');
    ws.broadcastToTenant(req.user.tenantId, { type: 'headcount_update', data: state });
  } catch {}
  res.json({ success: true, data: state });
}));

// ── DASHBOARD: POST /headcount/manual-adjust ────────────────────────────────
// Safety marshal can seed count at shift start or correct a drift
router.post('/manual-adjust', authenticate, asyncHandler(async (req, res) => {
  const { plant_id, count, note } = req.body;
  await getDB().query(`
    UPDATE headcount_state SET current_count=$3, updated_at=now()
    WHERE tenant_id=$1 AND plant_id=$2
  `, [req.user.tenantId, plant_id, Math.max(0, parseInt(count) || 0)]);
  res.json({ success: true });
}));

// ── DASHBOARD: GET /headcount/shift-log ─────────────────────────────────────
router.get('/shift-log', authenticate, asyncHandler(async (req, res) => {
  const { plant_id, hours = 12 } = req.query;
  const { rows } = await getDB().query(`
    SELECT e.direction, e.count, e.occurred_at,
           c.cam_label, c.camera_role
    FROM headcount_events e
    LEFT JOIN cameras c ON c.id = e.camera_id
    WHERE e.tenant_id=$1
      AND ($2::uuid IS NULL OR e.plant_id=$2::uuid)
      AND e.occurred_at > now() - ($3||' hours')::interval
    ORDER BY e.occurred_at DESC
    LIMIT 500
  `, [req.user.tenantId, plant_id || null, String(hours)]);
  res.json({ success: true, data: rows });
}));

// ── ESCALATION CONFIG ────────────────────────────────────────────────────────
router.get('/escalation', authenticate, asyncHandler(async (req, res) => {
  const { rows } = await getDB().query(
    'SELECT * FROM headcount_escalation WHERE tenant_id=$1 ORDER BY level',
    [req.user.tenantId]
  );
  res.json({ success: true, data: rows });
}));

router.post('/escalation', authenticate, asyncHandler(async (req, res) => {
  const { plant_id, level, name, role, phone, email } = req.body;
  const { rows: [row] } = await getDB().query(`
    INSERT INTO headcount_escalation (tenant_id, plant_id, level, name, role, phone, email)
    VALUES ($1,$2,$3,$4,$5,$6,$7)
    ON CONFLICT DO NOTHING RETURNING *
  `, [req.user.tenantId, plant_id || null, level || 1, name, role || null, phone || null, email || null]);
  res.json({ success: true, data: row });
}));

// ── SHIFT DEFINITIONS ────────────────────────────────────────────────────────
router.get('/shifts', authenticate, asyncHandler(async (req, res) => {
  const { rows } = await getDB().query(
    'SELECT * FROM shift_definitions WHERE tenant_id=$1 AND active=TRUE ORDER BY start_time',
    [req.user.tenantId]
  );
  res.json({ success: true, data: rows });
}));

router.post('/shifts', authenticate, asyncHandler(async (req, res) => {
  const { plant_id, name, start_time, end_time } = req.body;
  const { rows: [row] } = await getDB().query(`
    INSERT INTO shift_definitions (tenant_id, plant_id, name, start_time, end_time)
    VALUES ($1,$2,$3,$4,$5) RETURNING *
  `, [req.user.tenantId, plant_id || null, name, start_time, end_time]);
  res.json({ success: true, data: row });
}));

module.exports = router;


