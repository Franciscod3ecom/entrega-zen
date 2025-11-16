-- FASE 3.1: Atualizar view v_rastreamento_completo para incluir dados do comprador

DROP VIEW IF EXISTS v_rastreamento_completo;

CREATE OR REPLACE VIEW v_rastreamento_completo AS
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
  
  -- Extrair dados do comprador do raw_data.buyer_info
  (sc.raw_data->'buyer_info'->>'name') as cliente_nome,
  (sc.raw_data->'buyer_info'->>'city') as cidade,
  (sc.raw_data->'buyer_info'->>'state') as estado,
  
  -- Dados do assignment
  da.id as assignment_id,
  da.driver_id,
  da.assigned_at,
  da.scanned_at,
  da.returned_at,
  
  -- Dados do motorista
  d.name as motorista_nome,
  d.phone as motorista_phone,
  
  -- Contar alertas ativos
  (SELECT COUNT(*) 
   FROM shipment_alerts sa 
   WHERE sa.shipment_id = sc.shipment_id 
   AND sa.status = 'pending') as alertas_ativos

FROM shipments_cache sc
LEFT JOIN driver_assignments da 
  ON da.shipment_id = sc.shipment_id 
  AND da.owner_user_id = sc.owner_user_id
  AND da.returned_at IS NULL
LEFT JOIN drivers d 
  ON d.id = da.driver_id;

-- Adicionar comentário
COMMENT ON VIEW v_rastreamento_completo IS 
'View consolidada com dados de envios, motoristas e alertas, incluindo informações do cliente extraídas do raw_data';