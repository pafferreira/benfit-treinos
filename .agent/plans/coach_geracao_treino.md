# Benfit Coach — Conversa com Memória e Geração de Treino

Plano para dois objetivos ligados: tornar a conversa do Coach menos restrita e permitir que o fim de uma conversa gere um treino persistido no banco.

## 1. Diagnóstico — por que a conversa parece restrita

Três causas distintas, apenas uma delas é de prompt:

| # | Causa | Onde | Efeito |
|---|---|---|---|
| 1 | **Conversa sem memória** | `AICoach.jsx` → `sendMessage` envia só `text` + contexto remontado. O array `messages` nunca vai ao modelo | Amnésia total entre turnos. O aluno não consegue dizer "e o segundo exercício?" |
| 2 | **Cascata de 3 níveis** | `tryLocalResponse` (nível 1) e `directAnswer` do catálogo (nível 2) | Respostas montadas em JavaScript, não pelo modelo. Soam robóticas porque são templates |
| 3 | **Guardrail rígido de escopo** | `SYSTEM_PROMPT` em `api/_providers.js` | Recusa assuntos fora da lista com frase fixa |

A causa #1 é a dominante e é pré-requisito da geração de treino.

## 2. Decisões tomadas

- **Gravação:** IA propõe → aluno revisa e confirma → **RPC transacional grava**. A função usa a sessão autenticada, valida o payload e cria treino, dias e exercícios de forma atômica, sem risco de persistência parcial.
- **Memória:** histórico reconstruído a partir do **banco** (`b_ai_chat_history` filtrado por `conversation_id`), não do estado em memória do React.
- **Fallback:** manter os três provedores (Gemini → OpenAI → Groq) também na geração de treino.
- **Exercícios novos:** o Coach pode sugerir exercícios que ainda não existem no catálogo, porque atua como especialista. Essas sugestões ficam separadas do treino persistível e serão discutidas em uma evolução posterior, pois exigem cadastro, imagens e validação do exercício.
- **Compartilhamento:** o treino gerado não fica vinculado à conversa que o originou. Ele pode ser publicado como treino compartilhado para atender outros usuários, com a visibilidade apresentada explicitamente na etapa de revisão.

## 3. Mudanças de schema necessárias

### 3.1 Persistir as `parts` cruas do provedor

`b_ai_chat_history` guarda hoje apenas `role` + `content` (texto). Isso **não é suficiente** para o Gemini 3.x: com multiturno e function calling, as *thought signatures* retornadas pelo modelo precisam ser devolvidas nos turnos seguintes, senão a API responde 400.

```sql
ALTER TABLE b_ai_chat_history
  ADD COLUMN IF NOT EXISTS provider      varchar,
  ADD COLUMN IF NOT EXISTS provider_parts jsonb;
```

`provider_parts` guarda o array `parts` exatamente como o provedor devolveu. `provider` identifica quem gerou, para não reenviar assinaturas do Gemini a outro provedor.

### 3.2 Identificar treinos gerados pela IA

```sql
ALTER TABLE b_workouts
  ADD COLUMN IF NOT EXISTS source varchar DEFAULT 'manual';  -- manual | ai_coach
```

Permite medir a adoção da funcionalidade sem armazenar vínculo com a conversa. Não será criado `source_conversation_id`.

`b_workouts.is_public` define se o treino será compartilhado. O valor deve aparecer no preview e ser enviado explicitamente à RPC, em vez de depender silenciosamente do `DEFAULT true`.

## 4. Regra central: catálogo fechado para gravação, aberto para sugestões

`b_workout_exercises.exercise_id` é FK para `b_exercises` com `ON DELETE RESTRICT`. Portanto, a IA pode atuar como especialista e **sugerir um exercício novo**, mas somente exercícios existentes em `b_exercises` podem fazer parte do payload gravado.

O contrato da proposta separa dois tipos de item:

- `exercises`: itens do treino que possuem `exercise_id` válido e podem ser persistidos;
- `newExerciseSuggestions`: recomendações especializadas ainda fora do catálogo, com nome, justificativa e possível substituto existente.

Isso torna a validação obrigatória e independente do provedor:

1. O modelo recebe o catálogo disponível (id + nome + grupo muscular) no contexto.
2. O modelo devolve JSON separando exercícios catalogados de sugestões novas.
3. **Antes de renderizar o preview**, valida-se cada `exercise_id` contra `b_exercises`.
4. IDs inválidos → tenta casar por nome (`pg_trgm` já está indexado em `b_exercises.name`); se ainda falhar, o item passa para `newExerciseSuggestions` e não entra no payload persistível.
5. O preview mostra as sugestões novas em uma área separada e oferece um exercício catalogado como substituto. A gravação só é liberada quando todos os itens do treino possuem `exercise_id` válido.

Esse fluxo preserva a capacidade consultiva do Coach sem violar a integridade referencial nem criar exercícios sem as imagens necessárias. A validação também protege contra alucinações em qualquer um dos três provedores e viabiliza manter o Groq na cadeia.

## 5. Arquitetura — camada de adaptadores

Manter os três provedores com function calling exige um formato interno normalizado e três tradutores. Sem isso, a lógica de negócio se espalha por provedor.

