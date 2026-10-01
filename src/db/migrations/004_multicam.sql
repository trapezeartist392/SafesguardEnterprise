-- SafeguardIQ Enterprise — Migration 004
-- Multi-camera edge support: per-camera status, thumbnails, zone assignment
BEGIN;

-- ── Edge devices: zone + area assignment, camera capacity ──
ALTER TABLE edge_devices ADD COLUMN IF NOT EXISTS plant_id UUID REFERENCES plants(id) ON DELETE SET NULL;
ALTER TABLE edge_devices ADD COLUMN IF NOT EXISTS area_id  UUID REFERENCES areas(id)  ON DELETE SET NULL;
ALTER TABLE edge_devices ADD COLUMN IF NOT EXISTS max_cameras INT DEFAULT 16;
ALTER TABLE edge_devices ADD COLUMN IF NOT EXISTS location_note TEXT;

-- ── Cameras: zone/area assignment + live status + thumbnail ──
ALTER TABLE cameras ADD COLUMN IF NOT EXISTS plant_id UUID REFERENCES plants(id) ON DELETE SET NULL;
ALTER TABLE cameras ADD COLUMN IF NOT EXISTS area_id  UUID REFERENCES areas(id)  ON DELETE SET NULL;
ALTER TABLE cameras ADD COLUMN IF NOT EXISTS stream_status TEXT DEFAULT 'unknown';  -- unknown|online|offline|error
ALTER TABLE cameras ADD COLUMN IF NOT EXISTS last_frame_at TIMESTAMPTZ;
ALTER TABLE cameras ADD COLUMN IF NOT EXISTS last_frame_path TEXT;
ALTER TABLE cameras ADD COLUMN IF NOT EXISTS last_violation_at TIMESTAMPTZ;
ALTER TABLE cameras ADD COLUMN IF NOT EXISTS last_violation_type TEXT;
ALTER TABLE cameras ADD COLUMN IF NOT EXISTS last_violation_frame TEXT;
ALTER TABLE cameras ADD COLUMN IF NOT EXISTS fps_target INT DEFAULT 15;
ALTER TABLE cameras ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE cameras ADD COLUMN IF NOT EXISTS error_message TEXT;

CREATE INDEX IF NOT EXISTS idx_cameras_area   ON cameras(area_id);
CREATE INDEX IF NOT EXISTS idx_cameras_device ON cameras(edge_device_id);
CREATE INDEX IF NOT EXISTS idx_devices_area   ON edge_devices(area_id);

-- ── Violations: make sure camera link is indexed for per-camera counts ──
CREATE INDEX IF NOT EXISTS idx_violations_camera ON violations(camera_id, occurred_at DESC);

-- ── Per-camera daily rollup (fast "violations today" without scanning) ──
CREATE TABLE IF NOT EXISTS camera_daily_stats (
  camera_id   UUID NOT NULL REFERENCES cameras(id) ON DELETE CASCADE,
  stat_date   DATE NOT NULL,
  violations  INT  NOT NULL DEFAULT 0,
  frames_seen BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (camera_id, stat_date)
);

COMMIT;
