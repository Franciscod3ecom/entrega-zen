-- Adicionar ml_account_id nas tabelas de negócio
ALTER TABLE shipments_cache ADD COLUMN ml_account_id UUID REFERENCES ml_accounts(id);
ALTER TABLE driver_assignments ADD COLUMN ml_account_id UUID REFERENCES ml_accounts(id);
ALTER TABLE scan_logs ADD COLUMN ml_account_id UUID REFERENCES ml_accounts(id);

-- Adicionar owner_user_id para controle de limite por usuário
ALTER TABLE ml_accounts ADD COLUMN owner_user_id UUID REFERENCES auth.users(id);

-- Atualizar dados existentes (vincular ao primeiro usuário do tenant)
UPDATE ml_accounts SET owner_user_id = (
  SELECT user_id FROM memberships WHERE tenant_id = ml_accounts.tenant_id LIMIT 1
);

-- Índices para performance
CREATE INDEX idx_shipments_cache_account ON shipments_cache(tenant_id, ml_account_id, shipment_id);
CREATE INDEX idx_driver_assignments_account ON driver_assignments(tenant_id, ml_account_id);
CREATE INDEX idx_scan_logs_account ON scan_logs(tenant_id, ml_account_id);
CREATE INDEX idx_ml_accounts_owner ON ml_accounts(owner_user_id);

-- Trigger para limitar 5 contas por usuário
CREATE OR REPLACE FUNCTION check_ml_account_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM ml_accounts WHERE owner_user_id = NEW.owner_user_id) >= 5 THEN
    RAISE EXCEPTION 'Limite de 5 contas do Mercado Livre por usuário atingido';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_ml_account_limit
BEFORE INSERT ON ml_accounts
FOR EACH ROW
EXECUTE FUNCTION check_ml_account_limit();