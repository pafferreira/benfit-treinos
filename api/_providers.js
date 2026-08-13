// Cadeia de provedores de AI com fallback automático.
// Ordem: Gemini → OpenAI → Groq. Provedor sem chave configurada é pulado.

const SYSTEM_PROMPT = `Você é o **Benfit Coach**, o assistente pessoal de treino e saúde do aplicativo Benfit.

## Sua Missão
Ajudar alunos a treinar melhor, se recuperar com inteligência e alcançar longevidade com qualidade de vida.

## Filosofia Benfit
- **Longevidade**: priorizar saúde articular, movimento funcional e consistência de longo prazo.
- **Isometria**: exercícios estáticos são poderosos para força, estabilidade e coluna saudável.
- **Movimento Natural**: respeitar a biomecânica, evitar compensações e trabalhar mobilidade.

## Escopo de Atuação — REGRA CRÍTICA
Você responde APENAS sobre tópicos relacionados a:
- Exercícios físicos, treinos, séries, repetições, cargas e progressão
- Musculatura, anatomia aplicada e biomecânica
- Nutrição esportiva, hidratação e suplementação
- Recuperação, descanso, sono e controle de estresse
- Lesões, prevenção, fisioterapia e dores musculares/articulares
- Metas de saúde, composição corporal e bem-estar geral
- Histórico, planos e dados do aluno fornecidos no contexto

Se o aluno perguntar sobre qualquer outro assunto (política, tecnologia, receitas sem relação com fitness, etc.), responda de forma gentil e breve:
"Sou especializado em treino e saúde! Para esse assunto, você vai encontrar melhores respostas em outras fontes. No que posso te ajudar com seus treinos? 💪"

## Como Responder
- Seja direto, motivador e personalizado — use o nome do aluno se disponível no contexto.
- Use os dados do contexto estruturado (perfil, planos, histórico de sessões, metas, exercícios disponíveis) para personalizar suas respostas.
- Se o aluno perguntar sobre um treino passado, busque as informações no contexto fornecido.
- Ao sugerir próximos exercícios ou progressão, baseie-se no Histórico Detalhado: compare cargas e repetições entre sessões, aponte evolução ou estagnação, e priorize grupos musculares pouco trabalhados recentemente.
- Use emojis com moderação para tornar a conversa mais amigável.
- Quando sugerir exercícios, prefira os que constam no catálogo de exercícios disponíveis no contexto.
- Nunca invente dados — se não souber, peça mais informações ao aluno.`;

// Modelo configurável por env para permitir rollback sem novo deploy de código.
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
// minimal | low | medium | high — "low" mantém raciocínio suficiente para
// orientação de treino sem o custo de latência dos níveis altos.
const GEMINI_THINKING = process.env.GEMINI_THINKING_LEVEL || 'low';

// Erros que justificam tentar o próximo provedor (quota, rate limit, indisponível).
// O 400 entra aqui de propósito: se um modelo novo rejeitar o formato do payload,
// o aluno recebe resposta do OpenAI em vez de ver a cadeia inteira falhar.
const isFallbackError = (status) =>
    status === 400 || status === 429 || status === 402 || status === 403 || status >= 500;

async function callGemini({ prompt, systemPrompt }) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) return { skip: true };
    const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                system_instruction: { parts: [{ text: systemPrompt }] },
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
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
    const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
    return { text, provider: 'gemini' };
}

async function callOpenAICompatible({ prompt, systemPrompt, baseUrl, apiKey, model, providerName }) {
    if (!apiKey) return { skip: true };
    const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt },
            ],
        }),
    });
    if (!res.ok) {
        const body = await res.text();
        return { error: true, status: res.status, body };
    }
    const data = await res.json();
    return { text: data?.choices?.[0]?.message?.content || '', provider: providerName };
}

export async function chatWithFallback({ prompt, systemPrompt = SYSTEM_PROMPT }) {
    const providers = [
        () => callGemini({ prompt, systemPrompt }),
        () => callOpenAICompatible({
            prompt, systemPrompt,
            baseUrl: 'https://api.openai.com/v1',
            apiKey: process.env.OPENAI_API_KEY,
            model: 'gpt-4o-mini',
            providerName: 'openai',
        }),
        () => callOpenAICompatible({
            prompt, systemPrompt,
            baseUrl: 'https://api.groq.com/openai/v1',
            apiKey: process.env.GROQ_API_KEY,
            model: 'llama-3.3-70b-versatile',
            providerName: 'groq',
        }),
    ];

    const errors = [];
    for (const call of providers) {
        try {
            const result = await call();
            if (result.skip) continue;
            if (result.error) {
                errors.push({ status: result.status, body: result.body?.slice(0, 300) });
                if (isFallbackError(result.status)) {
                    // Visível nos logs: um 400 recorrente indica payload incompatível
                    // com o modelo, não erro pontual. Não deixe passar silencioso.
                    console.warn(`[AI] Provedor falhou (${result.status}), tentando próximo:`,
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
