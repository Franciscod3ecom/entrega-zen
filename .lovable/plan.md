
# Plano: Integrar Design System "Yellow iOS Style"

## Resumo

Integrar as novas regras do design system "Yellow iOS Style" (inspirado no iOS 15) ao sistema atual "D3ECOM Liquid Edition", mantendo a identidade visual existente enquanto adiciona:

- Tipografia iOS com SF Pro e escala precisa
- Cores semanticas alinhadas ao novo spec
- Espacamento baseado em grid de 4pt
- Regras de acessibilidade e contraste
- Interacoes e motion patterns iOS-style

---

## Analise de Compatibilidade

| Aspecto | Atual (D3ECOM) | Novo (Yellow iOS) | Acao |
|---------|----------------|-------------------|------|
| Cor primaria | #FFC700 (gold) | #FFC800 | Manter atual (quase identico) |
| Background dark | #000000 | #050509 | Atualizar para iOS spec |
| Tipografia | Inter | SF Pro | Adicionar SF Pro com fallback |
| Spacing | Tailwind default | 4pt grid | Adicionar escala iOS |
| Radius | 1rem base | 4-20px | Mapear valores |
| Touch targets | 44px | 44px | OK - ja implementado |

---

## Arquivos a Modificar

| Arquivo | Descricao |
|---------|-----------|
| `src/index.css` | Adicionar variaveis iOS, tipografia, cores light mode |
| `tailwind.config.ts` | Estender spacing, fontFamily, radii |
| `src/components/ui/button.tsx` | Aplicar pressed state (scale 0.98) |
| `src/components/ui/input.tsx` | Atualizar focused border color |
| `src/components/ui/card.tsx` | Adicionar variante highlight |
| `src/components/ui/badge.tsx` | Adicionar variante outline-gold |
| `src/components/ui/toast.tsx` | Aplicar novos estilos |
| `src/components/ui/alert.tsx` | Adicionar variantes success/warning/info |

---

## Detalhes Tecnicos

### 1. Variaveis CSS (index.css)

Adicionar novas variaveis seguindo a nomenclatura iOS:

```css
:root {
  /* Text Colors - iOS Style */
  --text-primary: 0 0% 96%;      /* #F5F5F7 */
  --text-secondary: 0 0% 82%;    /* #D1D1D6 */
  --text-tertiary: 0 0% 56%;     /* #8E8E93 */
  --text-link: 48 100% 52%;      /* #FFD60A */
  
  /* Brand - iOS Yellow */
  --brand-primary: 48 100% 50%;       /* #FFC800 */
  --brand-primary-soft: 48 100% 12%;  /* #3A3000 */
  --brand-primary-strong: 48 100% 54%;/* #FFD60A */
  
  /* State Colors */
  --state-success: 142 70% 45%;  /* #34C759 */
  --state-warning: 48 100% 50%;  /* #FFCC00 */
  --state-error: 4 100% 59%;     /* #FF3B30 */
  --state-info: 210 100% 50%;    /* #0A84FF */
  
  /* Border - iOS Style */
  --border-subtle: 0 0% 18%;     /* #2C2C2E */
  --border-strong: 0 0% 23%;     /* #3A3A3C */
  
  /* Typography */
  --font-primary: "SF Pro", -apple-system, system-ui, "Segoe UI", sans-serif;
  --font-mono: "SF Mono", ui-monospace, Menlo, Monaco, Consolas, monospace;
  
  /* Motion Durations - iOS Style */
  --duration-fast: 150ms;
  --duration-default: 200ms;
  --duration-slow: 300ms;
  
  /* iOS Easing */
  --ease-ios: cubic-bezier(0.25, 0.1, 0.25, 1);
}
```

### 2. Tipografia iOS (tailwind.config.ts)

Adicionar escala tipografica iOS com tracking preciso:

```typescript
fontSize: {
  // iOS Typography Scale
  'display-lg': ['34px', { lineHeight: '40px', letterSpacing: '0.37px', fontWeight: '700' }],
  'title-lg': ['28px', { lineHeight: '34px', letterSpacing: '0.36px', fontWeight: '700' }],
  'title-md': ['22px', { lineHeight: '28px', letterSpacing: '0.35px', fontWeight: '600' }],
  'title-sm': ['20px', { lineHeight: '24px', letterSpacing: '0.38px', fontWeight: '600' }],
  'headline': ['17px', { lineHeight: '22px', letterSpacing: '-0.41px', fontWeight: '600' }],
  'body': ['17px', { lineHeight: '22px', letterSpacing: '-0.41px', fontWeight: '400' }],
  'callout': ['16px', { lineHeight: '21px', letterSpacing: '-0.32px', fontWeight: '400' }],
  'subhead': ['15px', { lineHeight: '20px', letterSpacing: '-0.24px', fontWeight: '400' }],
  'caption': ['13px', { lineHeight: '18px', letterSpacing: '-0.08px', fontWeight: '400' }],
  'footnote': ['12px', { lineHeight: '16px', letterSpacing: '0px', fontWeight: '400' }],
},
```

