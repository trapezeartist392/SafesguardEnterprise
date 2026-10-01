"""
SafeguardIQ Enterprise — Edge Agent v4
======================================
One edge device, up to 16 cameras.

Cameras are configured in the DASHBOARD, not in this file.
The agent pulls its camera list from the backend every 60 seconds,
so adding or removing a camera in the UI takes effect with no restart.

edge_config.json only needs:
  backend_url, device_key

Everything else — camera labels, RTSP URLs, zones, FPS — comes from the server.
"""

import os, sys, time, json, random, sqlite3, threading, base64, hashlib, datetime
import requests

BASE        = os.path.dirname(os.path.abspath(__file__))
CONFIG_FILE = os.path.join(BASE, "edge_config.json")
QUEUE_DB    = os.path.join(BASE, "edge_queue.db")
FRAMES_DIR  = os.path.join(BASE, "frames")
os.makedirs(FRAMES_DIR, exist_ok=True)

DEFAULT_CONFIG = {
    "backend_url": "http://localhost:4200/api/v1/devices",
    "device_key": "PASTE_THE_API_KEY_FROM_THE_DASHBOARD",
    "model_path": "models/ppe-v1.pt",
    "confidence_threshold": 50,
    "heartbeat_interval_sec": 10,
    "sync_interval_sec": 10,
    "config_refresh_sec": 60,
    "thumbnail_interval_sec": 10,
    "upload_frames": True,
    "simulate_when_no_model": True,
    "simulate_violation_every_sec": 20,
    "cooldown_sec_per_camera": 8
}

SIM_TYPES = ["no-helmet", "no-vest", "no-gloves", "no-boots"]
_print_lock = threading.Lock()

def log(msg):
    with _print_lock:
        print(msg, flush=True)

# ── offline queue ─────────────────────────────────────────────
def init_queue():
    c = sqlite3.connect(QUEUE_DB)
    c.execute("""CREATE TABLE IF NOT EXISTS queue(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        local_event_id TEXT UNIQUE, violation_type TEXT, confidence INTEGER,
        occurred_at TEXT, cam_label TEXT, frame_b64 TEXT, synced INTEGER DEFAULT 0)""")
    c.commit(); c.close()

def queue_add(vtype, conf, cam_label, frame_b64=None):
    lid = hashlib.md5(f"{cam_label}{vtype}{time.time()}{random.random()}".encode()).hexdigest()
    ts  = datetime.datetime.utcnow().isoformat() + "Z"
    c = sqlite3.connect(QUEUE_DB)
    c.execute("INSERT OR IGNORE INTO queue(local_event_id,violation_type,confidence,occurred_at,cam_label,frame_b64) VALUES(?,?,?,?,?,?)",
              (lid, vtype, conf, ts, cam_label, frame_b64 or ""))
    c.commit(); c.close()

def queue_unsynced(limit=25):
    c = sqlite3.connect(QUEUE_DB)
    rows = c.execute("SELECT id,local_event_id,violation_type,confidence,occurred_at,cam_label,frame_b64 FROM queue WHERE synced=0 LIMIT ?", (limit,)).fetchall()
    c.close(); return rows

def queue_mark(ids):
    if not ids: return
    c = sqlite3.connect(QUEUE_DB)
    c.execute(f"UPDATE queue SET synced=1,frame_b64='' WHERE id IN ({','.join('?'*len(ids))})", ids)
    c.commit(); c.close()

# ── alarm ─────────────────────────────────────────────────────
def fire_alarm(vtype):
    try:
        import RPi.GPIO as GPIO
        GPIO.setmode(GPIO.BCM); GPIO.setup(18, GPIO.OUT)
        GPIO.output(18, GPIO.HIGH); time.sleep(0.4); GPIO.output(18, GPIO.LOW)
    except Exception:
        log(f"[ALARM] (no GPIO) buzzer would sound: {vtype}")

