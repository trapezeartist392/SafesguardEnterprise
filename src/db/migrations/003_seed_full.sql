-- 003_seed_full.sql — Complete test data for Enterprise with v1-compatible fields
-- Login: admin@bharatforge.com / Admin@123
-- Run AFTER 001_init.sql AND 002_v1_compat.sql
BEGIN;

-- Clean slate
DELETE FROM violations; DELETE FROM edge_sync_queue; DELETE FROM cameras; DELETE FROM edge_devices;
DELETE FROM areas; DELETE FROM plants; DELETE FROM form18_reports; DELETE FROM users; DELETE FROM tenants;

-- Tenant
INSERT INTO tenants (id, company_name, phone, subscription_status, plan_id) VALUES
  ('a1b2c3d4-0001-4000-a000-000000000001', 'Bharat Forge — Pune Plant', '+91-20-6612-0000', 'active', 'enterprise');

-- Users
INSERT INTO users (id, tenant_id, email, password_hash, full_name, role) VALUES
  ('b1000001-0001-4000-b000-000000000001', 'a1b2c3d4-0001-4000-a000-000000000001', 'admin@bharatforge.com', '$2b$10$4zrLUTWFJ0.kCbs97JFYHO8rWenKhCQCF4pQNS6ge/OGJ9.JnoK9.', 'Rajesh Sharma', 'customer_admin'),
  ('b1000001-0002-4000-b000-000000000002', 'a1b2c3d4-0001-4000-a000-000000000001', 'safety@bharatforge.com', '$2b$10$4zrLUTWFJ0.kCbs97JFYHO8rWenKhCQCF4pQNS6ge/OGJ9.JnoK9.', 'Priya Deshmukh', 'operator');

-- Plants
INSERT INTO plants (id, tenant_id, name, address, city, state, hazard_level) VALUES
  ('e1000001-0001-4000-e000-000000000001', 'a1b2c3d4-0001-4000-a000-000000000001', 'Pune Main Plant', 'Mundhwa Rd, Koregaon Park', 'Pune', 'Maharashtra', 'high');

-- Areas (zones within the plant)
INSERT INTO areas (id, plant_id, name, hazard_level) VALUES
  ('f1000001-0001-4000-f000-000000000001', 'e1000001-0001-4000-e000-000000000001', 'Press Bay 1', 'high'),
  ('f1000001-0002-4000-f000-000000000002', 'e1000001-0001-4000-e000-000000000001', 'Press Bay 2', 'high'),
  ('f1000001-0003-4000-f000-000000000003', 'e1000001-0001-4000-e000-000000000001', 'Forklift Zone', 'critical'),
  ('f1000001-0004-4000-f000-000000000004', 'e1000001-0001-4000-e000-000000000001', 'Loading Dock', 'medium'),
  ('f1000001-0005-4000-f000-000000000005', 'e1000001-0001-4000-e000-000000000001', 'Welding Shop', 'critical'),
  ('f1000001-0006-4000-f000-000000000006', 'e1000001-0001-4000-e000-000000000001', 'Storage Yard', 'low');

-- Edge Devices
INSERT INTO edge_devices (id, tenant_id, device_code, device_type, zone_name, model_version, status, last_heartbeat_at, last_ip_address, api_key_hash) VALUES
  ('d1000001-0001-4000-c000-000000000001', 'a1b2c3d4-0001-4000-a000-000000000001', 'EDGE-PB-01', 'jetson_nano',  'Press Bay 1',   'ppe-v1.2', 'online',  now()-interval '45 seconds', '192.168.10.101', 'aa3e8f1c2b4d6e9a0f1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a'),
  ('d1000001-0002-4000-c000-000000000002', 'a1b2c3d4-0001-4000-a000-000000000001', 'EDGE-PB-02', 'jetson_nano',  'Press Bay 2',   'ppe-v1.2', 'online',  now()-interval '12 seconds', '192.168.10.102', 'ab2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2'),
  ('d1000001-0003-4000-c000-000000000003', 'a1b2c3d4-0001-4000-a000-000000000001', 'EDGE-FK-01', 'jetson_nano',  'Forklift Zone', 'ppe-v1.2', 'online',  now()-interval '28 seconds', '192.168.10.103', 'ac3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3'),
  ('d1000001-0004-4000-c000-000000000004', 'a1b2c3d4-0001-4000-a000-000000000001', 'EDGE-LD-01', 'raspberry_pi', 'Loading Dock',  'ppe-v1.1', 'online',  now()-interval '3 minutes',  '192.168.10.104', 'ad4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4'),
  ('d1000001-0005-4000-c000-000000000005', 'a1b2c3d4-0001-4000-a000-000000000001', 'EDGE-WD-01', 'jetson_nano',  'Welding Shop',  'ppe-v1.2', 'offline', now()-interval '2 hours',    '192.168.10.105', 'ae5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5'),
  ('d1000001-0006-4000-c000-000000000006', 'a1b2c3d4-0001-4000-a000-000000000001', 'EDGE-ST-01', 'mini_pc',      'Storage Yard',   NULL,       'provisioned', NULL, NULL, 'af6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6');

