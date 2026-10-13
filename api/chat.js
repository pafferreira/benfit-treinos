import { chatWithFallback, SYSTEM_PROMPT } from './_providers.js';
import { TITLE_PROMPT } from './_prompt.js';
import {
    buildConversationMessages,
    ChatHttpError,
    getBearerToken,
    loadConversationSession,
    requireUser,
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
        const accessToken = getBearerToken(req);

        if (mode === 'title') {
            await requireUser(accessToken);
            const { text, provider } = await chatWithFallback({
                systemPrompt: TITLE_PROMPT,
                messages: [{ role: 'user', content: `Primeira mensagem da conversa:\n\n"${message.slice(0, 500)}"` }],
            });
            return res.status(200).json({ text, provider });
        }

        const session = await loadConversationSession({ accessToken, conversationId });
        const messages = buildConversationMessages({ history: session.history, message, context });

        const result = await chatWithFallback({ messages, systemPrompt: SYSTEM_PROMPT });
        const messageId = await saveAssistantResponse({
            supabase: session.supabase,
            userId: session.user.id,
            conversationId,
            text: result.text,
            provider: result.provider,
            model: result.model,
            usage: result.usage,
            providerParts: result.providerParts,
        });

        return res.status(200).json({
            text: result.text,
            provider: result.provider,
            model: result.model,
            messageId,
        });
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
