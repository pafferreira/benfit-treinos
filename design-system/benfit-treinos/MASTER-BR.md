````markdown
# Arquivo Mestre do Design System

> **LÓGICA:** Ao construir uma página específica, verifique primeiro `design-system/pages/[nome-da-pagina].md`.
> Se esse arquivo existir, suas regras **sobrescrevem** este arquivo Mestre.
> Caso contrário, siga rigorosamente as regras abaixo.

---

**Projeto:** Benfit Treinos
**Gerado:** 2026-02-12 18:57:21 · **Atualizado:** 2026-10-13 (v2: alinhado ao app real, tokens em `src/index.css`)
**Categoria:** App mobile de treino (tema claro)

---

## Regras Globais

> Fonte da verdade: as variáveis CSS de `src/index.css`. Use sempre a variável, nunca o hex solto.

### Paleta de Cores

| Papel | Hex | Variável CSS |
|------|-----|--------------|
| Primária (marca, títulos, ações) | `#034EA2` | `--color-primary` (`--color-primary-rgb`) |
| Secundária (gradientes, realces) | `#008ACF` | `--color-secondary` (`--color-secondary-rgb`) |
| Acento | `#F59E0B` | `--color-accent` |
| Sucesso | `#10B981` | `--color-success` |
| Perigo | `#EF4444` | `--color-danger` |
| Fundo do app | `#F3F4F6` | `--color-background-light` / `--color-bg-app` |
| Card | `#FFFFFF` | `--color-card-light` |
| Texto | `#231F20` | `--color-text-main` |
| Texto secundário | `#4B5563` | `--color-subtext-light` |

**Observação de cor:** tema claro; cartões brancos sobre cinza claro; destaque principal em gradiente `--color-primary → --color-secondary` (banner do Início, Dieta). Variantes escuras existem nos tokens (`*-dark`), mas o app força o tema claro.

### Tipografia

- **Fonte principal:** Nunito (fallback Inter, system-ui)
- **Pesos:** 400 corpo, 600/700 rótulos, 800 títulos
- **Tom:** parceiro, direto, motivador

**Import CSS (já em `src/index.css`):**
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap');
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

**Estilo:** App mobile, cartões arredondados (`--radius-xl` / `--radius-2xl`), sombras leves, uma ação principal clara por tela.

**Efeitos-chave:** cabeçalho e barra inferior somem ao rolar para baixo e voltam ao rolar para cima; transições curtas (0,2–0,3 s); respeitar `prefers-reduced-motion`.

### Padrão de Página (v2)

- **Cabeçalho fixo:** título + subtítulo da tela à esquerda; à direita, botão do **Benfit Coach** (ícone de robô), nome/perfil e avatar.
- **Barra inferior:** 4 abas iguais: Início · Dieta · Exercícios · Perfil. **Sem botão central flutuante**: a ação principal de cada tela fica dentro da própria tela (ex.: "Começar treino" no card Treino de hoje, "+ Novo" no topo das listas).
- **Benfit Coach:** abre num painel que sobe de baixo, sobre a tela atual, com o contexto dela ("Vendo: …") e sugestões de pergunta; pode expandir para a página `/coach`. Telas com cabeçalho próprio (sessão do dia, histórico) também mostram o botão do Coach.
- **Início:** banner em gradiente com saudação + Treino de hoje → semana (calendário + números) → Meus planos → Explorar planos (carrossel) → dica que abre o Coach.

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
