"""
SafeguardsIQ Edge — Inference Engine
======================================
Runs YOLO on local RTSP cameras. Detects PPE violations in real-time.
Triggers GPIO alarms. Stores violations locally. No internet required.
"""

import cv2
import os
import time
import json
import base64
import random
import threading
from datetime import datetime

from database import (
    init_db, get_cameras, get_config, set_config,
    update_camera_status, save_violation, log_detection,
    get_current_shift, reset_daily_counts, cleanup_old_logs,
)

# ── YOLO Model ──────────────────────────────────────────────────
YOLO_MODEL = None
MODEL_NAMES = {}


def load_model():
    """Load YOLO model from local file."""
    global YOLO_MODEL, MODEL_NAMES
    model_path = get_config("model_path", "models/best.pt")
    abs_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), model_path)

    try:
        from ultralytics import YOLO
        if os.path.exists(abs_path):
            print(f"  Loading model: {abs_path}")
            YOLO_MODEL = YOLO(abs_path)
        else:
            # Fallback to base model
            print(f"  Custom model not found at {abs_path}")
            print(f"  Loading YOLOv8n base model (person detection only)...")
            YOLO_MODEL = YOLO("yolov8n.pt")

        # Run a warmup inference
        import numpy as np
        dummy = np.zeros((640, 640, 3), dtype=np.uint8)
        YOLO_MODEL.predict(dummy, verbose=False)
        MODEL_NAMES = YOLO_MODEL.names if hasattr(YOLO_MODEL, 'names') else {}
        print(f"  ✅ Model loaded — {len(MODEL_NAMES)} classes")
        print(f"  Classes: {list(MODEL_NAMES.values())}")
        return True

    except ImportError:
        print("  ❌ ultralytics not installed. Run: pip install ultralytics")
        return False
    except Exception as e:
        print(f"  ❌ Model load failed: {e}")
        return False


# ── GPIO Alarm ──────────────────────────────────────────────────
GPIO_AVAILABLE = False
try:
    import Jetson.GPIO as GPIO
    GPIO_AVAILABLE = True
except ImportError:
    try:
        import RPi.GPIO as GPIO
        GPIO_AVAILABLE = True
    except ImportError:
        GPIO_AVAILABLE = False

_alarm_lock = threading.Lock()
_alarm_active = False


def init_gpio():
    """Initialize GPIO for buzzer/siren."""
    if not GPIO_AVAILABLE:
        print("  ⚠  GPIO not available (not running on Jetson/RPi)")
        return False
    try:
        pin = int(get_config("buzzer_pin", "7"))
        GPIO.setmode(GPIO.BOARD)
        GPIO.setup(pin, GPIO.OUT)
        GPIO.output(pin, GPIO.LOW)
        print(f"  ✅ GPIO initialized — buzzer on pin {pin}")
        return True
    except Exception as e:
        print(f"  ⚠  GPIO init failed: {e}")
        return False


def trigger_alarm(duration_ms=None):
    """Trigger the buzzer/siren for N milliseconds."""
    global _alarm_active
    if not GPIO_AVAILABLE:
        return
    if get_config("buzzer_enabled", "true") != "true":
        return
    if _alarm_active:
        return  # already sounding

    if duration_ms is None:
        duration_ms = int(get_config("buzzer_duration_ms", "3000"))

    def _buzz():
        global _alarm_active
        with _alarm_lock:
            _alarm_active = True
            pin = int(get_config("buzzer_pin", "7"))
            try:
                GPIO.output(pin, GPIO.HIGH)
                time.sleep(duration_ms / 1000.0)
                GPIO.output(pin, GPIO.LOW)
            except:
                pass
            _alarm_active = False

    threading.Thread(target=_buzz, daemon=True).start()


def cleanup_gpio():
    if GPIO_AVAILABLE:
        try:
            GPIO.cleanup()
        except:
            pass


