// Mídias geradas pela IA (v2, etapa 2C): pedidos ao /api/media e a fila b_media.
import { supabase } from '../lib/supabase';
import { postJson } from './ai';

// action: image | poses | video | video-status. prompt: descrição editada pelo admin.
// entityType: exercise (padrão) ou dish; prato só tem foto (image).
// Avisa a tela Aprovar mídias que o Benfit criou um item ou gerou uma mídia.
export const MEDIA_CHANGED_EVENT = 'benfit-media-changed';
export const mediaChanged = () => window.dispatchEvent(new CustomEvent(MEDIA_CHANGED_EVENT));

export const requestMedia = async (action, { exerciseId, entityType = 'exercise', entityId, mediaId, adjustment, prompt } = {}) => {
    const { media } = await postJson('/api/media', {
        action, entityType, entityId: entityId || exerciseId, mediaId, adjustment, prompt,
    });
    return media;
};

// Descrição padrão (em português) de um tipo de mídia, para o admin editar antes de gerar.
export const getDefaultPrompt = async (entityId, kind, entityType = 'exercise') => {
    const { prompt } = await postJson('/api/media', { action: 'prompt', entityType, entityId, kind });
    return prompt;
};

export const listMedia = async ({ statuses, limit = 50 } = {}) => {
    let query = supabase
        .from('b_media')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
    if (statuses?.length) query = query.in('status', statuses);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
};

// Mídias pelos ids (cartões salvos na conversa do Benfit). O RLS mostra as
// aprovadas, as que a pessoa pediu e, para o admin, todas.
export const getMediaByIds = async (ids) => {
    const { data, error } = await supabase
        .from('b_media')
        .select('id, kind, status, url, frames, error')
        .in('id', ids);
    if (error) throw error;
    return new Map((data || []).map(m => [m.id, m]));
};

// use=false aprova sem publicar no item (imagem fica só na Biblioteca).
export const reviewMedia = async (mediaId, decision, use = true) => {
    const { data, error } = await supabase.rpc('b_media_review', { p_media_id: mediaId, p_decision: decision, p_use: use });
    if (error) throw error;
    return data;
};

// Publica no exercício ou prato uma mídia já aprovada (Histórico).
export const applyMediaToItem = async (mediaId) => {
    const { data, error } = await supabase.rpc('b_media_use', { p_media_id: mediaId });
    if (error) throw error;
    return data;
};

export const getMediaApproval = async () => {
    const { data, error } = await supabase
        .from('b_app_settings')
        .select('value')
        .eq('key', 'media_approval')
        .maybeSingle();
    if (error) throw error;
    return data ? data.value !== false : true;
};

export const setMediaApproval = async (on) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
        .from('b_app_settings')
        .upsert({ key: 'media_approval', value: on, updated_at: new Date().toISOString(), updated_by: user?.id || null });
    if (error) throw error;
};
