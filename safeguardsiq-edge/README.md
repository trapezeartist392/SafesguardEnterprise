# SafeguardsIQ Edge — On-Premise AI Safety Monitor

## What is this?
A complete on-premise factory safety monitoring system that runs on an NVIDIA Jetson Orin Nano. No internet required. Sub-1-second violation detection with local alarms.

## Files
| File | Purpose |
|---|---|
| `server.py` | Main entry point — Flask web server + dashboard |
| `engine.py` | YOLO inference engine + camera processing + GPIO alarms |
| `database.py` | SQLite database manager — all local storage |
| `cloud_sync.py` | Optional cloud sync (pushes violations when internet available) |
| `install.sh` | One-command installer for Jetson |
| `requirements.txt` | Python dependencies |
| `static/dashboard.html` | Local web dashboard (accessed from any device on LAN) |
| `models/` | Place your trained YOLO model here as `best.pt` |
| `frames/` | Violation screenshots saved here |
| `reports/` | Generated compliance reports |

## Quick Start
```bash
chmod +x install.sh
./install.sh
```

## Dashboard
Open `http://JETSON_IP:5000` from any device on the factory network.

## Adding Cameras
1. Open the dashboard
2. Click "Add Camera"
3. Enter camera label (e.g. CAM-01) and RTSP URL
4. Click "Start"

## Adding Your YOLO Model
1. Train your model (see YOLO Training Guide)
2. Copy `best.pt` to the `models/` folder
3. Restart: `sudo systemctl restart safeguardsiq-edge`

## Hardware Requirements
- NVIDIA Jetson Orin Nano 8GB (or any Jetson with JetPack 6.0+)
- IP cameras with RTSP support (same LAN as Jetson)
- Optional: 12V buzzer on GPIO pin 7 for local alarms
