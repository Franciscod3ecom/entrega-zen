-- Migration 1: Adicionar owner_user_id e migrar dados do tenant_id

-- 1. ml_accounts: já tem owner_user_id, tornar obrigatório
ALTER TABLE ml_accounts ALTER COLUMN owner_user_id SET NOT NULL;

-- 2. drivers: adicionar owner_user_id e popular
ALTER TABLE drivers ADD COLUMN owner_user_id uuid;

UPDATE drivers d
SET owner_user_id = m.user_id
FROM memberships m
WHERE d.tenant_id = m.tenant_id;

ALTER TABLE drivers ALTER COLUMN owner_user_id SET NOT NULL;
ALTER TABLE drivers ADD CONSTRAINT drivers_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. orders: adicionar owner_user_id e popular
ALTER TABLE orders ADD COLUMN owner_user_id uuid;

UPDATE orders o
SET owner_user_id = m.user_id
FROM memberships m
WHERE o.tenant_id = m.tenant_id;

ALTER TABLE orders ALTER COLUMN owner_user_id SET NOT NULL;
ALTER TABLE orders ADD CONSTRAINT orders_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 4. shipments: adicionar owner_user_id e popular
ALTER TABLE shipments ADD COLUMN owner_user_id uuid;

UPDATE shipments s
SET owner_user_id = m.user_id
FROM memberships m
WHERE s.tenant_id = m.tenant_id;

ALTER TABLE shipments ALTER COLUMN owner_user_id SET NOT NULL;
ALTER TABLE shipments ADD CONSTRAINT shipments_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 5. shipments_cache: adicionar owner_user_id e popular
ALTER TABLE shipments_cache ADD COLUMN owner_user_id uuid;

UPDATE shipments_cache sc
SET owner_user_id = m.user_id
FROM memberships m
WHERE sc.tenant_id = m.tenant_id;

ALTER TABLE shipments_cache ALTER COLUMN owner_user_id SET NOT NULL;
ALTER TABLE shipments_cache ADD CONSTRAINT shipments_cache_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 6. driver_assignments: adicionar owner_user_id e popular
ALTER TABLE driver_assignments ADD COLUMN owner_user_id uuid;

UPDATE driver_assignments da
SET owner_user_id = m.user_id
FROM memberships m
WHERE da.tenant_id = m.tenant_id;

ALTER TABLE driver_assignments ALTER COLUMN owner_user_id SET NOT NULL;
ALTER TABLE driver_assignments ADD CONSTRAINT driver_assignments_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 7. scan_logs: adicionar owner_user_id e popular
ALTER TABLE scan_logs ADD COLUMN owner_user_id uuid;

UPDATE scan_logs sl
SET owner_user_id = m.user_id
FROM memberships m
WHERE sl.tenant_id = m.tenant_id;

ALTER TABLE scan_logs ALTER COLUMN owner_user_id SET NOT NULL;
ALTER TABLE scan_logs ADD CONSTRAINT scan_logs_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;