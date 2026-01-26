
# Plano de Implementação: Design System D3ECOM (v4.1 Liquid Edition)

## Resumo Executivo
Transformar a interface do RASTREIO_FLEX de um tema "Apple-like" claro para uma estética **Dark Premium** com efeitos de vidro líquido (Liquid Glass), cor dourada como primária (#FFC700) e animações suaves inspiradas no iOS 18.

---

## 1. Arquivos a Serem Modificados

| Arquivo | Alteração |
|---------|-----------|
| `src/index.css` | Refazer totalmente: novas variáveis CSS, classe `.liquid-glass`, animações, cores D3ECOM |
| `tailwind.config.ts` | Adicionar cores gold, novas animações (shimmer, liquid-move, pulse-gold) |
| `src/components/Layout.tsx` | Aplicar liquid-glass no header e bottom-nav, ajustar cores |
| `src/components/ui/button.tsx` | Nova variante `gold` com shimmer e sombra dourada |
| `src/components/ui/card.tsx` | Aplicar liquid-glass por padrão |
| `src/components/ui/input.tsx` | Adicionar animação shimmer e foco dourado |
| `src/pages/Auth.tsx` | Background com blobs animados, liquid-glass no card |
| Todas as páginas | Ajustar classes para usar novo sistema de cores |

---

## 2. Nova Paleta de Cores CSS

```text
+------------------------------------------+
|               CORES D3ECOM               |
+------------------------------------------+
| GOLD PRIMARY    | #FFC700               |
| GOLD HOVER      | #E6B800               |
| GOLD GLOW       | rgba(255,199,0,0.6)   |
+------------------------------------------+
| SURFACE PAGE    | #000000               |
| SURFACE CARD    | rgba(17,17,17,0.7)    |
| SURFACE INPUT   | rgba(255,255,255,0.03)|
| SURFACE ELEVATED| rgba(255,255,255,0.08)|
+------------------------------------------+
| TEXT PRIMARY    | #FFFFFF               |
| TEXT SECONDARY  | #D1D1D1               |
| TEXT MUTED      | #8A8A8A               |
+------------------------------------------+
```

---

## 3. Especificacao Liquid Glass

A classe `.liquid-glass` tera as seguintes propriedades:

- **backdrop-filter**: `blur(100px) saturate(280%) contrast(110%)`
- **background**: `rgba(17, 17, 17, 0.7)`
- **border**: `1px solid rgba(255, 255, 255, 0.08)`
- **Reflexo interno**: Gradiente linear 135 graus com opacidade baixa

---

## 4. Novas Animacoes

### 4.1 Input Shimmer
Brilho horizontal que percorre o campo de input sutilmente

### 4.2 Liquid Move
Blobs de fundo que se movem em ciclos de 20-30 segundos

### 4.3 Pulse Gold
Pulsacao dourada para indicar sucesso ou atividade

### 4.4 Fade-in Zoom
Transicoes de etapa usando fade + zoom para sensacao nativa

---

## 5. Etapas de Implementacao

### Etapa 1: Base CSS (index.css)
- Remover tema claro (light mode sera removido, apenas dark)
- Criar variaveis CSS para todas as cores D3ECOM
- Implementar classe `.liquid-glass`
- Adicionar animacoes keyframes (shimmer, liquid-move, pulse-gold)
- Definir tipografia com font Inter, pesos 500/700/900

### Etapa 2: Tailwind Config
- Adicionar cores: gold, gold-hover, gold-glow
- Adicionar surfaces: page, card, input, elevated
- Adicionar animacoes customizadas
- Configurar sombras douradas

### Etapa 3: Componentes UI Base
- **Button**: Nova variante `gold` com shimmer interno
- **Card**: Aplicar liquid-glass como estilo padrao
- **Input**: Focus ring dourado, animacao shimmer
- **Badge**: Variantes com cores D3ECOM

### Etapa 4: Layout Principal
- Header com liquid-glass e borda specular
- Bottom navigation mobile com efeito glass
- Sidebar com fundo escuro e hover dourado
- Logo com brilho gold

### Etapa 5: Pagina de Login (Auth.tsx)
- Background preto com blobs animados (liquid-move)
- Card central com liquid-glass
- Botoes dourados com shimmer
- Inputs com animacao de foco

### Etapa 6: Dashboard e Paginas
- Cards de metricas com liquid-glass
- Badges de status com cores atualizadas
- Tabelas com hover dourado sutil
- Botoes de acao em gold

---

## 6. Detalhes Tecnicos

### Variaveis CSS Principais
```css
:root {
  --gold: 45 100% 50%;
  --gold-hover: 45 100% 45%;
  --gold-glow: 45 100% 50%;
  --surface-page: 0 0% 0%;
  --surface-card: 0 0% 7%;
  --surface-input: 0 0% 3%;
  --text-primary: 0 0% 100%;
  --text-secondary: 0 0% 82%;
  --text-muted: 0 0% 54%;
}
```

### Classe Liquid Glass
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

### Animacao Shimmer para Inputs
```css
@keyframes input-shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
```

### Animacao Liquid Move para Blobs
```css
@keyframes liquid-move {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(30px, -50px) scale(1.1); }
  66% { transform: translate(-20px, 20px) scale(0.9); }
}
```

---

## 7. Componentes Afetados

| Componente | Mudanca |
|------------|---------|
| StatusBadge | Novas cores para status (gold para ativos) |
| NotificationCenter | Popup com liquid-glass |
| ShipmentHistoryModal | Modal com liquid-glass e bordas sutis |
| DiagnosticReportModal | Mesmo tratamento |
| Tabs | Indicador dourado |
| Select | Dropdown com liquid-glass |
| Dialog | Overlay escuro, conteudo liquid-glass |

---

## 8. Consideracoes de Performance

- **backdrop-filter** pode impactar performance em dispositivos antigos
- Fallback para dispositivos sem suporte: background solido escuro
- Limitar numero de blobs animados a 2-3 por pagina
- Usar `will-change: transform` nos elementos animados

---

## 9. Compatibilidade

- Manter suporte a Safari com `-webkit-backdrop-filter`
- Testar em dispositivos iOS para garantir efeito glass correto
- Touch targets continuam com minimo 44px

---

## 10. Resultado Esperado

Apos a implementacao, o RASTREIO_FLEX tera:

- Visual escuro premium com profundidade
- Efeitos de vidro liquido em todos os cards e modais
- Cor dourada (#FFC700) como acao principal
- Animacoes suaves e nativas (iOS-like)
- Tipografia Inter com hierarquia clara
- Sombras e brilhos dourados nos elementos interativos

