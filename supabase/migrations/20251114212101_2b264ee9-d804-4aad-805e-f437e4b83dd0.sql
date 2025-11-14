-- Recriar view com SECURITY INVOKER explícito para resolver warning de segurança
DROP VIEW IF EXISTS v_rastreamento_completo;

CREATE VIEW v_rastreamento_completo 
WITH (security_invoker = true) AS
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
WHERE sc.owner_user_id = auth.uid()
GROUP BY 
  sc.shipment_id, sc.order_id, sc.pack_id, sc.tracking_number, 
  sc.status, sc.substatus, sc.last_ml_update, sc.raw_data, 
  sc.owner_user_id, sc.ml_account_id,
  da.id, da.driver_id, d.name, d.phone, da.returned_at, da.assigned_at, da.scanned_at;