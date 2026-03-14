-- ============================================================
-- MIGRAÇÃO: Base de Conhecimento Compartilhada (Shared Knowledge)
-- Catálogo de exercícios embedded + templates + dicas fitness
-- Acesso de leitura: todos os usuários autenticados
-- Acesso de escrita: service_role (seed) + admin/personal (via app)
-- ============================================================

-- Tabela principal
CREATE TABLE IF NOT EXISTS public.b_shared_knowledge (
    id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    knowledge_type text NOT NULL DEFAULT 'exercise',
    -- Valores válidos: 'exercise' | 'workout_template' | 'fitness_tip' | 'faq'
    source_id      uuid,
    -- Referência opcional à linha de origem: b_exercises.id, b_workouts.id, etc.
    content        text NOT NULL,
    -- Texto descritivo para busca semântica (o que é embedado)
    metadata       jsonb,
    -- Ex: {"name":"Rosca Direta","muscle_group":"Bíceps","equipment":"Barra","difficulty":"iniciante"}
    embedding      vector(3072) NOT NULL,
    created_at     timestamptz DEFAULT now() NOT NULL,
    updated_at     timestamptz DEFAULT now() NOT NULL
);

-- Índice HNSW via halfvec (mesmo padrão de b_benfit_embeddings)
CREATE INDEX IF NOT EXISTS b_shared_knowledge_embedding_idx
    ON public.b_shared_knowledge
    USING hnsw ((embedding::halfvec(3072)) halfvec_cosine_ops);

-- Índice auxiliar para filtrar por tipo
CREATE INDEX IF NOT EXISTS b_shared_knowledge_type_idx
    ON public.b_shared_knowledge (knowledge_type);

-- Índice para upsert idempotente por source_id
CREATE INDEX IF NOT EXISTS b_shared_knowledge_source_idx
    ON public.b_shared_knowledge (source_id)
    WHERE source_id IS NOT NULL;

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.b_shared_knowledge ENABLE ROW LEVEL SECURITY;

-- Leitura: qualquer usuário autenticado
CREATE POLICY "SharedKnowledge_ReadAll"
    ON public.b_shared_knowledge
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Escrita: admin e personal podem gerenciar via app
CREATE POLICY "SharedKnowledge_AdminPersonalWrite"
    ON public.b_shared_knowledge
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.b_users
            WHERE id = auth.uid()
              AND role IN ('admin', 'personal')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.b_users
            WHERE id = auth.uid()
              AND role IN ('admin', 'personal')
        )
    );
-- Nota: service_role bypassa RLS por padrão (usado no seed script)

-- ── RPC: busca só no catálogo compartilhado ───────────────────────────────────
CREATE OR REPLACE FUNCTION match_shared_knowledge(
    query_embedding   vector(3072),
    match_threshold   float,
    match_count       int,
    p_knowledge_types text[] DEFAULT NULL
)
RETURNS TABLE (
    id             uuid,
    knowledge_type text,
    content        text,
    metadata       jsonb,
    similarity     float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        sk.id,
        sk.knowledge_type,
        sk.content,
        sk.metadata,
        1 - (sk.embedding <=> query_embedding) AS similarity
    FROM public.b_shared_knowledge sk
    WHERE
        (p_knowledge_types IS NULL OR sk.knowledge_type = ANY(p_knowledge_types))
        AND 1 - (sk.embedding <=> query_embedding) > match_threshold
    ORDER BY sk.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- ── RPC: busca híbrida (memórias do usuário + catálogo compartilhado) ─────────
CREATE OR REPLACE FUNCTION match_embeddings_hybrid(
    query_embedding   vector(3072),
    match_threshold   float,
    match_count       int,
    p_user_id         uuid,
    p_knowledge_types text[] DEFAULT NULL
)
RETURNS TABLE (
    id         uuid,
    source     text,
    content    text,
    metadata   jsonb,
    similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY

    -- Memórias privadas do usuário
    SELECT * FROM (
      SELECT
        e.id,
        'user_memory'::text AS source,
        e.content,
        e.metadata,
        1 - (e.embedding <=> query_embedding) AS similarity
      FROM public.b_benfit_embeddings e
      WHERE
        e.user_id = p_user_id
        AND 1 - (e.embedding <=> query_embedding) > match_threshold
      ORDER BY e.embedding <=> query_embedding
      LIMIT match_count
    ) sub1
    UNION ALL

    -- Conhecimento compartilhado
    SELECT * FROM (
      SELECT
        sk.id,
        'shared_knowledge'::text AS source,
        sk.content,
        sk.metadata,
        1 - (sk.embedding <=> query_embedding) AS similarity
      FROM public.b_shared_knowledge sk
      WHERE
        (p_knowledge_types IS NULL OR sk.knowledge_type = ANY(p_knowledge_types))
        AND 1 - (sk.embedding <=> query_embedding) > match_threshold
      ORDER BY sk.embedding <=> query_embedding
      LIMIT match_count
    ) sub2
    ORDER BY similarity DESC
    LIMIT match_count;
END;
$$;
