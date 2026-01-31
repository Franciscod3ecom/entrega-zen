# D3ECOM Design System v4.1 — Yellow iOS Style

> Inspirado no iOS 15+ Human Interface Guidelines com identidade visual D3ECOM (Gold/Amarelo).

---

## 1. Filosofia

- **Mobile-First**: Experiência nativa para dispositivos móveis
- **Dark-Only**: Tema escuro absoluto, sem light mode
- **Touch-Friendly**: Alvos mínimos de 44px (Apple HIG)
- **Liquid Glass**: Efeitos de blur intenso e bordas especulares

---

## 2. Cores

### 2.1 Brand (Amarelo iOS)

| Token | HSL | Uso |
|-------|-----|-----|
| `--brand-primary` | `48 100% 50%` | Botões primários, estados ativos |
| `--brand-primary-soft` | `48 100% 12%` | Backgrounds sutis, highlights |
| `--brand-primary-strong` | `48 100% 54%` | Links, labels curtos |

### 2.2 Gold (Alias)

| Token | HSL | Uso |
|-------|-----|-----|
| `--gold` | `48 100% 50%` | Primary gold |
| `--gold-hover` | `48 100% 45%` | Hover state |
| `--gold-glow` | `48 100% 50%` | Glow effects |

### 2.3 Surfaces

