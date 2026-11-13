-- SafeguardIQ Enterprise — Migration 005: Headcount & Muster
-- Run: psql -h localhost -p 5434 -U sgiq_user -d safeguardsiq_enterprise -f 005_headcount.sql

BEGIN;

-- ── Camera role column ──────────────────────────────────────────────────────
-- Adds role to existing cameras table so entry/exit/assembly cameras are
-- distinguished from PPE cameras without a schema break.
ALTER TABLE cameras
  ADD COLUMN IF NOT EXISTS camera_role TEXT NOT NULL DEFAULT 'ppe'
    CHECK (camera_role IN ('ppe','entry','exit','assembly'));

-- ── Shift definitions ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shift_definitions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plant_id    UUID REFERENCES plants(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,               -- 'Morning', 'General', 'Evening', 'Night'
  start_time  TIME NOT NULL,               -- '06:00'
  end_time    TIME NOT NULL,               -- '14:00'
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_shift_def_tenant ON shift_definitions(tenant_id);

-- ── Headcount events (one row per person crossing a camera line) ────────────
CREATE TABLE IF NOT EXISTS headcount_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plant_id        UUID REFERENCES plants(id) ON DELETE SET NULL,
  camera_id       UUID REFERENCES cameras(id) ON DELETE SET NULL,
  edge_device_id  UUID REFERENCES edge_devices(id) ON DELETE SET NULL,
  direction       TEXT NOT NULL CHECK (direction IN ('in','out','assembly_in')),
  count           INTEGER NOT NULL DEFAULT 1,   -- batch count from edge (usually 1)
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  synced_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  local_event_id  TEXT,                          -- dedup key from edge
  UNIQUE(tenant_id, local_event_id)
);
CREATE INDEX IF NOT EXISTS idx_hce_tenant_time  ON headcount_events(tenant_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_hce_plant        ON headcount_events(plant_id, occurred_at DESC);

-- ── Live headcount state (one row per plant, upserted on every event) ───────
CREATE TABLE IF NOT EXISTS headcount_state (
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plant_id        UUID NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  current_count   INTEGER NOT NULL DEFAULT 0,
  assembly_count  INTEGER NOT NULL DEFAULT 0,   -- people confirmed at muster point
  peak_count      INTEGER NOT NULL DEFAULT 0,
  last_event_at   TIMESTAMPTZ,
  last_direction  TEXT,
  emergency_mode  BOOLEAN NOT NULL DEFAULT FALSE,
  emergency_at    TIMESTAMPTZ,
  emergency_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  all_clear_at    TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, plant_id)
);

-- ── Escalation contacts (set during onboarding) ─────────────────────────────
CREATE TABLE IF NOT EXISTS headcount_escalation (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plant_id    UUID REFERENCES plants(id) ON DELETE SET NULL,
  level       INTEGER NOT NULL DEFAULT 1,   -- 1 = safety marshal, 2 = plant mgr, 3 = third
  name        TEXT NOT NULL,
  role        TEXT,
  phone       TEXT,
  email       TEXT,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_esc_tenant_plant ON headcount_escalation(tenant_id, plant_id);

-- ── Seed default headcount_state for every existing plant ───────────────────
INSERT INTO headcount_state (tenant_id, plant_id)
SELECT DISTINCT t.id, p.id
FROM tenants t
JOIN plants p ON p.tenant_id = t.id
ON CONFLICT (tenant_id, plant_id) DO NOTHING;

COMMIT;
