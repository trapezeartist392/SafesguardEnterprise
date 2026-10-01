#!/bin/bash
# ══════════════════════════════════════════════════════════════
# SafeguardsIQ Edge — One-Command Installer
# Run on a fresh NVIDIA Jetson Orin Nano (JetPack 6.0+)
# Usage: chmod +x install.sh && ./install.sh
# ══════════════════════════════════════════════════════════════

set -e
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  SafeguardsIQ Edge Installer"
echo "  On-premise AI Factory Safety Monitoring"
echo "═══════════════════════════════════════════════════════════"
echo ""

# ── 1. System dependencies ──
echo "Step 1 — Installing system dependencies..."
sudo apt update -qq
sudo apt install -y -qq python3-pip python3-venv libopencv-dev > /dev/null 2>&1
echo "  ✅ System packages installed"

# ── 2. Python virtual environment ──
echo ""
echo "Step 2 — Setting up Python environment..."
INSTALL_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$INSTALL_DIR"

python3 -m venv venv --system-site-packages
source venv/bin/activate
pip install --upgrade pip -q
pip install -r requirements.txt -q
echo "  ✅ Python dependencies installed"

# ── 3. Create directories ──
echo ""
echo "Step 3 — Creating data directories..."
mkdir -p frames models reports static
echo "  ✅ Directories created"

# ── 4. Initialize database ──
echo ""
echo "Step 4 — Initializing database..."
python3 database.py
echo "  ✅ Database ready"

# ── 5. Create systemd service ──
echo ""
echo "Step 5 — Creating system service..."
sudo tee /etc/systemd/system/safeguardsiq-edge.service > /dev/null << SVCEOF
[Unit]
Description=SafeguardsIQ Edge — AI Safety Monitor
After=network.target

[Service]
Type=simple
User=$(whoami)
WorkingDirectory=${INSTALL_DIR}
ExecStart=${INSTALL_DIR}/venv/bin/python3 ${INSTALL_DIR}/server.py
Restart=always
RestartSec=5
Environment=PYTHONUNBUFFERED=1

[Install]
WantedBy=multi-user.target
SVCEOF

sudo systemctl daemon-reload
sudo systemctl enable safeguardsiq-edge
echo "  ✅ Service created (auto-starts on boot)"

# ── 6. Start ──
echo ""
echo "Step 6 — Starting SafeguardsIQ Edge..."
sudo systemctl start safeguardsiq-edge
sleep 3

# Check if running
if systemctl is-active --quiet safeguardsiq-edge; then
    IP=$(hostname -I | awk '{print $1}')
    echo ""
    echo "═══════════════════════════════════════════════════════════"
    echo "  ✅ SafeguardsIQ Edge is RUNNING"
    echo ""
    echo "  Dashboard:  http://${IP}:5000"
    echo "  API:        http://${IP}:5000/api/health"
    echo ""
    echo "  Next steps:"
    echo "  1. Open the dashboard from any device on this network"
    echo "  2. Add your cameras (RTSP URL)"
    echo "  3. Place your trained model at: ${INSTALL_DIR}/models/best.pt"
    echo "  4. Restart: sudo systemctl restart safeguardsiq-edge"
    echo ""
    echo "  Commands:"
    echo "  Status:   sudo systemctl status safeguardsiq-edge"
    echo "  Logs:     sudo journalctl -u safeguardsiq-edge -f"
    echo "  Restart:  sudo systemctl restart safeguardsiq-edge"
    echo "  Stop:     sudo systemctl stop safeguardsiq-edge"
    echo "═══════════════════════════════════════════════════════════"
else
    echo "  ❌ Service failed to start. Check logs:"
    echo "  sudo journalctl -u safeguardsiq-edge -n 20"
fi
