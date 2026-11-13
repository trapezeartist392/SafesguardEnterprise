#!/usr/bin/env python3
"""
SafeguardsIQ — DVR Edge Agent Adapter
=======================================
Sits between a CP Plus / Dahua DVR and the SafeguardsIQ Enterprise edge agent.
Pulls all camera channels from a single DVR over RTSP and feeds them into
the existing edge agent pipeline.

This replaces the need for direct camera-to-edge-computer wiring.
One PC + this adapter + existing DVR = full SafeguardsIQ deployment.

Architecture:
  CCTV Cameras → DVR (existing) → LAN
                                    ↓
                          This PC (runs dvr_edge_agent.py)
                          Pulls RTSP from DVR channels
                                    ↓
                          SafeguardsIQ Enterprise backend

Usage:
  python dvr_edge_agent.py                          # Use dvr_config.json
  python dvr_edge_agent.py --config my_dvr.json     # Custom config file
  python dvr_edge_agent.py --setup                  # Interactive setup wizard

Requirements:
  pip install opencv-python requests ultralytics numpy
"""

import base64
import cv2
import json
import time
import os
import sys
import signal
import logging
import argparse
import threading
import socket
from datetime import datetime, timezone
from pathlib import Path
from collections import defaultdict

try:
    import requests
except ImportError:
    print("ERROR: pip install requests")
    sys.exit(1)

try:
    import numpy as np
except ImportError:
    print("ERROR: pip install numpy")
    sys.exit(1)


# ── Logging ──────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("dvr-agent")


# ── Default config ───────────────────────────────────────────────────

DEFAULT_CONFIG = {
    "server_url": "http://localhost:3000",
    "device_key": "",
    "device_code": "",

    "dvr": {
        "ip": "192.168.1.10",
        "port": 8554,
        "username": "admin",
        "password": "admin",
        "protocol": "dahua",      # "dahua" or "cpplus_v2" or "cpplus_v3"
        "transport": "tcp",       # "tcp" or "udp" — tcp is more reliable for DVR
    },

    "channels": [
        {
            "channel": 1,
            "label": "DVR-CH1",
            "stream": "main",     # "main" or "sub"
            "camera_role": "ppe",
            "headcount_enabled": False,
            "fps_target": 8,
            "enabled": True,
        },
    ],

    "detection": {
        "model_path": "models/ppe-v1.pt",
        "headcount_model": "yolov8n.pt",
        "confidence_threshold": 0.5,
        "frame_skip": 3,          # Process every Nth frame (saves CPU)
    },

    "heartbeat_interval": 30,
    "reconnect_delay": 5,
    "max_reconnect_attempts": 0,  # 0 = infinite
}

# RTSP URL templates per protocol
RTSP_TEMPLATES = {
    "dahua": {
        "main": "/cam/realmonitor?channel={ch}&subtype=0",
        "sub":  "/cam/realmonitor?channel={ch}&subtype=1",
    },
    "cpplus_v2": {
        "main": "/ch{ch:02d}/main/av_stream",
        "sub":  "/ch{ch:02d}/sub/av_stream",
    },
    "cpplus_v3": {
        "main": "/stream1",
        "sub":  "/stream2",
    },
}


# ── DVR Channel Reader ──────────────────────────────────────────────

