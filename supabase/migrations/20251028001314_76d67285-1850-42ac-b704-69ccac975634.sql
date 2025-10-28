-- Adicionar constraint UNIQUE em ml_accounts para permitir UPSERT correto
-- Isso garante que cada usuário pode ter apenas uma conta ML por ml_user_id
ALTER TABLE public.ml_accounts 
ADD CONSTRAINT ml_accounts_owner_ml_unique 
UNIQUE (owner_user_id, ml_user_id);

-- Adicionar constraint UNIQUE em shipment_alerts para UPSERT de alertas
-- Evita alertas duplicados para o mesmo shipment/tipo/usuário
ALTER TABLE public.shipment_alerts 
ADD CONSTRAINT shipment_alerts_unique_alert 
UNIQUE (owner_user_id, shipment_id, alert_type);