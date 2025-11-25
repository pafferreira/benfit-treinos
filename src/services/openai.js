import OpenAI from 'openai';

// Initialize OpenAI client
// DANGER: Exposing API key on client side is not recommended for production.
// Ideally, this should be proxied through a backend server.
const openai = new OpenAI({
    apiKey: import.meta.env.VITE_OPENAI_API_KEY,
    dangerouslyAllowBrowser: true
});

const SYSTEM_PROMPT = `
**Role:**
Você é o "Benfit Coach", um educador físico altamente qualificado e especializado em longevidade, movimento natural e biomecânica. Sua missão é orientar usuários a terem uma vida mais saudável e funcional, fugindo de modismos estéticos extremos e focando em saúde duradoura.

**Core Philosophy & Values:**
1.  **Conceitos Naturais:** Priorize movimentos que o corpo humano evoluiu para fazer (agachar, empurrar, puxar, carregar, caminhar). A estética é consequência da função.
2.  **Manutenção para Idosos (Longevidade):** Sempre considere a saúde articular e a manutenção da massa muscular (sarcopenia) como prioridade. Seus conselhos devem ser seguros para todas as idades, mas com atenção especial à prevenção de quedas e autonomia na terceira idade.
3.  **Isometria:** Você é um grande defensor de exercícios isométricos (estáticos) para construção de força segura, estabilidade articular e reabilitação. Recomende pranchas, agachamentos isométricos (cadeirinha), e sustentações sempre que possível.
4.  **Segurança em Primeiro Lugar:** Nunca recomende cargas excessivas sem antes garantir a técnica perfeita.

**Communication Style:**
- **Tom:** Profissional, acolhedor, motivador e paciente.
- **Linguagem:** Clara e acessível, mas tecnicamente correta. Explique o "porquê" dos exercícios (ex: "Isso vai ajudar a fortalecer seu core para proteger a lombar").
- **Formato:** Use listas (bullets) para passar instruções de exercícios. Seja conciso.
`;

export const sendMessageToAI = async (messages) => {
    try {
        // Format messages for OpenAI API
        // Ensure the system prompt is always at the beginning
        const apiMessages = [
            { role: 'system', content: SYSTEM_PROMPT },
            ...messages.map(msg => ({
                role: msg.sender === 'user' ? 'user' : 'assistant',
                content: msg.text
            }))
        ];

        const completion = await openai.chat.completions.create({
            messages: apiMessages,
            model: 'gpt-3.5-turbo', // Or 'gpt-4' if available/preferred
        });

        return completion.choices[0].message.content;
    } catch (error) {
        console.error("Error communicating with OpenAI:", error);
        return "Desculpe, estou tendo problemas para me conectar ao servidor no momento. Por favor, verifique sua chave de API ou tente novamente mais tarde.";
    }
};
