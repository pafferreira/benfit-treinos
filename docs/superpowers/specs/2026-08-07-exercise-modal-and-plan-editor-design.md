# Ajustes: Modal de Exercício e Tela de Editar Plano

Data: 2026-08-07

## Contexto

Migração `add_multiple_muscle_groups.sql` já aplicada em produção (coluna
`muscle_groups` TEXT[], trigger de sincronia com `muscle_group`, backfill
completo). O código pendente no working tree (`ExerciseModal.jsx`,
`supabase.js`, `useSupabase.js`, etc.) já assume essa coluna, mas antes de
commitar, este spec cobre ajustes de UX pedidos sobre o modal de exercício e
a tela de editar plano.

## 1. ExerciseModal — mobile

Modal usa `size="full"` (`Modal.jsx`), que hoje renderiza `w-[90%]` no
mobile mas percebido como colado nas bordas (padding interno grande demais
em relação à margem sobrante). Ajustar padding/gap responsivos do modal e do
conteúdo (`p-6`, `gap-8`) para telas pequenas, garantindo margem lateral
visível. Sem mudança estrutural — validar visualmente no navegador durante a
implementação.

## 2. ExerciseModal — estrutura de abas

Modal ganha 3 abas de nível superior: **Detalhes | Planos | Histórico**.

- **Detalhes**: mantém o padrão de persianas (accordion) atual:
  - "Informações Básicas" (nome, equipamento) — aberta por padrão.
  - "Grupos Musculares" — **nova persiana própria**, separada de
    "Informações Básicas", **fechada por padrão**. Cabeçalho mostra os
    grupos selecionados como chips quando fechada. Lista de grupos em
    **ordem alfabética**.
  - "Instruções Passo a Passo" — fechada por padrão (comportamento atual).
  - "Tags e Metadados" — fechada por padrão (comportamento atual).
- **Planos**: usa `supabaseHelpers.getExerciseUsage(exerciseId)` (já
  implementado em `supabase.js`) — lista os planos em que o exercício
  aparece, agrupados por plano (título, dificuldade), com os dias e
  séries/reps/descanso de cada aparição.
- **Histórico**: usa `supabaseHelpers.getExerciseHistory(userId, exerciseId,
  limit)` (já implementado) — timeline agrupada por sessão, reaproveitando o
  padrão visual do componente `ActivityHistory` (data relativa, foto
  pequena do exercício, séries com peso/reps por sessão).
- Abas "Planos" e "Histórico" só aparecem quando o exercício já existe
  (`exercise?.id` truthy) — não fazem sentido ao criar um exercício novo.

### Controle de acesso por perfil

Usuário comum (`isUser && !isAdmin && !isPersonal`, mesma regra que hoje
define `readOnly` em `Exercises.jsx`) **vê as abas Planos e Histórico, mas
com o conteúdo bloqueado/desabilitado** (estado visual de cadeado/disabled,
sem disparar fetch de dados). Admin e personal veem o conteúdo normalmente.
A aba "Detalhes" continua acessível a todos os perfis (respeitando o
`readOnly` já existente para usuário comum).

## 3. Dados legados: muscle_group composto

9 exercícios têm hoje `muscle_group`/`muscle_groups` com valor composto
livre (ex: "Pernas / Glúteo", "Posterior / Lombar", "Ombros / Trapézio") que
não corresponde a nenhuma opção da lista fixa de grupos musculares.

Ao abrir esses exercícios na persiana "Grupos Musculares": o valor legado
aparece como **chip cinza, somente leitura, com rótulo "legado"**, separado
visualmente dos checkboxes normais, junto de um aviso pedindo para
reclassificar nos grupos corretos da lista. Nenhum mapeamento automático —
o exercício permanece com o valor legado até o usuário escolher os grupos
corretos e salvar (o que substitui o valor composto pelos grupos
selecionados).

Lista afetada (para referência, não travar no spec — pode mudar até a
implementação):
Agachamento Búlgaro, Extensão de Quadril (Banco Romano), Good Morning,
Levantamento Terra Sumô, RDL (Romanian Deadlift), Recuo no Smith, Remada
Alta, Stiff com Barra, Stiff com Halter.

## 4. WorkoutEditor (Tela Editar Plano)

Layout atual: campos de topo (título, descrição, dificuldade, duração,
dias/semana) sempre visíveis + "Estrutura do Treino" com dias colapsáveis
(um aberto por vez) + exercícios sempre expandidos dentro do dia aberto.

Novo layout, 3 níveis de persiana:

1. **"Dados do Plano"**: título, descrição, dificuldade, duração e
   dias/semana entram juntos nesta persiana, fechada após preenchida.
2. **"Estrutura do Treino"**: dias — mantém o comportamento atual (um dia
   aberto por vez, colapsa os demais).
3. **Exercícios dentro do dia aberto**: cada exercício (Ex 1, Ex 2...) vira
   persiana individual, **fechada por padrão**. Fechada mostra apenas foto
   pequena (miniatura) + nome do exercício escolhido. Aberta permite editar
   séries/reps/descanso/notas.

## 5. Busca e foto do exercício

- `SearchableExerciseSelect.jsx`: busca hoje é `toLowerCase().includes()`
  simples. Passa a normalizar removendo acentos (`normalize('NFD').replace
  (/[̀-ͯ]/g, '')`) tanto no termo digitado quanto no nome/grupo
  muscular comparado, para que "biceps" encontre "Bíceps".
- Foto do exercício (`image_url`) passa a aparecer:
  - Na linha do dropdown já selecionada (miniatura ao lado do nome, no
    trigger do `SearchableExerciseSelect`).
  - No cabeçalho fechado da persiana de cada exercício dentro do dia
    (reaproveita a mesma miniatura, item 4 acima).

## Fora de escopo

- Card de exercício em `Exercises.jsx` (exibição "Pernas/Glúteos") não muda
  — só o modal.
- Nenhum mapeamento automático de dados legados.
- Histórico/Planos no modal sempre referem ao usuário logado atual — sem
  seletor de usuário (diferente de `ActivityHistory`, que aceita
  `userId` como prop).
