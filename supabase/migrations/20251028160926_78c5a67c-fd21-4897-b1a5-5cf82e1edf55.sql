-- Corrigir políticas RLS da tabela shipments_cache para proteger contra acesso não autorizado

-- Remover política atual que pode permitir acesso amplo
DROP POLICY IF EXISTS "Admins e ops podem ver cache" ON shipments_cache;
DROP POLICY IF EXISTS "Admins e ops podem gerenciar cache" ON shipments_cache;
DROP POLICY IF EXISTS "Admins e ops podem inserir cache" ON shipments_cache;
DROP POLICY IF EXISTS "Usuários podem ver próprio cache" ON shipments_cache;

-- Política DENY explícita por padrão (segurança adicional)
CREATE POLICY "Deny default access to shipments cache"
  ON shipments_cache
  FOR SELECT
  USING (false);

-- Permitir admin/ops gerenciar todo o cache do próprio tenant
CREATE POLICY "Admins e ops podem gerenciar próprio cache"
  ON shipments_cache
  FOR ALL
  USING (
    owner_user_id = auth.uid() 
    AND (
      has_role(auth.uid(), 'admin'::app_role) 
      OR has_role(auth.uid(), 'ops'::app_role)
    )
  )
  WITH CHECK (
    owner_user_id = auth.uid()
    AND (
      has_role(auth.uid(), 'admin'::app_role) 
      OR has_role(auth.uid(), 'ops'::app_role)
    )
  );

-- Permitir motoristas verem APENAS shipments atribuídos a eles
CREATE POLICY "Motoristas veem apenas shipments atribuídos"
  ON shipments_cache
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 
      FROM driver_assignments da
      JOIN drivers d ON da.driver_id = d.id
      WHERE da.shipment_id = shipments_cache.shipment_id
        AND d.user_id = auth.uid()
        AND da.returned_at IS NULL
    )
  );

-- Comentário explicativo sobre privacidade
COMMENT ON TABLE shipments_cache IS 'Cache de shipments do Mercado Livre. Contém dados sensíveis (endereços, telefones) em raw_data. Acesso restrito a admin/ops do tenant e motoristas com assignments ativos.';