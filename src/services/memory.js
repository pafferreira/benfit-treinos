import { supabase } from '../lib/supabase';
import { generateEmbedding } from './ai';

/**
 * Salva um novo evento na memória vetorial do usuário.
 * 
 * @param {string} userId UUID do usuário
 * @param {string} contentSummary Resumo em texto do que aconteceu (ex: "Treinou peito e tríceps hoje. Sentiu-se cansado.")
 * @param {object} metadata Objeto JSON com dados extras (ex: { type: "workout", intensity: "high" })
 */
export const saveToMemory = async (userId, contentSummary, metadata = {}) => {
    try {
        // 1. Gera o vetor de 3072 dimensões com o Gemini
        const embedding = await generateEmbedding(contentSummary);

        // 2. Salva no Supabase
        const { data, error } = await supabase
            .from('b_benfit_embeddings')
            .insert({
                user_id: userId,
                content: contentSummary,
                metadata: metadata,
                embedding: embedding
            })
            .select()
            .single();

        if (error) {
            console.error("Erro ao salvar memória no Supabase:", error);
            throw error;
        }

        return data;
    } catch (error) {
        console.error("Falha na rotina de saveToMemory:", error);
        throw error;
    }
};

/**
 * Busca memórias antigas relevantes baseadas na pergunta atual do usuário.
 * 
 * @param {string} userId UUID do usuário
 * @param {string} queryText A mensagem ou pergunta que o usuário enviou
 * @param {number} matchThreshold Grau de similaridade mínimo (0 a 1)
 * @param {number} matchCount Máximo de resultados retornados
 * @returns {Array} Array de textos contendo os históricos filtrados
 */
export const searchUserMemory = async (userId, queryText, matchThreshold = 0.5, matchCount = 5) => {
    try {
        // 1. Gera o vetor para a pergunta atual (para podermos comparar distâncias)
        const queryEmbedding = await generateEmbedding(queryText);

        // 2. Chama a função RPC no Supabase para buscar por similaridade (halfvec operator via SQL)
        const { data, error } = await supabase.rpc('match_embeddings', {
            query_embedding: queryEmbedding,
            match_threshold: matchThreshold,
            match_count: matchCount,
            p_user_id: userId
        });

        if (error) {
            console.error("Erro na busca semântica Supabase RPC:", error);
            throw error;
        }

        // Retorna apenas a fusão dos conteúdos numa string, ou o array de dados caso queira mapear os metadados.
        return data;
    } catch (error) {
        console.error("Falha na rotina de searchUserMemory:", error);
        throw error;
    }
};