class DVRChannelReader:
    """Reads frames from a single DVR channel over RTSP."""

    def __init__(self, config, dvr_config, channel_config):
        self.config = config
        self.dvr = dvr_config
        self.ch_config = channel_config
        self.channel = channel_config["channel"]
        self.label = channel_config.get("label", f"DVR-CH{self.channel}")
        self.enabled = channel_config.get("enabled", True)
        self.fps_target = channel_config.get("fps_target", 8)
        self.stream_type = channel_config.get("stream", "main")

        self.cap = None
        self.running = False
        self.last_frame = None
        self.last_frame_time = 0
        self.frame_count = 0
        self.error_count = 0
        self.status = "idle"
        self.lock = threading.Lock()

    def build_rtsp_url(self):
        """Build the RTSP URL for this channel."""
        protocol = self.dvr.get("protocol", "dahua")
        templates = RTSP_TEMPLATES.get(protocol, RTSP_TEMPLATES["dahua"])
        path = templates[self.stream_type].format(ch=self.channel)

        user = self.dvr["username"]
        password = self.dvr["password"]
        ip = self.dvr["ip"]
        port = self.dvr.get("port", 554)

        return f"rtsp://{user}:{password}@{ip}:{port}{path}"

    def connect(self):
        """Open the RTSP stream."""
        url = self.build_rtsp_url()
        log.info(f"[CH{self.channel}] Connecting: {self.label}")
        log.info(f"[CH{self.channel}]   URL: rtsp://***:***@{self.dvr['ip']}:{self.dvr.get('port',554)}/...")

        # Force TCP transport for DVR reliability
        os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = (
            f"rtsp_transport;{self.dvr.get('transport', 'tcp')}"
            f"|analyzeduration;5000000|stimeout;10000000"
        )

        self.cap = cv2.VideoCapture(url, cv2.CAP_FFMPEG)

        if not self.cap.isOpened():
            self.status = "error"
            log.error(f"[CH{self.channel}] Failed to connect to {self.label}")
            return False

        w = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        h = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fps = round(self.cap.get(cv2.CAP_PROP_FPS), 1)
        log.info(f"[CH{self.channel}] Connected: {w}×{h} @ {fps}fps")

        self.status = "online"
        self.error_count = 0
        return True

    def disconnect(self):
        """Release the RTSP stream."""
        if self.cap:
            self.cap.release()
            self.cap = None
        self.status = "offline"

    def read_frame(self):
        """Read a single frame. Returns (success, frame)."""
        if not self.cap or not self.cap.isOpened():
            return False, None

        ret, frame = self.cap.read()
        if ret and frame is not None and frame.size > 0:
            with self.lock:
                self.last_frame = frame
                self.last_frame_time = time.time()
                self.frame_count += 1
            self.error_count = 0
            return True, frame
        else:
            self.error_count += 1
            if self.error_count > 30:
                log.warning(f"[CH{self.channel}] Too many read errors, reconnecting...")
                self.disconnect()
            return False, None

    def get_frame_interval(self):
        """Seconds between frames based on fps_target."""
        return 1.0 / max(1, self.fps_target)


# ── DVR Edge Agent ───────────────────────────────────────────────────

