---
name: Estilo-PAF
description: Sistema de Design baseado na identidade visual do Detran SP / Governo do Estado de São Paulo.
---

# Estilo-PAF

Este skill define as diretrizes visuais para aplicar o "Estilo-PAF" (baseado no Detran SP) ao projeto Benfit Treinos.

## 1. Paleta de Cores

A identidade visual é fortemente baseada nos tons de azul do Estado de São Paulo.

| Token | Cor | Hex | Descrição |
| :--- | :--- | :--- | :--- |
| **Primary** | Azul SP Governo | `#034EA2` | Usado em cabeçalhos, botões primários e marcas. |
| **Secondary** | Azul Claro SP | `#008ACF` | Usado em destaques, ícones e estados de hover/foco. |
| **Accent** | Laranja/Amarelo | `#F59E0B` | Usado para alertas ou chamadas de atenção (mantido do Benfit original se compatível). |
| **Text** | Preto SP | `#231F20` | Texto principal, títulos. |
| **Text Secondary** | Cinza Escuro | `#4B5563` | Subtítulos, legendas. |
| **Background** | Cinza Claro | `#F3F4F6` | Fundo geral da aplicação (bg-gray-100). |
| **Card Bg** | Branco | `#FFFFFF` | Fundo de cards e modais. |
| **Success** | Verde | `#10B981` | Mensagens de sucesso. |
| **Error** | Vermelho | `#EF4444` | Mensagens de erro. |

## 2. Tipografia

O padrão moderno do governo utiliza fontes sem serifa, limpas e legíveis.
*Recomendação:* Manter `Inter` ou `Nunito` (já presentes no projeto) ajustando os pesos. A identidade oficial usa `Futura` (títulos) e `Verdana` (texto), mas `Inter` é uma excelente substituta moderna para web.

*   **Títulos (`h1` - `h3`)**: Font-weight `700` (Bold), cor Primary ou Text.
*   **Corpo (`p`, `span`)**: Font-weight `400` (Regular) ou `500` (Medium), cor Text ou Text Secondary.

## 3. Componentes UI

### Botões (`.btn-primary`, `.btn-secondary`)
*   **Shape**: Cantos levemente arredondados (`rounded-lg` ou `rounded-md`), **NÃO** totalmente redondos (`rounded-full`) a menos que seja um ícone isolado.
*   **Primary**: Background `#034EA2`, Texto Branco, Hover `#003C80`.
*   **Secondary**: Borda `#034EA2` ou Background `#008ACF` (10-20% opacity), Texto `#034EA2`.

### Cards & Containers
*   **Background**: Branco (`bg-white`).
*   **Borda**: Sutil (`border border-gray-200`) ou nenhuma se houver sombra forte.
*   **Sombra**: Suave (`shadow-sm` ou `shadow-md`). `shadow-xl` apenas para modais ou dropdowns.
*   **Padding**: Espaçamento generoso (`p-4` a `p-6`).

### Inputs & Formulários
*   **Background**: Branco ou Cinza muito claro (`bg-gray-50`).
*   **Borda**: Cinza (`border-gray-300`).
*   **Foco**: Borda Secondary (`#008ACF`) com Ring suave.
*   **Label**: Texto escuro, weight `500`.

### Header / Navegação
*   **Estilo**: Sólido (Primary Color) ou Branco com borda inferior.
*   **Logo**: Alinhado à esquerda.

### Tooltips em Botões (Obrigatório)
*   **Aplicação**: botões e elementos interativos com tooltip devem seguir padrão único.
*   **Fundo**: branco sólido (`#FFFFFF`).
*   **Texto**: escuro com alto contraste (`--color-text-main`).
*   **Borda/Sombra**: borda sutil (`#dbe3ee`) + sombra leve (`shadow-sm`/`shadow-md`).
*   **Acessibilidade**: tooltip deve aparecer em `hover` e também em foco por teclado (`:focus-visible`).

