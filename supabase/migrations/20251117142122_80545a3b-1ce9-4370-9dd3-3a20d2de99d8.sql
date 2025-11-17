-- FASE 2.3: Trigger para auto-resolver alertas quando shipment é entregue

-- 1. Função que será executada pelo trigger
CREATE OR REPLACE FUNCTION auto_resolve_shipment_alerts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se o status mudou para delivered ou not_delivered
  IF NEW.status IN ('delivered', 'not_delivered') AND 
     (OLD.status IS NULL OR OLD.status NOT IN ('delivered', 'not_delivered')) THEN
    
    -- Resolver todos os alertas pendentes deste shipment
    UPDATE shipment_alerts
    SET 
      status = 'resolved',
      resolved_at = NOW(),
      notes = COALESCE(notes || E'\n\n', '') || 
              '✅ Resolvido automaticamente pelo sistema - Envio finalizado com status: ' || NEW.status ||
              ' em ' || to_char(NOW(), 'DD/MM/YYYY HH24:MI') || ' (trigger FASE 2.3)'
    WHERE 
      shipment_id = NEW.shipment_id
      AND status = 'pending'
      AND owner_user_id = NEW.owner_user_id;
    
    -- Log para debug
    RAISE NOTICE 'Auto-resolved alerts for shipment % (status: %)', NEW.shipment_id, NEW.status;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 2. Criar trigger na tabela shipments_cache
DROP TRIGGER IF EXISTS trigger_auto_resolve_alerts ON shipments_cache;

CREATE TRIGGER trigger_auto_resolve_alerts
AFTER UPDATE OF status ON shipments_cache
FOR EACH ROW
WHEN (NEW.status IN ('delivered', 'not_delivered'))
EXECUTE FUNCTION auto_resolve_shipment_alerts();

-- Comentários para documentação
COMMENT ON FUNCTION auto_resolve_shipment_alerts() IS 
'FASE 2.3: Resolve automaticamente alertas pendentes quando shipment atinge status final (delivered/not_delivered)';

COMMENT ON TRIGGER trigger_auto_resolve_alerts ON shipments_cache IS 
'FASE 2.3: Dispara auto-resolução de alertas quando status muda para delivered ou not_delivered';