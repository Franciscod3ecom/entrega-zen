
# Plano: Aplicar Design System iOS em Todas as Paginas

## Objetivo
1. Habilitar botao de acesso ao Portal do Motorista
2. Criar menu de navegacao na pagina de Ajuda
3. Aplicar novo design iOS em **todas as paginas** do sistema

---

## 1. Habilitar Botao Login Motorista

### Alteracao em `src/pages/Auth.tsx`
Adicionar botao para acessar /motorista/login na tela de autenticacao:

```text
[Logo RASTREIO_FLEX]
[Tabs Login/Cadastro]
[Formulario]
-------------------
[Botao: Portal do Motorista] <- NOVO
```

**Implementacao:**
- Adicionar Link para `/motorista/login` apos o formulario de login
- Estilizar com `variant="ghost"` e icone de Truck
- Texto: "Acesse o Portal do Motorista"

---

## 2. Menu da Pagina de Ajuda

### Criar navegacao interna em `src/pages/Ajuda.tsx`

**Menu lateral/superior com secoes:**
- Fluxo de Uso
- Manutencao do Sistema
- Status e Badges
- FAQ
- Boas Praticas

**Implementacao:**
- Usar ScrollArea + ancora para cada secao
- Estilo iOS: menu pill no topo ou sidebar sticky
- IDs nos cards para navegacao suave

---

## 3. Design iOS em Todas as Paginas

### Padroes a Aplicar

| Elemento | Antes | Depois (iOS Style) |
|----------|-------|-------------------|
| Titulos | `text-3xl font-bold` | `text-display-lg` ou `text-title-lg` |
| Subtitulos | `text-muted-foreground` | `text-callout text-text-secondary` |
| Cards | `border-0 shadow-md` | `variant="ios"` + `rounded-ios-lg` |
| Botoes | `variant="default"` | `variant="ios-primary"` + `ios-pressed` |
| Inputs | default styling | `rounded-ios-md` + focus ring iOS |
| Badges | varios | semantic variants + `rounded-ios-full` |
| Spacing | Tailwind default | `ios-3`, `ios-4`, `ios-6` |
| Tables | rounded-lg | `rounded-ios-md` |

### Paginas a Atualizar (14 arquivos)

| # | Pagina | Prioridade | Alteracoes Principais |
|---|--------|------------|----------------------|
| 1 | `Auth.tsx` | Alta | Cards iOS, botoes ios-primary, tipografia |
| 2 | `Dashboard.tsx` | Alta | Cards metrica iOS, spacing 4pt, titulos |
| 3 | `Ajuda.tsx` | Alta | Menu navegacao + cards iOS + tipografia |
| 4 | `OperacoesUnificadas.tsx` | Alta | Tabs iOS, table iOS, badges |
| 5 | `Bipagem.tsx` | Alta | CTAs iOS, cards driver, fullscreen |
| 6 | `Motoristas.tsx` | Media | Table iOS, dialogs iOS, badges |
| 7 | `Transportadoras.tsx` | Media | Table iOS, dialogs iOS |
| 8 | `ConfigML.tsx` | Media | Cards status iOS, badges, alerts |
| 9 | `VincularVenda.tsx` | Media | Search iOS, cards result |
| 10 | `Alertas.tsx` | Media | Table iOS, badges semantic |
| 11 | `Instalar.tsx` | Media | Cards plataforma iOS style |
| 12 | `motorista/Login.tsx` | Media | Form iOS, card glass |
| 13 | `motorista/Dashboard.tsx` | Media | Cards metrica, lista items |
| 14 | `motorista/Bipar.tsx` | Baixa | Ja tem estilo adequado |

---

## 4. Alteracoes por Arquivo

### 4.1 Layout.tsx (Base)
- Header: `text-headline` para titulo
- NavLinks: hover/active com `ios-pressed`
- Bottom nav: `rounded-ios-lg` nos icones ativos

### 4.2 Auth.tsx
```tsx
// Titulo
<CardTitle className="text-title-lg">RASTREIO_FLEX</CardTitle>

// Tabs
<TabsList className="rounded-ios-lg">

// Botoes
<Button variant="ios-primary" size="ios-default">

// NOVO: Link motorista
<Button variant="ghost" asChild className="ios-pressed mt-4">
  <Link to="/motorista/login">
    <Truck /> Portal do Motorista
  </Link>
</Button>
```

### 4.3 Dashboard.tsx
```tsx
// Titulo
<h1 className="text-title-lg md:text-display-lg">Dashboard</h1>
<p className="text-callout text-text-secondary">

// Cards metrica
<Card variant="ios" className="rounded-ios-lg">
<div className="text-display-lg font-bold">{stat.value}</div>

// Botoes acao
<Button variant="ios-primary" className="ios-pressed">
```

