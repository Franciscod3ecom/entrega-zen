-- 1) Criar tabela de tenants (workspaces/empresas)
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2) Criar tabela de memberships (usuários ↔ tenants)
CREATE TABLE public.memberships (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, tenant_id)
);

-- 3) Criar nova tabela ml_accounts (substitui ml_tokens com tenant_id)
CREATE TABLE public.ml_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  ml_user_id BIGINT NOT NULL,
  nickname TEXT,
  site_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, ml_user_id)
);

-- 4) Adicionar tenant_id em tabelas existentes
ALTER TABLE public.drivers ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.driver_assignments ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.shipments_cache ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.orders ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.shipments ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.scan_logs ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- 5) Migrar dados existentes de ml_tokens para ml_accounts (se houver)
-- Criar um tenant default para dados existentes
INSERT INTO public.tenants (id, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'Tenant Padrão')
ON CONFLICT DO NOTHING;

-- Migrar tokens existentes para ml_accounts com tenant default
INSERT INTO public.ml_accounts (tenant_id, ml_user_id, nickname, site_id, access_token, refresh_token, expires_at)
SELECT 
  '00000000-0000-0000-0000-000000000001'::uuid,
  user_id,
  seller_nickname,
  site_id,
  access_token,
  refresh_token,
  expires_at
FROM public.ml_tokens
ON CONFLICT (tenant_id, ml_user_id) DO NOTHING;

-- Atribuir todos os dados existentes ao tenant default
UPDATE public.drivers SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE public.driver_assignments SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE public.shipments_cache SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE public.orders SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE public.shipments SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE public.scan_logs SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;

-- Atribuir primeiro admin ao tenant default
INSERT INTO public.memberships (user_id, tenant_id, role)
SELECT id, '00000000-0000-0000-0000-000000000001'::uuid, 'admin'
FROM auth.users
WHERE EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.users.id AND role = 'admin')
ON CONFLICT DO NOTHING;

-- 6) Tornar tenant_id obrigatório após migração
ALTER TABLE public.drivers ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.driver_assignments ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.shipments_cache ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.orders ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.shipments ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.scan_logs ALTER COLUMN tenant_id SET NOT NULL;

-- 7) Função auxiliar para obter tenants do usuário
CREATE OR REPLACE FUNCTION public.get_user_tenant_ids(_user_id UUID)
RETURNS TABLE(tenant_id UUID)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.memberships WHERE user_id = _user_id
$$;

-- 8) Enable RLS em novas tabelas
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_accounts ENABLE ROW LEVEL SECURITY;

-- 9) RLS Policies para tenants
CREATE POLICY "Usuários podem ver próprios tenants"
  ON public.tenants FOR SELECT
  USING (id IN (SELECT get_user_tenant_ids(auth.uid())));

CREATE POLICY "Admins podem criar tenants"
  ON public.tenants FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- 10) RLS Policies para memberships
CREATE POLICY "Usuários podem ver próprias memberships"
  ON public.memberships FOR SELECT
  USING (user_id = auth.uid() OR tenant_id IN (SELECT get_user_tenant_ids(auth.uid())));

CREATE POLICY "Admins podem gerenciar memberships"
  ON public.memberships FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- 11) RLS Policies para ml_accounts
CREATE POLICY "Usuários podem ver contas ML do tenant"
  ON public.ml_accounts FOR SELECT
  USING (tenant_id IN (SELECT get_user_tenant_ids(auth.uid())));

CREATE POLICY "Admins e ops podem gerenciar contas ML do tenant"
  ON public.ml_accounts FOR ALL
  USING (
    tenant_id IN (SELECT get_user_tenant_ids(auth.uid())) 
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'ops'))
  );

-- 12) Atualizar RLS policies existentes para incluir tenant_id
DROP POLICY IF EXISTS "Admins e ops podem ver motoristas" ON public.drivers;
DROP POLICY IF EXISTS "Admins podem gerenciar motoristas" ON public.drivers;
DROP POLICY IF EXISTS "Ops podem criar motoristas" ON public.drivers;
DROP POLICY IF EXISTS "Ops podem atualizar motoristas" ON public.drivers;

CREATE POLICY "Usuários podem ver motoristas do tenant"
  ON public.drivers FOR SELECT
  USING (tenant_id IN (SELECT get_user_tenant_ids(auth.uid())));

