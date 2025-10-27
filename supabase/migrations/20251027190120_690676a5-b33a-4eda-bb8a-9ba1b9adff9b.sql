-- FASE 1: Estrutura de Transportadoras e Alertas

-- Criar tabela de transportadoras
CREATE TABLE IF NOT EXISTS public.carriers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  contact_name text,
  phone text,
  email text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS para carriers
ALTER TABLE public.carriers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver próprias transportadoras"
  ON public.carriers FOR SELECT
  USING (owner_user_id = auth.uid());

CREATE POLICY "Admins e ops podem gerenciar próprias transportadoras"
  ON public.carriers FOR ALL
  USING (
    owner_user_id = auth.uid() AND 
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'ops'))
  );

-- Adicionar carrier_id aos motoristas
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS carrier_id uuid REFERENCES public.carriers(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_drivers_carrier ON public.drivers(carrier_id);

-- Criar tabela de alertas
CREATE TABLE IF NOT EXISTS public.shipment_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ml_account_id uuid REFERENCES public.ml_accounts(id) ON DELETE SET NULL,
  shipment_id text NOT NULL,
  driver_id uuid REFERENCES public.drivers(id) ON DELETE SET NULL,
  carrier_id uuid REFERENCES public.carriers(id) ON DELETE SET NULL,
  alert_type text NOT NULL,
  status text DEFAULT 'pending',
  detected_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- RLS para alertas
ALTER TABLE public.shipment_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver próprios alertas"
  ON public.shipment_alerts FOR SELECT
  USING (owner_user_id = auth.uid());

CREATE POLICY "Admins e ops podem gerenciar próprios alertas"
  ON public.shipment_alerts FOR ALL
  USING (
    owner_user_id = auth.uid() AND 
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'ops'))
  );

CREATE INDEX IF NOT EXISTS idx_alerts_pending ON public.shipment_alerts(owner_user_id, status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_alerts_shipment ON public.shipment_alerts(shipment_id);

-- FASE 4: Tabela de logs de handshakes (transferências entre entregadores)
CREATE TABLE IF NOT EXISTS public.flex_handshake_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ml_account_id uuid REFERENCES public.ml_accounts(id) ON DELETE SET NULL,
  shipment_id text NOT NULL,
  from_driver text,
  to_driver text,
  handshake_time timestamptz,
  raw_data jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.flex_handshake_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver próprios handshake logs"
  ON public.flex_handshake_logs FOR SELECT
  USING (owner_user_id = auth.uid());

CREATE POLICY "Sistema pode inserir handshake logs"
  ON public.flex_handshake_logs FOR INSERT
  WITH CHECK (owner_user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_handshake_shipment ON public.flex_handshake_logs(shipment_id);

-- Trigger para atualizar updated_at em carriers
CREATE TRIGGER update_carriers_updated_at
  BEFORE UPDATE ON public.carriers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();