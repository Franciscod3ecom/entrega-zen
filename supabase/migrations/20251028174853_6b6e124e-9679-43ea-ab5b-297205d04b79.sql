-- Corrigir tipo da coluna ml_user_id de numeric para bigint
-- Isso evita notação científica e problemas de comparação de tipos
ALTER TABLE ml_accounts 
ALTER COLUMN ml_user_id TYPE bigint USING ml_user_id::bigint;

-- Criar índice para melhorar performance de busca por ml_user_id
CREATE INDEX IF NOT EXISTS idx_ml_accounts_ml_user_id ON ml_accounts(ml_user_id);