-- Criar função para buscar pendências com join manual
CREATE OR REPLACE FUNCTION get_pendencias_with_cache()
RETURNS TABLE (
  id uuid,
  shipment_id text,
  assigned_at timestamptz,
  scanned_at timestamptz,
  note text,
  driver_id uuid,
  driver_name text,
  driver_phone text,
  cache_status text,
  cache_substatus text,
  cache_tracking text,
  cache_last_update timestamptz
) 
SECURITY DEFINER
SET search_path = public
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
  LEFT JOIN shipments_cache sc ON sc.shipment_id = da.shipment_id
  WHERE da.returned_at IS NULL
  ORDER BY da.assigned_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Adicionar Foreign Key para melhorar integridade (opcional mas recomendado)
-- Nota: só funciona se todos os shipment_ids em driver_assignments existirem em shipments_cache
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_driver_assignments_shipment'
  ) THEN
    ALTER TABLE driver_assignments
    ADD CONSTRAINT fk_driver_assignments_shipment
    FOREIGN KEY (shipment_id) 
    REFERENCES shipments_cache(shipment_id)
    ON DELETE CASCADE;
  END IF;
END $$;