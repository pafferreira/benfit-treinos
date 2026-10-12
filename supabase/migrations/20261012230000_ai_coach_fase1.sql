-- Fase 1 da IA Benfit.
-- 1) Libera a memória de longo prazo: b_benfit_embeddings tinha RLS ligado e
--    nenhuma policy, então todo insert era recusado e nenhuma memória era salva.
-- 2) Registra modelo, tokens e a avaliação 👍/👎 de cada resposta do Coach.

DROP POLICY IF EXISTS "Embeddings_Own" ON public.b_benfit_embeddings;
CREATE POLICY "Embeddings_Own" ON public.b_benfit_embeddings
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.b_ai_chat_history
    ADD COLUMN IF NOT EXISTS model TEXT,
    ADD COLUMN IF NOT EXISTS input_tokens INTEGER,
    ADD COLUMN IF NOT EXISTS output_tokens INTEGER,
    ADD COLUMN IF NOT EXISTS feedback SMALLINT;

COMMENT ON COLUMN public.b_ai_chat_history.provider IS
    'Provedor que gerou a mensagem: anthropic, openai, gemini ou shared_knowledge.';
COMMENT ON COLUMN public.b_ai_chat_history.model IS
    'ID do modelo que respondeu (ex.: claude-haiku-5-5).';
COMMENT ON COLUMN public.b_ai_chat_history.feedback IS
    'Avaliação do aluno: 1 = útil, -1 = não ajudou, NULL = sem avaliação.';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'b_ai_chat_history_feedback_check'
          AND conrelid = 'public.b_ai_chat_history'::regclass
    ) THEN
        ALTER TABLE public.b_ai_chat_history
            ADD CONSTRAINT b_ai_chat_history_feedback_check
            CHECK (feedback IS NULL OR feedback IN (-1, 1));
    END IF;
END
$$;
