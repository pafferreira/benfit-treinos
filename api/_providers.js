// Cadeia de provedores de AI com fallback automático.
// Ordem: Claude (voz do Coach) → OpenAI → Gemini. Provedor sem chave configurada é pulado.
import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT } from './_prompt.js';

// Referência genérica do modelo do Claude. BENFIT_AI_MODEL aceita "haiku",
// "sonnet", "opus" ou um ID completo; sem a variável, usa "haiku".
// Para evoluir de versão, atualize o ID da família aqui (ou defina o ID completo
// no Vercel) e o resto do app continua igual.
export const CLAUDE_MODELS = {
    haiku: 'claude-haiku-5-5',
    sonnet: 'claude-sonnet-5-5',
    opus: 'claude-opus-5-5',
};

export const resolveClaudeModel = (value) => {
    const name = (value || 'haiku').trim();
    return CLAUDE_MODELS[name.toLowerCase()] || name;
};

// low | medium | high: "low" basta para conversa de treino e mantém o custo baixo.
const CLAUDE_EFFORT = process.env.BENFIT_AI_EFFORT || 'low';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
const GEMINI_THINKING = process.env.GEMINI_THINKING_LEVEL || 'low';

// Erros que justificam tentar o próximo provedor (quota, rate limit, indisponível).
// O 400 entra aqui de propósito: se um modelo novo rejeitar o formato do payload,
// o aluno recebe resposta do próximo provedor em vez de ver a cadeia inteira falhar.
const isFallbackError = (status) =>
    status === 400 || status === 401 || status === 402 || status === 403
    || status === 404 || status === 429 || status >= 500;

// A API do Claude exige que a conversa comece pelo usuário.
export const toClaudeMessages = (messages) => {
    const firstUser = messages.findIndex(message => message.role !== 'assistant');
    if (firstUser === -1) return [];
    return messages.slice(firstUser).map(message => ({
        role: message.role === 'assistant' ? 'assistant' : 'user',
        content: message.content,
    }));
};

export const toGeminiContents = (messages) => messages.map(message => ({
    role: message.role === 'assistant' ? 'model' : 'user',
    parts: message.role === 'assistant'
        && message.provider === 'gemini'
        && Array.isArray(message.providerParts)
        ? message.providerParts
        : [{ text: message.content }],
}));

export const toOpenAIMessages = (messages, systemPrompt) => [
    { role: 'system', content: systemPrompt },
    ...messages.map(message => ({
        role: message.role === 'assistant' ? 'assistant' : 'user',
        content: message.content,
    })),
];

export const parseClaudeResponse = (response) => {
    if (response?.stop_reason === 'refusal') {
        return {
            text: 'Não posso ajudar com esse pedido. Posso te orientar sobre treino, recuperação ou alimentação?',
            refused: true,
        };
    }
    const text = (response?.content || [])
        .filter(block => block.type === 'text')
        .map(block => block.text)
        .join('');
    return { text, refused: false };
};

export const parseGeminiResponse = (data) => {
    const parts = data?.candidates?.[0]?.content?.parts;
    if (!Array.isArray(parts)) return { text: '', providerParts: null };

    const text = parts
        .filter(part => part?.thought !== true && typeof part?.text === 'string')
        .map(part => part.text)
        .join('');

    return { text, providerParts: parts };
};

let anthropicClient = null;
const getAnthropicClient = () => {
    // Uma retentativa só: se o Claude falhar, a cadeia segue para o próximo provedor.
    anthropicClient ??= new Anthropic({ maxRetries: 1, timeout: 45_000 });
    return anthropicClient;
};

// Ferramentas do Coach (só no Claude): cada rodada de tool_use executa as
// ferramentas e devolve o resultado, até a resposta final em texto.
const MAX_TOOL_ROUNDS = 3;

