
# Plano: Sistema de Credenciais de Motorista pelo Admin

## Objetivo
Permitir que o admin crie email e senha diretamente para o motorista, de forma simples e prática.

---

## Fluxo Simplificado

```text
Admin na tela /motoristas
        |
        v
Clica "Criar Acesso" no motorista desejado
        |
        v
Preenche email e senha do motorista
        |
        v
Sistema cria usuário no auth.users
Sistema vincula drivers.user_id
Sistema adiciona role 'driver'
        |
        v
Admin passa credenciais ao motorista (WhatsApp)
        |
        v
Motorista faz login em /motorista/login
```

---

## Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `supabase/functions/create-driver-credentials/index.ts` | Criar | Cria usuário e vincula ao motorista |
| `src/components/CreateDriverCredentialsDialog.tsx` | Criar | Dialog para inserir email/senha |
| `src/pages/Motoristas.tsx` | Modificar | Adicionar botão e integrar dialog |

---

## Detalhes Técnicos

### 1. Edge Function: `create-driver-credentials`

**Responsabilidades:**
- Receber `driver_id`, `email`, `password`
- Criar usuário em `auth.users` usando `supabase.auth.admin.createUser()`
- Inserir role `driver` em `user_roles`
- Atualizar `drivers` com `user_id` e `email`
- Retornar sucesso

**Segurança:**
- Usa `SUPABASE_SERVICE_ROLE_KEY` (apenas no backend)
- Verifica se chamador é admin/ops
- Email confirmado automaticamente (sem verificação por email)

```typescript
// Pseudocódigo da Edge Function
const { driver_id, email, password } = body;

// 1. Criar usuário
const { data: authUser } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true  // Já confirma, não precisa verificar email
});

// 2. Adicionar role 'driver'
await supabase.from('user_roles').insert({
  user_id: authUser.user.id,
  role: 'driver'
});

// 3. Vincular ao motorista
await supabase.from('drivers').update({
  user_id: authUser.user.id,
  email: email
}).eq('id', driver_id);
```

### 2. Componente: `CreateDriverCredentialsDialog`

**Campos:**
- Email (obrigatório)
- Senha (obrigatório, mínimo 6 caracteres)
- Confirmar senha

**Validações:**
- Email válido
- Senha com pelo menos 6 caracteres
- Senhas coincidem

**Após sucesso:**
- Mostra mensagem de confirmação
- Opção de copiar credenciais para compartilhar

### 3. Atualização da Tela de Motoristas

**Nova coluna na tabela:** Acesso Portal

**Estados possíveis:**
- **Sem acesso**: Mostra botão "Criar Acesso"
- **Com acesso**: Mostra badge "Portal ✓" + email

**Interface:**
```text
+------------------------------------------+
| Nome   | Telefone | Portal      | Ações  |
|--------|----------|-------------|--------|
| João   | 81...    | [Criar Acesso] | ... |
| Maria  | 82...    | m@x.com ✓   | ...    |
+------------------------------------------+
```

---

## Fluxo de Uso

1. **Admin cadastra motorista** (nome, telefone)
2. **Admin clica "Criar Acesso"**
3. **Preenche email e senha**
4. **Sistema cria credenciais**
5. **Admin envia por WhatsApp:**
   - "Acesse: rastreioflex.lovable.app/motorista/login"
   - "Email: joao@email.com"
   - "Senha: senha123"
6. **Motorista faz login** e vê seus pacotes

---

## Configuração Necessária

### supabase/config.toml
```toml
[functions.create-driver-credentials]
verify_jwt = false
```

---

## Validações de Segurança

1. **Senha mínima**: 6 caracteres
2. **Email único**: Verifica se email já existe
3. **Motorista único**: Verifica se motorista já tem acesso
4. **Apenas admin/ops**: Verifica role do chamador
5. **Service Role Key**: Nunca exposta ao frontend

---

## Resumo da Implementação

**Fase 1:** Criar Edge Function `create-driver-credentials`
**Fase 2:** Criar componente `CreateDriverCredentialsDialog`
**Fase 3:** Integrar na página `Motoristas.tsx`

O admin poderá criar credenciais com 3 cliques: Criar Acesso -> Preencher email/senha -> Confirmar.
