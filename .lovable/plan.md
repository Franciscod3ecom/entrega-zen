
## Objetivo (o que vai mudar)
Fazer a bipagem/sincronização funcionar para **usuário motorista sem conta Mercado Livre**, usando automaticamente as **contas ML do dono da operação (admin)** — e garantindo que o pacote bipado apareça depois no **Rastreamento / Operações Unificadas** com filtro por motorista.

---

## Diagnóstico (causa raiz confirmada no código)
Hoje a função de backend usada na bipagem é a:

- `supabase/functions/scan-bind-auto/index.ts`

Ela faz isso:

1) Lê o usuário logado pelo JWT:
- `owner_user_id = user.id` (linha 35)

2) Busca contas ML por esse `owner_user_id`:
- `.from('ml_accounts').eq('owner_user_id', owner_user_id)` (linhas 58–63)

Problema:
- Quando quem está logado é **motorista**, `user.id` é o **id do usuário motorista**, não o id do **dono da operação**.
- Logo a função não encontra contas ML (mesmo que a operação tenha 5 contas), dá erro “Nenhuma conta ML configurada”.
- E pior: ela também grava `shipments_cache` e `driver_assignments` com `owner_user_id` errado, então o admin não enxerga esses vínculos (e o filtro por motorista fica “vazio”/sem bater).

Isso explica exatamente o seu cenário (LXT): motorista bipou, mas a sincronização/vinculação e o “ver depois” falham porque o “dono” usado está errado.

---

## Solução (como vai funcionar depois)
### Regra nova para o `scan-bind-auto`
- Se o usuário logado for **driver**:
  - descobrir o `owner_user_id` correto através do **cadastro do motorista** (tabela `drivers`)
  - usar esse `owner_user_id` para:
    - buscar contas ML
    - gravar `shipments_cache`, `driver_assignments` e `scan_logs`
- Se o usuário logado não for driver (admin/ops):
  - continua usando `owner_user_id = user.id` como hoje

Além disso, quando for motorista logado, vamos **validar segurança**:
- o `driver_id` enviado no body precisa ser o mesmo motorista vinculado ao usuário (evita um motorista “bipar para outro motorista” passando id manual).

---

## Mudanças planejadas (arquivos)
### 1) Ajustar backend `scan-bind-auto` (principal)
**Arquivo:** `supabase/functions/scan-bind-auto/index.ts`

Implementar a lógica:

1. Identificar usuário logado (mantém como está, via `supabase.auth.getUser(token)`).
2. Checar se o usuário tem role `driver` (consulta em `user_roles`):
   - `select role where user_id = user.id and role = 'driver'`
3. Se for driver:
   - buscar o registro do motorista pelo `driver_id` do request:
     - `drivers.select('id,user_id,owner_user_id,active').eq('id', driver_id).maybeSingle()`
   - validar:
     - `active === true`
     - `driver.user_id === user.id`
   - definir `operation_owner_user_id = driver.owner_user_id`
4. Se não for driver:
   - `operation_owner_user_id = user.id`
5. Trocar todas as ocorrências que hoje usam `owner_user_id` para usar `operation_owner_user_id`:
   - busca em `ml_accounts`
   - upsert em `shipments_cache`
   - leitura/escrita em `driver_assignments`
   - insert em `scan_logs`

Resultado prático:
- motorista vai conseguir usar as contas ML do admin
- o vínculo vai cair no “escopo” certo e aparecer no rastreamento do admin, inclusive com `driver_id` para o filtro

### 2) Melhorar mensagem de erro no app (apenas UX)
**Arquivo:** `src/hooks/useBatchScanner.ts`

Hoje a mensagem é:
- “Configure uma conta do Mercado Livre primeiro”

Isso confunde o motorista (porque ele não deve configurar conta ML). Vamos ajustar para algo do tipo:
- “A operação não tem conta do Mercado Livre conectada. Peça ao administrador para conectar em Config ML.”

(Continuamos detectando pelo texto “Nenhuma conta ML configurada” que vem do backend.)

---

## Como vamos validar (passo a passo, fim-a-fim)
1) Logar como admin da operação que tem contas ML conectadas.
2) Criar/confirmar um motorista com usuário vinculado (login motorista funcionando).
3) Logar no app motorista e bipar 2–3 etiquetas:
   - deve retornar `success: true` no `scan-bind-auto`
   - deve gravar `driver_assignments` com `owner_user_id` do admin
4) Ir em **Operações Unificadas** (admin) e filtrar pelo motorista:
   - os pacotes bipados devem aparecer.
5) Teste de segurança:
   - tentar forçar outro `driver_id` (se houver forma) deve falhar com erro de autorização.

---

## Observações importantes (para evitar regressões)
- Não vamos exigir conta ML no usuário motorista (isso é o que estamos corrigindo).
- A correção precisa ser no backend porque o app não deve carregar tokens/contas ML no cliente.
- Essa mudança também corrige a causa de “não aparece no filtro” porque o join da view `v_rastreamento_completo` depende do `owner_user_id` consistente entre `shipments_cache` e `driver_assignments`.

---

## Entregáveis
- `scan-bind-auto` passa a funcionar para motorista usando as contas da operação
- registros ficam visíveis para o admin no rastreamento e filtro por motorista
- mensagem de erro no app deixa de instruir o motorista a configurar ML

