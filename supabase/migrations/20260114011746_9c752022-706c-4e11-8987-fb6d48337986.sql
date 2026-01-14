-- Atualizar view para extrair dados do cliente de múltiplos locais do raw_data
DROP VIEW IF EXISTS v_rastreamento_completo;

CREATE VIEW v_rastreamento_completo WITH (security_invoker = true) AS
SELECT 
  sc.shipment_id,
  sc.order_id,
  sc.pack_id,
  sc.tracking_number,
  sc.status,
  sc.substatus,
  sc.last_ml_update,
  sc.ml_account_id,
  sc.owner_user_id,
  -- Buscar nome do cliente em múltiplos locais (prioridade)
  COALESCE(
    sc.raw_data->'buyer_info'->>'name',
    sc.raw_data->'destination'->>'receiver_name',
    sc.raw_data->'receiver'->>'name',
    'Cliente não identificado'
  ) AS cliente_nome,
  -- Buscar cidade em múltiplos locais
  COALESCE(
    sc.raw_data->'buyer_info'->>'city',
    sc.raw_data->'destination'->'shipping_address'->'city'->>'name',
    sc.raw_data->'receiver_address'->'city'->>'name'
  ) AS cidade,
  -- Buscar estado em múltiplos locais
  COALESCE(
    sc.raw_data->'buyer_info'->>'state',
    sc.raw_data->'destination'->'shipping_address'->'state'->>'name',
    sc.raw_data->'receiver_address'->'state'->>'name'
  ) AS estado,
  -- Joins para assignments e drivers
  da.id AS assignment_id,
  da.driver_id,
  da.assigned_at,
  da.scanned_at,
  da.returned_at,
  d.name AS motorista_nome,
  d.phone AS motorista_phone,
  -- Contagem de alertas ativos
  (SELECT COUNT(*) FROM shipment_alerts sa 
   WHERE sa.shipment_id = sc.shipment_id AND sa.status = 'pending') AS alertas_ativos
FROM shipments_cache sc
LEFT JOIN driver_assignments da 
  ON da.shipment_id = sc.shipment_id 
  AND da.owner_user_id = sc.owner_user_id 
  AND da.returned_at IS NULL
LEFT JOIN drivers d ON d.id = da.driver_id;