class DVREdgeAgent:
    """
    Main agent: manages all DVR channels, runs detection,
    and reports to SafeguardsIQ Enterprise backend.
    """

    def __init__(self, config_path="dvr_config.json"):
        self.config = self.load_config(config_path)
        self.dvr_config = self.config["dvr"]
        self.channels = []
        self.running = False
        self.detection_model = None
        self.headcount_model = None
        self.server_url = self.config["server_url"].rstrip("/")
        self.device_key = self.config["device_key"]

        self._setup_channels()

    def load_config(self, path):
        """Load config from file, falling back to defaults."""
        if os.path.exists(path):
            with open(path) as f:
                user_config = json.load(f)
            # Merge with defaults
            config = {**DEFAULT_CONFIG, **user_config}
            config["dvr"] = {**DEFAULT_CONFIG["dvr"], **user_config.get("dvr", {})}
            config["detection"] = {**DEFAULT_CONFIG["detection"], **user_config.get("detection", {})}
            return config
        else:
            log.warning(f"Config file {path} not found. Run with --setup to create one.")
            return DEFAULT_CONFIG

    def _setup_channels(self):
        """Initialize channel readers from config."""
        for ch_conf in self.config.get("channels", []):
            reader = DVRChannelReader(self.config, self.dvr_config, ch_conf)
            self.channels.append(reader)
        log.info(f"Configured {len(self.channels)} DVR channel(s)")

    def load_models(self):
        """Load YOLO models for detection."""
        det_conf = self.config["detection"]

        # PPE detection model
        model_path = det_conf.get("model_path", "models/ppe-v1.pt")
        if os.path.exists(model_path):
            try:
                from ultralytics import YOLO
                self.detection_model = YOLO(model_path)
                log.info(f"PPE model loaded: {model_path}")
            except Exception as e:
                log.error(f"Failed to load PPE model: {e}")
        else:
            log.warning(f"PPE model not found at {model_path} — detection disabled")

        # Headcount model (for entry/exit/assembly cameras)
        hc_channels = [ch for ch in self.channels
                       if ch.ch_config.get("headcount_enabled")]
        if hc_channels:
            hc_model_path = det_conf.get("headcount_model", "yolov8n.pt")
            try:
                from ultralytics import YOLO
                self.headcount_model = YOLO(hc_model_path)
                log.info(f"Headcount model loaded: {hc_model_path}")
                log.info(f"  {len(hc_channels)} channel(s) with headcount enabled")
            except Exception as e:
                log.error(f"Failed to load headcount model: {e}")

    def connect_all(self):
        """Connect to all enabled DVR channels."""
        connected = 0
        for ch in self.channels:
            if not ch.enabled:
                log.info(f"[CH{ch.channel}] Skipped (disabled)")
                continue
            if ch.connect():
                connected += 1
            else:
                log.error(f"[CH{ch.channel}] Connection failed — will retry")
        log.info(f"Connected to {connected}/{len(self.channels)} channel(s)")
        return connected

    def heartbeat(self):
        """Send heartbeat to SafeguardsIQ backend."""
        if not self.device_key:
            return

        try:
            payload = {
                "device_code": self.config.get("device_code", ""),
                "status": "online",
                "cameras": [],
            }
            for ch in self.channels:
                cam_data = {
                    "cam_label": ch.label,
                    "status": ch.status,
                    "frame_count": ch.frame_count,
                    "fps_actual": round(ch.frame_count / max(1, time.time() - ch.last_frame_time), 1)
                        if ch.last_frame_time > 0 else 0,
                }
                # Include thumbnail from latest frame
                if ch.last_frame is not None and ch.status == "online":
                    try:
                        frame = ch.last_frame
                        # Resize to small thumbnail (320px wide)
                        h, w = frame.shape[:2]
                        thumb_w = 320
                        thumb_h = int(h * thumb_w / w)
                        thumb = cv2.resize(frame, (thumb_w, thumb_h))
                        _, jpg = cv2.imencode('.jpg', thumb, [cv2.IMWRITE_JPEG_QUALITY, 60])
                        cam_data["thumb_b64"] = base64.b64encode(jpg.tobytes()).decode('ascii')
                    except Exception:
                        pass  # Skip thumbnail on error
                payload["cameras"].append(cam_data)

            resp = requests.post(
                f"{self.server_url}/api/v1/devices/heartbeat",
                json=payload,
                headers={"X-Edge-Key": self.device_key},
                timeout=10,
            )
            if resp.status_code == 200:
                online = sum(1 for ch in self.channels if ch.status == "online")
                log.info(f"[HEARTBEAT] OK — {online}/{len(self.channels)} channel(s) streaming")
            else:
                log.warning(f"[HEARTBEAT] Server returned {resp.status_code}")
        except Exception as e:
            log.warning(f"[HEARTBEAT] Failed: {e}")

    def process_frame(self, channel, frame):
        """Run PPE detection and/or headcount on a frame."""
        results = {}
        # Use 0.35 confidence like cloud agent for better detection at CCTV distance
        conf_threshold = self.config["detection"].get("confidence_threshold", 0.35)

        # PPE Detection
        if self.detection_model and channel.ch_config.get("camera_role") == "ppe":
            try:
                detections = self.detection_model(frame, conf=conf_threshold, verbose=False)
                violations = []
                persons = 0
                helmets = 0
                vests = 0

                for r in detections:
                    for box in r.boxes:
                        cls_id = int(box.cls[0])
                        cls_name = r.names[cls_id].lower()  # lowercase for matching
                        conf = float(box.conf[0])

                        # Count persons
                        if cls_name == "person":
                            persons += 1

                        # Count compliant PPE
                        elif cls_name in ("helmet", "hard hat", "hardhat", "safety helmet"):
                            helmets += 1
                        elif cls_name in ("vest", "safety vest", "hi-vis", "hi_vis"):
                            vests += 1

                        # Explicit violations — match all naming variants
                        elif cls_name in ("no helmet", "no_helmet", "no-helmet", "no hardhat",
                                          "no vest", "no_vest", "no-vest",
                                          "no gloves", "no_gloves", "no-gloves",
                                          "no goggles", "no_goggles", "no-goggles",
                                          "no mask", "no_mask", "no-mask"):
                            violations.append({
                                "type": cls_name.replace(" ", "-").replace("_", "-"),
                                "confidence": round(conf, 3),
                                "bbox": box.xyxy[0].tolist(),
                            })

                # Heuristic: more persons than helmets = missing helmets
                if persons > 0 and helmets < persons and not any(
                    v["type"].startswith("no-helmet") for v in violations
                ):
                    missing = persons - helmets
                    violations.append({
                        "type": "no-helmet",
                        "confidence": 0.5,  # moderate confidence for heuristic
                        "bbox": [],
                    })
                    log.info(f"[CH{channel.channel}] Heuristic: {persons} person(s), "
                             f"{helmets} helmet(s) — {missing} missing")

                results["violations"] = violations
            except Exception as e:
                log.error(f"[CH{channel.channel}] PPE detection error: {e}")

        # Headcount
        if self.headcount_model and channel.ch_config.get("headcount_enabled"):
            try:
                detections = self.headcount_model(frame, conf=0.4, classes=[0], verbose=False)
                person_count = 0
                for r in detections:
                    person_count += len(r.boxes)
                results["person_count"] = person_count
                results["camera_role"] = channel.ch_config.get("camera_role", "entry")
            except Exception as e:
                log.error(f"[CH{channel.channel}] Headcount error: {e}")

        return results

    def report_violation(self, channel, violation, frame):
        """Send a PPE violation to the backend via /devices/sync.

        Expects `frame` to already be annotated with bounding boxes
        (drawn by channel_loop before calling this method).
        """
        if not self.device_key:
            return

        try:
            # Save annotated violation frame locally
            ts = datetime.now().strftime("%Y%m%d_%H%M%S")
            frame_path = f"violations/{channel.label}_{ts}.jpg"
            os.makedirs("violations", exist_ok=True)
            cv2.imwrite(frame_path, frame)

            # Encode frame as base64 for backend (high quality)
            _, buf = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 90])
            frame_b64 = base64.b64encode(buf).decode('utf-8') if buf is not None else None

            local_event_id = f"{channel.label}_{ts}_{violation['type']}"

            payload = {
                "events": [{
                    "local_event_id": local_event_id,
                    "violation_type": violation["type"],
                    "confidence": round(violation["confidence"] * 100),
                    "occurred_at": datetime.now(timezone.utc).isoformat(),
                    "cam_label": channel.label,
                    "frame_b64": frame_b64,
                }]
            }
            resp = requests.post(
                f"{self.server_url}/api/v1/devices/sync",
                json=payload,
                headers={"X-Edge-Key": self.device_key},
                timeout=15,
            )
            if resp.status_code == 200:
                log.info(f"[CH{channel.channel}] Violation synced: {violation['type']}")
            else:
                log.warning(f"[CH{channel.channel}] Violation sync returned {resp.status_code}")
        except Exception as e:
            log.error(f"[CH{channel.channel}] Failed to report violation: {e}")

    def report_headcount(self, channel, count):
        """Send headcount event to the backend via /headcount/event."""
        if not self.device_key:
            return

        try:
            role = channel.ch_config.get("camera_role", "entry")
            if role == "entry":
                direction = "in"
            elif role == "exit":
                direction = "out"
            elif role == "assembly":
                direction = "assembly_in"
            else:
                direction = "in"

            ts = datetime.now(timezone.utc).isoformat()
            local_event_id = f"hc_{channel.label}_{int(time.time())}_{count}"

            payload = {
                "events": [{
                    "direction": direction,
                    "count": count,
                    "occurred_at": ts,
                    "local_event_id": local_event_id,
                }]
            }
            resp = requests.post(
                f"{self.server_url}/api/v1/headcount/event",
                json=payload,
                headers={"X-Edge-Key": self.device_key},
                timeout=10,
            )
            if resp.status_code == 200:
                log.debug(f"[CH{channel.channel}] Headcount sent: {direction}={count}")
            else:
                log.warning(f"[CH{channel.channel}] Headcount returned {resp.status_code}")
        except Exception as e:
            log.error(f"[CH{channel.channel}] Failed to report headcount: {e}")

    def channel_loop(self, channel):
        """Main loop for a single DVR channel (runs in its own thread)."""
        frame_interval = channel.get_frame_interval()
        frame_skip = self.config["detection"].get("frame_skip", 3)
        reconnect_delay = self.config.get("reconnect_delay", 5)
        local_count = 0

        while self.running:
            # Reconnect if needed
            if channel.status != "online":
                log.info(f"[CH{channel.channel}] Reconnecting in {reconnect_delay}s...")
                time.sleep(reconnect_delay)
                if not channel.connect():
                    reconnect_delay = min(reconnect_delay * 2, 60)
                    continue
                reconnect_delay = self.config.get("reconnect_delay", 5)

            # Read frame
            ret, frame = channel.read_frame()
            if not ret:
                time.sleep(0.05)
                continue

            local_count += 1

            # Skip frames for CPU savings
            if local_count % frame_skip != 0:
                time.sleep(0.01)
                continue

            # Process frame
            results = self.process_frame(channel, frame)

            # Handle violations — draw ALL boxes on one annotated frame
            violations = results.get("violations", [])
            if violations:
                annotated = frame.copy()
                for v in violations:
                    bbox = v.get("bbox", [])
                    if len(bbox) == 4:
                        x1, y1, x2, y2 = [int(c) for c in bbox]
                        cv2.rectangle(annotated, (x1, y1), (x2, y2), (0, 255, 255), 2)
                        label = f"{v['type']} {v['confidence']:.0%}"
                        (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 1)
                        cv2.rectangle(annotated, (x1, y1 - th - 8), (x1 + tw + 4, y1),
                                      (0, 255, 255), -1)
                        cv2.putText(annotated, label, (x1 + 2, y1 - 4),
                                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 1, cv2.LINE_AA)
                for v in violations:
                    log.warning(f"[CH{channel.channel}] VIOLATION: {v['type']} ({v['confidence']:.0%})")
                    self.report_violation(channel, v, annotated)

            # Handle headcount
            if "person_count" in results:
                count = results["person_count"]
                if count > 0:
                    self.report_headcount(channel, count)

            # Rate limit
            time.sleep(frame_interval)

    def heartbeat_loop(self):
        """Periodic heartbeat to backend."""
        interval = self.config.get("heartbeat_interval", 30)
        while self.running:
            self.heartbeat()
            time.sleep(interval)

    def run(self):
        """Start the DVR edge agent."""
        print()
        print("=" * 60)
        print("  SafeguardsIQ Enterprise — DVR Edge Agent")
        print(f"  DVR: {self.dvr_config['ip']}:{self.dvr_config.get('port', 554)}")
        print(f"  Protocol: {self.dvr_config.get('protocol', 'dahua')}")
        print(f"  Channels: {len(self.channels)}")
        print("=" * 60)
        print()

        # Load detection models
        self.load_models()

        # Connect to DVR channels
        self.connect_all()

        # Start processing
        self.running = True
        threads = []

        # Channel threads
        for ch in self.channels:
            if ch.enabled and ch.status == "online":
                t = threading.Thread(target=self.channel_loop, args=(ch,),
                                     name=f"ch-{ch.channel}", daemon=True)
                t.start()
                threads.append(t)
                log.info(f"[CH{ch.channel}] Processing thread started ({ch.label})")

        # Heartbeat thread
        hb_thread = threading.Thread(target=self.heartbeat_loop, name="heartbeat", daemon=True)
        hb_thread.start()
        threads.append(hb_thread)

        log.info(f"DVR Edge Agent running — {len(threads)-1} camera thread(s) + heartbeat")
        log.info("Press Ctrl+C to stop")

        # Wait for interrupt
        try:
            while self.running:
                time.sleep(1)
        except KeyboardInterrupt:
            log.info("Shutting down...")
            self.running = False

        # Cleanup
        for ch in self.channels:
            ch.disconnect()
        log.info("DVR Edge Agent stopped.")

    def stop(self):
        self.running = False


