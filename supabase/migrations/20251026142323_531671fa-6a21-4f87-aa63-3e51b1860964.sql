-- Criação do tipo de role para usuários
CREATE TYPE public.app_role AS ENUM ('admin', 'ops', 'driver');

-- Tabela de perfis de usuário
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de roles dos usuários
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Função para verificar role do usuário (security definer)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Tabela de motoristas
CREATE TABLE public.drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES public.profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de pedidos do Mercado Livre
CREATE TABLE public.orders (
  order_id BIGINT PRIMARY KEY,
  pack_id BIGINT,
  buyer_id BIGINT,
  total DECIMAL(10, 2),
  created_at TIMESTAMPTZ NOT NULL,
  status TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de envios (shipments)
CREATE TABLE public.shipments (
  shipment_id BIGINT PRIMARY KEY,
  order_id BIGINT REFERENCES public.orders(order_id) ON DELETE SET NULL,
  status TEXT NOT NULL,
  substatus TEXT,
  tracking_number TEXT,
  last_update TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de eventos de shipment (histórico)
CREATE TABLE public.shipment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id BIGINT NOT NULL REFERENCES public.shipments(shipment_id) ON DELETE CASCADE,
  event_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL,
  substatus TEXT,
  payload_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de carregamentos (loads) dos motoristas
CREATE TABLE public.driver_loads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  load_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de itens do carregamento
CREATE TABLE public.driver_load_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  load_id UUID NOT NULL REFERENCES public.driver_loads(id) ON DELETE CASCADE,
  shipment_id BIGINT NOT NULL REFERENCES public.shipments(shipment_id) ON DELETE CASCADE,
  picked_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  returned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(load_id, shipment_id)
);

-- Tabela de tentativas de entrega
CREATE TABLE public.delivery_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id BIGINT NOT NULL REFERENCES public.shipments(shipment_id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  attempt_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de reconciliação diária
CREATE TABLE public.reconciliation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reconciliation_date DATE NOT NULL,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  pending_count INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(reconciliation_date, driver_id)
);

-- RLS Policies para profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver próprio perfil"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins podem ver todos perfis"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Usuários podem atualizar próprio perfil"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- RLS Policies para user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver próprias roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins podem gerenciar roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies para drivers
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins e ops podem ver motoristas"
  ON public.drivers FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'ops')
  );

CREATE POLICY "Motoristas podem ver próprio perfil"
  ON public.drivers FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins podem gerenciar motoristas"
  ON public.drivers FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies para orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem ver pedidos"
  ON public.orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins podem gerenciar pedidos"
  ON public.orders FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies para shipments
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem ver envios"
  ON public.shipments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins e ops podem gerenciar envios"
  ON public.shipments FOR ALL
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'ops')
  );

-- RLS Policies para shipment_events
ALTER TABLE public.shipment_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem ver eventos"
  ON public.shipment_events FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Sistema pode inserir eventos"
  ON public.shipment_events FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies para driver_loads
ALTER TABLE public.driver_loads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins e ops podem ver carregamentos"
  ON public.driver_loads FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'ops')
  );

CREATE POLICY "Motoristas podem ver próprios carregamentos"
  ON public.driver_loads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.drivers 
      WHERE id = driver_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins podem gerenciar carregamentos"
  ON public.driver_loads FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies para driver_load_items
ALTER TABLE public.driver_load_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver itens de carregamento"
  ON public.driver_load_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Motoristas podem atualizar próprios itens"
  ON public.driver_load_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.driver_loads dl
      JOIN public.drivers d ON d.id = dl.driver_id
      WHERE dl.id = load_id AND d.user_id = auth.uid()
    )
  );

-- RLS Policies para delivery_attempts
ALTER TABLE public.delivery_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem ver tentativas"
  ON public.delivery_attempts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Motoristas podem registrar tentativas"
  ON public.delivery_attempts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.drivers 
      WHERE id = driver_id AND user_id = auth.uid()
    )
  );

-- RLS Policies para reconciliation
ALTER TABLE public.reconciliation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins e ops podem ver reconciliações"
  ON public.reconciliation FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'ops')
  );

CREATE POLICY "Sistema pode criar reconciliações"
  ON public.reconciliation FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'ops')
  );

-- Trigger para criar perfil ao registrar usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Usuário'),
    NEW.raw_user_meta_data->>'phone'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_drivers_updated_at
  BEFORE UPDATE ON public.drivers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_driver_loads_updated_at
  BEFORE UPDATE ON public.driver_loads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_shipments_status ON public.shipments(status);
CREATE INDEX idx_shipments_order_id ON public.shipments(order_id);
CREATE INDEX idx_shipment_events_shipment_id ON public.shipment_events(shipment_id);
CREATE INDEX idx_driver_loads_driver_id ON public.driver_loads(driver_id);
CREATE INDEX idx_driver_loads_date ON public.driver_loads(load_date);
CREATE INDEX idx_driver_load_items_load_id ON public.driver_load_items(load_id);
CREATE INDEX idx_driver_load_items_shipment_id ON public.driver_load_items(shipment_id);