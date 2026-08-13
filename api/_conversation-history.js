import { createClient } from '@supabase/supabase-js';

export const CHAT_HISTORY_LIMIT = 12;

export class ChatHttpError extends Error {
    constructor(status, message) {
        super(message);
        this.name = 'ChatHttpError';
        this.status = status;
    }
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const getSupabaseConfig = () => ({
    url: process.env.SUPABASE_URL
        || process.env.VITE_SUPABASE_URL
        || process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY
        || process.env.VITE_SUPABASE_ANON_KEY
        || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});

export const getBearerToken = (req) => {
    const authorization = req?.headers?.authorization || req?.headers?.Authorization || '';
    const match = /^Bearer\s+(.+)$/i.exec(authorization);
    return match?.[1]?.trim() || null;
};

export const normalizeHistoryRows = (rows = []) => rows
    .filter(row => (row?.role === 'user' || row?.role === 'assistant') && typeof row.content === 'string')
    .map(row => ({
        role: row.role,
        content: row.content,
        provider: typeof row.provider === 'string' ? row.provider : null,
        providerParts: Array.isArray(row.provider_parts)
            ? row.provider_parts
            : (Array.isArray(row.providerParts) ? row.providerParts : null),
    }));

const buildCurrentContent = (message, context) => [
    context ? `### CONTEXTO ATUAL DO ALUNO\n${context}` : '',
    `---\nMensagem do aluno: ${message}`,
].filter(Boolean).join('\n\n');

export const buildConversationMessages = ({ history = [], message, context = '' }) => {
    const normalized = normalizeHistoryRows(history);
    const currentContent = buildCurrentContent(message, context);
    const last = normalized.at(-1);

    if (last?.role === 'user' && last.content.trim() === message.trim()) {
        return [
            ...normalized.slice(0, -1),
            { ...last, content: currentContent },
        ];
    }

    return [
        ...normalized,
        { role: 'user', content: currentContent, provider: null, providerParts: null },
    ];
};

const createAuthenticatedClient = (accessToken) => {
    const { url, anonKey } = getSupabaseConfig();
    if (!url || !anonKey) {
        throw new ChatHttpError(500, 'Configuração do Supabase indisponível no servidor');
    }

    return createClient(url, anonKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
        },
        global: {
            headers: { Authorization: `Bearer ${accessToken}` },
        },
    });
};

export const loadConversationSession = async ({ accessToken, conversationId }) => {
    if (!accessToken) {
        throw new ChatHttpError(401, 'Sessão expirada. Entre novamente para conversar com o Coach.');
    }
    if (!UUID_PATTERN.test(conversationId || '')) {
        throw new ChatHttpError(400, 'Campo "conversationId" inválido');
    }

    const supabase = createAuthenticatedClient(accessToken);
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
        throw new ChatHttpError(401, 'Sessão expirada. Entre novamente para conversar com o Coach.');
    }

    const { data: conversation, error: conversationError } = await supabase
        .from('b_ai_conversations')
        .select('id')
        .eq('id', conversationId)
        .eq('user_id', user.id)
        .maybeSingle();

    if (conversationError) {
        throw new ChatHttpError(500, 'Não foi possível validar a conversa');
    }
    if (!conversation) {
        throw new ChatHttpError(404, 'Conversa não encontrada');
    }

    const { data, error } = await supabase
        .from('b_ai_chat_history')
        .select('role, content, provider, provider_parts, created_at')
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(CHAT_HISTORY_LIMIT);

    if (error) {
        throw new ChatHttpError(500, 'Não foi possível carregar o histórico da conversa');
    }

    return {
        supabase,
        user,
        history: normalizeHistoryRows([...(data || [])].reverse()),
    };
};

export const saveAssistantResponse = async ({
    supabase,
    userId,
    conversationId,
    text,
    provider,
    providerParts,
}) => {
    const { error } = await supabase
        .from('b_ai_chat_history')
        .insert({
            user_id: userId,
            conversation_id: conversationId,
            role: 'assistant',
            content: text,
            provider,
            provider_parts: Array.isArray(providerParts) ? providerParts : null,
        });

    if (error) {
        throw new ChatHttpError(500, 'A resposta foi gerada, mas não pôde ser salva no histórico');
    }
};
