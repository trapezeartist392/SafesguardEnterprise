"""
SafeguardsIQ Edge — Local SQLite Database
==========================================
Zero-dependency local database. Stores violations, camera config,
shift data, and compliance records. No internet required.
"""

import sqlite3
import os
import json
from datetime import datetime, timedelta
from contextlib import contextmanager

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "safeguardsiq_edge.db")


@contextmanager
def get_db():
    """Thread-safe database connection context manager."""
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")  # better concurrent read/write
    conn.execute("PRAGMA foreign_keys=ON")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db():
    """Create all tables if they don't exist."""
    with get_db() as db:
        db.executescript("""
        -- Factory / tenant info
        CREATE TABLE IF NOT EXISTS factory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            factory_name TEXT NOT NULL DEFAULT 'My Factory',
            address TEXT DEFAULT '',
            registration_no TEXT DEFAULT '',
            industry_type TEXT DEFAULT 'Manufacturing',
            contact_name TEXT DEFAULT '',
            contact_phone TEXT DEFAULT '',
            contact_email TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Cameras
        CREATE TABLE IF NOT EXISTS cameras (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cam_label TEXT NOT NULL UNIQUE,
            rtsp_url TEXT NOT NULL,
            zone TEXT DEFAULT '',
            description TEXT DEFAULT '',
            ppe_types TEXT DEFAULT '["Helmet","Safety Vest","Gloves"]',
            status TEXT DEFAULT 'offline',
            last_seen TIMESTAMP,
            persons_detected INTEGER DEFAULT 0,
            violations_today INTEGER DEFAULT 0,
            risk_level TEXT DEFAULT 'safe',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Violations
        CREATE TABLE IF NOT EXISTS violations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            violation_no TEXT NOT NULL UNIQUE,
            cam_label TEXT NOT NULL,
            zone TEXT DEFAULT '',
            violation_type TEXT NOT NULL,
            category TEXT DEFAULT 'ppe',
            severity TEXT DEFAULT 'medium',
            confidence REAL DEFAULT 0.0,
            description TEXT DEFAULT '',
            persons_detected INTEGER DEFAULT 0,
            risk_level TEXT DEFAULT 'high',
            frame_path TEXT DEFAULT '',
            occurred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            shift TEXT DEFAULT 'general',
            synced_to_cloud INTEGER DEFAULT 0,
            synced_at TIMESTAMP,
            FOREIGN KEY (cam_label) REFERENCES cameras(cam_label)
        );

        -- Detection log (every frame check, including clear)
        CREATE TABLE IF NOT EXISTS detection_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cam_label TEXT NOT NULL,
            persons_detected INTEGER DEFAULT 0,
            violations_count INTEGER DEFAULT 0,
            risk_level TEXT DEFAULT 'safe',
            mode TEXT DEFAULT 'normal',
            api_called INTEGER DEFAULT 0,
            inference_ms REAL DEFAULT 0,
            checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Shifts
        CREATE TABLE IF NOT EXISTS shifts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            shift_name TEXT NOT NULL,
            start_time TEXT NOT NULL,
            end_time TEXT NOT NULL,
            is_active INTEGER DEFAULT 1
        );

        -- Alarm events
        CREATE TABLE IF NOT EXISTS alarm_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            alarm_type TEXT DEFAULT 'buzzer',
            violation_no TEXT,
            cam_label TEXT,
            duration_ms INTEGER DEFAULT 3000,
            triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- System config (key-value store)
        CREATE TABLE IF NOT EXISTS config (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Cloud sync queue
        CREATE TABLE IF NOT EXISTS sync_queue (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            table_name TEXT NOT NULL,
            record_id INTEGER NOT NULL,
            action TEXT DEFAULT 'insert',
            payload TEXT,
            queued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            synced_at TIMESTAMP,
            status TEXT DEFAULT 'pending'
        );

        -- Indexes for performance
        CREATE INDEX IF NOT EXISTS idx_violations_occurred ON violations(occurred_at);
        CREATE INDEX IF NOT EXISTS idx_violations_cam ON violations(cam_label);
        CREATE INDEX IF NOT EXISTS idx_violations_synced ON violations(synced_to_cloud);
        CREATE INDEX IF NOT EXISTS idx_detection_log_time ON detection_log(checked_at);
        CREATE INDEX IF NOT EXISTS idx_detection_log_cam ON detection_log(cam_label);
        CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);
        """)

        # Insert default shifts if empty
        cursor = db.execute("SELECT COUNT(*) FROM shifts")
        if cursor.fetchone()[0] == 0:
            db.executemany("INSERT INTO shifts (shift_name, start_time, end_time) VALUES (?, ?, ?)", [
                ("General",  "08:00", "17:00"),
                ("Morning",  "06:00", "14:00"),
                ("Evening",  "14:00", "22:00"),
                ("Night",    "22:00", "06:00"),
            ])

        # Insert default factory if empty
        cursor = db.execute("SELECT COUNT(*) FROM factory")
        if cursor.fetchone()[0] == 0:
            db.execute("INSERT INTO factory (factory_name) VALUES ('My Factory')")

        # Insert default config
        defaults = {
            "interval_normal": "60",
            "interval_alert": "15",
            "interval_relaxed": "300",
            "alert_duration": "1800",
            "relaxed_after": "3600",
            "audit_rate": "0.10",
            "buzzer_enabled": "true",
            "buzzer_pin": "7",
            "buzzer_duration_ms": "3000",
            "cloud_sync_enabled": "false",
            "cloud_url": "https://safeguardsiq.com/api/v1",
            "cloud_token": "",
            "model_path": "models/best.pt",
            "confidence_threshold": "0.35",
            "yolo_model_size": "yolov8n",
        }
        for k, v in defaults.items():
            db.execute(
                "INSERT OR IGNORE INTO config (key, value) VALUES (?, ?)", (k, v)
            )

    print("✅ Database initialized")


