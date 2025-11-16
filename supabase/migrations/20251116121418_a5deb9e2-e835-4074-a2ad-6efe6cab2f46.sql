-- Adicionar constraint única para permitir upsert correto em shipments_cache
-- Isso resolve o erro "there is no unique or exclusion constraint matching the ON CONFLICT specification"
ALTER TABLE public.shipments_cache
ADD CONSTRAINT shipments_cache_shipment_id_owner_user_id_key 
UNIQUE (shipment_id, owner_user_id);

-- Criar índice para melhorar performance de queries
CREATE INDEX IF NOT EXISTS idx_shipments_cache_owner_ml_account 
ON public.shipments_cache(owner_user_id, ml_account_id);