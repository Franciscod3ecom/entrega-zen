
# Plano de Otimizacao e Melhorias do RASTREIO_FLEX

## Resumo Executivo

Este plano aborda 5 grandes frentes de melhorias solicitadas:

1. **Otimizacao do Banco de Dados** - Limpeza e reestruturacao para reduzir armazenamento
2. **Consolidacao de Botoes** - Eliminar redundancia de botoes de sincronizacao
3. **Limite de Importacao de Pedidos** - Restringir apenas aos ultimos 7 dias (padrao)
4. **Filtro por Data** - Adicionar filtro de periodo na pagina de Operacoes
5. **Relatorio PDF de Alertas** - Gerar PDF com pendencias para envio a transportadoras
6. **Correcao da Contagem de Bipagem** - Evitar contagem duplicada de pacotes ja bipados

---

## FASE 1: Otimizacao do Banco de Dados

### Problema Identificado
- Tabela `shipments_cache` ocupando ~17 MB com dados redundantes
- Campo `raw_data` (JSONB) armazenando ~4.2 KB por registro quando apenas ~500 bytes sao usados
- Pedidos de 2024 e anteriores ocupando espaco desnecessario

### Solucao

#### 1.1 Adicionar colunas dedicadas
Criar colunas `cliente_nome`, `cidade`, `estado` na tabela `shipments_cache` para evitar parsing de JSON:

```text
+---------------------------+
|    shipments_cache        |
+---------------------------+
| + cliente_nome TEXT       |
| + cidade TEXT             |
| + estado TEXT             |
+---------------------------+
```

#### 1.2 Funcao de limpeza de raw_data
Criar funcao SQL que remove campos pesados do JSONB para envios finalizados (delivered/not_delivered/cancelled) com mais de 48h:
- Remover: `destination`, `origin`, `lead_time`, `quotation`, `snapshot_packing`
- Manter: `id`, `status`, `substatus`, `logistic`, `buyer_info`

#### 1.3 Edge Function de limpeza
Criar `cleanup-old-shipments` que:
- Executa limpeza de raw_data pesados
- Pode deletar envios muito antigos (30+ dias se configurado)
- Limpa tabelas de sistema (`job_run_details`, `_http_response`)

#### 1.4 Atualizar funcoes de sync
Modificar `sync-orders-initial`, `sync-all-accounts`, `sync-orders-periodic`, `meli-webhook` para:
- Salvar `cliente_nome`, `cidade`, `estado` nas novas colunas
- Armazenar `raw_data` slim (apenas campos essenciais)

### Arquivos a Modificar
- Nova edge function: `supabase/functions/cleanup-old-shipments/index.ts`
- `supabase/functions/sync-orders-initial/index.ts`
- `supabase/functions/sync-all-accounts/index.ts`
- `supabase/functions/sync-orders-periodic/index.ts`
- `supabase/functions/meli-webhook/index.ts`
- Migracao SQL para novas colunas e view atualizada

---

## FASE 2: Consolidacao de Botoes de Sincronizacao

### Problema Identificado
No Dashboard existem 5 botoes na area de "Manutencao":
- Sincronizar Contas
- Atualizar Status
- Verificar Problemas
- Diagnosticar
- Corrigir Inconsistencias

Na pagina Operacoes existem 2 botoes:
- Sincronizar ML
- Atualizar

### Solucao

#### 2.1 Dashboard - Simplificar para 2 botoes
| Botao Atual | Acao |
|-------------|------|
| Sincronizar Contas + Atualizar Status | Unificar em **"Sincronizar Tudo"** |
| Verificar Problemas + Diagnosticar + Corrigir | Unificar em **"Verificar e Corrigir"** |

#### 2.2 Operacoes Unificadas - Remover redundancia
| Botao Atual | Acao |
|-------------|------|
| Sincronizar ML | Manter (unico botao de sync) |
| Atualizar | Remover (ja tem realtime) |

### Arquivos a Modificar
- `src/pages/Dashboard.tsx`
- `src/pages/OperacoesUnificadas.tsx`

---

## FASE 3: Limite de Importacao de Pedidos

### Problema Identificado
O sistema importa pedidos sem limite de data, trazendo pedidos de 2024 e anteriores.

### Solucao

#### 3.1 Adicionar parametro `days_back` nas funcoes de sync
- Padrao: 7 dias para sync manual
- Maximo: 30 dias para sincronizacao inicial
- Sync periodico: 48 horas (manter)

#### 3.2 Interface para escolher periodo
Na pagina de Operacoes, ao clicar em "Sincronizar ML", mostrar opcoes:
- Ultimos 7 dias (padrao)
- Ultimos 15 dias
- Ultimos 30 dias

### Arquivos a Modificar
- `supabase/functions/sync-all-accounts/index.ts`
- `supabase/functions/sync-orders-initial/index.ts`
- `src/pages/OperacoesUnificadas.tsx` (dialog de opcoes)

---

## FASE 4: Filtro por Data na Pagina de Operacoes

### Problema Identificado
Nao existe filtro por data na listagem de envios.

### Solucao

#### 4.1 Adicionar componente de filtro de data
Opcoes pre-definidas:
- Hoje
- Ultimos 7 dias
- Ultimos 15 dias
- Ultimos 30 dias
- Este mes
- Mes anterior
- Personalizado (de/ate)

