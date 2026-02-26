---
name: Apple_UIUX
description: |
  Diretrizes de Design da Apple (Human Interface Guidelines - HIG) e principais alertas de rejeição da App Store (Regras de UI/UX, funcionalidade mínima e exigências técnicas "rígidas").
---

# 🍏 Apple UI/UX & App Store Survival Guide

Esta skill condensa as temidas "regras rígidas" da Apple para aprovação na App Store. O ecossistema iOS pune severamente aplicativos que parecem "sites envelopados" (PWA num "wrapper") ou que entregam baixa funcionalidade nativa. 

Use este guia como checklist mental constante ao desenvolver telas, fluxos e botões no Benfit, preparando o terreno gradativamente para uma futura aprovação sem estresse.

---

## 🛑 As "Regras Terríveis" (Por que a Apple rejeita Apps)

A base militar da App Store é a **Section 4.0 - Design** do seu Guia de Revisão. Se o Benfit tropeçar em alguma dessas, o reviewer joga na lixeira:

### 4.2 Minimum Functionality (A Lâmina Afiada)
*   **O "App de Site" é banido:** Aplicativos que *parecem, funcionam ou se comportam como um website empacotado* são banidos instantaneamente. É proibido ter apenas conteúdo estático. 
*   **Aparência Nativa Exigida:** Elementos que revelam que o app é "web" (bordas de foco estranhas, inputs de formulário que não abrem o teclado nativo de forma fluida, lentidão de clique de `300ms`, scroll travado) acionam o alarme.
*   **Utilidade Real:** O app precisa oferecer recursos que validem sua presença no celular em vez do navegador (Push Notifications vitais, hardware, animações complexas, cache offline pesado).

### 4.8 Sign in with Apple (A Regra da Prisão)
*   Se o aplicativo utilizar serviços de login de terceiros (Google, Facebook, X, etc.) de forma social/rápida, **É OBRIGATÓRIO** oferecer lado a lado a opção "Sign in with Apple" (Entrar com a Apple). 
*   O botão da Apple deve ter destaque igual ou superior aos demais da tela (Design, tamanho, legibilidade). Sem isso, aprovação bloqueada imediata.

### 4.0 Clean & Simple Design
*   **Estado Vazio (Empty States):** Telas sem dados que apenas mostram um painel branco geram alertas. É exigido "Empty States" polidos (Ícone, texto amigável e botão de "call to action" para preencher algo). Nós já fazemos isso bem no Benfit!
*   **Ação de Voltar:** A navegação precisa fazer sentido hierárquico. Um botão "voltar" nativo deve voltar para a tela anterior exata, sem "quebrar" ou perder o estado de abas (tabs). `Swipe to go back` (deslizar a tela pra esquerda) é esperado organicamente pelos usuários Apple.
*   **Tamanho de Toque (Touch Targets):** Essa é letal. Todo botão tapável, link ou área clicável **TEM QUE TER** no mínimo **44x44 points (aproximadamente `44px`)**. Botões pequenos grudados uns nos outros são rejeitados por UX ruim.

### 5.1.1 Data Collection and Storage (Privacidade Extremista)
*   Nunca peça uma permissão do celular (Câmera, Fotos, Localização, **HealthKit/Saúde**) no carregamento inicial do app.
*   **Contextualize:** A permissão *só deve ser pedida na hora exata que o usuário clicar* em algo que necessite daquilo (Ex: Clicou em "Trocar Avatar" -> Pede câmera. Clicou em "Sincronizar Relógio" -> Pede Saúde).
*   Você é obrigado a escrever uma string no código nativo (o "Purpose String") detalhando com exatidão implacável do **porquê** você precisa usar aquela foto ou dado de saúde, senão = Rejeição.

---

## 🎨 O DNA Visual da Apple (Human Interface Guidelines - HIG)

Se quisermos que o Benfit pareça natural no iOS desde a raiz Web/CSS, devemos adotar os três pilares que regem a mente do designer da Apple:

### 1. Clarity (Clareza Obcecada)
O conteúdo vem antes de qualquer "fru-fru". O texto tem que brilhar, o contraste tem que ser perfeito.
*   **Tipografia:** A San Francisco (ou suas variações em Inter/Roboto) deve reinar. Textos devem comunicar estado, título deve ser grosso e subtítulo sutil, guiando os olhos.
*   **Espaço Negativo (Whitespace):** Não encha as telas de bordas grossas e linhas soltas dividindo contéudo demais. A Apple separa blocos usando espaços vazios, respiro e sombras minimalistas. É o *Flat Design* em sua essência higienizada.

### 2. Deference (Submissão da Interface ao Conteúdo)
A "caixa" do app não deve gritar mais alto que o treino sendo visualizado. 
*   **Cores de Ação:** A interface base deve ser pálida (brancos brilhantes no claro, ou "True Black/Dark Grays" no escuro). Use SUA COR PRINCIPAL (Azul Benfit) **exclusivamente** para botões de ação clicáveis e realces vitais. Não pinte fundo de cards a toa. O azul é o chamariz do "clique me".
*   **Modo Escuro Genuíno:** Exigido por quase todos os usuários do ecossistema. Nosso app já domina isso (usando variáveis `--color-background-dark`, text-dark). A pureza do `#000` (Pitch Black) em fundos de iOS OLED economiza bateria e dá nota 10 no design.

### 3. Depth (A Terceira Dimensão Falsa)
iOS é obcecado em mostrar "Camadas" (Layers) para que as pessoas não percam onde clicaram. 
*   **Blur & Glassmorphism:** O iOS ama o `backdrop-filter: blur(15px);` do CSS. Quando a tela rola, o header/navigation bar deve ficar translúcido desfocando os exercícios que passam por baixo. (Já fizemos isso de forma maravilhosa no `WorkoutDayDetails` e no `ActivityHistory`). O *Sheet Modal* padrão do iOS (modais que sobem do fundo em vez de pipocar no meio da tela) são o xodó deles para ações de fluxo (nós temos que migrar alguns fluxos pesados no futuro para o bottom-sheet effect).
*   **Animações com Inércia (Spring physics):** Não use apenas `ease-in-out` de CSS genérico se possível em coisas longas. A Apple prefere transições matemáticas físicas (`cubic-bezier` de spring). Componentes devem "reagir" suavemente sem parecer lentos.

---

## 🛠️ Como o Benfit vai usar esta Skill no dia a dia:

Daqui em diante, sempre que solicitarmos o desenho de uma funcionalidade forte, essa *Skill* entra em alerta vermelho passivo na mente do nosso desenvolvedor assistente:

1.  **"O botão está menor que 44px?"**
2.  **"Criei botões grudados difíceis para dedos gordos?"**
3.  **"Ao rolar a janela, o scroll base da web está engasgando ou tem o header flutuando bonito?"**
4.  **"Se isso fosse nativo, e o celular perdesse a rede no meio do loading, ele morre tela branca ou tem um Empty State acolhedor avisando o usuário?"**
5.  **"Isso já atende o Dark Mode instantaneamente?"**

Preparando a base do React nesses preceitos e com essa arquitetura visual firme, quando chegar o "momento de riqueza" para empacotar o Benfit em Capacitor ou levá-lo para app puro nativo iOS, as lógicas de telas, fluxos UX e contraste simplesmente flutuarão na App Store, com **risco de rejeição reduzido em 90%.**
