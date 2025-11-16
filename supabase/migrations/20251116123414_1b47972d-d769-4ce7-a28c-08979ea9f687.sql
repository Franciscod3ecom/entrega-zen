-- Fix: Security Definer View
-- Recriar v_rastreamento_completo com SECURITY INVOKER para respeitar RLS do usuário

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
  sc.ml_account_id,
  sc.owner_user_id,
  -- Extrair dados do comprador do raw_data JSON
  (sc.raw_data->'buyer_info'->>'name') AS cliente_nome,
  (sc.raw_data->'buyer_info'->>'city') AS cidade,
  (sc.raw_data->'buyer_info'->>'state') AS estado,
  -- Dados de assignment
  da.id AS assignment_id,
  da.driver_id,
  da.assigned_at,
  da.scanned_at,
  da.returned_at,
  -- Dados do motorista
  d.name AS motorista_nome,
  d.phone AS motorista_phone,
  -- Contar alertas ativos
  (
    SELECT COUNT(*) 
    FROM shipment_alerts sa 
    WHERE sa.shipment_id = sc.shipment_id 
      AND sa.status = 'pending'
  ) AS alertas_ativos
FROM shipments_cache sc
LEFT JOIN driver_assignments da 
  ON da.shipment_id = sc.shipment_id 
  AND da.owner_user_id = sc.owner_user_id
  AND da.returned_at IS NULL
LEFT JOIN drivers d 
  ON d.id = da.driver_id;

COMMENT ON VIEW v_rastreamento_completo IS 
'View consolidada com dados de envios, motoristas e alertas. Usa SECURITY INVOKER para respeitar RLS policies do usuário consultante.';