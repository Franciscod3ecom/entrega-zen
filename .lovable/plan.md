
# Plano: Sincronizacao Automatica + Popup de Status de Importacao

## Objetivo
1. Configurar sincronizacao automatica em horarios estrategicos do dia via pg_cron
2. Criar popup/modal que mostra status detalhado da sincronizacao em tempo real

---

## 1. Horarios Estrategicos para Sincronizacao Automatica

Com base no fluxo operacional do Mercado Envios Flex:

| Horario | Motivo | Funcao |
|---------|--------|--------|
| 06:00 | Inicio do dia, captura pedidos da madrugada | sync-orders-periodic |
| 10:00 | Pico de novos pedidos manha | sync-orders-periodic |
| 14:00 | Apos almoco, novos pedidos tarde | sync-orders-periodic |
| 18:00 | Fim expediente, atualizacao final | sync-orders-periodic + auto-refresh-shipments |
| 21:00 | Fechamento do dia, verificar entregas | auto-refresh-shipments + check-stuck-shipments |

---

## 2. Configurar pg_cron Jobs

Criar os cron jobs no banco de dados para executar automaticamente:

```sql
-- Habilitar extensoes necessarias
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Sincronizacao 06:00 BRT (09:00 UTC)
SELECT cron.schedule(
  'sync-orders-morning-6h',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url:='https://icoxkprlazegyzgxeeok.supabase.co/functions/v1/sync-orders-periodic',
    headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."}'::jsonb,
    body:='{}'::jsonb
  );
  $$
);

-- Sincronizacao 10:00 BRT (13:00 UTC)
SELECT cron.schedule(
  'sync-orders-morning-10h',
  '0 13 * * *',
  ...
);

-- Sincronizacao 14:00 BRT (17:00 UTC)
SELECT cron.schedule(
  'sync-orders-afternoon-14h',
  '0 17 * * *',
  ...
);

-- Sincronizacao completa 18:00 BRT (21:00 UTC)
SELECT cron.schedule(
  'sync-full-evening-18h',
  '0 21 * * *',
  ...
);

-- Verificacao final 21:00 BRT (00:00 UTC)
SELECT cron.schedule(
  'check-problems-night-21h',
  '0 0 * * *',
  ...
);
```

---

## 3. Componente SyncStatusModal

Criar novo componente `src/components/SyncStatusModal.tsx`:

### Interface do Modal

```text
+------------------------------------------+
|  [X]  Sincronizacao em Andamento         |
+------------------------------------------+
|                                          |
|  [============================] 75%      |
|                                          |
|  Etapa: Processando contas ML            |
|                                          |
|  +------------------------------------+  |
|  | Conta 1 (LOJA_FLEX)       ✓ 12    |  |
|  | Conta 2 (DISTRIBUIDORA)   ... 8   |  |
|  +------------------------------------+  |
|                                          |
|  Importados: 20    |    Erros: 0        |
|                                          |
|  [  Concluido!  ]  ou  [  Cancelar  ]   |
+------------------------------------------+
```

### Props do Componente

```typescript
interface SyncStatusModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

interface SyncProgress {
  phase: 'starting' | 'syncing' | 'refreshing' | 'checking' | 'complete' | 'error';
  currentAccount: string | null;
  accountsProcessed: number;
  totalAccounts: number;
  imported: number;
  errors: number;
  accountResults: Array<{
    account: string;
    imported: number;
    errors: number;
    status: 'pending' | 'processing' | 'done' | 'error';
  }>;
}
```

### Fases de Sincronizacao

1. **starting**: "Iniciando sincronizacao..."
2. **syncing**: "Importando pedidos do Mercado Livre"
3. **refreshing**: "Atualizando status dos envios"
4. **checking**: "Verificando problemas"
5. **complete**: "Sincronizacao concluida!"
6. **error**: "Erro na sincronizacao"

---

## 4. Modificar sync-all-accounts Edge Function

Adicionar streaming de progresso via logs para o modal poder acompanhar:

```typescript
// Retornar resultados parciais conforme processa
const results = [];
for (const account of accounts) {
  const result = await processAccount(account);
  results.push(result);
  
  // Log estruturado para progresso
  console.log(JSON.stringify({
    type: 'progress',
    account: account.nickname,
    processed: results.length,
    total: accounts.length,
    imported: result.imported,
    errors: result.errors,
  }));
}
```

---

## 5. Modificar Dashboard.tsx

