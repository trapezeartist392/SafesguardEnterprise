const fs = require('fs');
let c = fs.readFileSync('src/services/websocket.js', 'utf8');

const newFn = `
function broadcastToTenant(tenantId, msg) {
  clients.forEach((info, ws) => {
    if (info.tenantId === tenantId && ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  });
}
`;

// Insert before module.exports
c = c.replace('module.exports = {', newFn + 'module.exports = {');

// Add to exports
c = c.replace('  broadcastStats,', '  broadcastStats,\n  broadcastToTenant,');

fs.writeFileSync('src/services/websocket.js', c);
console.log(require('fs').readFileSync('src/services/websocket.js','utf8').includes('broadcastToTenant') ? 'done' : 'failed');
