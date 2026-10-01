const { WebSocketServer, WebSocket } = require('ws');
const jwt = require('jsonwebtoken');
const url = require('url');

let wss = null;
const clients = new Map(); // ws → { tenantId, userId }

function initWebSocket(server) {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    const params = url.parse(req.url, true).query;
    const token = params.token;
    if (!token) { ws.close(4001, 'Token required'); return; }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      clients.set(ws, { tenantId: decoded.tid, userId: decoded.sub });
      console.log(`[WS] Client connected (tenant: ${decoded.tid})`);

      ws.on('close', () => { clients.delete(ws); console.log('[WS] Client disconnected'); });
      ws.on('error', () => { clients.delete(ws); });

      ws.send(JSON.stringify({
        type: 'connected',
        message: 'Real-time feed active',
        timestamp: new Date().toISOString(),
      }));
    } catch {
      ws.close(4002, 'Invalid token');
    }
  });

  console.log('✅ WebSocket server ready at /ws');
  return wss;
}

function send(tenantId, payload) {
  if (!wss) return 0;
  const msg = JSON.stringify({ ...payload, timestamp: new Date().toISOString() });
  let sent = 0;
  clients.forEach((info, ws) => {
    if (info.tenantId === tenantId && ws.readyState === WebSocket.OPEN) {
      ws.send(msg); sent++;
    }
  });
  return sent;
}

function broadcastViolation(tenantId, violation) {
  const n = send(tenantId, { type: 'violation', data: violation });
  if (n) console.log(`[WS] violation ${violation.violation_no} → ${n} client(s)`);
}

function broadcastDeviceStatus(tenantId, device) {
  send(tenantId, { type: 'device_status', data: device });
}

// NEW — per-camera status updates (online/offline, fresh thumbnail)
function broadcastCameraStatus(tenantId, camera) {
  send(tenantId, { type: 'camera_status', data: camera });
}

function broadcastStats(tenantId, stats) {
  send(tenantId, { type: 'stats_update', data: stats });
}

function getClientCount() { return clients.size; }

module.exports = {
  initWebSocket,
  broadcastViolation,
  broadcastDeviceStatus,
  broadcastCameraStatus,
  broadcastStats,
  getClientCount,
};
