import { supabase } from '../lib/supabase';
import { generateEmbedding } from './ai';

// ─────────────────────────────────────────────────────────────────
// CLASSIFICADOR DE CONVERSAS RICAS
// Determina se uma troca de mensagens vale ser salva como embedding
// de longo prazo no banco vetorial.
//
// Estratégia em 3 níveis:
//   1. Descarte imediato → resposta muito curta (trivial)
//   2. Aprovação por keywords fitness → conteúdo técnico/instrucional
//   3. Aprovação por keywords de memória → pedidos de recall
// ─────────────────────────────────────────────────────────────────

// Palavras que indicam conteúdo RICO (planos, protocolos, avaliações)
const RICH_KEYWORDS = [
    // Estrutura de treino
    'plano', 'protocolo', 'programa', 'rotina', 'semana', 'semanas',
    'dias por semana', 'série', 'séries', 'repetição', 'repetições',
    'isometria', 'isométrico', 'agachamento', 'supino', 'deadlift',
    'terra', 'remada', 'puxada', 'flexão', 'prancha',
    // Fisiologia e progressão
    'carga', 'progressão', 'sobrecarga', 'volume', 'intensidade',
    'frequência', 'hipertrofia', 'força', 'resistência', 'mobilidade',
    'aquecimento', 'descanso', 'recuperação', 'deload',
    // Lesão e saúde
    'dor', 'lesão', 'fisioterapeuta', 'médico', 'articulação',
    'lombar', 'joelho', 'ombro', 'postura', 'coluna',
    // Nutrição e dados corporais
    'proteína', 'caloria', 'déficit', 'superávit', 'dieta',
    'peso', 'gordura', 'massa muscular', 'composição corporal',
    // Metas e contexto pessoal
    'meta', 'objetivo', 'resultado', 'progresso', 'evolução',
    'emagrecer', 'ganhar', 'perder', 'manter', 'longevidade',
    // Contexto temporal valioso
    'hoje', 'ontem', 'semana passada', 'último treino',
    'relatou', 'informou', 'mencionou', 'sente', 'sentiu',
];

// Palavras que indicam converse TRIVIAL (saudação, confirmação básica)
const TRIVIAL_PATTERNS = [
    /^(ok|okay|ótimo|legal|entendido|certo|sim|não|claro|beleza)[\.\!\?]?\s*$/i,
    /^(obrigado|obrigada|valeu|vlw|thanks)[\.\!\?]?\s*$/i,
    /^(oi|olá|bom dia|boa tarde|boa noite)[\.\!\?]?\s*$/i,
    /^(até|tchau|até logo|flw)[\.\!\?]?\s*$/i,
];

/**
 * Classifica se uma conversa é "rica" o suficiente para ser armazenada
 * como embedding de longo prazo no banco vetorial.
 *
 * @param {string} userMessage - O que o usuário perguntou
 * @param {string} aiResponse - O que o Coach respondeu
 * @returns {{ isRich: boolean, reason: string, category: string }}
 */
export const classifyConversation = (userMessage, aiResponse) => {
    const combined = `${userMessage} ${aiResponse}`.toLowerCase();

    // Nível 1: Descarte imediato se a resposta for muito curta
    if (aiResponse.trim().length < 80) {
        return { isRich: false, reason: 'resposta muito curta', category: null };
    }

    // Nível 2: Descarte por padrões triviais na mensagem do usuário
    const isTrivialUserMsg = TRIVIAL_PATTERNS.some(p => p.test(userMessage.trim()));
    if (isTrivialUserMsg && aiResponse.length < 200) {
        return { isRich: false, reason: 'saudação ou confirmação trivial', category: null };
    }

    // Nível 3: Aprovação por keywords de conteúdo fitness
    const matchedKeywords = RICH_KEYWORDS.filter(kw => combined.includes(kw));
    if (matchedKeywords.length >= 2) {
        // Determina a categoria dominante
        const category = combined.includes('plano') || combined.includes('protocolo') || combined.includes('programa')
            ? 'training_plan'
            : combined.includes('lesão') || combined.includes('dor') || combined.includes('postura')
                ? 'injury_health'
                : combined.includes('meta') || combined.includes('objetivo') || combined.includes('evolução')
                    ? 'goal_assessment'
                    : 'fitness_advice';

        return {
            isRich: true,
            reason: `keywords encontradas: ${matchedKeywords.slice(0, 3).join(', ')}`,
            category
        };
    }

    // Nível 4: Aprova se a resposta for longa (provável conteúdo instrucional)
    if (aiResponse.trim().length > 400) {
        return {
            isRich: true,
            reason: 'resposta longa com conteúdo provável',
            category: 'long_response'
        };
    }

    return { isRich: false, reason: 'sem keywords relevantes e resposta curta', category: null };
};

// ─────────────────────────────────────────────────────────────────
// FUNÇÕES DE ARMAZENAMENTO E RECUPERAÇÃO
// ─────────────────────────────────────────────────────────────────

/**
 * Salva um novo evento na memória vetorial do usuário.
 *
 * @param {string} userId UUID do usuário
 * @param {string} contentSummary Resumo em texto do que aconteceu
 * @param {object} metadata Objeto JSON com dados extras
 */
export const saveToMemory = async (userId, contentSummary, metadata = {}) => {
    try {
        const embedding = await generateEmbedding(contentSummary);

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
            console.error('Erro ao salvar memória no Supabase:', error);
            throw error;
        }

        return data;
    } catch (error) {
        console.error('Falha na rotina de saveToMemory:', error);
        throw error;
    }
};

/**
 * Salva uma conversa na memória vetorial SE ela for classificada como "rica".
 * Retorna true se foi salva, false se foi descartada.
 *
 * @param {string} userId
 * @param {string} userMessage
 * @param {string} aiResponse
 * @returns {Promise<boolean>}
 */
export const maybeStoreConversation = async (userId, userMessage, aiResponse) => {
    const { isRich, reason, category } = classifyConversation(userMessage, aiResponse);

    if (!isRich) {
        console.log(`[Benfit Coach] Conversa não salva: ${reason}`);
        return false;
    }

    const contentSummary = `Usuário perguntou: "${userMessage}"\nBenfit Coach respondeu: ${aiResponse.substring(0, 600)}`;
    const metadata = {
        type: 'conversation',
        category,
        user_message: userMessage.substring(0, 200),
        date: new Date().toISOString()
    };

    await saveToMemory(userId, contentSummary, metadata);
    console.log(`[Benfit Coach] Conversa rica salva! Categoria: ${category} | Motivo: ${reason}`);
    return true;
};

/**
 * Busca memórias relevantes baseadas na pergunta atual do usuário.
 *
 * @param {string} userId UUID do usuário
 * @param {string} queryText Mensagem ou pergunta que o usuário enviou
 * @param {number} matchThreshold Grau de similaridade mínimo (0 a 1)
 * @param {number} matchCount Máximo de resultados retornados
 * @returns {Promise<Array>}
 */
export const searchUserMemory = async (userId, queryText, matchThreshold = 0.5, matchCount = 5) => {
    try {
        const queryEmbedding = await generateEmbedding(queryText);

        const { data, error } = await supabase.rpc('match_embeddings', {
            query_embedding: queryEmbedding,
            match_threshold: matchThreshold,
            match_count: matchCount,
            p_user_id: userId
        });

        if (error) {
            console.error('Erro na busca semântica Supabase RPC:', error);
            throw error;
        }

        return data;
    } catch (error) {
        console.error('Falha na rotina de searchUserMemory:', error);
        throw error;
    }
};
