// Cliente dos endpoints de AI (Vercel Functions em /api).
// As chaves ficam no servidor; o fallback Gemini → OpenAI → Groq é transparente.
import { supabase } from '../lib/supabase';

const postJson = async (url, payload, { authenticated = false } = {}) => {
    const headers = { 'Content-Type': 'application/json' };
    if (authenticated) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
            throw new Error('Sessão expirada. Entre novamente para conversar com o Coach.');
        }
        headers.Authorization = `Bearer ${session.access_token}`;
    }

    const res = await fetch(url, {
        method: 'POST',
        headers,
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
    }, { authenticated: true });
    const { provider } = result;
    if (provider && provider !== 'gemini') {
        console.log(`[Benfit Coach] Resposta via fallback: ${provider}`);
    }
    return result;
};
