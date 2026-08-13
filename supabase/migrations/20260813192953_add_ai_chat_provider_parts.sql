-- Memória multiturno do Benfit Coach.
-- provider_parts preserva as parts cruas do Gemini, incluindo thoughtSignature.

ALTER TABLE public.b_ai_chat_history
    ADD COLUMN IF NOT EXISTS provider TEXT,
    ADD COLUMN IF NOT EXISTS provider_parts JSONB;

COMMENT ON COLUMN public.b_ai_chat_history.provider IS
    'Provedor que gerou a mensagem: gemini, openai, groq, local ou shared_knowledge.';

COMMENT ON COLUMN public.b_ai_chat_history.provider_parts IS
    'Parts cruas da resposta do provedor. Para Gemini, devem ser reenviadas sem alteração para preservar thought signatures.';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'b_ai_chat_history_provider_parts_array'
          AND conrelid = 'public.b_ai_chat_history'::regclass
    ) THEN
        ALTER TABLE public.b_ai_chat_history
            ADD CONSTRAINT b_ai_chat_history_provider_parts_array
            CHECK (provider_parts IS NULL OR jsonb_typeof(provider_parts) = 'array');
    END IF;
END
$$;