#### 4.2 Aplicar filtro na query
Filtrar pela coluna `last_ml_update` ou `created_at` na view `v_rastreamento_completo`.

### Arquivos a Modificar
- `src/pages/OperacoesUnificadas.tsx` (adicionar filtro de data)
- Atualizar view `v_rastreamento_completo` (se necessario adicionar `created_at`)

---

## FASE 5: Relatorio PDF de Alertas/Pendencias

### Problema Identificado
O cliente precisa gerar um PDF com lista de entregas nao devolvidas para enviar a transportadoras/motoristas.

### Solucao

#### 5.1 Adicionar informacoes extras na aba de Alertas
Para cada alerta exibir:
- Codigo do envio
- Pedido/Pack ID do Mercado Livre
- Nome do cliente
- Motorista responsavel
- Data prevista de entrega
- Dias em atraso

#### 5.2 Criar componente de geracao de PDF
Usar biblioteca `jspdf` ou gerar via edge function:
- Cabecalho com logo e data
- Tabela com pendencias
- Filtro por motorista/transportadora
- Assinatura para recebimento

#### 5.3 Botao "Exportar PDF" na interface
Adicionar botao na aba de Alertas para gerar relatorio.

### Arquivos a Criar/Modificar
- `src/components/PendingReportPDF.tsx` (novo componente)
- `src/pages/OperacoesUnificadas.tsx` (botao de exportar)
- Instalar `jspdf` e `jspdf-autotable` para geracao de PDF no frontend

---

## FASE 6: Correcao da Contagem de Bipagem

### Problema Identificado
Quando o mesmo codigo e bipado mais de uma vez, o sistema:
1. Adiciona na fila (contagem aumenta)
2. Backend retorna que ja esta bipado
3. Contagem fica inflada (ex: 15 pacotes quando eram 10)

### Solucao

#### 6.1 Melhorar validacao no hook `useBatchScanner`
Atualmente o hook verifica:
- Cooldown de 3 segundos
- Se existe em `pendingItems`
- Se existe em `syncedItems` com status "success"

Problema: O cooldown expira e permite re-adicionar.

#### 6.2 Implementar validacao persistente
- Armazenar todos os shipmentIds ja escaneados na sessao atual (Set persistente)
- Ao receber resposta do backend "ja esta com mesmo motorista", nao incrementar contagem
- Exibir feedback "Ja bipado" sem adicionar a fila

#### 6.3 Atualizar UI do scanner
Quando codigo ja foi escaneado:
- Vibrar diferente (2 vibracao curtas)
- Mostrar mensagem "Ja escaneado" sem adicionar a lista

### Arquivos a Modificar
- `src/hooks/useBatchScanner.ts`
- `src/pages/Bipagem.tsx` (feedback visual)

---

## Resumo de Arquivos

### Novos Arquivos
| Arquivo | Descricao |
|---------|-----------|
| `supabase/functions/cleanup-old-shipments/index.ts` | Edge function de limpeza |
| `src/components/PendingReportPDF.tsx` | Componente de geracao de PDF |

### Arquivos Modificados
| Arquivo | Alteracoes |
|---------|------------|
| `src/pages/Dashboard.tsx` | Consolidar botoes de manutencao |
| `src/pages/OperacoesUnificadas.tsx` | Filtro de data, botao PDF, remover botao Atualizar |
| `src/hooks/useBatchScanner.ts` | Corrigir contagem duplicada |
| `src/pages/Bipagem.tsx` | Feedback para codigo ja escaneado |
| `supabase/functions/sync-orders-initial/index.ts` | Limite de dias + raw_data slim |
| `supabase/functions/sync-all-accounts/index.ts` | Limite de dias + raw_data slim |
| `supabase/functions/sync-orders-periodic/index.ts` | Raw_data slim |
| `supabase/functions/meli-webhook/index.ts` | Raw_data slim |

### Migracoes SQL
1. Adicionar colunas `cliente_nome`, `cidade`, `estado` em `shipments_cache`
2. Popular colunas com dados existentes
3. Criar funcao de limpeza de JSONB
4. Atualizar view `v_rastreamento_completo`

---

## Dependencias a Instalar
- `jspdf` - Geracao de PDF
- `jspdf-autotable` - Tabelas em PDF

---

## Ordem de Implementacao Sugerida

1. **FASE 6** - Correcao da bipagem (impacto imediato no uso diario)
2. **FASE 4** - Filtro por data (melhoria de UX)
3. **FASE 2** - Consolidacao de botoes (limpeza de interface)
4. **FASE 3** - Limite de importacao (evitar novos dados desnecessarios)
5. **FASE 1** - Otimizacao do banco (limpeza retroativa)
6. **FASE 5** - Relatorio PDF (funcionalidade adicional)

---

## Estimativa de Economia de Armazenamento

| Item | Antes | Depois | Economia |
|------|-------|--------|----------|
| raw_data por registro | 4.2 KB | ~500 bytes | 88% |
| Envios finalizados antigos | 3.5 MB | 400 KB | ~3 MB |
| Total shipments_cache | 17 MB | ~5 MB | ~12 MB |
