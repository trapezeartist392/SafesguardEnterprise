"""
SafeguardsIQ Edge — Local Web Server
======================================
Flask API server running on Jetson. Serves the dashboard at
http://JETSON_IP:5000 and provides REST API for camera management,
violation data, and live frames.

No internet required. Accessible from any device on the factory LAN.
"""

import os
import json
from datetime import datetime
from flask import Flask, jsonify, request, send_from_directory, send_file

from database import (
    init_db, get_cameras, add_camera, get_config, set_config,
    get_violations, get_today_stats, get_factory_info,
    update_factory_info, get_shift_stats, get_violations_count,
    get_unsynced_violations, mark_synced, get_current_shift,
)
from engine import (
    load_model, init_gpio, start_camera, stop_camera,
    start_all_cameras, get_active_cameras, get_live_frame,
    get_all_live_frames, start_maintenance, cleanup_gpio,
    YOLO_MODEL,
)

# ── Flask App ───────────────────────────────────────────────────
app = Flask(__name__,
    static_folder="static",
    static_url_path="/static"
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))


# ── Dashboard (serves the HTML file) ────────────────────────────
@app.route("/")
def index():
    return send_file(os.path.join(BASE_DIR, "static", "dashboard.html"))


@app.route("/frames/<path:filepath>")
def serve_frame(filepath):
    return send_from_directory(os.path.join(BASE_DIR, "frames"), filepath)


# ── Health ──────────────────────────────────────────────────────
@app.route("/api/health")
def health():
    return jsonify({
        "status": "ok",
        "service": "safeguardsiq-edge",
        "model_loaded": YOLO_MODEL is not None,
        "active_cameras": len(get_active_cameras()),
        "timestamp": datetime.utcnow().isoformat(),
    })


# ── Dashboard Stats ─────────────────────────────────────────────
@app.route("/api/stats")
def stats():
    return jsonify({"success": True, "data": get_today_stats()})


@app.route("/api/factory")
def factory_info():
    return jsonify({"success": True, "data": get_factory_info()})


@app.route("/api/factory", methods=["PUT"])
def update_factory():
    data = request.json
    allowed = ["factory_name", "address", "registration_no", "industry_type",
               "contact_name", "contact_phone", "contact_email"]
    updates = {k: v for k, v in data.items() if k in allowed}
    if updates:
        update_factory_info(**updates)
    return jsonify({"success": True})


# ── Cameras ─────────────────────────────────────────────────────
@app.route("/api/cameras")
def list_cameras():
    cameras = get_cameras()
    active = get_active_cameras()
    for cam in cameras:
        cam["is_active"] = cam["cam_label"] in active
        lf = get_live_frame(cam["cam_label"])
        if lf:
            cam["live_persons"] = lf["persons"]
            cam["live_risk"] = lf["risk"]
            cam["live_violations"] = lf["violations"]
            cam["live_updated"] = lf["updated_at"]
    return jsonify({"success": True, "data": cameras})


@app.route("/api/cameras", methods=["POST"])
def create_camera():
    data = request.json
    cam_label = data.get("cam_label", "").strip()
    rtsp_url = data.get("rtsp_url", "").strip()
    zone = data.get("zone", "")
    ppe_types = data.get("ppe_types", ["Helmet", "Safety Vest", "Gloves"])

    if not cam_label or not rtsp_url:
        return jsonify({"success": False, "message": "cam_label and rtsp_url required"}), 400

    add_camera(cam_label, rtsp_url, zone, ppe_types)
    return jsonify({"success": True, "message": f"Camera {cam_label} added"})


@app.route("/api/cameras/<cam_label>/start", methods=["POST"])
def start_cam(cam_label):
    cameras = get_cameras()
    cam = next((c for c in cameras if c["cam_label"] == cam_label), None)
    if not cam:
        return jsonify({"success": False, "message": "Camera not found"}), 404

    ppe_types = json.loads(cam.get("ppe_types", '["Helmet","Safety Vest","Gloves"]'))
    ok = start_camera(cam_label, cam["rtsp_url"], ppe_types)
    return jsonify({"success": ok, "message": "Started" if ok else "Already running"})


@app.route("/api/cameras/<cam_label>/stop", methods=["POST"])
def stop_cam(cam_label):
    ok = stop_camera(cam_label)
    return jsonify({"success": ok, "message": "Stopped" if ok else "Not running"})


@app.route("/api/cameras/start-all", methods=["POST"])
def start_all():
    count = start_all_cameras()
    return jsonify({"success": True, "message": f"Started {count} cameras"})


# ── Live Frames ─────────────────────────────────────────────────
@app.route("/api/live-frame/<cam_label>")
def live_frame(cam_label):
    lf = get_live_frame(cam_label)
    if not lf:
        return jsonify({"success": False, "message": "No live frame"})
    age = (datetime.utcnow() - datetime.fromisoformat(lf["updated_at"])).total_seconds()
    return jsonify({
        "success": True,
        "frame": lf["frame"],
        "persons": lf["persons"],
        "riskLevel": lf["risk"],
        "violations": lf["violations"],
        "updatedAt": lf["updated_at"],
        "ageSeconds": round(age),
        "stale": age > 60,
    })


@app.route("/api/live-frames")
def all_live_frames():
    frames = get_all_live_frames()
    result = []
    for cam_label, lf in frames.items():
        age = (datetime.utcnow() - datetime.fromisoformat(lf["updated_at"])).total_seconds()
        result.append({
            "cameraId": cam_label,
            "persons": lf["persons"],
            "riskLevel": lf["risk"],
            "violations": lf["violations"],
            "updatedAt": lf["updated_at"],
            "ageSeconds": round(age),
        })
    return jsonify({"success": True, "cameras": result})