# ── Smart Interval ──────────────────────────────────────────────
class SmartInterval:
    def __init__(self):
        self.last_violation_time = None
        self.clear_streak_start = time.time()
        self.reload_config()

    def reload_config(self):
        self.interval_normal  = int(get_config("interval_normal", "60"))
        self.interval_alert   = int(get_config("interval_alert", "15"))
        self.interval_relaxed = int(get_config("interval_relaxed", "300"))
        self.alert_duration   = int(get_config("alert_duration", "1800"))
        self.relaxed_after    = int(get_config("relaxed_after", "3600"))
        self.audit_rate       = float(get_config("audit_rate", "0.10"))

    def on_violation(self):
        self.last_violation_time = time.time()
        self.clear_streak_start = None

    def on_clear(self):
        if self.clear_streak_start is None:
            self.clear_streak_start = time.time()

    def get_interval(self):
        now = time.time()
        if self.last_violation_time and (now - self.last_violation_time) < self.alert_duration:
            return self.interval_alert, "ALERT"
        if self.clear_streak_start and (now - self.clear_streak_start) > self.relaxed_after:
            return self.interval_relaxed, "RELAXED"
        return self.interval_normal, "NORMAL"

    def should_audit(self):
        return random.random() < self.audit_rate


# ── YOLO Inference ──────────────────────────────────────────────
def analyze_frame(frame, ppe_types=None):
    """
    Run YOLO on frame. Returns:
    {
        "has_person": bool,
        "suspected_violation": bool,
        "persons": int,
        "violations": [{"type": str, "confidence": float, "bbox": [...]}],
        "details": str,
        "inference_ms": float
    }
    """
    if YOLO_MODEL is None:
        return {
            "has_person": False, "suspected_violation": False,
            "persons": 0, "violations": [], "details": "Model not loaded",
            "inference_ms": 0
        }

    conf_threshold = float(get_config("confidence_threshold", "0.35"))
    start = time.time()

    try:
        results = YOLO_MODEL.predict(frame, conf=conf_threshold, verbose=False)
        inference_ms = (time.time() - start) * 1000
        boxes = results[0].boxes
        names = results[0].names

        persons = 0
        helmets = 0
        vests = 0
        violations = []
        detections = []

        for box in boxes:
            cls_id = int(box.cls)
            cls_name = names[cls_id].lower()
            conf = float(box.conf)
            bbox = box.xyxy[0].tolist()  # [x1, y1, x2, y2]

            detections.append({"class": cls_name, "confidence": conf, "bbox": bbox})

            if cls_name == "person":
                persons += 1
            elif cls_name in ("helmet", "hard hat", "hardhat", "safety helmet"):
                helmets += 1
            elif cls_name in ("no helmet", "no_helmet", "no-helmet", "no hardhat"):
                violations.append({
                    "type": "Helmet", "category": "ppe",
                    "confidence": conf, "bbox": bbox,
                    "description": "Person without safety helmet detected"
                })
            elif cls_name in ("vest", "safety vest", "hi-vis", "hi_vis"):
                vests += 1
            elif cls_name in ("no vest", "no_vest", "no-vest"):
                violations.append({
                    "type": "Safety Vest", "category": "ppe",
                    "confidence": conf, "bbox": bbox,
                    "description": "Person without safety vest detected"
                })
            elif cls_name in ("no gloves", "no_gloves"):
                violations.append({
                    "type": "Gloves", "category": "ppe",
                    "confidence": conf, "bbox": bbox,
                    "description": "Person without gloves detected"
                })
            elif cls_name in ("fire", "flame"):
                violations.append({
                    "type": "Fire", "category": "unsafe",
                    "confidence": conf, "bbox": bbox,
                    "description": "Fire/flame detected in zone"
                })
            elif cls_name in ("smoke",):
                violations.append({
                    "type": "Smoke", "category": "unsafe",
                    "confidence": conf, "bbox": bbox,
                    "description": "Smoke detected — possible fire hazard"
                })
            elif cls_name in ("spark",):
                violations.append({
                    "type": "Spark", "category": "unsafe",
                    "confidence": conf, "bbox": bbox,
                    "description": "Electrical spark detected on cables"
                })

        # If base model (person-only), flag all persons as suspected
        is_base_model = all(names[i].lower() == "person" for i in names)
        if is_base_model and persons > 0:
            return {
                "has_person": True, "suspected_violation": True,
                "persons": persons, "violations": [],
                "details": f"{persons} person(s) — base model, PPE check unavailable",
                "inference_ms": inference_ms
            }

        has_person = persons > 0 or len(violations) > 0 or helmets > 0 or vests > 0
        suspected = len(violations) > 0

        # Heuristic: persons without matching helmets
        if persons > 0 and helmets < persons and not any(v["type"] == "Helmet" for v in violations):
            suspected = True
            if helmets == 0:
                violations.append({
                    "type": "Helmet", "category": "ppe",
                    "confidence": 0.6, "bbox": [],
                    "description": f"{persons} person(s) detected but no helmets visible"
                })

        detail_parts = []
        if persons: detail_parts.append(f"{persons} person(s)")
        if helmets: detail_parts.append(f"{helmets} helmet(s)")
        if vests: detail_parts.append(f"{vests} vest(s)")
        if violations: detail_parts.append(f"{len(violations)} violation(s)")
        details = ", ".join(detail_parts) if detail_parts else "No person detected"

        return {
            "has_person": has_person,
            "suspected_violation": suspected,
            "persons": persons,
            "violations": violations,
            "details": details,
            "inference_ms": inference_ms
        }

    except Exception as e:
        return {
            "has_person": True, "suspected_violation": True,
            "persons": 1, "violations": [],
            "details": f"Inference error: {e}",
            "inference_ms": (time.time() - start) * 1000
        }


