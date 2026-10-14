// Mídias geradas pela IA (v2, etapa 2C): pedidos ao /api/media e a fila b_media.
import { supabase } from '../lib/supabase';
import { postJson } from './ai';

// action: image | poses | video | video-status
export const requestMedia = async (action, { exerciseId, mediaId, adjustment } = {}) => {
    const { media } = await postJson('/api/media', { action, exerciseId, mediaId, adjustment });
    return media;
};

export const listMedia = async ({ statuses, limit = 50 } = {}) => {
    let query = supabase
        .from('b_media')
        .select('*')
        .eq('entity_type', 'exercise')
        .order('created_at', { ascending: false })
        .limit(limit);
    if (statuses?.length) query = query.in('status', statuses);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
};

export const reviewMedia = async (mediaId, decision) => {
    const { data, error } = await supabase.rpc('b_media_review', { p_media_id: mediaId, p_decision: decision });
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
