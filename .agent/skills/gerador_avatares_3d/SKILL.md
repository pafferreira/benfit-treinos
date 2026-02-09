---
name: gerador_avatares_3d
description: Gera avatares 3D estilizados (estilo Pixar/Disney) com alta qualidade, ideal para gamificação e perfis divertidos.
---

# Skill: Gerador de Avatares 3D (Estilo Pixar)

Use esta skill quando precisar gerar imagens de perfil ou personagens em estilo 3D estilizado (Pixar, Disney, Dreamworks), focando em carisma e alta qualidade de renderização.

## Diretrizes Visuais
1.  **Estilo Artístico**:
    - **Pixar/Disney Style**: Olhos grandes e expressivos, traços suaves, proporções estilizadas (cabeça levemente maior, mas harmônica).
    - **Carisma**: Personagens devem ter "appeal" e simpatia imediata.
    - **Tema**: Fitness/Saúde (roupas esportivas, aparência saudável e energética).

2.  **Qualidade de Renderização (Técnico)**:
    - **Iluminação**: Uso obrigatório de *Rim Light* (luz de recorte) para separar o personagem do fundo e dar volume. Iluminação de estúdio suave (Softbox) na frente.
    - **Materiais**: Pele com *Subsurface Scattering* (SSS) para aspecto de cera/pele viva e macia, evitando aspecto de plástico duro. Tecidos com textura visível.
    - **Motor**: Referências visuais de *Octane Render*, *Redshift* ou *Unreal Engine 5*.

3.  **Enquadramento e Fundo**:
    - **Corte**: Busto (Chest up) ou Close-up.
    - **Fundo**: Cores sólidas e vibrantes ou pastéis (Azul, Amarelo, Verde, Branco), sem cenários complexos para facilitar uso como ícone/avatar.

## Workflow de Geração

1.  **Construção do Prompt**:
    Use o template abaixo para garantir a qualidade "Premium":

    > **Template**:
    > "Disney Pixar style 3D character, [Gender] [Role/Archetype], bust shot (chest up), [Expression] expression, big expressive eyes, stylized proportions.
    > **Technical details**: Cinematic lighting, strong rim light to separate from background, subsurface scattering skin texture, detailed hair, 3D render, Octane Render, 8k resolution, masterpiece.
    > **Background**: Solid [Color] background."

2.  **Parâmetros Variáveis**:
    - **Gender**: Male, Female.
    - **Role**: Fitness enthusiast, athlete, runner, personal trainer.
    - **Expression**:
        - *Happy*: Smiling, friendly, welcoming.
        - *Brave*: Determined, focused, confident smirk.
        - *Energetic*: Excited, dynamic.
    - **Color**: Light Blue, Pastel Yellow, Mint Green, White, Soft Purple.

## Exemplos de Prompts
- *Heroico*: "Pixar style 3D character, female fitness hero, brave determined expression, hands on hips, strong rim light, solid white background..."
- *Amigável*: "Pixar style 3D character, male personal trainer, happy waving, friendly smile, volumetric lighting, solid blue background..."

48. ## Salvamento
49. 1.  **Local**: Salve em `public/avatars/`.
50. 2.  **Nomenclatura**: Use nomes amigáveis em português, sugerindo um nome próprio fictício para dar personalidade.
51.     - Padrão: `avatar_[nome_sugerido]_[emoção].png`
52.     - *Exemplos*:
53.       - `avatar_joao_bravo.png` (em vez de `avatar_pixar_male_yellow_brave`)
54.       - `avatar_ana_feliz.png`
55.       - `avatar_lucas_determinado.png`
