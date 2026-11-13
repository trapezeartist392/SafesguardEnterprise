"""
SafeguardIQ Enterprise — Headcount Counter Module
==================================================
Drop this file alongside edge_agent.py.
The EdgeAgent imports and runs it for cameras with role 'entry', 'exit', or 'assembly'.

Uses YOLOv8 person detection (class 0 in COCO) + centroid tracking across a
virtual tripwire line to count ingress / egress direction.

No additional model download needed — uses the same ultralytics YOLO with a
pre-trained COCO checkpoint (yolov8n.pt) that detects 'person' reliably.
"""

import cv2
import time
import math
import threading
import hashlib
import datetime
import requests
from collections import defaultdict

try:
    from ultralytics import YOLO
    YOLO_AVAILABLE = True
except ImportError:
    YOLO_AVAILABLE = False


# ── Centroid Tracker ──────────────────────────────────────────────────────────
class CentroidTracker:
    """Assigns persistent IDs to detected bounding boxes across frames."""
    def __init__(self, max_disappeared=30):
        self.next_id   = 0
        self.objects   = {}          # id → centroid
        self.disappeared = defaultdict(int)
        self.max_disappeared = max_disappeared

    def register(self, centroid):
        self.objects[self.next_id] = centroid
        self.next_id += 1

    def deregister(self, oid):
        del self.objects[oid]
        del self.disappeared[oid]

    def update(self, rects):
        if not rects:
            for oid in list(self.disappeared):
                self.disappeared[oid] += 1
                if self.disappeared[oid] > self.max_disappeared:
                    self.deregister(oid)
            return dict(self.objects)

        centroids = []
        for (x1, y1, x2, y2) in rects:
            cx = int((x1 + x2) / 2)
            cy = int((y1 + y2) / 2)
            centroids.append((cx, cy))

        if not self.objects:
            for c in centroids:
                self.register(c)
        else:
            oids  = list(self.objects.keys())
            octs  = list(self.objects.values())
            D = [[math.hypot(c[0]-oc[0], c[1]-oc[1]) for oc in octs] for c in centroids]
            rows = sorted(range(len(D)), key=lambda r: min(D[r]))
            cols = []
            used_rows, used_cols = set(), set()
            sorted_rows = sorted(rows, key=lambda r: min(D[r]))
            for row in sorted_rows:
                col = D[row].index(min(D[row]))
                if row not in used_rows and col not in used_cols:
                    self.objects[oids[col]] = centroids[row]
                    self.disappeared[oids[col]] = 0
                    used_rows.add(row)
                    used_cols.add(col)
            for col in set(range(len(oids))) - used_cols:
                self.disappeared[oids[col]] += 1
                if self.disappeared[oids[col]] > self.max_disappeared:
                    self.deregister(oids[col])
            for row in set(range(len(centroids))) - used_rows:
                self.register(centroids[row])

        return dict(self.objects)


# ── Tripwire Counter ──────────────────────────────────────────────────────────
class TripwireCounter:
    """
    Counts crossings of a horizontal line at `line_y` (fraction of frame height).
    direction IN  = crossing downward (y increases)  → ingress
    direction OUT = crossing upward   (y decreases)  → egress

    For entry cameras:    down = IN,  up = OUT
    For exit cameras:     down = OUT, up = IN  (flip_direction=True)
    For assembly cameras: every crossing = assembly_in
    """
    def __init__(self, line_y_frac=0.5, flip_direction=False, is_assembly=False):
        self.line_y_frac   = line_y_frac
        self.flip          = flip_direction
        self.is_assembly   = is_assembly
        self.prev_centroids = {}   # id → prev_y

    def check(self, tracked, frame_h):
        line_y = int(frame_h * self.line_y_frac)
        events = []
        # Fire IN on new track appearing (before updating prev_centroids)
        for oid in tracked:
            if oid not in self.prev_centroids:
                if not self.is_assembly:
                    events.append('out' if self.flip else 'in')
                else:
                    events.append('assembly_in')
        # Check tripwire crossings
        for oid, (cx, cy) in tracked.items():
            prev_y = self.prev_centroids.get(oid)
            if prev_y is not None:
                crossed_down = prev_y < line_y <= cy
                crossed_up   = prev_y > line_y >= cy
                if crossed_down or crossed_up:
                    if self.is_assembly:
                        events.append('assembly_in')
                    elif crossed_down:
                        events.append('out' if self.flip else 'in')
                    else:
                        events.append('in' if self.flip else 'out')
            self.prev_centroids[oid] = cy
        # Fire OUT on track disappearing
        for oid in list(self.prev_centroids):
            if oid not in tracked:
                if not self.is_assembly:
                    events.append('in' if self.flip else 'out')
                del self.prev_centroids[oid]
        return events


