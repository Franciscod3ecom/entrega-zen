-- Corrigir políticas RLS da tabela drivers para permitir ops inserir motoristas
DROP POLICY IF EXISTS "Admins podem gerenciar motoristas" ON drivers;

-- Admins podem fazer tudo
CREATE POLICY "Admins podem gerenciar motoristas"
  ON drivers FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Ops podem inserir e atualizar motoristas (mas não deletar)
CREATE POLICY "Ops podem criar motoristas"
  ON drivers FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'ops'));

CREATE POLICY "Ops podem atualizar motoristas"
  ON drivers FOR UPDATE
  USING (has_role(auth.uid(), 'ops'))
  WITH CHECK (has_role(auth.uid(), 'ops'));

-- Criar função helper para atribuir role ao primeiro usuário (se não existir nenhum admin)
CREATE OR REPLACE FUNCTION assign_first_admin()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Executar a função para atribuir admin ao primeiro usuário
SELECT assign_first_admin();