### 3. Espacamento Grid 4pt

Adicionar escala de spacing iOS:

```typescript
spacing: {
  'ios-0': '0px',
  'ios-1': '4px',
  'ios-2': '8px',
  'ios-3': '12px',
  'ios-4': '16px',
  'ios-5': '20px',
  'ios-6': '24px',
  'ios-7': '32px',
  'ios-8': '40px',
  'ios-9': '48px',
  'ios-10': '64px',
},
```

### 4. Border Radius iOS

Mapear valores de radius:

```typescript
borderRadius: {
  'ios-none': '0px',
  'ios-xs': '4px',
  'ios-sm': '8px',
  'ios-md': '12px',
  'ios-lg': '20px',
  'ios-full': '999px',
},
```

### 5. Button Component

Adicionar pressed state com scale:

```typescript
// Adicionar ao base styles
"active:scale-[0.98] transition-all duration-150"

// Atualizar disabled state
"disabled:bg-border-subtle disabled:text-text-tertiary disabled:shadow-none"
```

### 6. Card Component

Adicionar variante highlight:

```typescript
// Nova variante
highlight: "bg-brand-primary-soft border-brand-primary/20"
```

### 7. Badge Component

Adicionar variante outline-gold:

```typescript
"outline-gold": "bg-transparent text-brand-primary border-brand-primary border"
```

### 8. Alert Component

Adicionar variantes semanticas:

```typescript
variants: {
  success: "border-state-success/30 bg-state-success/10 [&>svg]:text-state-success",
  warning: "border-state-warning/30 bg-state-warning/10 [&>svg]:text-state-warning",
  info: "border-state-info/30 bg-state-info/10 [&>svg]:text-state-info",
}
```

---

## Regras de Design a Documentar

### Uso do Amarelo

1. **Botoes primarios**: Maximo 1 por contexto
2. **Texto amarelo**: Apenas em badges, numeros e labels curtos
3. **Links**: Usar brand-primary-strong (#FFD60A) em dark mode
4. **Evitar**: Paragrafos longos com texto amarelo

### Acessibilidade

1. **Contraste minimo**: 4.5:1 para texto body, 3:1 para texto grande
2. **Touch targets**: Minimo 44x44px
3. **Font size**: Minimo 13px para texto secundario, 17px para body

### Motion

1. **Transicoes simples**: 200ms
2. **Modais e telas**: 300ms
3. **Easing**: cubic-bezier(0.25, 0.1, 0.25, 1) - iOS standard

---

## Classes Utilitarias Novas (index.css)

```css
/* iOS Pressed State */
.ios-pressed {
  @apply active:scale-[0.98] active:opacity-90 transition-transform duration-150;
}

/* iOS List Item */
.ios-list-item {
  @apply h-14 px-4 flex items-center bg-surface-elevated border-b border-border-subtle;
}

/* iOS List Item Selected */
.ios-list-item-selected {
  @apply bg-brand-primary-soft;
}

/* Yellow Text (only for short labels) */
.text-brand {
  color: hsl(var(--brand-primary));
}

/* iOS Card Shadow */
.ios-card-shadow {
  box-shadow: 0 2px 12px 0 rgba(0,0,0,0.7);
}

/* iOS Focus Ring */
.ios-focus {
  @apply focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background;
}
```

---

## Ordem de Implementacao

1. **Fase 1**: Atualizar `index.css` com novas variaveis
2. **Fase 2**: Estender `tailwind.config.ts` com tipografia e spacing
3. **Fase 3**: Atualizar componentes UI (button, input, card, badge, alert)
4. **Fase 4**: Adicionar classes utilitarias iOS
5. **Fase 5**: Testar contraste e acessibilidade

---

## Compatibilidade

- **Backward compatible**: Todas as classes existentes continuam funcionando
- **Adicao incremental**: Novas classes `ios-*` e `text-*` para novos estilos
- **Variaveis CSS**: Novas variaveis nao sobrescrevem as existentes
- **Componentes**: Variantes existentes mantidas, novas adicionadas

---

## Exemplo de Uso

Antes:
```tsx
<Button variant="default">Confirmar</Button>
```

Depois (mesmo comportamento, com pressed state automatico):
```tsx
<Button variant="default">Confirmar</Button>
```

Novo uso com classes iOS:
```tsx
<div className="ios-list-item ios-pressed">
  <span className="text-body">Item de lista</span>
  <Badge variant="outline-gold">Novo</Badge>
</div>
```
