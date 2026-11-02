---
name: estilo_paf
description: Design system pessoal do PAF (Paulo Ferreira). Aplique em QUALQUER tarefa de UI, layout, CSS, componentes, cores ou tipografia em projetos do PAF. Base comum a todos os projetos (tokens, componentes, acessibilidade, animações) + um TEMA por projeto (paf, rizkai, centro) que troca cores, fontes e raios. No Super Gê use junto a skill estilo-ge. Tema padrão: paleta azul corporativa, tipografia Nunito+Inter; componentes padronizados, dark mode, animações sem reflow, breakpoints mobile-first, z-index hierarchy, toasts/modais e anti-padrões obrigatórios.
metadata:
  language: pt-BR
  author: PAF
  origem: skills/estilo-paf 2.1.0 + tema paf
---

> **Cópia gerada pelo hub `pafferreira/dev-tools`** (skills/estilo-paf 2.1.0 + tema paf) em 02/11/2026. Não edite aqui: altere a skill no hub e rode `python scripts/copiar_estilo.py` de novo.

## Quando usar

- Qualquer tarefa de UI, CSS, componentes ou layout em projetos do PAF
- Criação ou revisão de páginas, telas, modais, cards, botões, toasts
- Definição de cores, espaçamentos, tipografia, animações
- **Não usar** em tarefas puramente técnicas sem aspecto visual (SQL puro, scripts CLI)

---

## 0. Escolha do tema (fazer primeiro)

Esta skill tem duas camadas:
- **Base** (este arquivo): estrutura de tokens, componentes, dark mode, animações, acessibilidade, anti-padrões e checklist. Vale para **todo** projeto.
- **Tema** (`temas/<nome>.md`): troca só os **valores** dos tokens (cores, fontes, raio, sombra) e registra o que é próprio do produto.

| Projeto | Tema |
|---|---|
| supermercado (Super Gê) | skill **`estilo-ge`** (variação própria; esta base continua valendo) |
| rizkai | `temas/rizkai.md` |
| centro (GFA Nossa Casa) | `temas/centro.md` (= tema `paf`) |
| todos os outros e projetos novos | `temas/paf.md` (padrão, valores abaixo) |

Como aplicar: identifique o projeto pelo repositório ou pelo `CLAUDE.md`, leia o tema e use os **nomes** de tokens da base com os **valores** do tema. Na dúvida, use o tema `paf`. Se o projeto tiver `design-system/<app>/pages/<pagina>.md`, as regras da página prevalecem sobre o tema.

---

## 1. Tokens — CSS Variables (obrigatórias — valores do tema `paf`)

```css
:root {
  /* CORES PRINCIPAIS */
  --color-primary:        #034EA2;
  --color-primary-rgb:    3, 78, 162;
  --color-secondary:      #008ACF;
  --color-secondary-rgb:  0, 138, 207;

  /* FUNDOS */
  --color-background-light: #F3F4F6;
  --color-background-dark:  #111827;
  --color-card-light:       #FFFFFF;
  --color-card-dark:        #1F2937;

  /* TEXTO */
  --color-text-light:    #231F20;
  --color-text-dark:     #F9FAFB;
  --color-subtext-light: #4B5563;
  --color-subtext-dark:  #9CA3AF;
  --color-muted:         #6B7280;   /* texto apagado, placeholders */

  /* SUPERFÍCIES E BORDAS (vindos do Rizkai) */
  --color-surface-2-light: #F9FAFB;  /* inputs, faixas alternadas */
  --color-surface-2-dark:  #111827;
  --color-border-light:    #E5E7EB;
  --color-border-strong:   #D1D5DB;
  --color-border-dark:     #374151;

  /* ESTADOS */
  --color-success: #10B981;
  --color-danger:  #EF4444;
  --color-warning: #F59E0B;
  --color-info:    #008ACF;

  /* SOMBRAS */
  --shadow-sm:  0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md:  0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -1px rgb(0 0 0 / 0.06);
  --shadow-lg:  0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -2px rgb(0 0 0 / 0.05);
  --shadow-xl:  0 20px 25px -5px rgb(0 0 0 / 0.1), 0 10px 10px -5px rgb(0 0 0 / 0.04);
  --shadow-2xl: 0 25px 50px -12px rgb(0 0 0 / 0.25);

  /* BORDER RADIUS */
  --radius-sm:  0.375rem;   /* 6px  — tags, badges */
  --radius-md:  0.5rem;     /* 8px  — inputs, botões */
  --radius-lg:  0.625rem;   /* 10px — cards pequenos */
  --radius-xl:  0.75rem;    /* 12px — cards médios */
  --radius-2xl: 1rem;       /* 16px — cards grandes, modais */
  --radius-full: 9999px;

  /* SPACING SCALE (base 4px) */
  --space-1: 0.25rem;  /* 4px  */
  --space-2: 0.5rem;   /* 8px  */
  --space-3: 0.75rem;  /* 12px */
  --space-4: 1rem;     /* 16px */
  --space-5: 1.25rem;  /* 20px */
  --space-6: 1.5rem;   /* 24px */
  --space-8: 2rem;     /* 32px */
  --space-10: 2.5rem;  /* 40px */
  --space-12: 3rem;    /* 48px */
  --space-16: 4rem;    /* 64px */

  /* Z-INDEX HIERARCHY */
  --z-base:     1;
  --z-dropdown: 20;
  --z-nav:      30;
  --z-sticky:   50;
  --z-header:   100;
  --z-overlay:  9000;
  --z-modal:    9999;
  --z-toast:    12000;
  --z-tooltip:  15000;
}
```

