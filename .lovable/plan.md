
# Plano: Implementar Melhorias RASTREIO_FLEX

## Resumo das Melhorias

| # | Melhoria | Complexidade | Impacto |
|---|----------|--------------|---------|
| 1 | Corrigir botão data personalizada | Baixa | Alto |
| 2 | PWA para instalação mobile | Média | Alto |
| 3 | Portal do Motorista | Alta | Alto |
| 4 | Sincronização automática order_id | Média | Médio |

---

## 1. Corrigir Botão de Data Personalizada

**Problema identificado:** O componente `DateRangeFilter` renderiza o `Popover` condicionalmente junto com seu `PopoverTrigger`, causando conflito na abertura do calendário.

**Solucao:**

```text
Antes (Linha 115-153):
+-- showCustom && (
|   +-- Popover open={showCustom}
|       +-- PopoverTrigger  ← PROBLEMA: trigger dentro do condicional
|       +-- PopoverContent

Depois:
+-- Popover open={showCustom}
|   +-- PopoverTrigger (sempre presente, mas invisível quando !showCustom)
|   +-- PopoverContent
```

**Arquivos a modificar:**
- `src/components/DateRangeFilter.tsx`

---

## 2. PWA para Instalacao Mobile

**Objetivo:** Permitir que usuarios instalem o app no celular (Android/iOS) como um aplicativo nativo.

**Componentes necessarios:**

1. **Dependencia:** `vite-plugin-pwa`
2. **Manifest:** Configuracao com icones, cores e nome do app
3. **Meta tags:** Tags para iOS e Android no `index.html`
4. **Pagina de instalacao:** `/instalar` com instrucoes e botao de instalacao
5. **Icones:** Gerar icones em multiplos tamanhos (192x192, 512x512)

**Arquivos a criar/modificar:**
- `vite.config.ts` - Adicionar plugin PWA
- `index.html` - Meta tags para PWA
- `src/pages/Instalar.tsx` - Pagina de instalacao
- `public/manifest.json` - Manifest do PWA
- `public/pwa-icons/` - Icones do app

**Fluxo de instalacao:**

```text
Usuario abre /instalar
        |
        v
Detecta plataforma (iOS/Android/Desktop)
        |
        v
+-- iOS: Mostra instrucoes "Compartilhar > Add to Home Screen"
+-- Android: Mostra botao "Instalar App" (usa beforeinstallprompt)
+-- Desktop: Mostra instrucoes ou botao de instalacao
```

---

## 3. Portal do Motorista

**Objetivo:** Criar area restrita onde motoristas fazem login com suas credenciais e visualizam apenas seus pacotes.

**Arquitetura de seguranca:**

```text
+-- auth.users (Supabase Auth)
|
+-- profiles (dados basicos)
|   +-- id (FK -> auth.users)
|   +-- name, phone
|
+-- user_roles (ja existe)
|   +-- user_id (FK -> profiles)
|   +-- role: 'admin' | 'ops' | 'driver'
|
+-- drivers
|   +-- user_id (FK -> profiles) ← vincula motorista a usuario
|   +-- owner_user_id (operador que cadastrou)
```

**Componentes a criar:**

1. **Pagina de login motorista:** `/motorista/login`
   - Login via email/senha
   - Verifica se usuario tem role 'driver'
   - Redireciona para dashboard do motorista

2. **Dashboard do motorista:** `/motorista/dashboard`
   - Lista apenas pacotes atribuidos ao motorista logado
   - Status em tempo real
   - Scanner de QR code para confirmar entregas

3. **Pagina de bipagem motorista:** `/motorista/bipar`
   - Scanner simplificado
   - Apenas para atualizar status (entregue/nao entregue)

4. **Hook de autorizacao:** `useDriverAuth`
   - Verifica role do usuario
   - Busca dados do driver vinculado
   - Protege rotas de motoristas

**Migracao SQL necessaria:**

```sql
-- Garantir que drivers.user_id pode ser preenchido
-- (ja existe, apenas criar interface de vinculacao)

-- Adicionar coluna de senha temporaria para convite
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS invite_token TEXT;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS invite_expires_at TIMESTAMPTZ;

-- RLS para motoristas verem apenas seus dados
CREATE POLICY "drivers_see_own_assignments" ON driver_assignments
  FOR SELECT TO authenticated
  USING (
    driver_id IN (
      SELECT d.id FROM drivers d 
      WHERE d.user_id = auth.uid()
    )
  );
```

