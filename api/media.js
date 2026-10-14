import { ChatHttpError, getBearerToken, requireUser } from './_conversation-history.js';
import {
    buildImagePrompt,
    buildPosePrompt,
    buildVideoPrompt,
    checkVideo,
    downloadVideo,
    fetchImage,
    generateImage,
    mediaPath,
    startVideo,
    uploadMedia,
} from './_media.js';

// Mídia dos exercícios (v2, etapa 2C). Ações:
// - image: imagem nova (exercício criado pelo Coach, ou admin pedindo outra)
// - poses: início e fim do movimento, alternando no app (só admin)
// - video: animação em loop pelo Veo (só admin); devolve a mídia "gerando"
// - video-status: confere o vídeo e, pronto, salva o arquivo e manda para a fila
// Tudo roda com o token de quem pediu; as funções do banco conferem as permissões.
const ACTIONS = new Set(['image', 'poses', 'video', 'video-status']);
const ADMIN_ONLY = new Set(['poses', 'video']);
const DAILY_LIMIT = 6;

const loadExercise = async (supabase, exerciseId) => {
    const { data, error } = await supabase
        .from('b_exercises')
        .select('id, exercise_key, name, equipment, muscle_group, muscle_groups, instructions, image_url, created_by, created_by_ai')
        .eq('id', exerciseId)
        .maybeSingle();
    if (error) throw new ChatHttpError(500, 'Não foi possível carregar o exercício');
    if (!data) throw new ChatHttpError(404, 'Exercício não encontrado');
    return data;
};

const isAdminUser = async (supabase, userId) => {
    const { data } = await supabase.from('b_users').select('role').eq('id', userId).maybeSingle();
    return data?.role === 'admin';
};

// Confere antes de gastar com a geração; o banco confere de novo ao salvar.
const checkAccess = async ({ supabase, user, action, exercise }) => {
    const admin = await isAdminUser(supabase, user.id);
    if (admin) return;
    if (ADMIN_ONLY.has(action)) throw new ChatHttpError(403, 'Só administradores geram animações');
    const ownAiExercise = exercise.created_by_ai && exercise.created_by === user.id && !exercise.image_url;
    if (!ownAiExercise) throw new ChatHttpError(403, 'Sem permissão para gerar esta imagem');
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await supabase
        .from('b_media')
        .select('id', { count: 'exact', head: true })
        .eq('created_by', user.id)
        .gte('created_at', since);
    if ((count || 0) >= DAILY_LIMIT) throw new ChatHttpError(429, 'Limite diário de imagens atingido');
};

// Duas imagens atuais como referência de estilo (as que ficam em exercises/).
const styleReferences = async (supabase, exerciseId) => {
    const { data } = await supabase
        .from('b_exercises')
        .select('image_url')
        .like('image_url', '%/benfit-assets/exercises/%')
        .neq('id', exerciseId)
        .order('name')
        .limit(2);
    const images = await Promise.all((data || []).map(row => fetchImage(row.image_url).catch(() => null)));
    return images.filter(Boolean);
};

const submit = async (supabase, payload) => {
    const { data, error } = await supabase.rpc('b_media_submit', payload);
    if (error) {
        console.error('[api/media] Falha ao registrar mídia:', error.message);
        throw new ChatHttpError(error.code === '42501' ? 403 : 500, error.message || 'Não foi possível registrar a mídia');
    }
    return data;
};

const requireExerciseImage = async (exercise) => {
    const image = await fetchImage(exercise.image_url);
    if (!image) throw new ChatHttpError(400, 'O exercício precisa de uma imagem aprovada antes da animação');
    return image;
};

async function handleImage({ supabase, exercise, adjustment }) {
    const prompt = buildImagePrompt(exercise, adjustment);
    const references = await styleReferences(supabase, exercise.id);
    const image = await generateImage({ prompt, references });
    const path = mediaPath(exercise, 'imagem', image.mimeType);
    const url = await uploadMedia(supabase, path, Buffer.from(image.data, 'base64'), image.mimeType);
    return submit(supabase, {
        p_entity_type: 'exercise', p_entity_id: exercise.id, p_kind: 'image',
        p_url: url, p_frames: null, p_storage_paths: [path], p_prompt: prompt, p_job: null,
    });
}

