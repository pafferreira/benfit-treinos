// Cliente dos endpoints de AI (Vercel Functions em /api).
// As chaves ficam no servidor; o fallback Gemini → OpenAI → Groq é transparente.

const postJson = async (url, payload) => {
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

export const chatWithBenfit = async (userMessage, context) => {
    const { text, provider } = await postJson('/api/chat', { message: userMessage, context });
    if (provider && provider !== 'gemini') {
        console.log(`[Benfit Coach] Resposta via fallback: ${provider}`);
    }
    return text;
};
