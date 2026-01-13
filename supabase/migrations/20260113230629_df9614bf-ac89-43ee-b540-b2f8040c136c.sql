-- Habilitar REPLICA IDENTITY FULL para realtime
ALTER TABLE public.shipment_alerts REPLICA IDENTITY FULL;
ALTER TABLE public.shipments_cache REPLICA IDENTITY FULL;
ALTER TABLE public.driver_assignments REPLICA IDENTITY FULL;

-- Adicionar tabelas à publicação realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.shipment_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shipments_cache;
ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_assignments;