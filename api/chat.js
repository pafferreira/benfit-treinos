import { chatWithFallback, SYSTEM_PROMPT } from './_providers.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    const { message, context, mode } = req.body || {};
    if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Campo "message" é obrigatório' });
    }

    try {
        let prompt;
        let systemPrompt = SYSTEM_PROMPT;

        if (mode === 'title') {
            systemPrompt = 'Você gera títulos curtos para conversas de fitness.';
            prompt = `Crie um título curto (máximo 35 caracteres) em português para uma conversa de fitness que começou com a seguinte pergunta do usuário:\n\n"${message}"\n\nResponda APENAS com o título, sem aspas, sem pontuação no final, sem explicações.`;
        } else {
            prompt = `${context ? `${context}\n\n` : ''}---\nMensagem do aluno: ${message}`;
        }

        const { text, provider } = await chatWithFallback({ prompt, systemPrompt });
        return res.status(200).json({ text, provider });
    } catch (error) {
        console.error('[api/chat] Falha em todos os provedores:', error.details || error.message);
        return res.status(502).json({
            error: 'Nenhum provedor de AI disponível no momento. Tente novamente em instantes.',
        });
    }
}
