-- Criar view para tela de Rastreamento unificada
CREATE OR REPLACE VIEW v_rastreamento_completo AS
SELECT 
  sc.shipment_id,
  sc.order_id,
  sc.pack_id,
  sc.tracking_number,
  sc.status,
  sc.substatus,
  sc.last_ml_update,
  COALESCE(
    NULLIF(TRIM(CONCAT(
      COALESCE((sc.raw_data->'receiver')::jsonb->>'first_name', ''),
      ' ',
      COALESCE((sc.raw_data->'receiver')::jsonb->>'last_name', '')
    )), ''),
    (sc.raw_data->'receiver')::jsonb->>'nickname',
    'N/A'
  ) as cliente_nome,
  sc.owner_user_id,
  sc.ml_account_id,
  da.id as assignment_id,
  da.driver_id,
  d.name as motorista_nome,
  d.phone as motorista_phone,
  da.returned_at,
  da.assigned_at,
  da.scanned_at,
  COUNT(sa.id) FILTER (WHERE sa.status = 'pending') as alertas_ativos
FROM shipments_cache sc
LEFT JOIN driver_assignments da ON da.shipment_id = sc.shipment_id 
  AND da.returned_at IS NULL
  AND da.owner_user_id = sc.owner_user_id
LEFT JOIN drivers d ON d.id = da.driver_id
LEFT JOIN shipment_alerts sa ON sa.shipment_id = sc.shipment_id 
  AND sa.status = 'pending'
  AND sa.owner_user_id = sc.owner_user_id
GROUP BY 
  sc.shipment_id, sc.order_id, sc.pack_id, sc.tracking_number, 
  sc.status, sc.substatus, sc.last_ml_update, sc.raw_data, 
  sc.owner_user_id, sc.ml_account_id,
  da.id, da.driver_id, d.name, d.phone, da.returned_at, da.assigned_at, da.scanned_at;

-- Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_shipments_cache_status ON shipments_cache(status);
CREATE INDEX IF NOT EXISTS idx_shipments_cache_last_update ON shipments_cache(last_ml_update DESC);
CREATE INDEX IF NOT EXISTS idx_driver_assignments_returned ON driver_assignments(returned_at) WHERE returned_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_shipment_alerts_pending ON shipment_alerts(status) WHERE status = 'pending';