### 4.4 Ajuda.tsx
```tsx
// NOVO: Menu de navegacao
<nav className="sticky top-16 z-30 liquid-glass rounded-ios-lg p-2 mb-6">
  <div className="flex gap-2 overflow-x-auto">
    <Button variant="ghost" size="sm" className="ios-pressed" onClick={() => scrollTo('fluxo')}>
      Fluxo
    </Button>
    <Button variant="ghost" size="sm" className="ios-pressed" onClick={() => scrollTo('manutencao')}>
      Manutencao
    </Button>
    // ... outros
  </div>
</nav>

// Cards com IDs
<Card variant="ios" id="fluxo" className="rounded-ios-lg scroll-mt-24">
<CardTitle className="text-title-sm">

// Titulos
<h1 className="text-title-lg">Central de Ajuda</h1>
```

### 4.5 OperacoesUnificadas.tsx
```tsx
// Titulo
<h1 className="text-title-lg">Operacoes Unificadas</h1>

// Tabs
<TabsList className="rounded-ios-lg liquid-glass">

// Table container
<div className="rounded-ios-md border overflow-hidden">

// Badges
<Badge variant="ios-success">
<Badge variant="ios-warning">
```

### 4.6 Bipagem.tsx
```tsx
// Cards
<Card variant="ios" className="rounded-ios-lg">

// Select driver
<SelectTrigger className="h-12 rounded-ios-md">

// CTA principal
<Button variant="ios-primary" size="ios-lg" className="ios-pressed">
  <Camera /> Iniciar Scanner Rapido
</Button>
```

### 4.7-4.14 Demais Paginas
Aplicar mesmo padrao:
- `text-title-lg` / `text-title-md` para titulos
- `text-callout` para descricoes
- `Card variant="ios"` para containers
- `rounded-ios-*` para bordas
- `ios-pressed` para interatividade
- Badges semanticos (`variant="ios-success"`, etc)
- Spacing usando `ios-4`, `ios-6`

---

## 5. Novas Classes Utilitarias (index.css)

Adicionar ao CSS existente:

```css
/* Scroll suave para ancoras */
.scroll-smooth-section {
  scroll-behavior: smooth;
  scroll-margin-top: 6rem;
}

/* Ajuda menu pill active */
.menu-pill-active {
  @apply bg-brand-primary-soft text-brand-primary font-medium;
}
```

---

## 6. Ordem de Implementacao

**Fase 1 - Core (Critico)**
1. Auth.tsx - Botao motorista + iOS design
2. Ajuda.tsx - Menu navegacao + iOS design
3. Layout.tsx - Refinamentos iOS

**Fase 2 - Principais**
4. Dashboard.tsx - Metricas iOS
5. OperacoesUnificadas.tsx - Tabs/Tables iOS
6. Bipagem.tsx - CTAs iOS

**Fase 3 - Secundarias**
7-11. Motoristas, Transportadoras, ConfigML, VincularVenda, Alertas

**Fase 4 - Portal Motorista**
12-14. Login, Dashboard, Bipar do motorista

---

## 7. Resumo de Arquivos a Modificar

| Arquivo | Tipo de Alteracao |
|---------|------------------|
| `src/pages/Auth.tsx` | Botao motorista + iOS style |
| `src/pages/Ajuda.tsx` | Menu navegacao + iOS style |
| `src/pages/Dashboard.tsx` | iOS style completo |
| `src/pages/OperacoesUnificadas.tsx` | iOS style completo |
| `src/pages/Bipagem.tsx` | iOS style completo |
| `src/pages/Motoristas.tsx` | iOS style |
| `src/pages/Transportadoras.tsx` | iOS style |
| `src/pages/ConfigML.tsx` | iOS style |
| `src/pages/VincularVenda.tsx` | iOS style |
| `src/pages/Alertas.tsx` | iOS style |
| `src/pages/Instalar.tsx` | iOS style |
| `src/pages/motorista/Login.tsx` | iOS style |
| `src/pages/motorista/Dashboard.tsx` | iOS style |
| `src/pages/motorista/Bipar.tsx` | iOS style (menor) |
| `src/components/Layout.tsx` | Refinamentos iOS |
| `src/index.css` | Classes utilitarias |

**Total: 16 arquivos**

---

## 8. Resultado Esperado

- Botao "Portal do Motorista" visivel na tela de login
- Pagina de Ajuda com menu de navegacao interno
- Todas as paginas com visual iOS consistente:
  - Tipografia SF Pro scale
  - Cores brand-primary (#FFC800)
  - Radius iOS (8-20px)
  - Pressed states (scale 0.98)
  - Spacing 4pt grid
  - Cards com sombras iOS