-- Cameras
INSERT INTO cameras (id, edge_device_id, cam_label, local_rtsp_url, status) VALUES
  ('ca000001-0001-4000-d000-000000000001', 'd1000001-0001-4000-c000-000000000001', 'PB1-CAM-01', 'rtsp://proxy:8554/pb1-cam01', 'active'),
  ('ca000001-0002-4000-d000-000000000002', 'd1000001-0001-4000-c000-000000000001', 'PB1-CAM-02', 'rtsp://proxy:8554/pb1-cam02', 'active'),
  ('ca000001-0003-4000-d000-000000000003', 'd1000001-0002-4000-c000-000000000002', 'PB2-CAM-01', 'rtsp://proxy:8554/pb2-cam01', 'active'),
  ('ca000001-0004-4000-d000-000000000004', 'd1000001-0002-4000-c000-000000000002', 'PB2-CAM-02', 'rtsp://proxy:8554/pb2-cam02', 'active'),
  ('ca000001-0005-4000-d000-000000000005', 'd1000001-0003-4000-c000-000000000003', 'FK-CAM-01',  'rtsp://proxy:8554/fk-cam01',  'active'),
  ('ca000001-0006-4000-d000-000000000006', 'd1000001-0003-4000-c000-000000000003', 'FK-CAM-02',  'rtsp://proxy:8554/fk-cam02',  'active'),
  ('ca000001-0007-4000-d000-000000000007', 'd1000001-0004-4000-c000-000000000004', 'LD-CAM-01',  'rtsp://proxy:8554/ld-cam01',  'active'),
  ('ca000001-0008-4000-d000-000000000008', 'd1000001-0004-4000-c000-000000000004', 'LD-CAM-02',  'rtsp://proxy:8554/ld-cam02',  'active'),
  ('ca000001-0009-4000-d000-000000000009', 'd1000001-0005-4000-c000-000000000005', 'WD-CAM-01',  'rtsp://proxy:8554/wd-cam01',  'active'),
  ('ca000001-0010-4000-d000-000000000010', 'd1000001-0005-4000-c000-000000000005', 'WD-CAM-02',  'rtsp://proxy:8554/wd-cam02',  'active'),
  ('ca000001-0011-4000-d000-000000000011', 'd1000001-0005-4000-c000-000000000005', 'WD-CAM-03',  'rtsp://proxy:8554/wd-cam03',  'active'),
  ('ca000001-0012-4000-d000-000000000012', 'd1000001-0006-4000-c000-000000000006', 'ST-CAM-01',  'rtsp://proxy:8554/st-cam01',  'active');

