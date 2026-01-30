-- Portal do Motorista: Colunas de convite e RLS

-- Adicionar colunas de convite na tabela drivers
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS invite_token TEXT;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS invite_expires_at TIMESTAMPTZ;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS email TEXT;

-- Índice para busca por token de convite
CREATE INDEX IF NOT EXISTS idx_drivers_invite_token ON public.drivers(invite_token) WHERE invite_token IS NOT NULL;

-- Índice para busca por user_id
CREATE INDEX IF NOT EXISTS idx_drivers_user_id ON public.drivers(user_id) WHERE user_id IS NOT NULL;

-- RLS Policy: Motoristas podem ver seus próprios dados de drivers
DROP POLICY IF EXISTS "drivers_view_self" ON public.drivers;
CREATE POLICY "drivers_view_self" ON public.drivers
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() 
    OR owner_user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'ops')
  );

-- RLS Policy: Motoristas podem ver suas próprias atribuições
DROP POLICY IF EXISTS "driver_assignments_driver_view" ON public.driver_assignments;
CREATE POLICY "driver_assignments_driver_view" ON public.driver_assignments
  FOR SELECT TO authenticated
  USING (
    driver_id IN (
      SELECT d.id FROM public.drivers d 
      WHERE d.user_id = auth.uid()
    )
    OR owner_user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'ops')
  );

-- RLS Policy: Motoristas podem inserir scan_logs para si mesmos
DROP POLICY IF EXISTS "scan_logs_driver_insert" ON public.scan_logs;
CREATE POLICY "scan_logs_driver_insert" ON public.scan_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    driver_id IN (
      SELECT d.id FROM public.drivers d 
      WHERE d.user_id = auth.uid()
    )
    OR owner_user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'ops')
  );

-- RLS Policy: Motoristas podem ver shipments_cache atribuídos a eles
DROP POLICY IF EXISTS "shipments_cache_driver_view" ON public.shipments_cache;
CREATE POLICY "shipments_cache_driver_view" ON public.shipments_cache
  FOR SELECT TO authenticated
  USING (
    shipment_id IN (
      SELECT da.shipment_id FROM public.driver_assignments da
      JOIN public.drivers d ON da.driver_id = d.id
      WHERE d.user_id = auth.uid()
    )
    OR owner_user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'ops')
  );

-- Garantir que a view v_rastreamento_completo usa security_invoker
-- (já deve estar configurada, mas garantindo)
-- A view já filtra por owner_user_id ou driver_id via RLS das tabelas base