-- FASE 1.2: Funções de Limpeza e Sincronização de Alertas

-- 1. Função para remover alertas órfãos (shipment não existe)
CREATE OR REPLACE FUNCTION cleanup_orphaned_alerts()
RETURNS TABLE (
  deleted_count INTEGER,
  deleted_ids UUID[]
) AS $$
DECLARE
  v_deleted_ids UUID[];
  v_count INTEGER;
BEGIN
  -- Deletar alertas cujo shipment_id não existe em shipments_cache
  DELETE FROM shipment_alerts
  WHERE status = 'pending'
    AND shipment_id NOT IN (SELECT shipment_id FROM shipments_cache)
  RETURNING id INTO v_deleted_ids;
  
  v_count := array_length(v_deleted_ids, 1);
  IF v_count IS NULL THEN
    v_count := 0;
    v_deleted_ids := ARRAY[]::UUID[];
  END IF;
  
  RAISE NOTICE 'Removidos % alertas órfãos', v_count;
  
  RETURN QUERY SELECT v_count, v_deleted_ids;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Função para consolidar alertas duplicados (manter o mais antigo)
CREATE OR REPLACE FUNCTION cleanup_duplicate_alerts()
RETURNS TABLE (
  consolidated_count INTEGER,
  deleted_ids UUID[]
) AS $$
DECLARE
  v_deleted_ids UUID[];
  v_count INTEGER;
BEGIN
  -- Para cada grupo de duplicatas, manter apenas o alerta mais antigo
  WITH duplicates AS (
    SELECT 
      shipment_id,
      alert_type,
      array_agg(id ORDER BY detected_at ASC) as alert_ids
    FROM shipment_alerts
    WHERE status = 'pending'
    GROUP BY shipment_id, alert_type
    HAVING COUNT(*) > 1
  ),
  to_delete AS (
    SELECT unnest(alert_ids[2:]) as id
    FROM duplicates
  )
  DELETE FROM shipment_alerts
  WHERE id IN (SELECT id FROM to_delete)
  RETURNING id INTO v_deleted_ids;
  
  v_count := array_length(v_deleted_ids, 1);
  IF v_count IS NULL THEN
    v_count := 0;
    v_deleted_ids := ARRAY[]::UUID[];
  END IF;
  
  RAISE NOTICE 'Consolidados % alertas duplicados', v_count;
  
  RETURN QUERY SELECT v_count, v_deleted_ids;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Função para resolver alertas de envios já finalizados
CREATE OR REPLACE FUNCTION resolve_alerts_on_delivered_shipments()
RETURNS TABLE (
  resolved_count INTEGER,
  resolved_ids UUID[]
) AS $$
DECLARE
  v_resolved_ids UUID[];
  v_count INTEGER;
BEGIN
  -- Marcar como resolvidos os alertas de shipments com status final
  UPDATE shipment_alerts sa
  SET 
    status = 'resolved',
    resolved_at = NOW(),
    notes = COALESCE(notes || E'\n\n', '') || 
            '✅ Resolvido automaticamente - envio finalizado com status: ' || sc.status
  FROM shipments_cache sc
  WHERE sa.shipment_id = sc.shipment_id
    AND sa.status = 'pending'
    AND sc.status IN ('delivered', 'not_delivered')
  RETURNING sa.id INTO v_resolved_ids;
  
  v_count := array_length(v_resolved_ids, 1);
  IF v_count IS NULL THEN
    v_count := 0;
    v_resolved_ids := ARRAY[]::UUID[];
  END IF;
  
  RAISE NOTICE 'Resolvidos % alertas de envios finalizados', v_count;
  
  RETURN QUERY SELECT v_count, v_resolved_ids;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Função mestra que executa todas as limpezas em sequência
CREATE OR REPLACE FUNCTION sync_alert_counts()
RETURNS TABLE (
  orphaned_removed INTEGER,
  duplicates_consolidated INTEGER,
  delivered_resolved INTEGER,
  total_cleaned INTEGER
) AS $$
DECLARE
  v_orphaned INTEGER := 0;
  v_duplicates INTEGER := 0;
  v_delivered INTEGER := 0;
BEGIN
  RAISE NOTICE '🧹 Iniciando limpeza de alertas...';
  
  -- 1. Remover órfãos
  SELECT deleted_count INTO v_orphaned
  FROM cleanup_orphaned_alerts();
  
  -- 2. Consolidar duplicados
  SELECT consolidated_count INTO v_duplicates
  FROM cleanup_duplicate_alerts();
  
  -- 3. Resolver finalizados
  SELECT resolved_count INTO v_delivered
  FROM resolve_alerts_on_delivered_shipments();
  
  RAISE NOTICE '✅ Limpeza concluída: % órfãos, % duplicados, % finalizados',
    v_orphaned, v_duplicates, v_delivered;
  
  RETURN QUERY SELECT 
    v_orphaned,
    v_duplicates,
    v_delivered,
    (v_orphaned + v_duplicates + v_delivered);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION sync_alert_counts IS 
'Função mestra que limpa inconsistências de alertas: remove órfãos, consolida duplicados e resolve alertas de envios finalizados';

COMMENT ON FUNCTION cleanup_orphaned_alerts IS 
'Remove alertas pendentes cujo shipment_id não existe mais em shipments_cache';

COMMENT ON FUNCTION cleanup_duplicate_alerts IS 
'Consolida alertas duplicados mantendo apenas o mais antigo de cada grupo';

COMMENT ON FUNCTION resolve_alerts_on_delivered_shipments IS 
'Resolve automaticamente alertas de shipments com status delivered ou not_delivered';