# ── HeadcountCamera ───────────────────────────────────────────────────────────
class HeadcountCamera:
    """
    Runs person detection + tripwire counting for one camera.
    Queues events; the main agent flushes them to the backend.
    """
    def __init__(self, cam_config, model_path='yolov8n.pt',
                 confidence=0.45, line_y_frac=0.5):
        """
        cam_config keys: cam_label, rtsp_url, camera_role, camera_id, plant_id
        camera_role: 'entry' | 'exit' | 'assembly'
        """
        self.cam   = cam_config
        self.label = cam_config['cam_label']
        self.role  = cam_config.get('camera_role', 'entry')
        self.conf  = confidence
        self.events = []           # list of dicts ready to POST
        self._lock  = threading.Lock()

        flip       = (self.role == 'exit')
        is_asm     = (self.role == 'assembly')
        self.tracker  = CentroidTracker()
        self.tripwire = TripwireCounter(line_y_frac, flip, is_asm)
        self.running   = False
        self.thread    = None

        if YOLO_AVAILABLE:
            try:
                self.model = YOLO(model_path)
                print(f"[HC] {self.label} ({self.role}): YOLO loaded ({model_path})")
            except Exception as e:
                self.model = None
                print(f"[HC] {self.label}: model load failed — {e}")
        else:
            self.model = None
            print(f"[HC] {self.label}: ultralytics not installed — simulate mode")

    def start(self):
        self.running = True
        self.thread  = threading.Thread(target=self._loop, daemon=True)
        self.thread.start()

    def stop(self):
        self.running = False

    def pop_events(self):
        with self._lock:
            evs = list(self.events)
            self.events.clear()
            return evs

    def _loop(self):
        src = self.cam['rtsp_url']
        if src == 'simulate':
            self._simulate()
            return
        cap = cv2.VideoCapture(src)
        while self.running:
            if not cap.isOpened():
                print(f"[HC] {self.label} disconnected, retry in 5s")
                time.sleep(5)
                cap = cv2.VideoCapture(src)
                continue
            ret, frame = cap.read()
            if not ret or frame is None:
                time.sleep(0.1)
                continue
            self._process(frame)
            time.sleep(0.05)   # ~20 fps max
        cap.release()

    def _process(self, frame):
        if self.model is None:
            return
        h, w = frame.shape[:2]
        results = self.model.predict(frame, classes=[0], conf=self.conf, verbose=False)
        rects = []
        for box in (results[0].boxes or []):
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            rects.append((x1, y1, x2, y2))
        tracked = self.tracker.update(rects)
        if tracked: print(f"[HC-DBG] {self.label}: {len(tracked)} tracked, line_y={int(h*self.tripwire.line_y_frac)}")
        crossings = self.tripwire.check(tracked, h)
        for direction in crossings:
            self._queue_event(direction)

    def _queue_event(self, direction):
        local_id = hashlib.md5(
            f"{self.label}{direction}{time.time()}".encode()
        ).hexdigest()
        with self._lock:
            self.events.append({
                'direction':      direction,
                'count':          1,
                'occurred_at':    datetime.datetime.utcnow().isoformat() + 'Z',
                'local_event_id': local_id,
                'camera_id':      self.cam.get('camera_id'),
                'plant_id':       self.cam.get('plant_id'),
                'cam_label':      self.label,
            })
        print(f"[HC] {self.label} ({self.role}): {direction}")

    def _simulate(self):
        """Generates a fake ingress every 20s for dev/demo."""
        import random
        directions = ['in', 'out'] if self.role != 'assembly' else ['assembly_in']
        while self.running:
            time.sleep(20)
            d = random.choice(directions)
            self._queue_event(d)
            print(f"[HC-SIM] {self.label}: {d} (simulated)")


# ── HeadcountManager ─────────────────────────────────────────────────────────
class HeadcountManager:
    """
    Launched by the main EdgeAgent.
    Runs all headcount cameras and flushes events to backend.
    """
    def __init__(self, cameras, backend_url, session, flush_interval=5):
        """
        cameras: list of cam configs where camera_role in ('entry','exit','assembly')
        backend_url: e.g. http://localhost:4200/api/v1/devices  (base)
        session: requests.Session with x-edge-key header set
        """
        self.cameras   = [HeadcountCamera(c) for c in cameras]
        self.endpoint  = backend_url.rstrip('/') + '/../../headcount/event'
        # Normalise to /api/v1/headcount/event
        import re
        self.endpoint  = re.sub(r'/api/v1/devices.*', '/api/v1/headcount/event', backend_url)
        self.session   = session
        self.interval  = flush_interval
        self._running  = False

    def start(self):
        for cam in self.cameras:
            cam.start()
        self._running = True
        t = threading.Thread(target=self._flush_loop, daemon=True)
        t.start()
        print(f"[HC] HeadcountManager started — {len(self.cameras)} camera(s)")

    def stop(self):
        self._running = False
        for cam in self.cameras:
            cam.stop()

    def _flush_loop(self):
        while self._running:
            time.sleep(self.interval)
            self._flush()

    def _flush(self):
        all_events = []
        plant_id   = None
        for cam in self.cameras:
            evs = cam.pop_events()
            if evs:
                plant_id = evs[0].get('plant_id') or plant_id
                all_events.extend(evs)
        if not all_events:
            return
        try:
            r = self.session.post(
                self.endpoint,
                json={'plant_id': plant_id, 'events': all_events},
                timeout=10
            )
            if r.status_code == 200:
                print(f"[HC] flushed {len(all_events)} headcount event(s)")
            else:
                print(f"[HC] flush error {r.status_code}: {r.text[:80]}")
                # Re-queue on failure (put back)
                for cam in self.cameras:
                    with cam._lock:
                        cam.events = [e for e in all_events
                                      if e['cam_label'] == cam.label] + cam.events
        except Exception as e:
            print(f"[HC] flush failed (offline?): {e}")