**Gradientes padrão:**
```css
/* Hero / Banners */
background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%);
box-shadow: 0 8px 24px rgba(var(--color-primary-rgb), 0.25);

/* Cards sutis */
background: linear-gradient(135deg, rgba(var(--color-primary-rgb), 0.06), rgba(var(--color-secondary-rgb), 0.04));
```

---

## 2. Breakpoints (mobile-first)

```css
/* sm  */ @media (min-width: 640px)  { }
/* md  */ @media (min-width: 768px)  { }
/* lg  */ @media (min-width: 1024px) { }
/* xl  */ @media (min-width: 1280px) { }
/* 2xl */ @media (min-width: 1536px) { }
```

Regra: **mobile primeiro**, sempre. Container max-width `1280px`, padding lateral `var(--space-4)` (mobile) → `var(--space-8)` (desktop).

---

## 3. Tipografia

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Nunito:wght@400;600;700;800&display=swap');

body { font-family: 'Nunito', 'Inter', system-ui, -apple-system, sans-serif; }
```

| Nível  | Tamanho       | Peso    | Uso                  |
|--------|---------------|---------|----------------------|
| H1     | 1.5rem        | 800     | Títulos de página    |
| H2     | 1.25rem       | 700     | Cabeçalhos de seção  |
| H3     | 1.0625rem     | 700     | Subcabeçalhos        |
| Body   | 0.875–0.95rem | 500–600 | Texto principal      |
| Small  | 0.78–0.8rem   | 600–700 | Labels, metadados    |
| Micro  | 0.65–0.72rem  | 700     | Timestamps, versões  |

---

## 4. Componentes — CSS + React/TSX

### Botão (React + Tailwind)
```tsx
import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
}

