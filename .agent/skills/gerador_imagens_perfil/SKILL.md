---
name: gerador_imagens_perfil
description: Gera imagens de perfil de usuários (avatar) mantendo o estilo visual do Benfit (busto, fundo neutro/suave, iluminação de estúdio).
---

# Skill: Gerador de Imagens de Perfil (Avatar)

Use esta skill quando precisar gerar novas imagens de perfil para usuários, coaches ou personas do app Benfit.

## Diretrizes Visuais
1.  **Estilo Geral**:
    - Fotorrealista e profissional.
    - Iluminação de estúdio (softbox), destacando o rosto de forma agradável.
    - Fundo neutro (cinza claro, branco ou gradiente suave desfocado) para destacar o usuário.
    - Evitar fundos complexos ou distrações.

2.  **Enquadramento (Busto/Headshot)**:
    - A imagem deve focar no rosto e ombros (busto).
    - O sujeito deve estar olhando para a câmera ou levemente para o lado (estilo retrato corporativo/fitness).
    - Expressão confiante, amigável e saudável.

3.  **Referências Visuais do Projeto**:
    - Use os arquivos abaixo como referência de estilo (iluminação, corte, vibe):
        - `public/avatar-female.png`
        - `public/avatar-male.png`
        - `public/benfit_fem.jpg`
        - `public/benfit_mas.jpg`

## Workflow de Geração
1.  **Pesquisa de Referência (Divertida)**:
    - Se o nome do usuário estiver disponível, use a tool `search_web` para buscar celebridades ou pessoas famosas com o mesmo nome (ex: "famous person named [Nome]").
    - O objetivo é criar uma semelhança sutil ou divertida ("look-alike") com a celebridade encontrada, mantendo o estilo fitness do Benfit.
    - *Exemplo*: Se o nome for "Dwayne", tente incorporar traços do "The Rock" mas com o visual do Benfit.

2.  **Ferramenta**: Use a tool `generate_image`.

3.  **Prompt**: Crie prompts detalhados.
    - *Template*: "Professional portrait, headshot of a [gender] fit person [optional: resembling famous person NAME], [age] years old, [ethnicity], looking at camera, friendly smile, wearing fitness clothing, soft studio lighting, neutral blurred background, 8k resolution, photorealistic."
    - Se encontrou um famoso, adicione: "subtle resemblance to [Famous Person Name], fit version".

4.  **Uso de Referências**:
    - Se desejar manter consistência estrita com o estilo atual (sem celebridade) ou reforçar a iluminação, passe um dos caminhos de imagem de referência (`public/avatar-female.png`, etc.) no parâmetro `ImagePaths`.

## Salvamento
1.  **Nome do Arquivo**: Use nomes descritivos em snake_case (ex: `avatar_joao_silva.png` ou `user_female_01.png`).
2.  **Local**: Geralmente salvas em `public/avatars/` ou `public/` caso seja um asset genérico.
