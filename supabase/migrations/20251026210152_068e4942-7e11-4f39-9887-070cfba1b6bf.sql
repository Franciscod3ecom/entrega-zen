-- Corrigir search_path da função de limite
CREATE OR REPLACE FUNCTION check_ml_account_limit()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT COUNT(*) FROM ml_accounts WHERE owner_user_id = NEW.owner_user_id) >= 5 THEN
    RAISE EXCEPTION 'Limite de 5 contas do Mercado Livre por usuário atingido';
  END IF;
  RETURN NEW;
END;
$$;