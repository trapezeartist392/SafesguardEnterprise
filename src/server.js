require('dotenv').config();
const http = require('http');
const app = require('./app');
const { connectDB } = require('./config/database');
const { loadAndVerify } = require('./config/license');
const { initWebSocket } = require('./services/websocket');

const PORT = process.env.PORT || 4200;

(async () => {
  try {
    try {
      const lic = loadAndVerify();
      console.log(`✅ License valid — ${lic.customer} (${lic.max_devices} devices, ${lic.max_cameras} cameras, expires ${lic.expires_at})`);
    } catch (err) {
      console.error(`⚠️  License warning: ${err.message}`);
      console.error('   Protected routes will return 403. Place a .lic file and restart.');
    }

    await connectDB();

    // Create HTTP server and attach WebSocket
    const server = http.createServer(app);
    initWebSocket(server);

    server.listen(PORT, () => {
      console.log(`🚀 SafeguardIQ Enterprise running on port ${PORT}`);
      console.log(`📡 Real-time WebSocket at ws://localhost:${PORT}/ws`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
})();