async function handlePoses({ supabase, exercise, adjustment }) {
    const reference = await requireExerciseImage(exercise);
    const prompts = ['start', 'end'].map(pose => buildPosePrompt(exercise, pose, adjustment));
    const images = await Promise.all(prompts.map(prompt => generateImage({ prompt, references: [reference] })));
    const paths = images.map((image, i) => mediaPath(exercise, i === 0 ? 'pose-inicio' : 'pose-fim', image.mimeType));
    const urls = await Promise.all(images.map((image, i) =>
        uploadMedia(supabase, paths[i], Buffer.from(image.data, 'base64'), image.mimeType)));
    return submit(supabase, {
        p_entity_type: 'exercise', p_entity_id: exercise.id, p_kind: 'poses',
        p_url: null, p_frames: urls, p_storage_paths: paths, p_prompt: prompts.join('\n---\n'), p_job: null,
    });
}

async function handleVideo({ supabase, exercise, adjustment }) {
    const image = await requireExerciseImage(exercise);
    const prompt = buildVideoPrompt(exercise, adjustment);
    const { job } = await startVideo({ prompt, image });
    return submit(supabase, {
        p_entity_type: 'exercise', p_entity_id: exercise.id, p_kind: 'video',
        p_url: null, p_frames: null, p_storage_paths: [], p_prompt: prompt, p_job: job,
    });
}

async function handleVideoStatus({ supabase, mediaId }) {
    const { data: media, error } = await supabase.from('b_media').select('*').eq('id', mediaId).maybeSingle();
    if (error || !media) throw new ChatHttpError(404, 'Mídia não encontrada');
    if (media.status !== 'gerando') return media;

    const result = await checkVideo({ job: media.job });
    if (!result.done) return media;

    let url = null;
    let paths = [];
    let failure = result.error || null;
    if (result.uri) {
        try {
            const exercise = await loadExercise(supabase, media.entity_id);
            const video = await downloadVideo({ uri: result.uri });
            const path = mediaPath(exercise, 'video', 'video/mp4');
            url = await uploadMedia(supabase, path, video, 'video/mp4');
            paths = [path];
        } catch (e) {
            failure = e.message;
        }
    }
    const { data, error: finishError } = await supabase.rpc('b_media_finish_job', {
        p_media_id: media.id, p_url: url, p_storage_paths: paths, p_error: failure,
    });
    if (finishError) throw new ChatHttpError(500, finishError.message);
    return data;
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }
    const { action, exerciseId, mediaId, adjustment } = req.body || {};
    if (!ACTIONS.has(action)) {
        return res.status(400).json({ error: 'Ação inválida' });
    }
    const cleanAdjustment = typeof adjustment === 'string' ? adjustment.trim().slice(0, 500) : '';

    try {
        const { supabase, user } = await requireUser(getBearerToken(req));

        if (action === 'video-status') {
            if (!mediaId) return res.status(400).json({ error: 'Campo "mediaId" é obrigatório' });
            const media = await handleVideoStatus({ supabase, mediaId });
            return res.status(200).json({ media });
        }

        if (!exerciseId) return res.status(400).json({ error: 'Campo "exerciseId" é obrigatório' });
        const exercise = await loadExercise(supabase, exerciseId);
        await checkAccess({ supabase, user, action, exercise });

        const run = { image: handleImage, poses: handlePoses, video: handleVideo }[action];
        const media = await run({ supabase, exercise, adjustment: cleanAdjustment });
        return res.status(200).json({ media });
    } catch (error) {
        if (error instanceof ChatHttpError) {
            return res.status(error.status).json({ error: error.message });
        }
        console.error('[api/media] Erro:', error);
        return res.status(500).json({ error: 'Falha ao gerar a mídia' });
    }
}