CREATE POLICY "Admins e ops podem gerenciar motoristas do tenant"
  ON public.drivers FOR ALL
  USING (
    tenant_id IN (SELECT get_user_tenant_ids(auth.uid()))
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'ops'))
  );

-- Shipments cache
DROP POLICY IF EXISTS "Ops e admins podem gerenciar cache" ON public.shipments_cache;
DROP POLICY IF EXISTS "Usuários autenticados podem ver cache" ON public.shipments_cache;

CREATE POLICY "Usuários podem ver cache do tenant"
  ON public.shipments_cache FOR SELECT
  USING (tenant_id IN (SELECT get_user_tenant_ids(auth.uid())));

CREATE POLICY "Admins e ops podem gerenciar cache do tenant"
  ON public.shipments_cache FOR ALL
  USING (
    tenant_id IN (SELECT get_user_tenant_ids(auth.uid()))
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'ops'))
  );

-- Orders
DROP POLICY IF EXISTS "Admins podem gerenciar pedidos" ON public.orders;
DROP POLICY IF EXISTS "Usuários autenticados podem ver pedidos" ON public.orders;

CREATE POLICY "Usuários podem ver pedidos do tenant"
  ON public.orders FOR SELECT
  USING (tenant_id IN (SELECT get_user_tenant_ids(auth.uid())));

CREATE POLICY "Admins e ops podem gerenciar pedidos do tenant"
  ON public.orders FOR ALL
  USING (
    tenant_id IN (SELECT get_user_tenant_ids(auth.uid()))
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'ops'))
  );

-- Shipments
DROP POLICY IF EXISTS "Admins e ops podem gerenciar envios" ON public.shipments;
DROP POLICY IF EXISTS "Usuários autenticados podem ver envios" ON public.shipments;

CREATE POLICY "Usuários podem ver envios do tenant"
  ON public.shipments FOR SELECT
  USING (tenant_id IN (SELECT get_user_tenant_ids(auth.uid())));

CREATE POLICY "Admins e ops podem gerenciar envios do tenant"
  ON public.shipments FOR ALL
  USING (
    tenant_id IN (SELECT get_user_tenant_ids(auth.uid()))
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'ops'))
  );

-- Driver assignments
DROP POLICY IF EXISTS "Ops e admins podem ver assignments" ON public.driver_assignments;
DROP POLICY IF EXISTS "Ops e admins podem criar assignments" ON public.driver_assignments;
DROP POLICY IF EXISTS "Ops e admins podem atualizar assignments" ON public.driver_assignments;

CREATE POLICY "Usuários podem ver assignments do tenant"
  ON public.driver_assignments FOR SELECT
  USING (tenant_id IN (SELECT get_user_tenant_ids(auth.uid())));

CREATE POLICY "Ops e admins podem gerenciar assignments do tenant"
  ON public.driver_assignments FOR ALL
  USING (
    tenant_id IN (SELECT get_user_tenant_ids(auth.uid()))
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'ops'))
  );

-- Scan logs
DROP POLICY IF EXISTS "Ops e admins podem ver scan logs" ON public.scan_logs;
DROP POLICY IF EXISTS "Ops e admins podem inserir scan logs" ON public.scan_logs;

CREATE POLICY "Usuários podem ver scan logs do tenant"
  ON public.scan_logs FOR SELECT
  USING (tenant_id IN (SELECT get_user_tenant_ids(auth.uid())));

CREATE POLICY "Ops e admins podem inserir scan logs do tenant"
  ON public.scan_logs FOR INSERT
  WITH CHECK (
    tenant_id IN (SELECT get_user_tenant_ids(auth.uid()))
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'ops'))
  );

-- 13) Triggers para updated_at
CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ml_accounts_updated_at
  BEFORE UPDATE ON public.ml_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 14) Índices para performance
CREATE INDEX idx_memberships_user_id ON public.memberships(user_id);
CREATE INDEX idx_memberships_tenant_id ON public.memberships(tenant_id);
CREATE INDEX idx_ml_accounts_tenant_id ON public.ml_accounts(tenant_id);
CREATE INDEX idx_ml_accounts_ml_user_id ON public.ml_accounts(ml_user_id);
CREATE INDEX idx_drivers_tenant_id ON public.drivers(tenant_id);
CREATE INDEX idx_shipments_cache_tenant_id ON public.shipments_cache(tenant_id);
CREATE INDEX idx_orders_tenant_id ON public.orders(tenant_id);
CREATE INDEX idx_shipments_tenant_id ON public.shipments(tenant_id);