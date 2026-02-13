````markdown
# Arquivo Mestre do Design System

> **LÓGICA:** Ao construir uma página específica, verifique primeiro `design-system/pages/[nome-da-pagina].md`.
> Se esse arquivo existir, suas regras **sobrescrevem** este arquivo Mestre.
> Caso contrário, siga rigorosamente as regras abaixo.

---

**Projeto:** Benfit Treinos
**Gerado:** 2026-02-12 18:57:21
**Categoria:** Dashboard Analítico

---

## Regras Globais

### Paleta de Cores

| Papel | Hex | Variável CSS |
|------|-----|--------------|
| Primária | `#0F172A` | `--color-primary` |
| Secundária | `#1E293B` | `--color-secondary` |
| CTA/Acento | `#22C55E` | `--color-cta` |
| Fundo | `#020617` | `--color-background` |
| Texto | `#F8FAFC` | `--color-text` |

**Observação de cor:** Fundo escuro + indicadores positivos em verde

### Tipografia

- **Fonte de título:** Fira Code
- **Fonte do corpo:** Fira Sans
- **Tom:** dashboard, dados, análise, código, técnico, preciso
- **Google Fonts:** [Fira Code + Fira Sans](https://fonts.google.com/share?selection.family=Fira+Code:wght@400;500;600;700|Fira+Sans:wght@300;400;500;600;700)

**Import CSS:**
```css
@import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600;700&family=Fira+Sans:wght@300;400;500;600;700&display=swap');
```

### Variáveis de Espaçamento

| Token | Valor | Uso |
|-------|-------|-------|
| `--space-xs` | `4px` / `0.25rem` | Espaços muito apertados |
| `--space-sm` | `8px` / `0.5rem` | Espaço entre ícones, espaçamento inline |
| `--space-md` | `16px` / `1rem` | Padding padrão |
| `--space-lg` | `24px` / `1.5rem` | Padding de seção |
| `--space-xl` | `32px` / `2rem` | Espaços grandes |
| `--space-2xl` | `48px` / `3rem` | Margens de seção |
| `--space-3xl` | `64px` / `4rem` | Padding de hero |

### Profundidade de Sombra

| Nível | Valor | Uso |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Elevação sutil |
| `--shadow-md` | `0 4px 6px rgba(0,0,0,0.1)` | Cards, botões |
| `--shadow-lg` | `0 10px 15px rgba(0,0,0,0.1)` | Modais, dropdowns |
| `--shadow-xl` | `0 20px 25px rgba(0,0,0,0.15)` | Imagens de destaque, cards principais |

---

## Especificações de Componentes

### Botões

```css
/* Botão Primário */
.btn-primary {
  background: #22C55E;
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  transition: all 200ms ease;
  cursor: pointer;
}

.btn-primary:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

/* Botão Secundário */
.btn-secondary {
  background: transparent;
  color: #0F172A;
  border: 2px solid #0F172A;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  transition: all 200ms ease;
  cursor: pointer;
}
```

### Cards

```css
.card {
  background: #020617;
  border-radius: 12px;
  padding: 24px;
  box-shadow: var(--shadow-md);
  transition: all 200ms ease;
  cursor: pointer;
}

.card:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
}
```

### Inputs

```css
.input {
  padding: 12px 16px;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 200ms ease;
}

.input:focus {
  border-color: #0F172A;
  outline: none;
  box-shadow: 0 0 0 3px #0F172A20;
}
```

### Modais

```css
.modal-overlay {
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
}

.modal {
  background: white;
  border-radius: 16px;
  padding: 32px;
  box-shadow: var(--shadow-xl);
  max-width: 500px;
  width: 90%;
}
```

---

## Diretrizes de Estilo

**Estilo:** Dashboard Data-Denso

**Palavras-chave:** Vários gráficos/widgets, tabelas de dados, cartões KPI, padding mínimo, layout em grade, economia de espaço, máxima visibilidade de dados

**Indicado para:** Dashboards de business intelligence, análise financeira, relatórios empresariais, dashboards operacionais, data warehousing

**Efeitos-chave:** Tooltips ao passar o mouse, zoom no gráfico ao clicar, realce de linha ao passar o mouse, animações suaves em filtros, indicadores de carregamento de dados

### Padrão de Página

**Nome do padrão:** Video-First Hero

- **Estratégia de conversão:** Vídeo aumenta engajamento em ~86%. Adicionar legendas para acessibilidade. Comprimir vídeo para performance.
- **Posicionamento do CTA:** Sobreposição no vídeo (centro/inferior) + seção inferior
- **Ordem das seções:** 1. Hero com vídeo de fundo, 2. Sobreposição de funcionalidades-chave, 3. Seção de benefícios, 4. CTA

---

## Anti-Padrões (Não usar)

- ❌ Design ornamentado
- ❌ Sem filtros

### Padrões adicionais proibidos

- ❌ **Emojis como ícones** — Use SVG (Heroicons, Lucide, Simple Icons)
- ❌ **Sem cursor:pointer** — Todos os elementos clicáveis devem ter cursor:pointer
- ❌ **Hovers que alteram layout** — Evitar transforms que causem deslocamento de layout
- ❌ **Texto com baixo contraste** — Manter razão de contraste mínima 4.5:1
- ❌ **Mudanças de estado instantâneas** — Use transições (150–300ms)
- ❌ **Estados de foco invisíveis** — Estados de foco devem ser visíveis para acessibilidade

---

## Checklist Pré-Entrega

Antes de entregar qualquer código de UI, verifique:

- [ ] Não usar emojis como ícones (usar SVG)
- [ ] Todas as ícones vêm do mesmo conjunto (Heroicons/Lucide)
- [ ] `cursor-pointer` em todos os elementos clicáveis
- [ ] Estados de hover com transições suaves (150–300ms)
- [ ] Modo claro: contraste de texto mínimo 4.5:1
- [ ] Estados de foco visíveis para navegação por teclado
- [ ] `prefers-reduced-motion` respeitado
- [ ] Responsivo: 375px, 768px, 1024px, 1440px
- [ ] Nenhum conteúdo oculto atrás de barras de navegação fixas
- [ ] Sem scroll horizontal no mobile

````
