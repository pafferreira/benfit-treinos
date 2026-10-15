// Cliente dos endpoints de AI (Vercel Functions em /api).
// As chaves ficam no servidor; o fallback Claude → OpenAI → Gemini é transparente.
// Todos os endpoints exigem o usuário logado.
import { supabase } from '../lib/supabase';

export const postJson = async (url, payload) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
        throw new Error('Sessão expirada. Entre novamente para conversar com o Benfit.');
    }

    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(data.error || `Erro ${res.status} em ${url}`);
    }
    return data;
};

export const generateEmbedding = async (text) => {
    const { embedding } = await postJson('/api/embedding', { text });
    return embedding;
};

export const generateConversationTitle = async (firstMessage) => {
    try {
        const { text } = await postJson('/api/chat', { message: firstMessage, mode: 'title' });
        return text.trim().slice(0, 40) || 'Nova conversa';
    } catch {
        return 'Nova conversa';
    }
};

export const chatWithBenfit = async (userMessage, context, conversationId) => {
    const result = await postJson('/api/chat', {
        message: userMessage,
        context,
        conversationId,
    });
    if (result.provider && result.provider !== 'anthropic') {
        console.warn(`[Benfit Coach] Resposta via fallback: ${result.provider}`);
    }
    return result;
};

// 1 = útil, -1 = não ajudou, null = remove a avaliação.
export const rateCoachMessage = async (messageId, feedback) => {
    const { error } = await supabase
        .from('b_ai_chat_history')
        .update({ feedback })
        .eq('id', messageId);
    if (error) throw error;
};
