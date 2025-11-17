-- Função auxiliar para identificar alertas duplicados
CREATE OR REPLACE FUNCTION identify_duplicate_alerts()
RETURNS TABLE (
  shipment_id TEXT,
  alert_type TEXT,
  count BIGINT,
  oldest_alert_id UUID,
  duplicate_ids UUID[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sa.shipment_id,
    sa.alert_type,
    COUNT(*) as count,
    MIN(sa.id) as oldest_alert_id,
    ARRAY_AGG(sa.id ORDER BY sa.detected_at DESC) FILTER (WHERE sa.id != MIN(sa.id)) as duplicate_ids
  FROM shipment_alerts sa
  WHERE sa.status = 'pending'
  GROUP BY sa.shipment_id, sa.alert_type
  HAVING COUNT(*) > 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;