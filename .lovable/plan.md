
# Plano: Corrigir Sistema de Bipagem e Filtro por Motorista

## Diagnóstico Completo

Identifiquei **dois problemas distintos** que estão causando a falha:

### Problema 1: Bipagem Falhando - "Nenhuma conta ML configurada"

**Causa Raiz:**
Os logs mostram que o usuário `8798f401-634f-4fde-8262-a2f3e6777629` está tentando bipar, mas:
- Esse usuário tem **1 motorista cadastrado** (Fernando)
- Esse usuário **NÃO tem contas ML configuradas**

A edge function `scan-bind-auto` busca contas ML pelo `owner_user_id` do JWT e falha porque retorna array vazio.

```text
Usuarios no sistema:
+--------------------------------------+----------+-------------+
| owner_user_id                        | ML Contas| Motoristas  |
+--------------------------------------+----------+-------------+
| 0c2aac85-3153-47aa-968c-24d4098d45ec | 5        | 6           | <-- Funciona
| 6246ed49-f5ca-4f0d-b5d5-cce950140db9 | 1        | 2           | <-- Funciona  
| 8798f401-634f-4fde-8262-a2f3e6777629 | 0        | 1           | <-- ERRO!
+--------------------------------------+----------+-------------+
```

**Impacto:** 
- `driver_assignments` está vazia (0 registros)
- `scan_logs` está vazia (0 registros)
- Nenhum pacote foi vinculado a motoristas

---

### Problema 2: Filtro por Motorista Usando Nome em vez de ID

**Causa Raiz:**
No `OperacoesUnificadas.tsx`, o filtro está usando o **nome do motorista** como valor:

```tsx
// Linha 656 - Select value usa driver.name
<SelectItem key={driver.id} value={driver.name}>
  {driver.name}
</SelectItem>

// Linha 338-341 - Filtro usa includes() com nome
if (driverFilter !== "all") {
  filteredShips = filteredShips.filter(item =>
    item.motorista_nome?.includes(driverFilter)  // Busca parcial por nome
  );
}
```

**Problemas:**
1. `includes()` faz busca parcial - "João" encontraria "João Silva" E "Maria João"
2. Sensivel a case - "joao" não encontra "João"
3. Se dois motoristas tiverem nomes similares, pode haver colisão

---

## Solucao

### Parte 1: Melhorar Feedback de Erro na Bipagem

Atualizar o frontend para mostrar mensagem clara quando o usuario nao tem contas ML:

**Arquivo:** `src/hooks/useBatchScanner.ts`

Adicionar tratamento especifico para o erro "Nenhuma conta ML configurada":

```tsx
// Linha ~241-258: Tratar erro especifico
} catch (err: any) {
  const errorMsg = err.message || "Erro ao vincular";
  
  // Se não tem conta ML configurada
  if (errorMsg.includes("Nenhuma conta ML configurada")) {
    return {
      ...item,
      status: "error" as const,
      errorMessage: "Configure uma conta do Mercado Livre primeiro",
    };
  }
  // ... resto do tratamento
}
```

---

### Parte 2: Corrigir Filtro por Motorista

**Arquivo:** `src/pages/OperacoesUnificadas.tsx`

Alterar o filtro para usar `driver_id` em vez de `motorista_nome`:

| Local | De | Para |
|-------|-----|------|
| Linha 656 (mobile) | `value={driver.name}` | `value={driver.id}` |
| Linha 723 (desktop) | `value={driver.name}` | `value={driver.id}` |
| Linha 338-341 | `includes(driverFilter)` | Comparacao exata por `driver_id` |
| Linha 372-374 | `includes(driverFilter)` | Comparacao exata por `driver_id` |

Porem, a view `v_rastreamento_completo` retorna `motorista_nome` mas **NAO retorna `driver_id`**. 

**Opcoes:**
1. **Opcao A (Recomendada):** Adicionar `da.driver_id` na view e filtrar por ID
2. **Opcao B:** Manter filtro por nome, mas usar comparacao exata (`===`)

**Escolha: Opcao A** - Adicionar driver_id na view (ja existe, verificar linha 82 da migracao)

Verificando a view atual, ela ja inclui `da.driver_id`. O problema e que o frontend nao esta usando.

**Correcoes no frontend:**

```tsx
// Interface (linha 40-57) - adicionar driver_id
interface RastreamentoItem {
  // ... campos existentes
  driver_id: string | null;  // ADICIONAR
}

// Select mobile (linha 656)
<SelectItem key={driver.id} value={driver.id}>
  {driver.name}
</SelectItem>

// Select desktop (linha 723)
<SelectItem key={driver.id} value={driver.id}>
  {driver.name}
</SelectItem>

// Filtro shipments (linha 338-341)
if (driverFilter !== "all") {
  filteredShips = filteredShips.filter(item =>
    item.driver_id === driverFilter
  );
}

// Filtro alerts - precisa adicionar driver_id nos alerts tambem
// Ou manter comparacao por nome exata para alerts
```

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/hooks/useBatchScanner.ts` | Melhorar mensagem de erro para "sem conta ML" |
| `src/pages/OperacoesUnificadas.tsx` | Interface: adicionar `driver_id`, Selects: usar `driver.id`, Filtro: comparar por ID |

---

## Validacao

Apos as correcoes:

1. **Bipagem:** Usuario sem conta ML vera mensagem clara "Configure uma conta do Mercado Livre primeiro"

2. **Filtro:** Ao selecionar um motorista:
   - Lista mostrara apenas envios com `driver_id` correspondente
   - Sem colisao de nomes
   - Comparacao exata

---

## Nota Importante

Para testar a bipagem completamente, o usuario `8798f401-634f-4fde-8262-a2f3e6777629` precisara:
1. Ir em **Config ML** 
2. Conectar pelo menos uma conta do Mercado Livre
3. Depois os scans funcionarao e criarao registros em `driver_assignments`
