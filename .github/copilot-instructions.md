## Guia rápido para agentes de codificação (PAF / Paulão / Affonso)

Este repositório é um app React + Vite que usa Supabase (BD + Auth) como backend principal e chama a OpenAI no cliente para a funcionalidade AICoach. Abaixo está um playbook prático para que um agente seja produtivo rapidamente.

### Visão geral da arquitetura
- Frontend: React + Vite. Entrada: `src/main.jsx`. Rotas em `src/App.jsx`.
- Dados & Auth: Supabase (cliente em `src/lib/supabase.js`) — atenção a Row-Level Security (RLS) e ao shape das tabelas.
- AI: Wrapper em `src/services/openai.js` que constrói o SYSTEM_PROMPT (em Português) e envia mensagens ao modelo.

### Comandos essenciais
- Desenvolvimento (HMR): `npm run dev`
- Build: `npm run build`
- Preview (build): `npm run preview`
- Lint: `npm run lint`

Variáveis de ambiente (arquivo `.env` na raiz):
- `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` — obrigatórias para operações com Supabase.
- `VITE_OPENAI_API_KEY` — usado em `src/services/openai.js`. OBS: hoje a chave é usada no browser (`dangerouslyAllowBrowser: true`) — preferir um proxy/endpoint servidor para produção.

### Pontos críticos / integração (verificar antes de editar)
- `src/lib/supabase.js` — contém `supabase` e `supabaseHelpers` (getAllExercises, getAllWorkouts, createWorkout, updateWorkout, etc.).
  - Muitos helpers lançam erro (`throw`) quando o Supabase retorna um erro; os callers (hooks/pages) costumam capturar e aplicar fallback para arquivos em `src/data/`.
  - `getAllWorkouts()` usa selects aninhados (b_workout_days → b_workout_exercises → b_exercises). O UI espera esse shape aninhado.
  - Estratégia de atualização de treino: `updateWorkout` apaga dias existentes e recria (intencional — evita atualizações parciais/complexas).

- `src/hooks/useSupabase.js` — hooks como `useExercises` e `useWorkouts`:
  - Registram logs detalhados no console (úteis para debugging).
  - Em falha do Supabase, fazem fallback para `src/data/exercises.js` e `src/data/workouts.js` — preserve esse comportamento.

- `src/services/openai.js` — constrói mensagens incluindo um SYSTEM_PROMPT longo em Português. Exige atenção de segurança (não deixar chaves expostas em PRs).

-- Tabelas administrativas: usar prefixo `z_`
- Há tabelas com prefixo `z_` reservadas para controle de usuários e sistemas (permissões, roles e dados operacionais). Não misture alterações nessas tabelas com as tabelas de domínio (`b_`); ao tocar em `z_` verifique `database/` e documente a mudança no PR.
 - Há tabelas com prefixo `z_` reservadas para controle de usuários e sistemas (permissões, roles e dados operacionais). Essas tabelas residem no banco de dados chamado **`Inventario`**. Não misture alterações nessas tabelas com as tabelas de domínio (`b_`); ao tocar em `z_` verifique `database/` e documente a mudança no PR.

-- Esqueci minha senha
- A funcionalidade "Esqueci minha senha" usa atualmente o magic link do Supabase (fluxo cliente). Ao alterar esse fluxo, documente o motivo e verifique se o `VITE_SUPABASE_URL`/anon key estão corretamente configurados no ambiente de testes.

### Convenções do projeto (importante)
- Idioma: strings/logs e muitos textos estão em Português (Brasil). Ao alterar texto de domínio prefira Português.
- Resiliência: hooks tentam Supabase e só então recorrem a dados locais — não remova essa camada sem avaliar UX/offline.
- Identificadores: o banco usa UUIDs; ao mapear resultados prefira os campos FK explícitos (`exercise_id`) quando disponível.

### Regras operacionais para o agente (Playbook)
1. Sempre verificar `package.json` scripts antes de adicionar novos comandos.
2. Ao modificar `supabaseHelpers`: escreva a função no `supabase.js`, re-use nas hooks em `src/hooks/` e preserve a estratégia de erro -> fallback.
3. Para alterações em rotas/páginas, atualize `src/App.jsx` e garanta que componentes em `src/pages/` suportem o novo shape dos dados.
4. Ao tocar em `src/services/openai.js`, substitua o uso direto da chave por um proxy quando possível; documente claramente a mudança no PR.
5. Não crie migrations diretas no código cliente — use os scripts em `database/` e documente alterações de schema.

### Checklist curto (PR / mudanças rápidas)
- [ ] Verifique variáveis de ambiente necessárias (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_OPENAI_API_KEY).
- [ ] Confirme se `supabaseHelpers` está sendo chamado pelas hooks corretas (`useWorkouts`, `useExercises`).
- [ ] Preserve fallback para `src/data/` caso o Supabase falhe (UX offline/testes).
- [ ] Não exponha chaves em commits — prefira secrets/CI.
- [ ] Atualize `database/` scripts se alterar schema e cite no PR como aplicar no Supabase.

### Exemplos práticos (onde olhar)
- Ler workouts com shape esperado: `supabaseHelpers.getAllWorkouts()` + transformação em `useWorkouts` (ver `src/hooks/useSupabase.js`).
- Adicionar um endpoint/feature AI: revisar `src/services/openai.js` e criar um proxy serverless se for produção.

### Testes e segurança
- Não há testes automáticos no repositório; ao criar lógica crítica (helpers, transforms) acrescente um script de verificação local (node + jest/mocks) e documente como executar.
- Nunca commit uma `.env` com chaves reais. Use secrets do CI ou variáveis de ambiente no ambiente de preview.

---
Se quiser, PAF (Paulão / Affonso), eu adapto o tom para português técnico mais direto ou adiciono uma seção de 'Do/Don't' com regras mais rígidas sobre tocar em código de banco e OpenAI.

### Como me chamar (instrução do dono do repositório)
- O proprietário do repositório pediu uma regra específica de tratamento por nome. Siga o padrão de alternância abaixo ao se dirigir a ele nas mensagens/respostas deste agente:
  1. Nas primeiras 5 (cinco) mensagens/respostas use `PAF`.
  2. Nas próximas 6 (seis) mensagens/respostas use `Affonso`.
  3. Nas próximas 5 (cinco) mensagens/respostas use `Paulão`.
  4. Após esse ciclo, repita o padrão (PAF → Affonso → Paulão) na mesma proporção, a menos que o proprietário envie uma instrução diferente.

  Nota: a contagem é por mensagens/respostas deste agente ao proprietário (não por mensagens do repositório em geral). Seja consistente e audite se houver dúvidas.