# ── detectors ─────────────────────────────────────────────────
class YoloDetector:
    def __init__(self, model_path, conf_threshold):
        from ultralytics import YOLO
        self.model = YOLO(model_path)
        self.thr   = conf_threshold / 100.0
        names = self.model.names
        self.class_map = {}
        for idx, name in names.items():
            n = str(name).lower().replace("_", "-").replace(" ", "-")
            if n.startswith("no-"):
                if "hardhat" in n or "helmet" in n:   self.class_map[idx] = "no-helmet"
                elif "vest" in n:                     self.class_map[idx] = "no-vest"
                elif "glove" in n:                    self.class_map[idx] = "no-gloves"
                elif "boot" in n or "shoe" in n:      self.class_map[idx] = "no-boots"
                elif "mask" in n:                     self.class_map[idx] = "no-mask"
                elif "goggle" in n or "glass" in n:   self.class_map[idx] = "no-goggles"
                else:                                 self.class_map[idx] = n
        log(f"  ✅ YOLO model loaded: {model_path}")
        log(f"     violation classes: {self.class_map or '(none auto-detected — edit class_map)'}")

    def infer(self, frame):
        res = self.model.predict(frame, conf=self.thr, verbose=False)
        out = []
        for box in (res[0].boxes or []):
            cid = int(box.cls[0])
            if cid in self.class_map:
                out.append({"violation_type": self.class_map[cid],
                            "confidence": int(float(box.conf[0]) * 100)})
        return out

class PlaceholderDetector:
    def infer(self, frame): return []

