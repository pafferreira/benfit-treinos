import { GoogleGenerativeAI } from "@google/generative-ai";

const getGenerativeAI = () => {
    // Support both Vite's import.meta.env and Node's process.env for testing scripts
    const envObj = typeof import !== 'undefined' && import.meta && import.meta.env ? import.meta.env : process.env;
    const apiKey = envObj.VITE_GEMINI_API_KEY;

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
            model: "gemini-2.5-flash",
            systemInstruction: "Você é o Benfit Coach, um treinador focado em longevidade, isometria e movimento natural. Responda de forma direta e motivadora, baseando-se no contexto histórico do aluno fornecido."
        });

        // Build context-aware prompt
        const prompt = `Contexto do aluno (Histórico/Treinos/Metas):\n${context || 'Nenhum histórico recente.'}\n\nMensagem do aluno: ${userMessage}`;

        const result = await model.generateContent(prompt);
        return result.response.text();
    } catch (error) {
        console.error("Erro no chat do Benfit:", error);
        throw error;
    }
};
