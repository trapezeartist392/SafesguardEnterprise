CREATE EXTENSION IF NOT EXISTS "pgcrypto";
BEGIN;

CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT NOT NULL,
    phone TEXT,
    subscription_status TEXT NOT NULL DEFAULT 'active',
    plan_id TEXT DEFAULT 'enterprise',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'customer_admin',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE edge_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    device_code TEXT NOT NULL,
    device_type TEXT NOT NULL DEFAULT 'jetson_nano',
    zone_name TEXT,
    model_version TEXT,
    status TEXT NOT NULL DEFAULT 'provisioned',
    last_heartbeat_at TIMESTAMPTZ,
    last_ip_address TEXT,
    battery_pct INTEGER,
    firmware_version TEXT,
    api_key_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, device_code)
);
CREATE INDEX idx_edge_devices_tenant ON edge_devices(tenant_id);

CREATE TABLE cameras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    edge_device_id UUID NOT NULL REFERENCES edge_devices(id) ON DELETE CASCADE,
    cam_label TEXT NOT NULL,
    local_rtsp_url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_cameras_device ON cameras(edge_device_id);

CREATE TABLE violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    violation_no TEXT NOT NULL UNIQUE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    edge_device_id UUID REFERENCES edge_devices(id),
    camera_id UUID REFERENCES cameras(id),
    violation_type TEXT NOT NULL,
    confidence INTEGER NOT NULL CHECK (confidence BETWEEN 0 AND 100),
    occurred_at TIMESTAMPTZ NOT NULL,
    image_path TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_violations_tenant ON violations(tenant_id);
CREATE INDEX idx_violations_occurred ON violations(occurred_at DESC);

CREATE TABLE edge_sync_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    edge_device_id UUID NOT NULL REFERENCES edge_devices(id) ON DELETE CASCADE,
    local_event_id TEXT NOT NULL,
    violation_type TEXT NOT NULL,
    confidence INTEGER NOT NULL CHECK (confidence BETWEEN 0 AND 100),
    occurred_at TIMESTAMPTZ NOT NULL,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    image_path TEXT,
    raw_payload JSONB,
    resolved_violation_id UUID REFERENCES violations(id),
    UNIQUE (edge_device_id, local_event_id)
);
CREATE INDEX idx_edge_sync_device ON edge_sync_queue(edge_device_id);

COMMIT;
