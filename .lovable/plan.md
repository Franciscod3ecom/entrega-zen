# Plano: Melhorias RASTREIO_FLEX - IMPLEMENTADO ✅

## Status das Implementações

| # | Melhoria | Status | Arquivos |
|---|----------|--------|----------|
| 1 | Corrigir botão data personalizada | ✅ Concluído | `DateRangeFilter.tsx` |
| 2 | PWA para instalação mobile | ✅ Concluído | `vite.config.ts`, `index.html`, `Instalar.tsx` |
| 3 | Portal do Motorista | ✅ Concluído | `/motorista/*`, `useDriverAuth.ts` |
| 4 | Sincronização automática order_id | ✅ Concluído | `useBatchScanner.ts` |

---

## 1. Correção DateRangeFilter ✅

**Problema:** PopoverTrigger dentro de bloco condicional impedia abertura do calendário.

**Solução aplicada:** Mover Popover para fora do condicional, deixando sempre presente mas controlado por `open={showCustom}`.

---

## 2. PWA para Instalação Mobile ✅

**Arquivos criados/modificados:**
- `vite.config.ts` - Plugin vite-plugin-pwa configurado
- `index.html` - Meta tags PWA (theme-color, apple-touch-icon, manifest)
- `src/pages/Instalar.tsx` - Página de instalação com detecção de plataforma
- `public/pwa-192x192.png` - Ícone 192x192
- `public/pwa-512x512.png` - Ícone 512x512

**Funcionalidades:**
- Detecção automática iOS/Android/Desktop
- Botão "Instalar App" no Android (via beforeinstallprompt)
- Instruções passo-a-passo para iOS (Safari)
- Workbox com cache de assets e API Supabase

---

## 3. Portal do Motorista ✅

**Páginas criadas:**
- `/motorista/login` - Login com email/senha
- `/motorista/dashboard` - Lista pacotes atribuídos ao motorista
- `/motorista/bipar` - Scanner de QR codes

**Hook criado:**
- `useDriverAuth.ts` - Verifica role 'driver', busca dados do motorista vinculado

**Migração SQL aplicada:**
- Colunas `invite_token`, `invite_expires_at`, `email` em `drivers`
- RLS policies para motoristas verem apenas seus dados

**Fluxo de segurança:**
1. Usuário faz login
2. Sistema verifica se tem role 'driver' em `user_roles`
3. Sistema busca motorista vinculado via `drivers.user_id`
4. Motorista vê apenas shipments atribuídos a ele

---

## 4. Sincronização Automática order_id ✅

**Modificação em `useBatchScanner.ts`:**
- Adicionado `useQueryClient` do TanStack Query
- Após cada sync bem-sucedido, invalida queries:
  - `['shipments']`
  - `['v_rastreamento_completo']`

**Resultado:** UI atualiza imediatamente após bipagem, sem esperar realtime.

---

## Próximos Passos Sugeridos

1. **Testar o filtro de data personalizado** - Verificar se o calendário abre corretamente
2. **Testar instalação PWA** - Acessar `/instalar` em dispositivo móvel
3. **Cadastrar motorista com usuário** - Vincular `drivers.user_id` a um `auth.user`
4. **Testar portal do motorista** - Login em `/motorista/login`

---

## Arquivos Modificados

```
src/components/DateRangeFilter.tsx  (fix Popover)
src/hooks/useBatchScanner.ts        (cache invalidation)
src/hooks/useDriverAuth.ts          (novo)
src/pages/Instalar.tsx              (novo)
src/pages/motorista/Login.tsx       (novo)
src/pages/motorista/Dashboard.tsx   (novo)
src/pages/motorista/Bipar.tsx       (novo)
src/App.tsx                         (novas rotas)
vite.config.ts                      (PWA plugin)
index.html                          (PWA meta tags)
public/pwa-192x192.png              (novo)
public/pwa-512x512.png              (novo)
```