async function callClaude({ messages, systemPrompt, tools, runTool }) {
    if (!process.env.ANTHROPIC_API_KEY) return { skip: true };
    const model = resolveClaudeModel(process.env.BENFIT_AI_MODEL);
    const useTools = Array.isArray(tools) && tools.length > 0 && typeof runTool === 'function';
    const conversation = toClaudeMessages(messages);
    const usage = { input_tokens: 0, output_tokens: 0 };
    const actions = [];
    try {
        for (let round = 0; ; round++) {
            const response = await getAnthropicClient().messages.create({
                model,
                max_tokens: 8000,
                output_config: { effort: CLAUDE_EFFORT },
                // O perfil do Coach é fixo: fica em cache e barateia as mensagens seguintes.
                system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
                ...(useTools ? { tools } : {}),
                messages: conversation,
            });
            usage.input_tokens += (response.usage?.input_tokens || 0)
                + (response.usage?.cache_read_input_tokens || 0)
                + (response.usage?.cache_creation_input_tokens || 0);
            usage.output_tokens += response.usage?.output_tokens || 0;

            const toolUses = (response.content || []).filter(block => block.type === 'tool_use');
            if (useTools && response.stop_reason === 'tool_use' && toolUses.length > 0 && round < MAX_TOOL_ROUNDS) {
                const results = [];
                for (const block of toolUses) {
                    const outcome = await runTool(block.name, block.input || {});
                    if (outcome.action) actions.push(outcome.action);
                    results.push({
                        type: 'tool_result',
                        tool_use_id: block.id,
                        content: outcome.content,
                        ...(outcome.isError ? { is_error: true } : {}),
                    });
                }
                conversation.push({ role: 'assistant', content: response.content });
                conversation.push({ role: 'user', content: results });
                continue;
            }

            const { text } = parseClaudeResponse(response);
            return { text, provider: 'anthropic', model: response.model || model, usage, actions };
        }
    } catch (error) {
        if (error instanceof Anthropic.APIError && typeof error.status === 'number') {
            return { error: true, status: error.status, body: error.message };
        }
        throw error;
    }
}

async function callOpenAI({ messages, systemPrompt }) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return { skip: true };
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: OPENAI_MODEL,
            messages: toOpenAIMessages(messages, systemPrompt),
        }),
    });
    if (!res.ok) {
        const body = await res.text();
        return { error: true, status: res.status, body };
    }
    const data = await res.json();
    return {
        text: data?.choices?.[0]?.message?.content || '',
        provider: 'openai',
        model: data?.model || OPENAI_MODEL,
        usage: {
            input_tokens: data?.usage?.prompt_tokens || 0,
            output_tokens: data?.usage?.completion_tokens || 0,
        },
    };
}

async function callGemini({ messages, systemPrompt }) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) return { skip: true };
    const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                system_instruction: { parts: [{ text: systemPrompt }] },
                contents: toGeminiContents(messages),
                generationConfig: {
                    thinkingConfig: { thinkingLevel: GEMINI_THINKING },
                },
            }),
        }
    );
    if (!res.ok) {
        const body = await res.text();
        return { error: true, status: res.status, body };
    }
    const data = await res.json();
    const { text, providerParts } = parseGeminiResponse(data);
    return {
        text,
        provider: 'gemini',
        model: GEMINI_MODEL,
        providerParts,
        usage: {
            input_tokens: data?.usageMetadata?.promptTokenCount || 0,
            output_tokens: data?.usageMetadata?.candidatesTokenCount || 0,
        },
    };
}

export async function chatWithFallback({ messages, systemPrompt = SYSTEM_PROMPT, tools, runTool }) {
    const providers = [callClaude, callOpenAI, callGemini];

    const errors = [];
    for (const call of providers) {
        try {
            const result = await call({ messages, systemPrompt, tools, runTool });
            if (result.skip) continue;
            if (result.error) {
                errors.push({ status: result.status, body: result.body?.slice(0, 300) });
                if (isFallbackError(result.status)) {
                    console.warn(`[AI] ${call.name} falhou (${result.status}), tentando o próximo:`,
                        result.body?.slice(0, 200));
                    continue;
                }
                break; // erro realmente não recuperável
            }
            if (result.text) return result;
            errors.push({ status: 'empty', body: 'resposta vazia' });
        } catch (e) {
            errors.push({ status: 'network', body: e.message });
        }
    }
    const err = new Error('Todos os provedores de AI falharam');
    err.details = errors;
    throw err;
}

export { SYSTEM_PROMPT };
