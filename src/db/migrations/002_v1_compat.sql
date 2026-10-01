-- 002_v1_compat.sql — adds tables/columns the v1 frontend expects
BEGIN;

CREATE TABLE IF NOT EXISTS plants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT,
    city TEXT,
    state TEXT,
    hazard_level TEXT DEFAULT 'medium',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_plants_tenant ON plants(tenant_id);

CREATE TABLE IF NOT EXISTS areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plant_id UUID NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    hazard_level TEXT DEFAULT 'medium',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_areas_plant ON areas(plant_id);

CREATE TABLE IF NOT EXISTS form18_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    report_no TEXT NOT NULL UNIQUE,
    report_year INTEGER NOT NULL,
    report_month INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    form_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_form18_tenant ON form18_reports(tenant_id);

-- Extra columns on violations that v1 frontend expects
ALTER TABLE violations ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'medium';
ALTER TABLE violations ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'open';
ALTER TABLE violations ADD COLUMN IF NOT EXISTS corrective_action TEXT;
ALTER TABLE violations ADD COLUMN IF NOT EXISTS worker_id TEXT;
ALTER TABLE violations ADD COLUMN IF NOT EXISTS category TEXT;

COMMIT;

-- Additional columns for full lifecycle support
ALTER TABLE violations ADD COLUMN IF NOT EXISTS assigned_to TEXT;
ALTER TABLE violations ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ;
ALTER TABLE violations ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
