-- Remover conta THDISTRIBUIDOR e suas referências

-- 1. Primeiro, remover referências em shipments_cache
DELETE FROM shipments_cache 
WHERE ml_account_id = '8cc264e0-5fd9-497a-974d-d1544e55429f';

-- 2. Remover referências em driver_assignments
UPDATE driver_assignments 
SET ml_account_id = NULL 
WHERE ml_account_id = '8cc264e0-5fd9-497a-974d-d1544e55429f';

-- 3. Remover referências em scan_logs
UPDATE scan_logs 
SET ml_account_id = NULL 
WHERE ml_account_id = '8cc264e0-5fd9-497a-974d-d1544e55429f';

-- 4. Remover referências em shipment_alerts
UPDATE shipment_alerts 
SET ml_account_id = NULL 
WHERE ml_account_id = '8cc264e0-5fd9-497a-974d-d1544e55429f';

-- 5. Remover referências em flex_handshake_logs
UPDATE flex_handshake_logs 
SET ml_account_id = NULL 
WHERE ml_account_id = '8cc264e0-5fd9-497a-974d-d1544e55429f';

-- 6. Finalmente, deletar a conta ML
DELETE FROM ml_accounts 
WHERE id = '8cc264e0-5fd9-497a-974d-d1544e55429f';