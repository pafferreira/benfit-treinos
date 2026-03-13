# Integração com pgvector e Gemini Embedding 2 no Benfit

Esta implementação visa dotar o Benfit de uma memória semântica baseada no histórico de treinos e interações do aluno, através da utilização do `gemini-embedding-2-preview` e da extensão `pgvector` no Supabase.

## Proposed Changes

---

### Banco de Dados (Supabase - Esquema)

Criação de um novo arquivo SQL contendo as queries para rodar no seu projeto Supabase, para configurar a base vetorial e a busca.

#### [NEW] `supabase/migrations/pgvector_setup.sql`
Este arquivo conterá comandos SQL para você executar diretamente no **SQL Editor do Supabase**:
- `CREATE EXTENSION IF NOT EXISTS vector;`
- Criação da tabela **`b_benfit_embeddings`** com:
  - `id` (uuid)
  - `user_id` (uuid) (Referência ao assistido/usuário)
  - `content` (text) (O "resumo" do treino/diálogo original)
  - `metadata` (jsonb) (Dados extras úteis como modalidade, tipo de evento: treino/meta/avaliação)
  - `embedding` (vector(3072)) (Os embeddings do Gemini)
- Criação de Índice `HNSW` em cima da coluna embedding para busca veloz.
- Criação de uma Postgres Function (função RPC) ex: `match_embeddings` que aceita um vetor da requisição e retorna os registros por similaridade.

---

### Configuração e Serviços da Injeção da Gemini e Embeddings

#### Instruções para Obter a VITE_GEMINI_API_KEY
Para que o sistema consiga gerar os vetores e as respostas do Coach AI:
1. Acesse o [Google AI Studio](https://aistudio.google.com/).
2. Faça login com sua conta Google.
3. No menu lateral, clique em **"Get API key"**.
4. Clique no botão azul **"Create API key"** e selecione o projeto do Google Cloud associado (ou crie um novo).
5. Copie a chave gerada e cole no seu arquivo `.env` do projeto Benfit da seguinte forma:
   ```env
   VITE_GEMINI_API_KEY="AIzaSySuaChaveAqui..."
   ```

#### [NEW] `src/services/ai.ts` (ou local similar)
Módulo centralizado que vai empacotar as rotinas de IA:
- Função `generateEmbedding(text: string): Promise<number[]>`: Chama o `gemini-embedding-2-preview` e retorna o array `[3072 pontos]`.
- Função `chatWithBenfit(userMessage: string, context: string): Promise<string>`: Chama o modelo de conversação (Gemini Flash). O `context` passado via System Instruction conteria as diretrizes de personalidade do Benfit e o que foi retornado do banco vetorial.

#### [NEW] `src/services/memory.ts` 
Lógicas orquestradoras que ligam IA e Banco:
- Função `saveToMemory(userId, contentSummary, metadata)`: Internamente faz embedding -> banco.
- Função `searchUserMemory(userId, queryText)`: Internamente faz embedding do queryText -> chama o `match_embeddings` no Supabase via `.rpc()` -> retorna strings históricas para servir de contexto.

---

### Integração nas UI's Existentes (Gatilhos de Salvamento e IA)

Os momentos chave em que o app irá registrar os embeddings dos usuários:

#### [MODIFY] Finalização de Treino (`src/views/WorkoutSessionView.tsx` ou equivalente)
- Ao finalizar o treino e a "avaliação" (feedback de humor/intensidade), dispararemos o `saveToMemory()` registrando a carga, os exercícios feitos e o feedback do usuário.

#### [MODIFY] Minhas Metas (`src/views/GoalsView.tsx` ou equivalente)
- Quando o usuário gerar, criar ou atingir uma meta, essa informação deve virar um embedding para que o Coach a reforce no futuro.

#### [MODIFY] Coach AI (`src/components/AIBottomSheet.tsx` ou equivalente)
- O botão do Coach AI será aprimorado para ser o **ponto de recuperação** dessa memória. Quando o usuário fizer uma pergunta ("Coach, posso aumentar o peso?"), ele buscará no `b_benfit_embeddings` os treinos passados e passará para a chamada do modelo responder com contexto.

#### [MODIFY] Perfil / Notificações (`src/views/ProfileView.tsx` ou equivalente)
- Planejar e implementar o uso de **Notificações** inteligentes no perfil. O sistema poderá gerar notificações personalizadas ou "insights" com base no processamento via IA dos dados recentes salvos no banco vetorial.

## Verification Plan

### Manual Verification
1. Copiar o script `pgvector_setup.sql` e rodar pelo SQL Editor do Supabase. Certificar que as tabelas `b_benfit_embeddings` e a função RPC foram criadas sem erros.
2. Com a chave da API no `.env`, gerar o primeiro embedding através do app (terminando um treino teste) e verificar se a linha aparece no Supabase.
3. Testar o botão do Coach AI enviando mensagens que requeiram contexto passado (ex: "Qual foi meu último treino de perna?") e observar a eficácia do Semantic Search.