# ── Frame Saver ─────────────────────────────────────────────────
FRAMES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "frames")
os.makedirs(FRAMES_DIR, exist_ok=True)

# Latest frame per camera (for dashboard live view)
_live_frames = {}
_live_lock = threading.Lock()


def save_violation_frame(frame, cam_label, violation_no):
    """Save violation frame as JPEG. Returns file path."""
    try:
        cam_dir = os.path.join(FRAMES_DIR, cam_label)
        os.makedirs(cam_dir, exist_ok=True)
        filename = f"{violation_no}.jpg"
        filepath = os.path.join(cam_dir, filename)
        cv2.imwrite(filepath, frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
        return f"frames/{cam_label}/{filename}"
    except Exception as e:
        print(f"  Frame save error: {e}")
        return ""


def update_live_frame(cam_label, frame, persons=0, risk="safe", violations=0):
    """Store latest frame for dashboard live view."""
    try:
        _, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 60])
        b64 = base64.b64encode(buf).decode("utf-8")
        with _live_lock:
            _live_frames[cam_label] = {
                "frame": b64,
                "persons": persons,
                "risk": risk,
                "violations": violations,
                "updated_at": datetime.utcnow().isoformat(),
            }
    except:
        pass


def get_live_frame(cam_label):
    with _live_lock:
        return _live_frames.get(cam_label)


def get_all_live_frames():
    with _live_lock:
        return dict(_live_frames)


# ── Camera Processing Loop ──────────────────────────────────────
_active_cameras = {}  # cam_label -> thread


def process_camera(cam_label, rtsp_url, ppe_types):
    """Main loop for one camera. Runs in its own thread."""
    print(f"\n[{cam_label}] Connecting to {rtsp_url}...")
    smart = SmartInterval()
    retry_count = 0
    violation_counter = 0

    while True:
        cap = cv2.VideoCapture(rtsp_url)
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

        if not cap.isOpened():
            retry_count += 1
            wait = min(retry_count * 5, 60)
            update_camera_status(cam_label, "offline")
            print(f"[{cam_label}] ❌ Cannot connect — retry {retry_count} in {wait}s")
            if retry_count >= 100:
                print(f"[{cam_label}] ❌ Stopped after 100 retries.")
                update_camera_status(cam_label, "error")
                return
            time.sleep(wait)
            continue

        retry_count = 0
        update_camera_status(cam_label, "online")
        interval, mode = smart.get_interval()
        print(f"[{cam_label}] ✅ Connected — mode: {mode} (every {interval}s)")

        last_check = 0

        while True:
            ret, frame = cap.read()
            if not ret:
                print(f"[{cam_label}] ⚠  Lost connection — reconnecting in 5s")
                update_camera_status(cam_label, "offline")
                break

            now = time.time()
            interval, mode = smart.get_interval()
            if now - last_check < interval:
                time.sleep(0.05)
                continue
            last_check = now

            ts = datetime.now().strftime("%H:%M:%S")

            # ━━━ Run YOLO inference ━━━
            result = analyze_frame(frame, ppe_types)
            has_person = result["has_person"]
            suspected = result["suspected_violation"]
            persons = result["persons"]
            violations = result["violations"]
            details = result["details"]
            inference_ms = result["inference_ms"]

            # Update live frame for dashboard
            risk = "high" if violations else "safe"
            update_live_frame(cam_label, frame, persons, risk, len(violations))

            if not has_person:
                # Empty zone
                smart.on_clear()
                update_camera_status(cam_label, "online", 0, 0, "safe")
                log_detection(cam_label, 0, 0, "safe", mode, False, inference_ms)
                print(f"[{ts}] [{cam_label}] ⬜ Empty ({inference_ms:.0f}ms) | mode={mode}")
                continue

            if violations:
                # ━━━ VIOLATION DETECTED ━━━
                smart.on_violation()
                risk_level = "critical" if len(violations) >= 3 else "high" if len(violations) >= 2 else "medium"

                # Trigger alarm
                trigger_alarm()

                # Save each violation
                for v in violations:
                    violation_counter += 1
                    vno = f"VIO-{datetime.now().strftime('%Y')}-{cam_label}-{violation_counter:04d}"
                    frame_path = save_violation_frame(frame, cam_label, vno)

                    save_violation(
                        violation_no=vno,
                        cam_label=cam_label,
                        violation_type=v["type"],
                        category=v.get("category", "ppe"),
                        severity=v.get("severity", "medium") if "severity" in v else (
                            "critical" if v.get("confidence", 0) > 0.9 else
                            "high" if v.get("confidence", 0) > 0.7 else "medium"
                        ),
                        confidence=v.get("confidence", 0),
                        description=v.get("description", ""),
                        persons=persons,
                        risk=risk_level,
                        frame_path=frame_path,
                        zone=get_camera_zone(cam_label),
                    )

                types = ", ".join(v["type"] for v in violations)
                update_camera_status(cam_label, "online", persons, len(violations), risk_level)
                log_detection(cam_label, persons, len(violations), risk_level, mode, False, inference_ms)
                print(f"[{ts}] [{cam_label}] 🚨 VIOLATION — {types} | persons={persons} | {inference_ms:.0f}ms | mode={mode}")

            elif suspected:
                # Local thinks violation but not confirmed by specific class
                smart.on_clear()
                update_camera_status(cam_label, "online", persons, 0, "safe")
                log_detection(cam_label, persons, 0, "safe", mode, False, inference_ms)
                print(f"[{ts}] [{cam_label}] 🔍 Suspected: {details} ({inference_ms:.0f}ms) | mode={mode}")

            else:
                # All clear
                smart.on_clear()
                update_camera_status(cam_label, "online", persons, 0, "safe")
                log_detection(cam_label, persons, 0, "safe", mode, False, inference_ms)
                print(f"[{ts}] [{cam_label}] ✅ Clear: {details} ({inference_ms:.0f}ms) | mode={mode}")

        cap.release()
        time.sleep(5)