# ── Helper functions ──────────────────────────────────────────────

def get_config(key, default=None):
    with get_db() as db:
        row = db.execute("SELECT value FROM config WHERE key=?", (key,)).fetchone()
        return row["value"] if row else default


def set_config(key, value):
    with get_db() as db:
        db.execute(
            "INSERT INTO config (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) "
            "ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at",
            (key, str(value))
        )


def add_camera(cam_label, rtsp_url, zone="", ppe_types=None):
    if ppe_types is None:
        ppe_types = ["Helmet", "Safety Vest", "Gloves"]
    with get_db() as db:
        db.execute(
            "INSERT OR REPLACE INTO cameras (cam_label, rtsp_url, zone, ppe_types) VALUES (?, ?, ?, ?)",
            (cam_label, rtsp_url, zone, json.dumps(ppe_types))
        )


def get_cameras():
    with get_db() as db:
        return [dict(r) for r in db.execute("SELECT * FROM cameras ORDER BY cam_label").fetchall()]


def update_camera_status(cam_label, status, persons=0, violations=0, risk="safe"):
    with get_db() as db:
        db.execute(
            "UPDATE cameras SET status=?, last_seen=CURRENT_TIMESTAMP, "
            "persons_detected=?, violations_today=?, risk_level=? WHERE cam_label=?",
            (status, persons, violations, risk, cam_label)
        )