-- Violations with v1-compatible fields (severity, status, category)
INSERT INTO violations (id, violation_no, tenant_id, edge_device_id, camera_id, violation_type, confidence, occurred_at, severity, status, category) VALUES
  (gen_random_uuid(), 'VIO-2026-001', 'a1b2c3d4-0001-4000-a000-000000000001', 'd1000001-0001-4000-c000-000000000001', 'ca000001-0001-4000-d000-000000000001', 'Helmet',       92, now()-interval '6 days 14 hours', 'high',   'open', 'ppe'),
  (gen_random_uuid(), 'VIO-2026-002', 'a1b2c3d4-0001-4000-a000-000000000001', 'd1000001-0001-4000-c000-000000000001', 'ca000001-0002-4000-d000-000000000002', 'Safety Vest',  87, now()-interval '6 days 13 hours', 'medium', 'open', 'ppe'),
  (gen_random_uuid(), 'VIO-2026-003', 'a1b2c3d4-0001-4000-a000-000000000001', 'd1000001-0002-4000-c000-000000000002', 'ca000001-0003-4000-d000-000000000003', 'Helmet',       95, now()-interval '6 days 11 hours', 'high',   'resolved', 'ppe'),
  (gen_random_uuid(), 'VIO-2026-004', 'a1b2c3d4-0001-4000-a000-000000000001', 'd1000001-0003-4000-c000-000000000003', 'ca000001-0005-4000-d000-000000000005', 'Gloves',       81, now()-interval '6 days 9 hours',  'medium', 'open', 'ppe'),
  (gen_random_uuid(), 'VIO-2026-005', 'a1b2c3d4-0001-4000-a000-000000000001', 'd1000001-0003-4000-c000-000000000003', 'ca000001-0006-4000-d000-000000000006', 'Safety Boots', 78, now()-interval '6 days 7 hours',  'low',    'acknowledged', 'ppe'),
  (gen_random_uuid(), 'VIO-2026-006', 'a1b2c3d4-0001-4000-a000-000000000001', 'd1000001-0001-4000-c000-000000000001', 'ca000001-0001-4000-d000-000000000001', 'Helmet',       94, now()-interval '5 days 16 hours', 'high',   'open', 'ppe'),
  (gen_random_uuid(), 'VIO-2026-007', 'a1b2c3d4-0001-4000-a000-000000000001', 'd1000001-0004-4000-c000-000000000004', 'ca000001-0007-4000-d000-000000000007', 'Safety Vest',  89, now()-interval '5 days 14 hours', 'medium', 'resolved', 'ppe'),
  (gen_random_uuid(), 'VIO-2026-008', 'a1b2c3d4-0001-4000-a000-000000000001', 'd1000001-0004-4000-c000-000000000004', 'ca000001-0008-4000-d000-000000000008', 'Helmet',       91, now()-interval '5 days 12 hours', 'high',   'open', 'ppe'),
  (gen_random_uuid(), 'VIO-2026-009', 'a1b2c3d4-0001-4000-a000-000000000001', 'd1000001-0002-4000-c000-000000000002', 'ca000001-0004-4000-d000-000000000004', 'Gloves',       83, now()-interval '5 days 10 hours', 'medium', 'acknowledged', 'ppe'),
  (gen_random_uuid(), 'VIO-2026-010', 'a1b2c3d4-0001-4000-a000-000000000001', 'd1000001-0005-4000-c000-000000000005', 'ca000001-0009-4000-d000-000000000009', 'Goggles',      96, now()-interval '5 days 8 hours',  'high',   'open', 'ppe'),
  (gen_random_uuid(), 'VIO-2026-011', 'a1b2c3d4-0001-4000-a000-000000000001', 'd1000001-0005-4000-c000-000000000005', 'ca000001-0010-4000-d000-000000000010', 'Safety Vest',  85, now()-interval '4 days 16 hours', 'medium', 'open', 'ppe'),
  (gen_random_uuid(), 'VIO-2026-012', 'a1b2c3d4-0001-4000-a000-000000000001', 'd1000001-0001-4000-c000-000000000001', 'ca000001-0001-4000-d000-000000000001', 'Safety Boots', 79, now()-interval '4 days 15 hours', 'low',    'resolved', 'ppe'),
  (gen_random_uuid(), 'VIO-2026-013', 'a1b2c3d4-0001-4000-a000-000000000001', 'd1000001-0001-4000-c000-000000000001', 'ca000001-0002-4000-d000-000000000002', 'Helmet',       93, now()-interval '3 days 12 hours', 'high',   'open', 'ppe'),
  (gen_random_uuid(), 'VIO-2026-014', 'a1b2c3d4-0001-4000-a000-000000000001', 'd1000001-0003-4000-c000-000000000003', 'ca000001-0005-4000-d000-000000000005', 'Safety Vest',  88, now()-interval '3 days 10 hours', 'medium', 'open', 'ppe'),
  (gen_random_uuid(), 'VIO-2026-015', 'a1b2c3d4-0001-4000-a000-000000000001', 'd1000001-0003-4000-c000-000000000003', 'ca000001-0006-4000-d000-000000000006', 'Gloves',       82, now()-interval '2 days 14 hours', 'medium', 'acknowledged', 'ppe'),
  (gen_random_uuid(), 'VIO-2026-016', 'a1b2c3d4-0001-4000-a000-000000000001', 'd1000001-0002-4000-c000-000000000002', 'ca000001-0003-4000-d000-000000000003', 'Helmet',       97, now()-interval '2 days 12 hours', 'critical','open', 'ppe'),
  (gen_random_uuid(), 'VIO-2026-017', 'a1b2c3d4-0001-4000-a000-000000000001', 'd1000001-0004-4000-c000-000000000004', 'ca000001-0007-4000-d000-000000000007', 'Helmet',       90, now()-interval '2 days 6 hours',  'high',   'open', 'ppe'),
  (gen_random_uuid(), 'VIO-2026-018', 'a1b2c3d4-0001-4000-a000-000000000001', 'd1000001-0005-4000-c000-000000000005', 'ca000001-0011-4000-d000-000000000011', 'Safety Vest',  86, now()-interval '1 day 16 hours',  'medium', 'open', 'ppe'),
  (gen_random_uuid(), 'VIO-2026-019', 'a1b2c3d4-0001-4000-a000-000000000001', 'd1000001-0001-4000-c000-000000000001', 'ca000001-0001-4000-d000-000000000001', 'Gloves',       80, now()-interval '1 day 10 hours',  'medium', 'resolved', 'ppe'),
  (gen_random_uuid(), 'VIO-2026-020', 'a1b2c3d4-0001-4000-a000-000000000001', 'd1000001-0002-4000-c000-000000000002', 'ca000001-0004-4000-d000-000000000004', 'Helmet',       94, now()-interval '1 day 4 hours',   'high',   'open', 'ppe'),
  (gen_random_uuid(), 'VIO-2026-021', 'a1b2c3d4-0001-4000-a000-000000000001', 'd1000001-0003-4000-c000-000000000003', 'ca000001-0005-4000-d000-000000000005', 'Safety Boots', 77, now()-interval '22 hours',        'low',    'open', 'ppe'),
  (gen_random_uuid(), 'VIO-2026-022', 'a1b2c3d4-0001-4000-a000-000000000001', 'd1000001-0004-4000-c000-000000000004', 'ca000001-0008-4000-d000-000000000008', 'Helmet',       92, now()-interval '18 hours',        'high',   'open', 'ppe'),
  (gen_random_uuid(), 'VIO-2026-023', 'a1b2c3d4-0001-4000-a000-000000000001', 'd1000001-0005-4000-c000-000000000005', 'ca000001-0009-4000-d000-000000000009', 'Safety Vest',  84, now()-interval '14 hours',        'medium', 'acknowledged', 'ppe'),
  (gen_random_uuid(), 'VIO-2026-024', 'a1b2c3d4-0001-4000-a000-000000000001', 'd1000001-0001-4000-c000-000000000001', 'ca000001-0002-4000-d000-000000000002', 'Helmet',       95, now()-interval '10 hours',        'high',   'open', 'ppe'),
  (gen_random_uuid(), 'VIO-2026-025', 'a1b2c3d4-0001-4000-a000-000000000001', 'd1000001-0002-4000-c000-000000000002', 'ca000001-0003-4000-d000-000000000003', 'Goggles',      81, now()-interval '8 hours',         'medium', 'open', 'ppe'),
  (gen_random_uuid(), 'VIO-2026-026', 'a1b2c3d4-0001-4000-a000-000000000001', 'd1000001-0003-4000-c000-000000000003', 'ca000001-0006-4000-d000-000000000006', 'Helmet',       93, now()-interval '6 hours',         'high',   'open', 'ppe'),
  (gen_random_uuid(), 'VIO-2026-027', 'a1b2c3d4-0001-4000-a000-000000000001', 'd1000001-0004-4000-c000-000000000004', 'ca000001-0007-4000-d000-000000000007', 'Safety Vest',  87, now()-interval '4 hours',         'medium', 'open', 'ppe'),
  (gen_random_uuid(), 'VIO-2026-028', 'a1b2c3d4-0001-4000-a000-000000000001', 'd1000001-0005-4000-c000-000000000005', 'ca000001-0010-4000-d000-000000000010', 'Safety Boots', 76, now()-interval '2 hours',         'low',    'open', 'ppe'),
  (gen_random_uuid(), 'VIO-2026-029', 'a1b2c3d4-0001-4000-a000-000000000001', 'd1000001-0001-4000-c000-000000000001', 'ca000001-0001-4000-d000-000000000001', 'Helmet',       98, now()-interval '45 minutes',      'critical','open', 'ppe'),
  (gen_random_uuid(), 'VIO-2026-030', 'a1b2c3d4-0001-4000-a000-000000000001', 'd1000001-0002-4000-c000-000000000002', 'ca000001-0004-4000-d000-000000000004', 'Gloves',       85, now()-interval '12 minutes',      'medium', 'open', 'ppe');

COMMIT;
