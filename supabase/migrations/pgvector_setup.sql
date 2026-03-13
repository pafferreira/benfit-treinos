-- 1. Cria a extensão pgvector caso ela não exista
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Criação da tabela para armazenar os embeddings
CREATE TABLE IF NOT EXISTS public.b_benfit_embeddings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL, -- Referência ao usuário/assistido (dependendo do seu schema pode adicionar FOREIGN KEY aqui)
    content text NOT NULL, -- O "resumo" do evento (treino, meta, avaliação, etc) em texto claro
    metadata jsonb, -- Dados extras úteis (ex: {"type": "workout", "modality": "forca", "mood": "cansado"})
    embedding vector(3072) NOT NULL, -- O vetor gerado pelo Gemini Embedding 2
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- 3. Cria índice HNSW para busca vetorial muito mais rápida
-- Usamos o operador de distância cosseno (vector_cosine_ops)
-- CREATE INDEX IF NOT EXISTS b_benfit_embeddings_embedding_idx 
-- ON public.b_benfit_embeddings 
-- USING hnsw (embedding vector_cosine_ops);
-- Como o PostgreSQL e a extensão pgvector possuem um limite padrão de 2000 dimensões para índices HNSW,
-- e o Gemini 2 usa 3072 dimensões, não podemos criar um índice simples HNSW aqui.

-- Example 2: IVFFlat on raw vector (choose ops appropriate for your distance)
-- CREATE INDEX IF NOT EXISTS b_benfit_embeddings_embedding_ivf_idx
--   ON public.b_benfit_embeddings
--   USING ivfflat (embedding vector_cosine_ops)
--   WITH (lists = 100);

CREATE INDEX IF NOT EXISTS b_benfit_embeddings_embedding_idx
  ON public.b_benfit_embeddings
  USING hnsw ((embedding::halfvec(3072)) halfvec_cosine_ops);

-- 4. Função RPC para buscar os registros mais similares
-- O cliente mandará seu query_embedding (gerado a partir do que o usuário digitou no chat)
-- Retorna os dados que possuem maior similaridade (menor distância cosseno)
CREATE OR REPLACE FUNCTION match_embeddings(
    query_embedding vector(3072),
    match_threshold float,
    match_count int,
    p_user_id uuid
)
RETURNS TABLE (
    id uuid,
    user_id uuid,
    content text,
    metadata jsonb,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.id,
        e.user_id,
        e.content,
        e.metadata,
        1 - (e.embedding <=> query_embedding) AS similarity
    FROM
        public.b_benfit_embeddings e
    WHERE
        e.user_id = p_user_id -- Filtramos para garantir que a IA lembre APENAS dos dados deste usuário
        AND 1 - (e.embedding <=> query_embedding) > match_threshold
    ORDER BY
        e.embedding <=> query_embedding
    LIMIT
        match_count;
END;
$$;