const variants: Record<Variant, string> = {
  primary:   'bg-[var(--color-primary)] text-white hover:bg-[#023d82]',
  secondary: 'bg-[rgba(var(--color-secondary-rgb),0.08)] text-[var(--color-primary)] border border-[rgba(var(--color-primary-rgb),0.3)] hover:bg-[rgba(var(--color-secondary-rgb),0.16)]',
  ghost:     'bg-transparent text-[var(--color-primary)] hover:bg-[rgba(var(--color-primary-rgb),0.08)]',
  danger:    'bg-[var(--color-danger)] text-white hover:bg-[#dc2626]',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', loading, disabled, className = '', children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-md font-bold text-sm transition-all duration-200 hover:-translate-y-px disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[rgba(var(--color-secondary-rgb),0.22)] ${variants[variant]} ${className}`}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  ),
);
Button.displayName = 'Button';
```

### Card
```tsx
export function Card({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`bg-[var(--color-card-light)] dark:bg-[var(--color-card-dark)] border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm transition-all duration-200 hover:border-[rgba(var(--color-primary-rgb),0.3)] hover:shadow-md hover:-translate-y-0.5 ${className}`}
      {...props}
    />
  );
}
```

### Input
```css
.form-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #E5E7EB;
  border-radius: var(--radius-md);
  background: #F9FAFB;
  color: var(--color-text-light);
  font-size: 0.9rem;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.form-input:focus {
  border-color: var(--color-secondary);
  box-shadow: 0 0 0 3px rgba(var(--color-secondary-rgb), 0.2);
  outline: none;
}
.dark .form-input { background: #111827; border-color: #374151; color: var(--color-text-dark); }
```

### Badges
```css
.badge { display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.15rem 0.5rem; border-radius: var(--radius-full); font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; border: 1px solid; }
.badge-primary { background: rgba(var(--color-primary-rgb), 0.1);  color: var(--color-primary);  border-color: rgba(var(--color-primary-rgb), 0.2); }
.badge-success { background: rgba(16,185,129,0.12); color: #047857; border-color: rgba(16,185,129,0.28); }
.badge-danger  { background: #fee2e2; color: #dc2626; border-color: #fecaca; }
.badge-warning { background: #fef3c7; color: #d97706; border-color: #fbd9a7; }
```

### Modal (acessível)
```tsx
import { useEffect } from 'react';
import { X } from 'lucide-react';

export function Modal({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="modal-title"
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4"
      style={{ zIndex: 'var(--z-modal)' }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-[var(--color-card-dark)] rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-[fadeIn_200ms_ease-out]">
        <div className="flex justify-between items-center mb-4">
          <h2 id="modal-title" className="text-xl font-bold">{title}</h2>
          <button onClick={onClose} aria-label="Fechar" className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
```

### Toast
```css
.toast {
  position: fixed; bottom: var(--space-6); right: var(--space-6);
  z-index: var(--z-toast);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-lg);
  background: var(--color-card-light);
  border-left: 4px solid var(--color-primary);
  box-shadow: var(--shadow-xl);
  animation: toastIn 250ms cubic-bezier(0.4, 0, 0.2, 1);
}
.toast--success { border-left-color: var(--color-success); }
.toast--danger  { border-left-color: var(--color-danger); }
.toast--warning { border-left-color: var(--color-warning); }

@keyframes toastIn {
  from { opacity: 0; transform: translateX(20px); }
  to   { opacity: 1; transform: translateX(0); }
}
```

### Skeleton (loading)
```css
.skeleton {
  background: linear-gradient(90deg, #E5E7EB 0%, #F3F4F6 50%, #E5E7EB 100%);
  background-size: 200% 100%;
  animation: skeletonShimmer 1.5s ease-in-out infinite;
  border-radius: var(--radius-md);
}
.dark .skeleton {
  background: linear-gradient(90deg, #374151 0%, #4B5563 50%, #374151 100%);
}
@keyframes skeletonShimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

### Empty State
```tsx
import { Inbox } from 'lucide-react';

export function EmptyState({ icon: Icon = Inbox, title, description, action }: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string; description?: string; action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
        style={{ background: 'linear-gradient(135deg, rgba(var(--color-primary-rgb), 0.1), rgba(var(--color-secondary-rgb), 0.06))' }}>
        <Icon className="w-8 h-8 text-[var(--color-primary)]" />
      </div>
      <h3 className="text-lg font-bold mb-1">{title}</h3>
      {description && <p className="text-sm text-[var(--color-subtext-light)] dark:text-[var(--color-subtext-dark)] mb-4 max-w-sm">{description}</p>}
      {action}
    </div>
  );
}
```

---

## 5. Dark Mode

Classe `.dark` no container raiz. **Todo componente deve ter variante dark.**

```css
.componente {
  background: var(--color-card-light);
  color: var(--color-text-light);
  transition: background-color 0.2s, color 0.2s;
}
.dark .componente {
  background: var(--color-card-dark);
  color: var(--color-text-dark);
}
```

---

## 6. Animações — Regra Crítica

```
✅ SEM reflow (sem trembling):
   transform: translateY(-5rem)   ← OK
   opacity: 0                     ← OK

❌ COM reflow (causa trembling):
   padding-top: 0                 ← NÃO
   height: 0                      ← NÃO
   margin-top: -5rem              ← NÃO
```

| Uso               | Duração   | Easing                       |
|-------------------|-----------|------------------------------|
| Hover rápido      | 150–200ms | `ease`                       |
| Estado / feedback | 200–300ms | `ease-in-out`                |
| Entrada / saída   | 250–300ms | `cubic-bezier(0.4,0,0.2,1)`  |

---

## 7. Ícones

**Lucide React exclusivamente.** Nunca emojis como ícones de interface.

| Contexto         | Tamanho  |
|------------------|----------|
| Chips, badges    | 11–13px  |
| Botões, labels   | 14–16px  |
| Cabeçalhos       | 18–20px  |
| Bottom nav       | 24px     |
| Empty states     | 28–32px  |

---

## 8. Acessibilidade (obrigatório)

```css
:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(var(--color-secondary-rgb), 0.22);
  border-color: var(--color-secondary);
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.001ms !important;
    transition-duration: 0.001ms !important;
  }
}
```

- `cursor: pointer` em **todo** elemento clicável
- `aria-label` em botões só-ícone
- `role`, `aria-modal`, `aria-labelledby` em modais
- Tecla `Esc` fecha modais/dropdowns
- Foco preso (focus trap) em modais
- Contraste mínimo **4.5:1** (texto), **3:1** (UI)

---

## 9. Anti-Padrões (NUNCA fazer)

| ❌ Proibido                     | ✅ Alternativa                       |
|---------------------------------|--------------------------------------|
| Emojis como ícones              | Lucide React SVG                     |
| Cores hardcoded (`#3B82F6`)     | `var(--color-primary)`               |
| `rgba(59,130,246,X)`            | `rgba(var(--color-primary-rgb),X)`   |
| Mudar padding/height em scroll  | `transform` + `opacity`              |
| Transições em 0ms               | Mínimo 150ms                         |
| Focus invisible                 | `box-shadow` 3px                     |
| `z-index` aleatório             | Tokens `--z-*`                       |
| `px` em layout                  | `rem`/`em` (mantém `px` só p/ bordas) |
| Texto sem dark mode             | Sempre par `var(--color-text-*)`     |
| Modal sem Esc/focus trap        | Componente Modal acessível           |

---

## 10. Tailwind Config (quando usar Tailwind)

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary:   { light: '#008ACF', DEFAULT: '#034EA2', dark: '#023d82' },
        secondary: { light: '#33AADF', DEFAULT: '#008ACF', dark: '#006FA8' },
      },
      fontFamily: {
        sans: ['Nunito', 'Inter', 'ui-sans-serif', 'system-ui'],
      },
      borderRadius: {
        md: '0.5rem', lg: '0.625rem', xl: '0.75rem', '2xl': '1rem',
      },
      zIndex: {
        dropdown: '20', nav: '30', sticky: '50', header: '100',
        overlay: '9000', modal: '9999', toast: '12000', tooltip: '15000',
      },
    },
  },
};
```

---

## 11. Tokens em JSON (design-tokens / Style Dictionary)

```json
{
  "color": {
    "primary":   { "value": "#034EA2" },
    "secondary": { "value": "#008ACF" },
    "success":   { "value": "#10B981" },
    "danger":    { "value": "#EF4444" },
    "warning":   { "value": "#F59E0B" }
  },
  "radius": { "sm": "6px", "md": "8px", "lg": "10px", "xl": "12px", "2xl": "16px" },
  "space":  { "1": "4px", "2": "8px", "3": "12px", "4": "16px", "6": "24px", "8": "32px" }
}
```

---

## 12. Checklist pré-entrega

- [ ] Cores via `var(--color-*)` — zero hex hardcoded fora do `:root`
- [ ] Ícones Lucide, sem emojis
- [ ] `cursor: pointer` em todos os clicáveis
- [ ] Hover com `transform` e transição 150–300ms
- [ ] Focus visible (`box-shadow` 3px)
- [ ] Dark mode em todo componente
- [ ] Animações: apenas `transform`/`opacity`
- [ ] `prefers-reduced-motion` respeitado
- [ ] Sem scroll horizontal no mobile
- [ ] `aria-label` em botões só-ícone
- [ ] Modais com `Esc`, focus trap, `aria-modal`
- [ ] Z-index via tokens `--z-*`
- [ ] Skeleton/empty state em listas async
- [ ] Mobile-first (breakpoints `min-width`)

---

# Tema deste projeto

# Tema `paf` (padrão)

**Projetos:** meu-bolso, benfit-treinos, obras, newsletter, contratos, gerproj e todo projeto novo.

Os valores são os da seção 1 do `SKILL.md` — este tema não troca nada. Resumo:

| Token | Valor |
|---|---|
| `--color-primary` | `#034EA2` (azul corporativo) |
| `--color-secondary` | `#008ACF` (azul claro) |
| `--color-background-light` / `-dark` | `#F3F4F6` / `#111827` |
| `--color-card-light` / `-dark` | `#FFFFFF` / `#1F2937` |
| `--color-text-light` | `#231F20` |
| Fontes | Nunito (texto e títulos) + Inter (números, tabelas) |
| Raio | 6–16px conforme o componente |

## Variações por projeto

- **benfit-treinos:** pode usar `--color-warning` (`#F59E0B`) como cor de destaque para conquistas e badges.
- Demais projetos: sem variação.