def get_camera_zone(cam_label):
    """Get zone for a camera from DB."""
    cameras = get_cameras()
    for c in cameras:
        if c["cam_label"] == cam_label:
            return c.get("zone", "")
    return ""


# ── Start / Stop ────────────────────────────────────────────────
def start_camera(cam_label, rtsp_url, ppe_types=None):
    """Start monitoring a camera in a background thread."""
    if ppe_types is None:
        ppe_types = ["Helmet", "Safety Vest", "Gloves"]
    if cam_label in _active_cameras:
        return False  # already running

    t = threading.Thread(
        target=process_camera,
        args=(cam_label, rtsp_url, ppe_types),
        daemon=True,
        name=f"cam-{cam_label}"
    )
    t.start()
    _active_cameras[cam_label] = t
    return True


def stop_camera(cam_label):
    """Stop monitoring a camera (thread will exit on next iteration)."""
    if cam_label in _active_cameras:
        del _active_cameras[cam_label]
        update_camera_status(cam_label, "offline")
        return True
    return False


def start_all_cameras():
    """Start all cameras from database."""
    cameras = get_cameras()
    started = 0
    for cam in cameras:
        ppe_types = json.loads(cam.get("ppe_types", '["Helmet","Safety Vest","Gloves"]'))
        if start_camera(cam["cam_label"], cam["rtsp_url"], ppe_types):
            started += 1
            time.sleep(0.5)  # stagger starts
    return started


def get_active_cameras():
    """Get list of currently active camera labels."""
    return list(_active_cameras.keys())


# ── Maintenance Tasks ───────────────────────────────────────────
def _daily_maintenance():
    """Run daily at midnight: reset counters, cleanup old logs."""
    while True:
        now = datetime.now()
        # Sleep until next midnight
        tomorrow = (now + __import__('datetime').timedelta(days=1)).replace(
            hour=0, minute=0, second=5, microsecond=0
        )
        sleep_seconds = (tomorrow - now).total_seconds()
        time.sleep(sleep_seconds)

        print("[maintenance] Running daily tasks...")
        reset_daily_counts()
        cleanup_old_logs(days=30)
        print("[maintenance] Done")


def start_maintenance():
    t = threading.Thread(target=_daily_maintenance, daemon=True, name="maintenance")
    t.start()
