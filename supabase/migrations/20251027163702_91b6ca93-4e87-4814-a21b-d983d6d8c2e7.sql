-- Migration 3: Atualizar todas as RLS Policies para usar owner_user_id

-- ===== ml_accounts =====
DROP POLICY IF EXISTS "Usuários podem ver contas ML do tenant" ON ml_accounts;
DROP POLICY IF EXISTS "Admins e ops podem gerenciar contas ML do tenant" ON ml_accounts;

CREATE POLICY "Usuários podem ver próprias contas ML"
ON ml_accounts FOR SELECT
TO authenticated
USING (owner_user_id = auth.uid());

CREATE POLICY "Admins e ops podem gerenciar próprias contas ML"
ON ml_accounts FOR ALL
TO authenticated
USING (owner_user_id = auth.uid() AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ops'::app_role)));

-- ===== drivers =====
DROP POLICY IF EXISTS "Usuários podem ver motoristas do tenant" ON drivers;
DROP POLICY IF EXISTS "Admins e ops podem gerenciar motoristas do tenant" ON drivers;
DROP POLICY IF EXISTS "Motoristas podem ver próprio perfil" ON drivers;

CREATE POLICY "Usuários podem ver próprios motoristas"
ON drivers FOR SELECT
TO authenticated
USING (owner_user_id = auth.uid());

CREATE POLICY "Admins e ops podem gerenciar próprios motoristas"
ON drivers FOR ALL
TO authenticated
USING (owner_user_id = auth.uid() AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ops'::app_role)));

CREATE POLICY "Motoristas podem ver próprio perfil"
ON drivers FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- ===== orders =====
DROP POLICY IF EXISTS "Usuários podem ver pedidos do tenant" ON orders;
DROP POLICY IF EXISTS "Admins e ops podem gerenciar pedidos do tenant" ON orders;

CREATE POLICY "Usuários podem ver próprios pedidos"
ON orders FOR SELECT
TO authenticated
USING (owner_user_id = auth.uid());

CREATE POLICY "Admins e ops podem gerenciar próprios pedidos"
ON orders FOR ALL
TO authenticated
USING (owner_user_id = auth.uid() AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ops'::app_role)));

-- ===== shipments =====
DROP POLICY IF EXISTS "Usuários podem ver envios do tenant" ON shipments;
DROP POLICY IF EXISTS "Admins e ops podem gerenciar envios do tenant" ON shipments;

CREATE POLICY "Usuários podem ver próprios envios"
ON shipments FOR SELECT
TO authenticated
USING (owner_user_id = auth.uid());

CREATE POLICY "Admins e ops podem gerenciar próprios envios"
ON shipments FOR ALL
TO authenticated
USING (owner_user_id = auth.uid() AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ops'::app_role)));

-- ===== shipments_cache =====
DROP POLICY IF EXISTS "Usuários podem ver cache do tenant" ON shipments_cache;
DROP POLICY IF EXISTS "Admins e ops podem gerenciar cache do tenant" ON shipments_cache;

CREATE POLICY "Usuários podem ver próprio cache"
ON shipments_cache FOR SELECT
TO authenticated
USING (owner_user_id = auth.uid());

CREATE POLICY "Admins e ops podem gerenciar próprio cache"
ON shipments_cache FOR ALL
TO authenticated
USING (owner_user_id = auth.uid() AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ops'::app_role)));

-- ===== driver_assignments =====
DROP POLICY IF EXISTS "Usuários podem ver assignments do tenant" ON driver_assignments;
DROP POLICY IF EXISTS "Ops e admins podem gerenciar assignments do tenant" ON driver_assignments;

CREATE POLICY "Usuários podem ver próprios assignments"
ON driver_assignments FOR SELECT
TO authenticated
USING (owner_user_id = auth.uid());

CREATE POLICY "Ops e admins podem gerenciar próprios assignments"
ON driver_assignments FOR ALL
TO authenticated
USING (owner_user_id = auth.uid() AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ops'::app_role)));

-- ===== scan_logs =====
DROP POLICY IF EXISTS "Usuários podem ver scan logs do tenant" ON scan_logs;
DROP POLICY IF EXISTS "Ops e admins podem inserir scan logs do tenant" ON scan_logs;

CREATE POLICY "Usuários podem ver próprios scan logs"
ON scan_logs FOR SELECT
TO authenticated
USING (owner_user_id = auth.uid());

CREATE POLICY "Ops e admins podem inserir próprios scan logs"
ON scan_logs FOR INSERT
TO authenticated
WITH CHECK (owner_user_id = auth.uid() AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ops'::app_role)));