Integrar o SyncStatusModal no botao "Sincronizar Tudo":

### Alteracoes

```tsx
// Estados
const [syncModalOpen, setSyncModalOpen] = useState(false);
const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);

// Handler atualizado
const handleSyncWithModal = async () => {
  setSyncModalOpen(true);
  setSyncProgress({ phase: 'starting', ... });
  
  try {
    // Fase 1: Sincronizar contas
    setSyncProgress({ phase: 'syncing', ... });
    const syncResult = await supabase.functions.invoke("sync-all-accounts");
    
    // Atualizar progresso com resultados
    setSyncProgress({ 
      phase: 'refreshing', 
      accountResults: syncResult.data.accounts,
      imported: syncResult.data.imported,
      ...
    });
    
    // Fase 2: Atualizar status
    await supabase.functions.invoke("auto-refresh-shipments");
    
    // Fase 3: Concluido
    setSyncProgress({ phase: 'complete', ... });
    
  } catch (error) {
    setSyncProgress({ phase: 'error', ... });
  }
};

// No JSX - substituir onClick do botao
<Button onClick={handleSyncWithModal} ...>
  Sincronizar Tudo
</Button>

<SyncStatusModal 
  open={syncModalOpen} 
  onOpenChange={setSyncModalOpen}
  progress={syncProgress}
/>
```

---

## 6. Exibir Proxima Sincronizacao Automatica

Adicionar indicador no Dashboard mostrando quando sera a proxima sync:

```tsx
// Calcular proxima sincronizacao
const getNextSyncTime = () => {
  const now = new Date();
  const schedules = [6, 10, 14, 18, 21]; // horarios BRT
  
  const nowBRT = new Date(now.toLocaleString('en-US', { timeZone: 'America/Recife' }));
  const currentHour = nowBRT.getHours();
  
  const nextHour = schedules.find(h => h > currentHour) || schedules[0];
  // Formatar para exibir
  return `${nextHour}:00`;
};

// No Card de Saude
<div className="p-ios-3 rounded-ios-md bg-muted/50">
  <div className="flex items-center gap-2 mb-1">
    <Clock className="h-4 w-4 text-text-tertiary" />
    <span className="text-caption1 text-text-tertiary">Proxima Sync Auto</span>
  </div>
  <div className="text-callout font-medium">{getNextSyncTime()}</div>
</div>
```

---

## 7. Arquivos a Criar/Modificar

| Arquivo | Acao |
|---------|------|
| `src/components/SyncStatusModal.tsx` | **CRIAR** - Modal com status da sincronizacao |
| `src/pages/Dashboard.tsx` | **MODIFICAR** - Integrar modal + indicador proxima sync |
| `src/pages/OperacoesUnificadas.tsx` | **MODIFICAR** - Integrar modal no botao sync |
| SQL Migration | **CRIAR** - Configurar pg_cron jobs |

---

## 8. Design do Modal (iOS Style)

```css
/* Estilo do modal */
.sync-modal-content {
  @apply rounded-ios-xl liquid-glass;
}

/* Barra de progresso */
.sync-progress-bar {
  @apply h-2 rounded-ios-full bg-brand-primary;
  transition: width 0.3s ease;
}

/* Lista de contas */
.account-item {
  @apply flex items-center justify-between p-ios-3 rounded-ios-md;
}

.account-item.processing {
  @apply bg-primary/10;
}

.account-item.done {
  @apply bg-success/10;
}

.account-item.error {
  @apply bg-danger/10;
}
```

---

## 9. Resumo

### Funcionalidades Implementadas

1. **Sincronizacao Automatica via pg_cron**
   - 5 horarios estrategicos: 06h, 10h, 14h, 18h, 21h (BRT)
   - Diferentes funcoes por horario

2. **Modal de Status de Sincronizacao**
   - Barra de progresso animada
   - Lista de contas com status individual
   - Contadores de importados/erros em tempo real
   - Fases claras: Importando → Atualizando → Verificando → Concluido

3. **Indicador de Proxima Sync**
   - Mostra no Dashboard quando sera a proxima sincronizacao automatica

### Resultado Visual

Quando o usuario clicar em "Sincronizar Tudo":
1. Modal abre imediatamente
2. Barra de progresso comeca a preencher
3. Lista de contas aparece com status individual
4. Contadores atualizam em tempo real
5. Ao finalizar, mostra resumo e botao de fechar