def save_violation(violation_no, cam_label, violation_type, category="ppe",
                   severity="medium", confidence=0.0, description="",
                   persons=0, risk="high", frame_path="", zone=""):
    shift = get_current_shift()
    with get_db() as db:
        db.execute(
            "INSERT INTO violations (violation_no, cam_label, zone, violation_type, "
            "category, severity, confidence, description, persons_detected, "
            "risk_level, frame_path, shift) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (violation_no, cam_label, zone, violation_type, category, severity,
             confidence, description, persons, risk, frame_path, shift)
        )
        # Queue for cloud sync
        db.execute(
            "INSERT INTO sync_queue (table_name, record_id, action, payload) "
            "VALUES ('violations', last_insert_rowid(), 'insert', ?)",
            (json.dumps({
                "violation_no": violation_no, "cam_label": cam_label,
                "violation_type": violation_type, "category": category,
                "severity": severity, "confidence": confidence,
                "description": description, "risk_level": risk,
            }),)
        )
        # Increment today's count
        db.execute(
            "UPDATE cameras SET violations_today = violations_today + 1 WHERE cam_label=?",
            (cam_label,)
        )


def log_detection(cam_label, persons=0, violations=0, risk="safe",
                  mode="normal", api_called=False, inference_ms=0):
    with get_db() as db:
        db.execute(
            "INSERT INTO detection_log (cam_label, persons_detected, violations_count, "
            "risk_level, mode, api_called, inference_ms) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (cam_label, persons, violations, risk, mode, 1 if api_called else 0, inference_ms)
        )


def get_violations(hours=24, cam_label=None, limit=100):
    with get_db() as db:
        since = (datetime.utcnow() - timedelta(hours=hours)).isoformat()
        if cam_label:
            rows = db.execute(
                "SELECT * FROM violations WHERE occurred_at > ? AND cam_label=? "
                "ORDER BY occurred_at DESC LIMIT ?", (since, cam_label, limit)
            ).fetchall()
        else:
            rows = db.execute(
                "SELECT * FROM violations WHERE occurred_at > ? "
                "ORDER BY occurred_at DESC LIMIT ?", (since, limit)
            ).fetchall()
        return [dict(r) for r in rows]


def get_violations_count(hours=24):
    with get_db() as db:
        since = (datetime.utcnow() - timedelta(hours=hours)).isoformat()
        row = db.execute(
            "SELECT COUNT(*) as cnt FROM violations WHERE occurred_at > ?", (since,)
        ).fetchone()
        return row["cnt"]


def get_today_stats():
    """Get today's statistics for the dashboard."""
    with get_db() as db:
        today = datetime.utcnow().strftime("%Y-%m-%d")
        stats = {}

        # Total violations today
        row = db.execute(
            "SELECT COUNT(*) as cnt FROM violations WHERE date(occurred_at)=?", (today,)
        ).fetchone()
        stats["violations_today"] = row["cnt"]

        # By category
        for cat in ["ppe", "pathway", "unsafe", "accident", "nearmiss"]:
            row = db.execute(
                "SELECT COUNT(*) as cnt FROM violations WHERE date(occurred_at)=? AND category=?",
                (today, cat)
            ).fetchone()
            stats[f"{cat}_count"] = row["cnt"]

        # By camera
        rows = db.execute(
            "SELECT cam_label, COUNT(*) as cnt FROM violations "
            "WHERE date(occurred_at)=? GROUP BY cam_label ORDER BY cnt DESC", (today,)
        ).fetchall()
        stats["by_camera"] = [dict(r) for r in rows]

        # By severity
        for sev in ["low", "medium", "high", "critical"]:
            row = db.execute(
                "SELECT COUNT(*) as cnt FROM violations WHERE date(occurred_at)=? AND severity=?",
                (today, sev)
            ).fetchone()
            stats[f"severity_{sev}"] = row["cnt"]

        # Detection log stats
        row = db.execute(
            "SELECT COUNT(*) as total, SUM(api_called) as api_calls, "
            "AVG(inference_ms) as avg_inference "
            "FROM detection_log WHERE date(checked_at)=?", (today,)
        ).fetchone()
        stats["total_checks"] = row["total"] or 0
        stats["api_calls"] = row["api_calls"] or 0
        stats["avg_inference_ms"] = round(row["avg_inference"] or 0, 1)
        stats["api_savings_pct"] = round(
            (1 - (stats["api_calls"] / max(stats["total_checks"], 1))) * 100, 1
        )

        # Active cameras
        row = db.execute(
            "SELECT COUNT(*) as cnt FROM cameras WHERE status IN ('online','analysing','running')"
        ).fetchone()
        stats["cameras_online"] = row["cnt"]
        row = db.execute("SELECT COUNT(*) as cnt FROM cameras").fetchone()
        stats["cameras_total"] = row["cnt"]

        # Compliance rate
        total_checks_with_persons = db.execute(
            "SELECT COUNT(*) as cnt FROM detection_log "
            "WHERE date(checked_at)=? AND persons_detected > 0", (today,)
        ).fetchone()["cnt"]
        stats["compliance_rate"] = round(
            (1 - (stats["violations_today"] / max(total_checks_with_persons, 1))) * 100, 1
        ) if total_checks_with_persons > 0 else 100.0

        return stats