| Token | HSL | Uso |
|-------|-----|-----|
| `--surface-page` | `240 14% 2%` | Background principal (#050509) |
| `--surface-card` | `0 0% 7%` | Cards, containers |
| `--surface-input` | `0 0% 100% / 0.03` | Inputs, campos |
| `--surface-elevated` | `0 0% 11%` | Elementos elevados |

### 2.4 Text

| Token | HSL | Uso |
|-------|-----|-----|
| `--text-primary` | `0 0% 96%` | Texto principal |
| `--text-secondary` | `0 0% 82%` | Texto secundário |
| `--text-tertiary` | `0 0% 56%` | Labels, hints |
| `--text-muted` | `0 0% 54%` | Texto desabilitado |
| `--text-link` | `48 100% 54%` | Links (amarelo) |

### 2.5 State Colors

| Token | HSL | Uso |
|-------|-----|-----|
| `--state-success` | `142 70% 45%` | Sucesso, entregue |
| `--state-warning` | `48 100% 50%` | Alerta, pendente |
| `--state-error` | `4 100% 59%` | Erro, crítico |
| `--state-info` | `210 100% 50%` | Informação |

### 2.6 Borders

| Token | HSL | Uso |
|-------|-----|-----|
| `--border-subtle` | `0 0% 18%` | Bordas sutis |
| `--border-strong` | `0 0% 23%` | Bordas visíveis |
| `--border` | `0 0% 100% / 0.08` | Padrão (transparente) |

---

## 3. Tipografia

### 3.1 Font Stack

```css
font-family: 'SF Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif;
font-family: 'SF Mono', ui-monospace, Menlo, Monaco, Consolas, monospace; /* mono */
```

### 3.2 Escala iOS

| Classe | Size | Line Height | Letter Spacing | Weight |
|--------|------|-------------|----------------|--------|
| `text-display-lg` | 34px | 40px | 0.37px | 700 |
| `text-title-lg` | 28px | 34px | 0.36px | 700 |
| `text-title-md` | 22px | 28px | 0.35px | 600 |
| `text-title-sm` | 20px | 24px | 0.38px | 600 |
| `text-headline` | 17px | 22px | -0.41px | 600 |
| `text-body` | 17px | 22px | -0.41px | 400 |
| `text-callout` | 16px | 21px | -0.32px | 400 |
| `text-subhead` | 15px | 20px | -0.24px | 400 |
| `text-caption-ios` | 13px | 18px | -0.08px | 400 |
| `text-footnote` | 12px | 16px | 0px | 400 |

### 3.3 CSS Utilities

```css
.text-display-lg { font-size: 34px; line-height: 41px; letter-spacing: -0.4px; font-weight: 700; }
.text-display-md { font-size: 28px; line-height: 34px; letter-spacing: -0.4px; font-weight: 700; }
.text-title-lg   { font-size: 22px; line-height: 28px; letter-spacing: -0.4px; font-weight: 700; }
.text-title-md   { font-size: 20px; line-height: 25px; letter-spacing: -0.4px; font-weight: 600; }
.text-title-sm   { font-size: 17px; line-height: 22px; letter-spacing: -0.4px; font-weight: 600; }
.text-headline   { font-size: 17px; line-height: 22px; letter-spacing: -0.4px; font-weight: 600; }
.text-body       { font-size: 17px; line-height: 22px; letter-spacing: -0.4px; font-weight: 400; }
.text-callout    { font-size: 16px; line-height: 21px; letter-spacing: -0.3px; font-weight: 400; }
.text-subhead    { font-size: 15px; line-height: 20px; letter-spacing: -0.2px; font-weight: 400; }
.text-footnote   { font-size: 13px; line-height: 18px; letter-spacing: -0.1px; font-weight: 400; }
.text-caption1   { font-size: 12px; line-height: 16px; font-weight: 400; }
.text-caption2   { font-size: 11px; line-height: 13px; font-weight: 400; }
```

---

## 4. Spacing (Grid 4pt)

### 4.1 Tailwind Tokens

| Token | Valor | Uso |
|-------|-------|-----|
| `ios-0` | 0px | Sem espaço |
| `ios-1` | 4px | Micro |
| `ios-2` | 8px | XS |
| `ios-3` | 12px | SM |
| `ios-4` | 16px | MD (padrão) |
| `ios-5` | 20px | LG |
| `ios-6` | 24px | XL |
| `ios-7` | 32px | 2XL |
| `ios-8` | 40px | 3XL |
| `ios-9` | 48px | 4XL |
| `ios-10` | 64px | 5XL |

### 4.2 CSS Utilities

```css
.p-ios-2  { padding: 8px; }
.p-ios-3  { padding: 12px; }
.p-ios-4  { padding: 16px; }
.p-ios-5  { padding: 20px; }
.p-ios-6  { padding: 24px; }

.gap-ios-2 { gap: 8px; }
.gap-ios-3 { gap: 12px; }
.gap-ios-4 { gap: 16px; }
.gap-ios-5 { gap: 20px; }
.gap-ios-6 { gap: 24px; }

.space-y-ios-2 > :not([hidden]) ~ :not([hidden]) { margin-top: 8px; }
.space-y-ios-3 > :not([hidden]) ~ :not([hidden]) { margin-top: 12px; }
.space-y-ios-4 > :not([hidden]) ~ :not([hidden]) { margin-top: 16px; }
```

---

## 5. Border Radius

| Token | Valor | Uso |
|-------|-------|-----|
| `rounded-ios-none` | 0px | Sem radius |
| `rounded-ios-xs` | 4px | Badges pequenos |
| `rounded-ios-sm` | 8px | Inputs, botões SM |
| `rounded-ios-md` | 12px | Cards, containers |
| `rounded-ios-lg` | 20px | Modais, sheets |
| `rounded-ios-full` | 999px | Pills, avatars |

### CSS Utilities

```css
.rounded-ios-sm   { border-radius: 8px; }
.rounded-ios-md   { border-radius: 12px; }
.rounded-ios-lg   { border-radius: 16px; }
.rounded-ios-xl   { border-radius: 20px; }
.rounded-ios-full { border-radius: 9999px; }
```

---

## 6. Motion & Timing

### 6.1 Durations

| Token | Valor | Uso |
|-------|-------|-----|
| `--duration-fast` | 150ms | Micro-interactions |
| `--duration-default` | 200ms | Padrão |
| `--duration-slow` | 300ms | Transições complexas |

### 6.2 Easing

```css
--ease-ios: cubic-bezier(0.25, 0.1, 0.25, 1);
```

### 6.3 Transition Utilities

```css
.ios-transition      { transition-timing-function: var(--ease-ios); transition-duration: 200ms; }
.ios-transition-fast { transition-timing-function: var(--ease-ios); transition-duration: 150ms; }
.ios-transition-slow { transition-timing-function: var(--ease-ios); transition-duration: 300ms; }
```

---

## 7. Shadows

| Token | Valor | Uso |
|-------|-------|-----|
| `--shadow-sm` | `0 1px 2px 0 hsl(0 0% 0% / 0.3)` | Sutil |
| `--shadow-md` | `0 4px 12px -2px hsl(0 0% 0% / 0.4)` | Cards |
| `--shadow-lg` | `0 12px 24px -4px hsl(0 0% 0% / 0.5)` | Modais |
| `--shadow-primary` | `0 8px 30px hsl(45 100% 50% / 0.25)` | Destaque gold |
| `--shadow-glow` | `0 0 30px hsl(45 100% 50% / 0.2)` | Glow effect |
| `--shadow-gold` | `0 20px 60px hsl(45 100% 50% / 0.3)` | FAB, CTAs |

---

## 8. Gradients

```css
--gradient-primary:   linear-gradient(135deg, hsl(48 100% 50%), hsl(48 100% 40%));
--gradient-secondary: linear-gradient(135deg, hsl(0 0% 15%), hsl(0 0% 10%));
--gradient-success:   linear-gradient(135deg, hsl(142 70% 45%), hsl(142 75% 35%));
--gradient-subtle:    linear-gradient(180deg, hsl(0 0% 7%), hsl(0 0% 4%));
--gradient-gold-glow: radial-gradient(ellipse at center, hsl(48 100% 50% / 0.15), transparent 70%);
```

---

## 9. Efeitos Glass (Liquid)

### 9.1 Liquid Glass (Principal)

```css
.liquid-glass {
  background: rgba(17, 17, 17, 0.7);
  backdrop-filter: blur(100px) saturate(280%) contrast(110%);
  -webkit-backdrop-filter: blur(100px) saturate(280%) contrast(110%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  background-image: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.05) 0%,
    transparent 50%
  );
}
```

### 9.2 Liquid Glass Subtle

```css
.liquid-glass-subtle {
  background: rgba(17, 17, 17, 0.5);
  backdrop-filter: blur(60px) saturate(200%) contrast(105%);
  -webkit-backdrop-filter: blur(60px) saturate(200%) contrast(105%);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
```

---

## 10. Componentes iOS

### 10.1 Pressed State

```css
.ios-pressed {
  @apply active:scale-[0.98] active:opacity-90 transition-transform;
  transition-duration: 150ms;
}
```

### 10.2 List Item

```css
.ios-list-item {
  @apply h-14 px-4 flex items-center border-b;
  background: hsl(var(--surface-elevated));
  border-color: hsl(var(--border-subtle));
}

.ios-list-item-selected {
  background: hsl(var(--brand-primary-soft));
}
```

### 10.3 Focus Ring

```css
.ios-focus {
  @apply focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background;
  --tw-ring-color: hsl(var(--brand-primary));
}
```

### 10.4 Card Highlight

```css
.ios-card-highlight {
  background: hsl(var(--brand-primary-soft));
  border: 1px solid hsl(var(--brand-primary) / 0.2);
}
```

---

## 11. Mobile Patterns

### 11.1 Safe Areas

```css
--safe-area-top: env(safe-area-inset-top);
--safe-area-bottom: env(safe-area-inset-bottom);
--safe-area-left: env(safe-area-inset-left);
--safe-area-right: env(safe-area-inset-right);

.safe-top    { padding-top: max(1rem, var(--safe-area-top)); }
.safe-bottom { padding-bottom: max(1rem, var(--safe-area-bottom)); }
.safe-x      { padding-left: max(1rem, var(--safe-area-left)); padding-right: max(1rem, var(--safe-area-right)); }
```

### 11.2 Touch Target (44px mínimo)

```css
@media (max-width: 768px) {
  button, a, input, select, [role="button"] {
    min-height: 44px;
  }
}
```

### 11.3 Touch Feedback

```css
.touch-feedback {
  @apply active:scale-[0.98] transition-transform duration-150;
}
```

### 11.4 Bottom Navigation

```css
.bottom-nav {
  @apply fixed bottom-0 left-0 right-0 z-50 liquid-glass;
  padding-bottom: max(0.5rem, var(--safe-area-bottom));
}
```

### 11.5 FAB (Floating Action Button)

```css
.fab {
  @apply fixed z-40 rounded-full touch-feedback;
  background: var(--gradient-primary);
  box-shadow: var(--shadow-gold);
}
```

---

## 12. Animações

### 12.1 Keyframes Disponíveis

| Nome | Descrição |
|------|-----------|
| `shimmer` | Efeito de brilho passando |
| `liquid-move` | Movimento orgânico de blobs |
| `pulse-gold` | Pulsação com glow dourado |
| `scale-in` | Entrada com scale |
| `slide-up` | Entrada de baixo |
| `slide-down` | Entrada de cima |
| `fade-in` | Fade simples |
| `fade-in-zoom` | Fade com zoom |

### 12.2 Classes de Animação

```css
.animate-scale-in     { animation: scale-in 0.2s ease-out; }
.animate-slide-up     { animation: slide-up 0.3s ease-out; }
.animate-slide-down   { animation: slide-down 0.3s ease-out; }
.animate-fade-in      { animation: fade-in 0.2s ease-out; }
.animate-fade-in-zoom { animation: fade-in-zoom 0.3s ease-out; }
.animate-pulse-subtle { animation: pulse-subtle 2s ease-in-out infinite; }
.animate-bounce-subtle{ animation: bounce-subtle 2s ease-in-out infinite; }
.animate-pulse-gold   { animation: pulse-gold 2s ease-in-out infinite; }
.animate-shimmer      { animation: shimmer 2s infinite; }
.animate-liquid       { animation: liquid-move 25s ease-in-out infinite; }
```

---

## 13. Gold Effects

### 13.1 Gold Glow

```css
.gold-glow        { box-shadow: var(--shadow-gold); }
.gold-glow-subtle { box-shadow: 0 0 20px hsl(45 100% 50% / 0.15); }
```

### 13.2 Gold Text Gradient

```css
.text-gold-gradient {
  background: linear-gradient(135deg, hsl(45 100% 50%), hsl(45 100% 70%));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

### 13.3 Gold Shimmer Button

```css
.btn-gold-shimmer {
  position: relative;
  overflow: hidden;
}

.btn-gold-shimmer::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  animation: shimmer 2s infinite;
}
```

---

## 14. Scrollbar Custom

```css
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: hsl(0 0% 10%);
  border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: hsl(0 0% 25%);
  border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: hsl(45 100% 50% / 0.5);
}

.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.no-scrollbar::-webkit-scrollbar {
  display: none;
}
```

---

## 15. Uso Recomendado

### ✅ DO

```tsx
// Usar tokens semânticos
<div className="bg-surface-card text-text-primary border-border-subtle">
<Button className="bg-brand text-black">

// Usar classes iOS
<div className="liquid-glass rounded-ios-md p-ios-4">
<span className="text-headline text-text-secondary">
```

### ❌ DON'T

```tsx
// Evitar cores hardcoded
<div className="bg-[#1a1a1a] text-white border-gray-800">
<Button className="bg-yellow-500">

// Evitar valores arbitrários
<div className="p-[17px] rounded-[13px]">
```

---

## 16. Arquivos de Referência

| Arquivo | Conteúdo |
|---------|----------|
| `src/index.css` | CSS variables, componentes, utilities |
| `tailwind.config.ts` | Tokens Tailwind, extensões |

---

*Última atualização: Janeiro 2026*
