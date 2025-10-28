-- Corrigir políticas RLS de carriers e drivers para permitir INSERT por admin/ops

-- ============================================
-- CARRIERS: Corrigir políticas RLS
-- ============================================

-- Remover políticas antigas
DROP POLICY IF EXISTS "Admins e ops podem gerenciar transportadoras" ON carriers;
DROP POLICY IF EXISTS "Admins e ops podem inserir transportadoras" ON carriers;

-- Recriar política ALL com WITH CHECK correto
CREATE POLICY "Admins e ops podem gerenciar transportadoras"
  ON carriers
  FOR ALL
  USING (
    owner_user_id = auth.uid() 
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ops'::app_role))
  )
  WITH CHECK (
    owner_user_id = auth.uid()
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ops'::app_role))
  );

-- ============================================
-- DRIVERS: Corrigir políticas RLS
-- ============================================

-- Remover políticas antigas
DROP POLICY IF EXISTS "Admins e ops podem gerenciar motoristas" ON drivers;
DROP POLICY IF EXISTS "Admins e ops podem inserir motoristas" ON drivers;

-- Recriar política ALL com WITH CHECK correto
CREATE POLICY "Admins e ops podem gerenciar motoristas"
  ON drivers
  FOR ALL
  USING (
    owner_user_id = auth.uid()
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ops'::app_role))
  )
  WITH CHECK (
    owner_user_id = auth.uid()
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ops'::app_role))
  );

-- ============================================
-- OUTRAS TABELAS: Corrigir políticas similares
-- ============================================

-- ORDERS
DROP POLICY IF EXISTS "Admins e ops podem gerenciar pedidos" ON orders;
DROP POLICY IF EXISTS "Admins e ops podem inserir pedidos" ON orders;

CREATE POLICY "Admins e ops podem gerenciar pedidos"
  ON orders
  FOR ALL
  USING (
    owner_user_id = auth.uid()
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ops'::app_role))
  )
  WITH CHECK (
    owner_user_id = auth.uid()
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ops'::app_role))
  );

-- SHIPMENTS
DROP POLICY IF EXISTS "Admins e ops podem gerenciar envios" ON shipments;
DROP POLICY IF EXISTS "Admins e ops podem inserir envios" ON shipments;

CREATE POLICY "Admins e ops podem gerenciar envios"
  ON shipments
  FOR ALL
  USING (
    owner_user_id = auth.uid()
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ops'::app_role))
  )
  WITH CHECK (
    owner_user_id = auth.uid()
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ops'::app_role))
  );

-- DRIVER_ASSIGNMENTS
DROP POLICY IF EXISTS "Ops e admins podem gerenciar assignments" ON driver_assignments;
DROP POLICY IF EXISTS "Ops e admins podem inserir assignments" ON driver_assignments;

CREATE POLICY "Ops e admins podem gerenciar assignments"
  ON driver_assignments
  FOR ALL
  USING (
    owner_user_id = auth.uid()
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ops'::app_role))
  )
  WITH CHECK (
    owner_user_id = auth.uid()
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ops'::app_role))
  );

-- SHIPMENT_ALERTS
DROP POLICY IF EXISTS "Admins e ops podem gerenciar alertas" ON shipment_alerts;
DROP POLICY IF EXISTS "Admins e ops podem inserir alertas" ON shipment_alerts;

CREATE POLICY "Admins e ops podem gerenciar alertas"
  ON shipment_alerts
  FOR ALL
  USING (
    owner_user_id = auth.uid()
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ops'::app_role))
  )
  WITH CHECK (
    owner_user_id = auth.uid()
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ops'::app_role))
  );

-- ML_ACCOUNTS
DROP POLICY IF EXISTS "Admins e ops podem gerenciar contas ML" ON ml_accounts;
DROP POLICY IF EXISTS "Admins e ops podem inserir contas ML" ON ml_accounts;

CREATE POLICY "Admins e ops podem gerenciar contas ML"
  ON ml_accounts
  FOR ALL
  USING (
    owner_user_id = auth.uid()
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ops'::app_role))
  )
  WITH CHECK (
    owner_user_id = auth.uid()
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ops'::app_role))
  );

-- ============================================
-- GARANTIR ROLES: Atribuir admin ao usuário atual se necessário
-- ============================================

-- Executar função para atribuir admin ao primeiro usuário
SELECT assign_first_admin();

-- Comentários explicativos
COMMENT ON POLICY "Admins e ops podem gerenciar transportadoras" ON carriers IS 'Permite admin/ops do tenant gerenciar transportadoras (SELECT/INSERT/UPDATE/DELETE)';
COMMENT ON POLICY "Admins e ops podem gerenciar motoristas" ON drivers IS 'Permite admin/ops do tenant gerenciar motoristas (SELECT/INSERT/UPDATE/DELETE)';
COMMENT ON POLICY "Admins e ops podem gerenciar pedidos" ON orders IS 'Permite admin/ops do tenant gerenciar pedidos (SELECT/INSERT/UPDATE/DELETE)';
COMMENT ON POLICY "Admins e ops podem gerenciar envios" ON shipments IS 'Permite admin/ops do tenant gerenciar envios (SELECT/INSERT/UPDATE/DELETE)';
COMMENT ON POLICY "Ops e admins podem gerenciar assignments" ON driver_assignments IS 'Permite admin/ops do tenant gerenciar atribuições de motoristas (SELECT/INSERT/UPDATE/DELETE)';
COMMENT ON POLICY "Admins e ops podem gerenciar alertas" ON shipment_alerts IS 'Permite admin/ops do tenant gerenciar alertas (SELECT/INSERT/UPDATE/DELETE)';
COMMENT ON POLICY "Admins e ops podem gerenciar contas ML" ON ml_accounts IS 'Permite admin/ops do tenant gerenciar contas ML (SELECT/INSERT/UPDATE/DELETE)';