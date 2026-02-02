---
name: gerador_imagens_exercicios
description: Gera imagens de exercícios mantendo consistência visual (fotorrealista, fundo neutro) e biomecânica correta.
---

# Skill: Gerador de Imagens de Exercícios

Use esta skill quando precisar gerar novas imagens ilustrativas para exercícios do app Benfit.

## Diretrizes Visuais
1.  **Estilo Geral**:
    - Fotorrealista.
    - Iluminação suave de estúdio (softbox), sem sombras duras.
    - Fundo neutro e limpo (cinza claro #F0F0F0 ou branco), sem distrações de cenário de academia.
    - Foco na clareza do movimento e na biomecânica perfeita.

2.  **Modelo/Personagem**:
    - Manter consistência de biotipo: Atlético, saudável, roupas de treino neutras (evitar logos de marcas grandes).
    - Referências visuais do projeto: `public/avatar-female.png`, `public/avatar-male.png`, `public/Elifit_Coach.png` `public/benfit_fem.jpg`, `public/benfit_mas.jpg`. Tente aproximar o estilo desses modelos e alternar entre eles.

3.  **Enquadramento**:
    - Corpo inteiro visível para exercícios em pé/deitados.
    - Plano médio para exercícios focados (ex: bíceps, pescoço), mas garantindo contexto.
    - Ângulo que melhor demonstre a execução (geralmente 45 graus ou lateral).

## Workflow de Geração
1.  **Prompt**: Crie prompts detalhados descrevendo a posição exata, membros envolvidos e postura.
    - *Exemplo*: "Professional fitness photo, studio shot over white background, a fit person doing an isometric plank, perfect straight back posture, engaging core, soft lighting, 8k resolution."
2.  **Ferramenta**: Use a tool `generate_image`.

## Salvamento e Organização
1.  **Diretório**: Salve todas as imagens geradas em `public/exercicios/`. Crie a pasta se não existir.
2.  **Nomenclatura**:
    - Snake Case.
    - Padrão: `nome_do_exercicio_variacao.png`
    - *Exemplos*:
      - `agachamento_isometrico.png`
      - `flexao_bracos_joelho.png`
      - `prancha_frontal.png`
