-- ============================================================
-- MIGRAÇÃO: Sistema de Conversas para o Benfit Coach
-- Execute no Supabase SQL Editor
-- ============================================================

-- 1. Tabela de conversas
CREATE TABLE IF NOT EXISTS b_ai_conversations (
    id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id        UUID REFERENCES b_users(id) ON DELETE CASCADE NOT NULL,
    title          TEXT NOT NULL DEFAULT 'Nova conversa',
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    last_message_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Coluna conversation_id em b_ai_chat_history
ALTER TABLE b_ai_chat_history
    ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES b_ai_conversations(id) ON DELETE CASCADE;

-- 3. RLS para b_ai_conversations
ALTER TABLE b_ai_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User_Own_Conversations" ON "public"."b_ai_conversations"
    FOR ALL USING (auth.uid() = user_id);

-- 4. Índices para performance
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON b_ai_conversations(user_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_history_conversation_id ON b_ai_chat_history(conversation_id);

-- 5. Migração de mensagens existentes (sem conversation_id) para uma conversa "Histórico"
-- Cria uma conversa de migração para cada usuário que tem mensagens órfãs
INSERT INTO b_ai_conversations (user_id, title, created_at, last_message_at)
SELECT DISTINCT
    user_id,
    'Histórico anterior' AS title,
    MIN(created_at)      AS created_at,
    MAX(created_at)      AS last_message_at
FROM b_ai_chat_history
WHERE conversation_id IS NULL
GROUP BY user_id
ON CONFLICT DO NOTHING;

-- Associa mensagens órfãs à conversa de migração criada
UPDATE b_ai_chat_history h
SET conversation_id = (
    SELECT c.id
    FROM b_ai_conversations c
    WHERE c.user_id = h.user_id
      AND c.title = 'Histórico anterior'
    LIMIT 1
)
WHERE h.conversation_id IS NULL;