```
AICoach.jsx
   │  { conversationId, message }
   ▼
/api/chat  ──► carrega histórico de b_ai_chat_history
   │
   ▼
_providers.js  ──►  formato interno normalizado
   │                { messages: [{role, content, parts?, provider?}], tools: [...] }
   │
   ├──► adapters/gemini.js   contents[] + thoughtSignature + functionDeclarations
   ├──► adapters/openai.js   messages[] + tools[] (json_schema)
   └──► adapters/groq.js     messages[] + response_format json_object
   │
   ▼
validador de catálogo  ──► resposta { text, workoutProposal?, newExerciseSuggestions? }
```

**Regra de ouro dos adaptadores:** `provider_parts` só é reenviado ao provedor que o gerou. Ao trocar de provedor no meio de uma conversa, degrada-se para texto puro — as assinaturas do Gemini não são portáveis.

### Diferenças por provedor

| Provedor | Structured output | Multiturno | Observação |
|---|---|---|---|
| Gemini 3.5 Flash-Lite | `responseSchema` + function calling | Exige thought signatures | Melhor qualidade, mais exigente no protocolo |
| OpenAI `gpt-4o-mini` | `response_format: json_schema` | Simples, sem assinaturas | Suporte maduro |
| Groq `llama-3.3-70b` | `json_object` (sem schema estrito) | Simples | **Menor aderência ao schema** — depende mais da validação |

## 6. Fases de implementação

### Fase 1 — Memória multiturno (pré-requisito)
- Migração SQL 3.1
- `/api/chat` passa a receber `conversationId` e carregar histórico do banco
- `_providers.js` muda de `{prompt: string}` para `{messages: [...]}`
- Janela deslizante: últimas 12 mensagens persistidas, para conter custo
- Persistir `provider` e `provider_parts` a cada resposta

**Critério de aceite:** o aluno pergunta "e o segundo que você citou?" e o Coach responde corretamente.

### Fase 2 — Reduzir o engessamento
- Remover o curto-circuito do nível 2 (`directAnswer` do catálogo) para perguntas livres; manter apenas no seletor de músculos
- Manter o nível 1 (`tryLocalResponse`) só onde é resposta factual de dado local (perfil, metas)
- Reescrever o bloco de escopo do `SYSTEM_PROMPT`: redirecionar com naturalidade em vez de recusar com frase fixa

**Critério de aceite:** respostas do Coach deixam de ter formato repetido em perguntas abertas.

### Fase 3 — Geração de treino
- Migração SQL 3.2
- Definir o JSON schema do treino (título, dificuldade, duração, dias, exercícios com sets/reps/descanso e sugestões novas separadas)
- Implementar os três adaptadores + validador de catálogo + separação de sugestões novas
- `POST /api/workout-proposal`: recebe `conversationId` somente para recuperar o contexto e devolve a proposta validada; o treino criado não armazena esse identificador
- Componente `WorkoutProposalCard`: preview editável do treino, das substituições e da visibilidade compartilhada
- Criar uma RPC no Supabase que receba o JSON validado e grave `b_workouts`, `b_workout_days` e `b_workout_exercises` em uma única transação
- Botão "Salvar treino" → chama a RPC com `source: 'ai_coach'` e `is_public` explicitamente confirmado na revisão

**Critério de aceite:** conversa sobre objetivo gera treino coerente; exercícios catalogados são salvos atomicamente; exercícios novos aparecem apenas como sugestões futuras; o treino não fica vinculado à conversa e pode ser compartilhado conforme a visibilidade confirmada pelo aluno.

## 7. Riscos e pontos de atenção

| Risco | Mitigação |
|---|---|
| Thought signatures ausentes → 400 no Gemini | Persistir `provider_parts`; testar multiturno longo antes do deploy |
| Groq gera JSON fora do schema | Validador de catálogo é obrigatório e roda para todos os provedores |
| Exercício novo é tratado como item persistível | Separar `newExerciseSuggestions`, impedir sua gravação e exigir substituto catalogado |
| Visibilidade do treino diverge da revisão | Mostrar a opção de compartilhamento no preview e enviar `is_public` explicitamente à RPC |
| Custo de tokens cresce com histórico | Janela deslizante + `thinking_level: low` |
| Insert parcial (workout criado, exercícios falham) | Gravar tudo por RPC transacional em `database/rpc/` |

> A RPC transacional é parte obrigatória da Fase 3, não uma otimização opcional. Ela deve validar permissão, exercícios do catálogo e o payload completo antes de confirmar a transação.

## 8. Estado atual

- ✅ Migração para `gemini-3.5-flash-lite` com `thinking_level` configurável (`api/_providers.js`), publicada na `v1.8.11`
- ✅ Status 400 incluído na cadeia de fallback, com log explícito
- ✅ Fase 1 implementada e validada localmente; migração aplicada e verificada no Supabase em 13/08/2026
- ⬜ Fases 2 e 3 pendentes de execução

**Próximo trabalho planejado:** publicar a **Fase 1 — Memória multiturno** e executar o teste de aceite integrado (por exemplo, perguntar "e o segundo exercício?") antes de iniciar a Fase 2.