# ── Setup wizard ─────────────────────────────────────────────────────

def setup_wizard():
    """Interactive config generator."""
    print()
    print("=" * 60)
    print("  SafeguardsIQ — DVR Edge Agent Setup")
    print("=" * 60)

    config = dict(DEFAULT_CONFIG)
    config["dvr"] = dict(DEFAULT_CONFIG["dvr"])
    config["detection"] = dict(DEFAULT_CONFIG["detection"])

    # Server
    print("\n[1/5] SafeguardsIQ Enterprise Server")
    config["server_url"] = input(f"  Server URL [{config['server_url']}]: ").strip() or config["server_url"]
    config["device_key"] = input("  Device API key (from dashboard): ").strip()
    config["device_code"] = input("  Device code (e.g. DVR-PRESS-01): ").strip()

    # DVR connection
    print("\n[2/5] DVR Connection")
    config["dvr"]["ip"] = input(f"  DVR IP [{config['dvr']['ip']}]: ").strip() or config["dvr"]["ip"]
    port_str = input(f"  RTSP port [{config['dvr']['port']}]: ").strip()
    if port_str:
        config["dvr"]["port"] = int(port_str)
    config["dvr"]["username"] = input(f"  Username [{config['dvr']['username']}]: ").strip() or config["dvr"]["username"]
    config["dvr"]["password"] = input("  Password: ").strip() or config["dvr"]["password"]

    print("\n  DVR protocol:")
    print("    [1] Dahua / CP Plus (Dahua OEM) — most common")
    print("    [2] CP Plus newer firmware")
    print("    [3] CP Plus basic/stream path")
    proto_choice = input("  Select [1]: ").strip() or "1"
    config["dvr"]["protocol"] = {"1": "dahua", "2": "cpplus_v2", "3": "cpplus_v3"}.get(proto_choice, "dahua")

    # Channels
    print("\n[3/5] Camera Channels")
    num_ch = int(input("  How many channels? [4]: ").strip() or "4")
    config["channels"] = []

    for i in range(1, num_ch + 1):
        print(f"\n  --- Channel {i} ---")
        label = input(f"    Label [DVR-CH{i}]: ").strip() or f"DVR-CH{i}"
        print("    Role: [1] PPE Monitoring  [2] Entry Gate  [3] Exit Gate  [4] Assembly Point")
        role_choice = input("    Select [1]: ").strip() or "1"
        role = {"1": "ppe", "2": "entry", "3": "exit", "4": "assembly"}.get(role_choice, "ppe")

        headcount = False
        if role in ("entry", "exit", "assembly"):
            headcount = input("    Enable headcount? (Y/n): ").strip().lower() != "n"

        config["channels"].append({
            "channel": i,
            "label": label,
            "stream": "main",
            "camera_role": role,
            "headcount_enabled": headcount,
            "fps_target": 8,
            "enabled": True,
        })

    # Detection
    print("\n[4/5] Detection Settings")
    model_path = input(f"  PPE model path [{config['detection']['model_path']}]: ").strip()
    if model_path:
        config["detection"]["model_path"] = model_path
    fps_str = input("  Target FPS per channel [8]: ").strip()
    if fps_str:
        for ch in config["channels"]:
            ch["fps_target"] = int(fps_str)

    # Save
    print("\n[5/5] Save Configuration")
    config_path = input("  Config file name [dvr_config.json]: ").strip() or "dvr_config.json"

    with open(config_path, "w") as f:
        json.dump(config, f, indent=2)

    print(f"\n  ✔ Config saved to {config_path}")
    print(f"  Run:  python dvr_edge_agent.py --config {config_path}")
    print()


# ── CLI entry point ──────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="SafeguardsIQ DVR Edge Agent — pull CCTV from existing DVR",
    )
    parser.add_argument("--config", default="dvr_config.json", help="Config file path")
    parser.add_argument("--setup", action="store_true", help="Run interactive setup wizard")

    args = parser.parse_args()

    if args.setup:
        setup_wizard()
    else:
        agent = DVREdgeAgent(config_path=args.config)
        signal.signal(signal.SIGINT, lambda *_: agent.stop())
        agent.run()


if __name__ == "__main__":
    main()