**Fluxo de convite de motorista:**

```text
Admin cadastra motorista
        |
        v
Sistema gera link de convite (token unico)
        |
        v
Motorista acessa link, cria senha
        |
        v
Sistema vincula auth.user.id ao drivers.user_id
        |
        v
Motorista pode fazer login em /motorista/login
```

---

## 4. Sincronizacao Automatica de Order ID

**Problema:** Dados de order_id nao atualizam automaticamente apos bipagem ou webhook.

**Causa raiz:**
- Webhooks processam dados mas UI nao faz refetch imediato
- Realtime tem latencia de 200-500ms
- React Query cache pode estar desatualizado

**Solucao em 3 partes:**

**4.1 Refetch imediato apos mutacoes:**

```typescript
// Apos qualquer mutacao que afeta shipments
const queryClient = useQueryClient();

const handleScan = async () => {
  await supabase.functions.invoke('scan-bind', {...});
  
  // Refetch imediato - NAO esperar realtime
  await queryClient.invalidateQueries({ queryKey: ['shipments'] });
};
```

**4.2 Realtime + Refetch combinados:**

```typescript
// No useEffect do realtime
.on('postgres_changes', { event: '*', table: 'shipments_cache' }, 
  async (payload) => {
    // Ao receber update, forcar refetch completo
    await loadShipments();
  }
)
```

**4.3 Webhook atualiza order_id corretamente:**

Verificar que o `meli-webhook` esta salvando `order_id` no `shipments_cache`:

```typescript
// Ja existe em meli-webhook/index.ts linha 190-210
order_id: orderData.id.toString(), // ← Garantir que isso esta sendo salvo
```

**Arquivos a modificar:**
- `src/pages/OperacoesUnificadas.tsx` - Adicionar invalidateQueries
- `src/pages/Bipagem.tsx` - Refetch apos sync
- `supabase/functions/meli-webhook/index.ts` - Garantir order_id salvo

---

## Resumo de Arquivos

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `src/components/DateRangeFilter.tsx` | Modificar | Corrigir logica do Popover |
| `vite.config.ts` | Modificar | Adicionar vite-plugin-pwa |
| `index.html` | Modificar | Meta tags PWA |
| `src/pages/Instalar.tsx` | Criar | Pagina de instalacao |
| `public/manifest.json` | Criar | Manifest PWA |
| `src/pages/motorista/Login.tsx` | Criar | Login motorista |
| `src/pages/motorista/Dashboard.tsx` | Criar | Dashboard motorista |
| `src/pages/motorista/Bipar.tsx` | Criar | Bipagem motorista |
| `src/hooks/useDriverAuth.ts` | Criar | Hook de autorizacao |
| `src/App.tsx` | Modificar | Adicionar rotas motorista |
| `src/pages/OperacoesUnificadas.tsx` | Modificar | Refetch imediato |
| `src/pages/Bipagem.tsx` | Modificar | Invalidar cache |
| `supabase/migrations/` | Criar | Policies e colunas para motoristas |

---

## Detalhes Tecnicos

### PWA - Configuracao vite-plugin-pwa

```javascript
// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'RASTREIO_FLEX',
        short_name: 'RastreioFlex',
        theme_color: '#f59e0b',
        background_color: '#0f0f0f',
        display: 'standalone',
        icons: [...]
      }
    })
  ]
})
```

### Portal Motorista - Rotas Protegidas

```typescript
// App.tsx
<Route path="/motorista" element={<DriverGuard />}>
  <Route path="login" element={<DriverLogin />} />
  <Route path="dashboard" element={<DriverDashboard />} />
  <Route path="bipar" element={<DriverScanner />} />
</Route>
```

### Sincronizacao - Invalidacao de Cache

```typescript
// Apos qualquer operacao que modifica dados
const invalidateShipmentData = async () => {
  await queryClient.invalidateQueries({ 
    queryKey: ['shipments'],
    refetchType: 'active'
  });
};
```

---

## Ordem de Implementacao

1. **Fase 1:** Corrigir DateRangeFilter (15 min)
2. **Fase 2:** Sincronizacao automatica order_id (30 min)
3. **Fase 3:** PWA para instalacao (1h)
4. **Fase 4:** Portal do Motorista (2-3h)

Deseja que eu comece a implementacao pela Fase 1 (corrigir o botao de data)?