# ── Violations ──────────────────────────────────────────────────
@app.route("/api/violations")
def list_violations():
    hours = int(request.args.get("hours", 24))
    cam = request.args.get("camera")
    limit = int(request.args.get("limit", 100))
    violations = get_violations(hours, cam, limit)
    return jsonify({"success": True, "data": violations, "count": len(violations)})


@app.route("/api/violations/count")
def violation_count():
    hours = int(request.args.get("hours", 24))
    return jsonify({"success": True, "count": get_violations_count(hours)})


# ── Shifts ──────────────────────────────────────────────────────
@app.route("/api/shifts")
def shift_info():
    date_str = request.args.get("date")
    return jsonify({
        "success": True,
        "current_shift": get_current_shift(),
        "stats": get_shift_stats(date_str),
    })


# ── Config ──────────────────────────────────────────────────────
@app.route("/api/config")
def get_all_config():
    from database import get_db
    with get_db() as db:
        rows = db.execute("SELECT key, value FROM config").fetchall()
        config = {r["key"]: r["value"] for r in rows}
    return jsonify({"success": True, "data": config})


@app.route("/api/config", methods=["PUT"])
def update_config():
    data = request.json
    for k, v in data.items():
        set_config(k, v)
    return jsonify({"success": True})


# ── Cloud Sync ──────────────────────────────────────────────────
@app.route("/api/sync/status")
def sync_status():
    unsynced = get_unsynced_violations()
    return jsonify({
        "success": True,
        "pending": len(unsynced),
        "cloud_sync_enabled": get_config("cloud_sync_enabled", "false") == "true",
    })


@app.route("/api/sync/trigger", methods=["POST"])
def trigger_sync():
    """Manually trigger cloud sync."""
    cloud_url = get_config("cloud_url", "")
    cloud_token = get_config("cloud_token", "")

    if not cloud_url or not cloud_token:
        return jsonify({"success": False, "message": "Cloud sync not configured"}), 400

    import requests
    unsynced = get_unsynced_violations(limit=50)
    synced_ids = []

    for v in unsynced:
        try:
            r = requests.post(f"{cloud_url}/violations", json={
                "camLabel": v["cam_label"],
                "violationType": v["violation_type"],
                "severity": v["severity"],
                "confidence": v["confidence"],
                "description": v["description"],
            }, headers={
                "Authorization": f"Bearer {cloud_token}",
                "Content-Type": "application/json",
            }, timeout=10)
            if r.status_code in (200, 201):
                synced_ids.append(v["id"])
        except:
            break  # stop on first failure

    if synced_ids:
        mark_synced(synced_ids)

    return jsonify({
        "success": True,
        "synced": len(synced_ids),
        "remaining": len(unsynced) - len(synced_ids),
    })


# ── System ──────────────────────────────────────────────────────
@app.route("/api/system")
def system_info():
    import platform
    try:
        import psutil
        cpu = psutil.cpu_percent(interval=1)
        mem = psutil.virtual_memory()
        disk = psutil.disk_usage("/")
        temp = None
        try:
            with open("/sys/class/thermal/thermal_zone0/temp") as f:
                temp = round(int(f.read().strip()) / 1000, 1)
        except:
            pass
        return jsonify({
            "success": True,
            "data": {
                "hostname": platform.node(),
                "platform": platform.platform(),
                "cpu_percent": cpu,
                "memory_total_gb": round(mem.total / 1e9, 1),
                "memory_used_gb": round(mem.used / 1e9, 1),
                "memory_percent": mem.percent,
                "disk_total_gb": round(disk.total / 1e9, 1),
                "disk_used_gb": round(disk.used / 1e9, 1),
                "disk_percent": disk.percent,
                "temperature_c": temp,
                "model_loaded": YOLO_MODEL is not None,
                "active_cameras": get_active_cameras(),
            }
        })
    except ImportError:
        return jsonify({
            "success": True,
            "data": {
                "hostname": platform.node(),
                "platform": platform.platform(),
                "model_loaded": YOLO_MODEL is not None,
                "active_cameras": get_active_cameras(),
            }
        })


# ── Main ────────────────────────────────────────────────────────
def main():
    print("\n" + "=" * 60)
    print("   SafeguardsIQ Edge — Local Safety Monitoring System")
    print("   On-premise AI • No internet required • Sub-1s detection")
    print("=" * 60 + "\n")

    # Initialize database
    print("Step 1 — Initializing database")
    init_db()

    # Load YOLO model
    print("\nStep 2 — Loading AI model")
    if not load_model():
        print("  ⚠  Running without AI model — add models/best.pt and restart")

    # Initialize GPIO
    print("\nStep 3 — Initializing GPIO alarm")
    init_gpio()

    # Start maintenance thread
    start_maintenance()

    # Auto-start cameras
    print("\nStep 4 — Starting cameras")
    cameras = get_cameras()
    if cameras:
        count = start_all_cameras()
        print(f"  Started {count} camera(s)")
    else:
        print("  No cameras configured — add via dashboard at http://DEVICE_IP:5000")

    # Start web server
    host = get_config("server_host", "0.0.0.0")
    port = int(get_config("server_port", "5000"))

    print(f"\nStep 5 — Starting dashboard")
    print(f"  Dashboard: http://0.0.0.0:{port}")
    print(f"  API:       http://0.0.0.0:{port}/api/health")
    print(f"\n  Open the dashboard from any device on this network.")
    print(f"  Press Ctrl+C to stop.\n")

    app.run(host=host, port=port, debug=False, threaded=True)


if __name__ == "__main__":
    main()
