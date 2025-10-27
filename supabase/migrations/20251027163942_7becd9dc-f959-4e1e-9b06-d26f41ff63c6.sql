-- Migration 4: Remover tenant_id e tabelas de tenant

-- Remover tenant_id de todas as tabelas
ALTER TABLE ml_accounts DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE drivers DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE orders DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE shipments DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE shipments_cache DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE driver_assignments DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE scan_logs DROP COLUMN IF EXISTS tenant_id CASCADE;

-- Dropar função get_user_tenant_ids
DROP FUNCTION IF EXISTS public.get_user_tenant_ids(uuid) CASCADE;

-- Dropar tabelas de tenant
DROP TABLE IF EXISTS public.memberships CASCADE;
DROP TABLE IF EXISTS public.tenants CASCADE;

-- Atualizar função get_pendencias_with_cache
CREATE OR REPLACE FUNCTION public.get_pendencias_with_cache()
RETURNS TABLE(
  id uuid,
  shipment_id text,
  assigned_at timestamp with time zone,
  scanned_at timestamp with time zone,
  note text,
  driver_id uuid,
  driver_name text,
  driver_phone text,
  cache_status text,
  cache_substatus text,
  cache_tracking text,
  cache_last_update timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    da.id,
    da.shipment_id,
    da.assigned_at,
    da.scanned_at,
    da.note,
    da.driver_id,
    d.name as driver_name,
    d.phone as driver_phone,
    sc.status as cache_status,
    sc.substatus as cache_substatus,
    sc.tracking_number as cache_tracking,
    sc.last_ml_update as cache_last_update
  FROM driver_assignments da
  INNER JOIN drivers d ON d.id = da.driver_id
  LEFT JOIN shipments_cache sc ON sc.shipment_id = da.shipment_id AND sc.owner_user_id = da.owner_user_id
  WHERE da.returned_at IS NULL
    AND da.owner_user_id = auth.uid()
  ORDER BY da.assigned_at DESC;
END;
$$;