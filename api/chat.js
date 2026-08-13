import { chatWithFallback, SYSTEM_PROMPT } from './_providers.js';
import {
    buildConversationMessages,
    ChatHttpError,
    getBearerToken,
    loadConversationSession,
    saveAssistantResponse,
} from './_conversation-history.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    const { message, context, mode, conversationId } = req.body || {};
    if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Campo "message" é obrigatório' });
    }

    try {
        let systemPrompt = SYSTEM_PROMPT;
        let messages;

        if (mode === 'title') {
            systemPrompt = 'Você gera títulos curtos para conversas de fitness.';
            messages = [{
                role: 'user',
                content: `Crie um título curto (máximo 35 caracteres) em português para uma conversa de fitness que começou com a seguinte pergunta do usuário:\n\n"${message}"\n\nResponda APENAS com o título, sem aspas, sem pontuação no final, sem explicações.`,
            }];
        } else {
            const accessToken = getBearerToken(req);
            const session = await loadConversationSession({ accessToken, conversationId });
            messages = buildConversationMessages({ history: session.history, message, context });

            const result = await chatWithFallback({ messages, systemPrompt });
            await saveAssistantResponse({
                supabase: session.supabase,
                userId: session.user.id,
                conversationId,
                text: result.text,
                provider: result.provider,
                providerParts: result.providerParts,
            });

            return res.status(200).json({ text: result.text, provider: result.provider });
        }

        const { text, provider } = await chatWithFallback({ messages, systemPrompt });
        return res.status(200).json({ text, provider });
    } catch (error) {
        if (error instanceof ChatHttpError) {
            return res.status(error.status).json({ error: error.message });
        }
        console.error('[api/chat] Falha em todos os provedores:', error.details || error.message);
        return res.status(502).json({
            error: 'Nenhum provedor de AI disponível no momento. Tente novamente em instantes.',
        });
    }
}
