-- ==============================================
-- REMOVER EXIGÊNCIA DE ROLES PARA CLIENTES
-- Apenas owner_user_id + opcional admin master
-- ==============================================

-- 1. CARRIERS (transportadoras)
DROP POLICY IF EXISTS "Admins e ops podem gerenciar transportadoras" ON carriers;
DROP POLICY IF EXISTS "Usuários podem ver próprias transportadoras" ON carriers;

CREATE POLICY "Usuários gerenciam próprias transportadoras ou admin vê tudo"
ON carriers FOR ALL
USING (owner_user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (owner_user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- 2. DRIVERS (motoristas)
DROP POLICY IF EXISTS "Admins e ops podem gerenciar motoristas" ON drivers;
DROP POLICY IF EXISTS "Usuários podem ver próprios motoristas" ON drivers;
DROP POLICY IF EXISTS "Motoristas podem ver próprio perfil" ON drivers;

CREATE POLICY "Usuários gerenciam próprios motoristas ou admin vê tudo"
ON drivers FOR ALL
USING (owner_user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (owner_user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- 3. DRIVER_ASSIGNMENTS (atribuições)
DROP POLICY IF EXISTS "Ops e admins podem gerenciar assignments" ON driver_assignments;
DROP POLICY IF EXISTS "Usuários podem ver próprios assignments" ON driver_assignments;

CREATE POLICY "Usuários gerenciam próprios assignments ou admin vê tudo"
ON driver_assignments FOR ALL
USING (owner_user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (owner_user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- 4. SHIPMENTS_CACHE (cache de envios)
DROP POLICY IF EXISTS "Admins e ops podem gerenciar próprio cache" ON shipments_cache;
DROP POLICY IF EXISTS "Deny default access to shipments cache" ON shipments_cache;
DROP POLICY IF EXISTS "Motoristas veem apenas shipments atribuídos" ON shipments_cache;

CREATE POLICY "Usuários gerenciam próprio cache ou admin vê tudo"
ON shipments_cache FOR ALL
USING (owner_user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (owner_user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- 5. SHIPMENT_ALERTS (alertas)
DROP POLICY IF EXISTS "Admins e ops podem gerenciar alertas" ON shipment_alerts;
DROP POLICY IF EXISTS "Usuários podem ver próprios alertas" ON shipment_alerts;

CREATE POLICY "Usuários gerenciam próprios alertas ou admin vê tudo"
ON shipment_alerts FOR ALL
USING (owner_user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (owner_user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- 6. ORDERS (pedidos)
DROP POLICY IF EXISTS "Admins e ops podem gerenciar pedidos" ON orders;
DROP POLICY IF EXISTS "Usuários podem ver próprios pedidos" ON orders;

CREATE POLICY "Usuários gerenciam próprios pedidos ou admin vê tudo"
ON orders FOR ALL
USING (owner_user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (owner_user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- 7. SHIPMENTS (envios)
DROP POLICY IF EXISTS "Admins e ops podem gerenciar envios" ON shipments;
DROP POLICY IF EXISTS "Usuários podem ver próprios envios" ON shipments;

CREATE POLICY "Usuários gerenciam próprios envios ou admin vê tudo"
ON shipments FOR ALL
USING (owner_user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (owner_user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- 8. ML_ACCOUNTS (contas Mercado Livre)
DROP POLICY IF EXISTS "Admins e ops podem gerenciar contas ML" ON ml_accounts;
DROP POLICY IF EXISTS "Usuários podem ver próprias contas ML" ON ml_accounts;

CREATE POLICY "Usuários gerenciam próprias contas ML ou admin vê tudo"
ON ml_accounts FOR ALL
USING (owner_user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (owner_user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- 9. SCAN_LOGS (logs de bipagem)
DROP POLICY IF EXISTS "Ops e admins podem inserir próprios scan logs" ON scan_logs;
DROP POLICY IF EXISTS "Usuários podem ver próprios scan logs" ON scan_logs;

CREATE POLICY "Usuários gerenciam próprios scan logs ou admin vê tudo"
ON scan_logs FOR ALL
USING (owner_user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (owner_user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- Comentários das novas políticas
COMMENT ON POLICY "Usuários gerenciam próprias transportadoras ou admin vê tudo" ON carriers IS 
'Permite que usuários gerenciem suas próprias transportadoras. Admin master pode ver/gerenciar tudo.';

COMMENT ON POLICY "Usuários gerenciam próprios motoristas ou admin vê tudo" ON drivers IS 
'Permite que usuários gerenciem seus próprios motoristas. Admin master pode ver/gerenciar tudo.';

COMMENT ON POLICY "Usuários gerenciam próprios assignments ou admin vê tudo" ON driver_assignments IS 
'Permite que usuários gerenciem suas próprias atribuições. Admin master pode ver/gerenciar tudo.';