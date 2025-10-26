-- Tabela para armazenar tokens OAuth do Mercado Livre
CREATE TABLE IF NOT EXISTS public.ml_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id TEXT NOT NULL,
  user_id BIGINT NOT NULL,
  seller_nickname TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(site_id, user_id)
);

-- Tabela de vinculações motorista → shipment
CREATE TABLE IF NOT EXISTS public.driver_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  shipment_id TEXT NOT NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  returned_at TIMESTAMPTZ NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela cache de shipments (status ML)
CREATE TABLE IF NOT EXISTS public.shipments_cache (
  shipment_id TEXT PRIMARY KEY,
  order_id TEXT,
  pack_id TEXT,
  status TEXT NOT NULL,
  substatus TEXT,
  tracking_number TEXT,
  last_ml_update TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_driver_assignments_driver ON public.driver_assignments(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_assignments_shipment ON public.driver_assignments(shipment_id);
CREATE INDEX IF NOT EXISTS idx_driver_assignments_returned ON public.driver_assignments(returned_at) WHERE returned_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_shipments_cache_status ON public.shipments_cache(status);
CREATE INDEX IF NOT EXISTS idx_shipments_cache_update ON public.shipments_cache(last_ml_update);

-- Habilitar RLS
ALTER TABLE public.ml_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments_cache ENABLE ROW LEVEL SECURITY;

-- Policies para ml_tokens
CREATE POLICY "Apenas admins podem gerenciar tokens ML"
  ON public.ml_tokens FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Policies para driver_assignments
CREATE POLICY "Ops e admins podem ver assignments"
  ON public.driver_assignments FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'ops')
  );

CREATE POLICY "Ops e admins podem criar assignments"
  ON public.driver_assignments FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'ops')
  );

CREATE POLICY "Ops e admins podem atualizar assignments"
  ON public.driver_assignments FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'ops')
  );

-- Policies para shipments_cache
CREATE POLICY "Usuários autenticados podem ver cache"
  ON public.shipments_cache FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Ops e admins podem gerenciar cache"
  ON public.shipments_cache FOR ALL
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'ops')
  );

-- Trigger para atualizar updated_at em ml_tokens
CREATE TRIGGER update_ml_tokens_updated_at
  BEFORE UPDATE ON public.ml_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();