# ── agent ─────────────────────────────────────────────────────
class EdgeAgent:
    def __init__(self):
        self.cfg = self._load_config()
        self.s = requests.Session()
        self.s.headers.update({"x-edge-key": self.cfg["device_key"]})
        init_queue()

        self.cameras   = {}   # cam_label -> {rtsp_url, fps_target, status, thumb_b64, error}
        self.threads   = {}   # cam_label -> Thread
        self.stop_flags= {}   # cam_label -> threading.Event
        self.lock      = threading.Lock()

        mp = os.path.join(BASE, self.cfg.get("model_path", "models/ppe-v1.pt"))
        if os.path.exists(mp):
            try:
                self.detector = YoloDetector(mp, self.cfg.get("confidence_threshold", 50))
                self.has_model = True
            except Exception as e:
                log(f"  ⚠ model load failed: {e}")
                self.detector = PlaceholderDetector(); self.has_model = False
        else:
            log(f"[INIT] No model at {mp} — placeholder mode.")
            self.detector = PlaceholderDetector(); self.has_model = False

    def _load_config(self):
        if not os.path.exists(CONFIG_FILE):
            json.dump(DEFAULT_CONFIG, open(CONFIG_FILE, "w"), indent=2)
            log(f"[INIT] Created {CONFIG_FILE}")
            log("       Register an edge device in the dashboard, paste its API key as device_key, then run again.")
            sys.exit(0)
        cfg = json.load(open(CONFIG_FILE))
        for k, v in DEFAULT_CONFIG.items():
            cfg.setdefault(k, v)
        return cfg

    # ── config pull ───────────────────────────────────────────
    def _pull_config(self):
        try:
            r = self.s.get(f"{self.cfg['backend_url']}/config", timeout=10)
            if r.status_code != 200:
                log(f"[CONFIG] server returned {r.status_code}"); return
            data = r.json().get("data", {})
            server_cams = {c["cam_label"]: c for c in data.get("cameras", [])}

            with self.lock:
                current = set(self.cameras.keys())
                wanted  = set(server_cams.keys())

                for label in wanted - current:
                    self.cameras[label] = {**server_cams[label], "status": "unknown",
                                           "thumb_b64": None, "error": None}
                    self._start_camera(label)
                    log(f"[CONFIG] + camera added from dashboard: {label}")

                for label in current - wanted:
                    self._stop_camera(label)
                    self.cameras.pop(label, None)
                    log(f"[CONFIG] − camera removed from dashboard: {label}")

                for label in wanted & current:
                    if server_cams[label].get("rtsp_url") != self.cameras[label].get("rtsp_url"):
                        log(f"[CONFIG] ~ RTSP changed for {label}, restarting stream")
                        self._stop_camera(label)
                        self.cameras[label].update(server_cams[label])
                        self._start_camera(label)
                    else:
                        self.cameras[label].update({k: v for k, v in server_cams[label].items()
                                                    if k in ("fps_target", "area_name", "camera_id")})

            if not server_cams:
                log("[CONFIG] No cameras assigned to this device yet — add them in the dashboard.")
        except Exception as e:
            log(f"[CONFIG] pull failed (offline?): {e}")

    # ── camera threads ────────────────────────────────────────
    def _start_camera(self, label):
        ev = threading.Event()
        self.stop_flags[label] = ev
        t = threading.Thread(target=self._camera_loop, args=(label, ev), daemon=True)
        self.threads[label] = t
        t.start()

    def _stop_camera(self, label):
        ev = self.stop_flags.pop(label, None)
        if ev: ev.set()
        self.threads.pop(label, None)

    def _camera_loop(self, label, stop_ev):
        cam = self.cameras.get(label, {})
        url = cam.get("rtsp_url", "")
        log(f"[CAM] {label} → {url}")

        if url == "simulate":
            self._simulate_loop(label, stop_ev); return

        try:
            import cv2
            os.environ["OPENCV_LOG_LEVEL"] = "SILENT"
        except ImportError:
            log(f"[CAM] opencv missing — {label} runs in simulate mode")
            self._simulate_loop(label, stop_ev); return

        src = int(url.split(":",1)[1]) if url.startswith("webcam:") else url
        cap = cv2.VideoCapture(src)
        try: cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        except Exception: pass

        fps      = max(1, int(cam.get("fps_target") or 15))
        interval = 1.0 / fps
        thumb_every = self.cfg.get("thumbnail_interval_sec", 10)
        sim_every   = self.cfg.get("simulate_violation_every_sec", 20)
        cooldown    = self.cfg.get("cooldown_sec_per_camera", 8)

        last_thumb = 0; last_sim = time.time(); last_viol = 0; fails = 0

        while not stop_ev.is_set():
            if not cap.isOpened():
                self._set_status(label, "offline", "Stream not open")
                time.sleep(5)
                cap = cv2.VideoCapture(src)
                continue

            ok, frame = cap.read()
            if not ok or frame is None:
                fails += 1
                if fails > 30:
                    self._set_status(label, "error", "No frames from this RTSP URL")
                    cap.release(); time.sleep(5)
                    cap = cv2.VideoCapture(src); fails = 0
                time.sleep(0.2)
                continue

            fails = 0
            self._set_status(label, "online", None)
            now = time.time()

            # thumbnail for the dashboard card
            if now - last_thumb >= thumb_every:
                small = cv2.resize(frame, (320, 180))
                ok2, buf = cv2.imencode('.jpg', small, [cv2.IMWRITE_JPEG_QUALITY, 60])
                if ok2:
                    with self.lock:
                        if label in self.cameras:
                            self.cameras[label]["thumb_b64"] = base64.b64encode(buf.tobytes()).decode()
                last_thumb = now

            # detection
            if self.has_model and (now - last_viol) >= cooldown:
                for det in self.detector.infer(frame):
                    fb = self._encode(frame) if self.cfg.get("upload_frames", True) else None
                    queue_add(det["violation_type"], det["confidence"], label, fb)
                    fire_alarm(det["violation_type"])
                    log(f"[DETECT] {label}: {det['violation_type']} ({det['confidence']}%)")
                    last_viol = now
                    break

            # simulate so the pipeline is testable before the model is trained
            if (not self.has_model and self.cfg.get("simulate_when_no_model", True)
                    and now - last_sim >= sim_every):
                vt = random.choice(SIM_TYPES); cf = random.randint(72, 97)
                fb = self._encode(frame) if self.cfg.get("upload_frames", True) else None
                queue_add(vt, cf, label, fb)
                fire_alarm(vt)
                log(f"[CAM-SIM] {label}: {vt} ({cf}%) — simulated, real frame attached")
                last_sim = now

            time.sleep(interval)

        try: cap.release()
        except Exception: pass
        log(f"[CAM] {label} stopped")

    def _encode(self, frame):
        try:
            import cv2
            small = cv2.resize(frame, (640, 360))
            ok, buf = cv2.imencode('.jpg', small, [cv2.IMWRITE_JPEG_QUALITY, 70])
            return base64.b64encode(buf.tobytes()).decode() if ok else None
        except Exception:
            return None

    def _simulate_loop(self, label, stop_ev):
        every = self.cfg.get("simulate_violation_every_sec", 20)
        self._set_status(label, "online", None)
        while not stop_ev.is_set():
            time.sleep(every)
            vt = random.choice(SIM_TYPES); cf = random.randint(72, 97)
            queue_add(vt, cf, label, None)
            fire_alarm(vt)
            log(f"[SIM] {label}: {vt} ({cf}%)")

    def _set_status(self, label, status, err):
        with self.lock:
            if label in self.cameras:
                self.cameras[label]["status"] = status
                self.cameras[label]["error"]  = err

    # ── heartbeat & sync ──────────────────────────────────────
    def _heartbeat(self):
        with self.lock:
            cams = []
            for label, c in self.cameras.items():
                entry = {"cam_label": label, "status": c.get("status", "unknown"), "error": c.get("error")}
                if c.get("thumb_b64"):
                    entry["thumb_b64"] = c["thumb_b64"]
                    c["thumb_b64"] = None     # send each thumbnail once
                cams.append(entry)
        try:
            r = self.s.post(f"{self.cfg['backend_url']}/heartbeat",
                            json={"model_version": "v4",
                                  "firmware_version": "1.0.0",
                                  "cameras": cams}, timeout=20)
            if r.status_code == 200:
                online = sum(1 for c in cams if c["status"] == "online")
                log(f"[HEARTBEAT] OK — {online}/{len(cams)} camera(s) streaming")
            else:
                log(f"[HEARTBEAT] error {r.status_code}")
        except Exception as e:
            log(f"[HEARTBEAT] failed (offline?): {e}")

    def _sync(self):
        rows = queue_unsynced(25)
        if not rows: return
        events, ids = [], []
        for rid, lid, vt, cf, ts, cam, fb in rows:
            e = {"local_event_id": lid, "violation_type": vt, "confidence": cf,
                 "occurred_at": ts, "cam_label": cam}
            if fb and self.cfg.get("upload_frames", True):
                e["frame_b64"] = fb
            events.append(e); ids.append(rid)
        try:
            r = self.s.post(f"{self.cfg['backend_url']}/sync", json={"events": events}, timeout=30)
            if r.status_code == 200:
                queue_mark(ids)
                log(f"[SYNC] pushed {len(events)} event(s)")
            else:
                log(f"[SYNC] error {r.status_code}: {r.text[:120]}")
        except Exception as e:
            log(f"[SYNC] failed (offline?), will retry: {e}")

    # ── main ──────────────────────────────────────────────────
    def run(self):
        log("")
        log("=" * 62)
        log("   SafeguardIQ Enterprise — Edge Agent v4")
        log("   Cameras are managed from the dashboard · up to 16 per device")
        log("=" * 62)
        log("")

        self._pull_config()

        t_hb = t_sync = t_cfg = 0
        hb   = self.cfg.get("heartbeat_interval_sec", 10)
        sy   = self.cfg.get("sync_interval_sec", 10)
        cf   = self.cfg.get("config_refresh_sec", 60)

        while True:
            now = time.time()
            if now - t_hb   >= hb: self._heartbeat(); t_hb = now
            if now - t_sync >= sy: self._sync();      t_sync = now
            if now - t_cfg  >= cf: self._pull_config(); t_cfg = now
            time.sleep(1)


if __name__ == "__main__":
    try:
        EdgeAgent().run()
    except KeyboardInterrupt:
        log("\n[EXIT] Edge agent stopped.")
