import { GoogleGenerativeAI } from "@google/generative-ai";

const getGenerativeAI = () => {
    // Use Vite's import.meta.env in the browser/app context
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
        throw new Error("VITE_GEMINI_API_KEY não encontrada nas variáveis de ambiente. Verifique o arquivo .env");
    }
    return new GoogleGenerativeAI(apiKey);
};

export const generateEmbedding = async (text) => {
    try {
        const genAI = getGenerativeAI();
        // Using gemini-embedding-2-preview as requested, it returns 3072 dimensions
        // Fallback could be text-embedding-004 depending on Google AI Studio limits
        const model = genAI.getGenerativeModel({ model: "gemini-embedding-2-preview" });
        const result = await model.embedContent(text);
        return result.embedding.values;
    } catch (error) {
        console.error("Erro ao gerar embedding:", error);
        throw error;
    }
};

export const chatWithBenfit = async (userMessage, context) => {
    try {
        const genAI = getGenerativeAI();
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            systemInstruction: `Você é o **Benfit Coach**, o assistente pessoal de treino e saúde do aplicativo Benfit.

## Sua Missão
Ajudar alunos a treinar melhor, se recuperar com inteligência e alcançar longevidade com qualidade de vida.

## Filosofia Benfit
- **Longevidade**: priorizar saúde articular, movimento funcional e consistência de longo prazo.
- **Isometria**: exercícios estáticos são poderosos para força, estabilidade e coluna sans.
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
- Use emojis com moderação para tornar a conversa mais amigável.
- Quando sugerir exercícios, prefira os que constam no catálogo de exercícios disponíveis no contexto.
- Nunca invente dados — se não souber, peça mais informações ao aluno.`
        });

        // Build context-aware prompt combining structured DB data + semantic memories
        const prompt = `${context ? `${context}\n\n` : ''}---\nMensagem do aluno: ${userMessage}`;

        const result = await model.generateContent(prompt);
        return result.response.text();
    } catch (error) {
        console.error("Erro no chat do Benfit:", error);
        throw error;
    }
};
