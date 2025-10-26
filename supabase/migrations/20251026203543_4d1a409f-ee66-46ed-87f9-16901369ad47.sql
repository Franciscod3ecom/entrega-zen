-- Corrigir search_path em funções para segurança
-- A função get_user_tenant_ids já tem search_path definido, mas vamos garantir

-- Recriar a função assign_first_admin com search_path explícito
CREATE OR REPLACE FUNCTION public.assign_first_admin()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  first_user_id uuid;
  admin_exists boolean;
BEGIN
  -- Verificar se já existe algum admin
  SELECT EXISTS (
    SELECT 1 FROM user_roles WHERE role = 'admin'
  ) INTO admin_exists;

  -- Se não existe admin, pegar o primeiro usuário e torná-lo admin
  IF NOT admin_exists THEN
    SELECT id INTO first_user_id
    FROM auth.users
    ORDER BY created_at ASC
    LIMIT 1;

    IF first_user_id IS NOT NULL THEN
      INSERT INTO user_roles (user_id, role)
      VALUES (first_user_id, 'admin')
      ON CONFLICT (user_id, role) DO NOTHING;
      
      RAISE NOTICE 'Admin role atribuída ao usuário: %', first_user_id;
    END IF;
  END IF;
END;
$function$;