def get_current_shift():
    """Determine current shift based on time."""
    now = datetime.now().strftime("%H:%M")
    with get_db() as db:
        shifts = db.execute("SELECT * FROM shifts WHERE is_active=1").fetchall()
        for s in shifts:
            start, end = s["start_time"], s["end_time"]
            if start < end:
                if start <= now < end:
                    return s["shift_name"]
            else:  # overnight shift (e.g., 22:00-06:00)
                if now >= start or now < end:
                    return s["shift_name"]
    return "General"


def get_shift_stats(date_str=None):
    """Get violation counts per shift for a given date."""
    if date_str is None:
        date_str = datetime.utcnow().strftime("%Y-%m-%d")
    with get_db() as db:
        rows = db.execute(
            "SELECT shift, COUNT(*) as cnt FROM violations "
            "WHERE date(occurred_at)=? GROUP BY shift", (date_str,)
        ).fetchall()
        return {r["shift"]: r["cnt"] for r in rows}


def get_unsynced_violations(limit=50):
    """Get violations not yet synced to cloud."""
    with get_db() as db:
        rows = db.execute(
            "SELECT * FROM violations WHERE synced_to_cloud=0 "
            "ORDER BY occurred_at ASC LIMIT ?", (limit,)
        ).fetchall()
        return [dict(r) for r in rows]


def mark_synced(violation_ids):
    """Mark violations as synced to cloud."""
    with get_db() as db:
        placeholders = ",".join(["?"] * len(violation_ids))
        db.execute(
            f"UPDATE violations SET synced_to_cloud=1, synced_at=CURRENT_TIMESTAMP "
            f"WHERE id IN ({placeholders})", violation_ids
        )


def reset_daily_counts():
    """Reset violations_today on all cameras. Call at midnight."""
    with get_db() as db:
        db.execute("UPDATE cameras SET violations_today=0")


def cleanup_old_logs(days=30):
    """Remove detection logs older than N days to save disk space."""
    with get_db() as db:
        cutoff = (datetime.utcnow() - timedelta(days=days)).isoformat()
        db.execute("DELETE FROM detection_log WHERE checked_at < ?", (cutoff,))


def get_factory_info():
    with get_db() as db:
        row = db.execute("SELECT * FROM factory LIMIT 1").fetchone()
        return dict(row) if row else {}


def update_factory_info(**kwargs):
    with get_db() as db:
        sets = ", ".join(f"{k}=?" for k in kwargs)
        vals = list(kwargs.values())
        db.execute(f"UPDATE factory SET {sets}, updated_at=CURRENT_TIMESTAMP WHERE id=1", vals)


# ── Initialize on import ──────────────────────────────────────────
if __name__ == "__main__":
    init_db()
    print(f"Database at: {DB_PATH}")
    print(f"Factory: {get_factory_info()}")
    print(f"Cameras: {len(get_cameras())}")
    print(f"Violations today: {get_violations_count(24)}")
