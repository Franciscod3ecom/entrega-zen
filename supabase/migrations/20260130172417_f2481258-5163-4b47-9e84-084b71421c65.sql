-- FASE 1: Adicionar colunas dedicadas para cliente_nome, cidade, estado
ALTER TABLE public.shipments_cache 
ADD COLUMN IF NOT EXISTS cliente_nome TEXT,
ADD COLUMN IF NOT EXISTS cidade TEXT,
ADD COLUMN IF NOT EXISTS estado TEXT;

-- Popular colunas com dados existentes do raw_data
UPDATE public.shipments_cache
SET 
  cliente_nome = COALESCE(
    raw_data->'buyer_info'->>'name',
    CONCAT(
      raw_data->'destination'->'receiver'->>'name',
      ' ',
      raw_data->'destination'->'receiver'->>'last_name'
    )
  ),
  cidade = COALESCE(
    raw_data->'buyer_info'->>'city',
    raw_data->'destination'->'shipping_address'->'city'->>'name'
  ),
  estado = COALESCE(
    raw_data->'buyer_info'->>'state',
    raw_data->'destination'->'shipping_address'->'state'->>'name'
  )
WHERE raw_data IS NOT NULL;

-- Criar função de limpeza de campos pesados do JSONB
CREATE OR REPLACE FUNCTION public.slim_shipment_raw_data(data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Remover campos pesados, manter apenas essenciais
  RETURN jsonb_build_object(
    'id', data->'id',
    'status', data->'status',
    'substatus', data->'substatus',
    'logistic', jsonb_build_object(
      'type', data->'logistic'->'type',
      'mode', data->'logistic'->'mode'
    ),
    'buyer_info', data->'buyer_info',
    'tracking_number', data->'tracking_number'
  );
END;
$$;

-- Criar função de limpeza automática de envios finalizados
CREATE OR REPLACE FUNCTION public.cleanup_old_shipments_raw_data()
RETURNS TABLE(cleaned_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Limpar raw_data de envios finalizados com mais de 48h
  UPDATE shipments_cache
  SET raw_data = slim_shipment_raw_data(raw_data)
  WHERE status IN ('delivered', 'not_delivered', 'cancelled')
    AND last_ml_update < NOW() - INTERVAL '48 hours'
    AND raw_data ? 'destination'; -- Apenas se ainda tem campos pesados
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  RAISE NOTICE 'Limpados % registros de raw_data', v_count;
  
  RETURN QUERY SELECT v_count;
END;
$$;

-- Atualizar a view v_rastreamento_completo para usar as novas colunas
DROP VIEW IF EXISTS public.v_rastreamento_completo;

CREATE VIEW public.v_rastreamento_completo WITH (security_invoker = true) AS
SELECT 
  sc.owner_user_id,
  da.id AS assignment_id,
  da.driver_id,
  da.assigned_at,
  da.scanned_at,
  da.returned_at,
  (SELECT COUNT(*) FROM shipment_alerts sa 
   WHERE sa.shipment_id = sc.shipment_id 
   AND sa.owner_user_id = sc.owner_user_id 
   AND sa.status = 'pending')::bigint AS alertas_ativos,
  sc.last_ml_update,
  sc.ml_account_id,
  sc.shipment_id,
  sc.order_id,
  sc.pack_id,
  sc.tracking_number,
  sc.status,
  sc.substatus,
  -- Usar colunas dedicadas, com fallback para raw_data
  COALESCE(
    sc.cliente_nome,
    sc.raw_data->'buyer_info'->>'name',
    CONCAT(
      sc.raw_data->'destination'->'receiver'->>'name',
      ' ',
      sc.raw_data->'destination'->'receiver'->>'last_name'
    )
  ) AS cliente_nome,
  COALESCE(
    sc.cidade,
    sc.raw_data->'buyer_info'->>'city',
    sc.raw_data->'destination'->'shipping_address'->'city'->>'name'
  ) AS cidade,
  COALESCE(
    sc.estado,
    sc.raw_data->'buyer_info'->>'state',
    sc.raw_data->'destination'->'shipping_address'->'state'->>'name'
  ) AS estado,
  d.name AS motorista_nome,
  d.phone AS motorista_phone
FROM shipments_cache sc
LEFT JOIN driver_assignments da 
  ON da.shipment_id = sc.shipment_id 
  AND da.owner_user_id = sc.owner_user_id
  AND da.returned_at IS NULL
LEFT JOIN drivers d ON d.id = da.driver_id
ORDER BY sc.last_ml_update DESC;