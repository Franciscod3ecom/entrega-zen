-- Correção de políticas RLS para permitir INSERT corretamente
-- Problema: políticas ALL sem WITH CHECK explícito impedem INSERT

-- ========================================
-- TABELA: drivers
-- ========================================

-- Remover política ALL problemática
DROP POLICY IF EXISTS "Admins e ops podem gerenciar próprios motoristas" ON drivers;

-- Criar política específica para INSERT
CREATE POLICY "Admins e ops podem inserir motoristas"
ON drivers
FOR INSERT
TO authenticated
WITH CHECK (
  owner_user_id = auth.uid() 
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'ops'::app_role)
  )
);

-- Criar política para SELECT/UPDATE/DELETE
CREATE POLICY "Admins e ops podem gerenciar motoristas"
ON drivers
FOR ALL
TO authenticated
USING (
  owner_user_id = auth.uid() 
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'ops'::app_role)
  )
);

-- ========================================
-- TABELA: carriers
-- ========================================

DROP POLICY IF EXISTS "Admins e ops podem gerenciar próprias transportadoras" ON carriers;

CREATE POLICY "Admins e ops podem inserir transportadoras"
ON carriers
FOR INSERT
TO authenticated
WITH CHECK (
  owner_user_id = auth.uid() 
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'ops'::app_role)
  )
);

CREATE POLICY "Admins e ops podem gerenciar transportadoras"
ON carriers
FOR ALL
TO authenticated
USING (
  owner_user_id = auth.uid() 
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'ops'::app_role)
  )
);

-- ========================================
-- TABELA: ml_accounts
-- ========================================

DROP POLICY IF EXISTS "Admins e ops podem gerenciar próprias contas ML" ON ml_accounts;

CREATE POLICY "Admins e ops podem inserir contas ML"
ON ml_accounts
FOR INSERT
TO authenticated
WITH CHECK (
  owner_user_id = auth.uid() 
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'ops'::app_role)
  )
);

CREATE POLICY "Admins e ops podem gerenciar contas ML"
ON ml_accounts
FOR ALL
TO authenticated
USING (
  owner_user_id = auth.uid() 
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'ops'::app_role)
  )
);

-- ========================================
-- TABELA: driver_assignments
-- ========================================

DROP POLICY IF EXISTS "Ops e admins podem gerenciar próprios assignments" ON driver_assignments;

CREATE POLICY "Ops e admins podem inserir assignments"
ON driver_assignments
FOR INSERT
TO authenticated
WITH CHECK (
  owner_user_id = auth.uid() 
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'ops'::app_role)
  )
);

CREATE POLICY "Ops e admins podem gerenciar assignments"
ON driver_assignments
FOR ALL
TO authenticated
USING (
  owner_user_id = auth.uid() 
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'ops'::app_role)
  )
);

-- ========================================
-- TABELA: shipment_alerts
-- ========================================

DROP POLICY IF EXISTS "Admins e ops podem gerenciar próprios alertas" ON shipment_alerts;

CREATE POLICY "Admins e ops podem inserir alertas"
ON shipment_alerts
FOR INSERT
TO authenticated
WITH CHECK (
  owner_user_id = auth.uid() 
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'ops'::app_role)
  )
);

CREATE POLICY "Admins e ops podem gerenciar alertas"
ON shipment_alerts
FOR ALL
TO authenticated
USING (
  owner_user_id = auth.uid() 
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'ops'::app_role)
  )
);

-- ========================================
-- TABELA: shipments_cache
-- ========================================

DROP POLICY IF EXISTS "Admins e ops podem gerenciar próprio cache" ON shipments_cache;

CREATE POLICY "Admins e ops podem inserir cache"
ON shipments_cache
FOR INSERT
TO authenticated
WITH CHECK (
  owner_user_id = auth.uid() 
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'ops'::app_role)
  )
);

CREATE POLICY "Admins e ops podem gerenciar cache"
ON shipments_cache
FOR ALL
TO authenticated
USING (
  owner_user_id = auth.uid() 
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'ops'::app_role)
  )
);

-- ========================================
-- TABELA: shipments
-- ========================================

DROP POLICY IF EXISTS "Admins e ops podem gerenciar próprios envios" ON shipments;

CREATE POLICY "Admins e ops podem inserir envios"
ON shipments
FOR INSERT
TO authenticated
WITH CHECK (
  owner_user_id = auth.uid() 
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'ops'::app_role)
  )
);

CREATE POLICY "Admins e ops podem gerenciar envios"
ON shipments
FOR ALL
TO authenticated
USING (
  owner_user_id = auth.uid() 
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'ops'::app_role)
  )
);

-- ========================================
-- TABELA: orders
-- ========================================

DROP POLICY IF EXISTS "Admins e ops podem gerenciar próprios pedidos" ON orders;

CREATE POLICY "Admins e ops podem inserir pedidos"
ON orders
FOR INSERT
TO authenticated
WITH CHECK (
  owner_user_id = auth.uid() 
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'ops'::app_role)
  )
);

CREATE POLICY "Admins e ops podem gerenciar pedidos"
ON orders
FOR ALL
TO authenticated
USING (
  owner_user_id = auth.uid() 
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'ops'::app_role)
  )
);