### Fluxo de Saída / Cancelamento (Obrigatório)
*   **Escape (`ESC`)**: Toda tela de criação/edição e todo modal deve permitir fechar/cancelar via tecla `ESC`.
*   **Botão Voltar (dispositivo/browser)**: Fluxos de edição devem respeitar o botão de voltar nativo (Android/browser), levando o usuário ao contexto anterior sem travar navegação.
*   **Ação Visível**: Sempre exibir ação explícita de `Cancelar`/`Voltar` na interface.

### Estados de Carregamento (Skeleton)
*   **Skeleton obrigatório** em telas de listagem/detalhe com carregamento remoto.
*   **Estilo**: placeholders com shimmer suave, bordas arredondadas moderadas (`rounded-md`/`rounded-lg`), mantendo hierarquia visual da tela real.
*   **Comportamento**: remover skeleton assim que os dados chegarem; não manter animações decorativas contínuas fora de estado de loading.

## 4. Como Aplicar (Tailwind Configuration)

Para implementar este estilo, atualize o `tailwind.config.js` ou as variáveis CSS em `index.css`:

```css
:root {
  /* Estilo-PAF Override */
  --color-primary: #034EA2;    /* Azul SP */
  --color-secondary: #008ACF;  /* Azul Claro */
  --color-text-main: #231F20;  /* Preto SP */
  --color-background-light: #F3F4F6;
  
  /* Ajuste de Border Radius */
  --radius-default: 0.5rem;    /* 8px - Mais quadrado que o tema anterior */
  --radius-xl: 0.75rem;        /* 12px */
  --radius-2xl: 1rem;          /* 16px */
}
```

## 5. Exemplo de Uso (Código)

```jsx
// Botão Estilo-PAF
<button className="bg-[#034EA2] hover:bg-[#003C80] text-white font-bold py-2 px-4 rounded-lg shadow-sm transition-colors">
  Acessar Sistema
</button>

// Card Informativo
<div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
  <h3 className="text-[#034EA2] font-bold text-lg mb-2">Serviços Online</h3>
  <p className="text-gray-600">Consulte seus pontos e agende exames.</p>
</div>
```

## 6. Padrão de Cabeçalho Fixo Absoluto (Mobile Optimization)

Este padrão otimiza o espaço vertical em dispositivos móveis, fixando o título da página no topo absoluto (`position: fixed`) sobre o cabeçalho base da aplicação ao rolar.

### Conceito
Ao rolar a página, o cabeçalho de contexto (ex: Título do Treino) deve se fixar no topo absoluto da janela (`position: fixed`), cobrindo qualquer barra de navegação superior do layout base.

### Implementação CSS
A classe `.stuck` deve ser aplicada ao container do cabeçalho quando o scroll for detectado.

```css
/* Estado Base */
.page-header {
  position: sticky; /* ou relative */
  top: 0;
  transition: all 0.2s ease;
}

/* Estado Fixado (Stuck) */
.page-header.stuck {
  position: fixed;   /* Sai do fluxo e vai para o topo da window */
  top: 0;
  left: 0;
  width: 100%;       /* Ocupa largura total */
  z-index: 1000;     /* Fica sobre tudo */
  margin: 0;         /* Reseta margens do layout pai */
  padding: 0.75rem 1rem;
  
  background: #ffffff; /* Fundo sólido opaco */
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); /* Sombra suave */
  border-bottom: 1px solid rgba(0,0,0,0.05);

  animation: slideInDown 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideInDown {
    from { transform: translateY(-100%); }
    to { transform: translateY(0); }
}
```

### Implementação React
É necessário monitorar o scroll e renderizar um elemento "Spacer" invisível para evitar que o conteúdo salte quando o cabeçalho sair do fluxo.

```jsx
const [isHeaderStuck, setIsHeaderStuck] = useState(false);
// ... lógica de scroll ...
return (
  <>
    <div className={`page-header ${isHeaderStuck ? 'stuck' : ''}`}>...</div>
    {/* Spacer condicional */}
    {isHeaderStuck && <div style={{ height: '72px' }} aria-hidden="true" />}
  </>
);
```
