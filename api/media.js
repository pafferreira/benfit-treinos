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
    translatePrompt,
    uploadMedia,
} from './_media.js';

// Mídia dos exercícios (v2, etapa 2C). Ações:
// - image: imagem nova (exercício criado pelo Coach, ou admin pedindo outra)
// - poses: início e fim do movimento, alternando no app (só admin)
// - video: animação em loop pelo Veo (só admin); devolve a mídia "gerando"
// - video-status: confere o vídeo e, pronto, salva o arquivo e manda para a fila
// - prompt: devolve a descrição padrão de um tipo, para o admin editar antes de gerar
// O admin pode mandar "prompt" (descrição editada) no lugar da descrição padrão.
// Tudo roda com o token de quem pediu; as funções do banco conferem as permissões.
const ACTIONS = new Set(['image', 'poses', 'video', 'video-status', 'prompt']);
const ADMIN_ONLY = new Set(['poses', 'video', 'prompt']);
const KINDS = new Set(['image', 'poses', 'video']);
const PROMPT_MAX = 4000;
// Nas duas poses, a descrição tem duas partes (início e fim) separadas por esta linha.
export const POSE_SEPARATOR = '\n---\n';

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

// Recusa cedo o que nunca seria permitido; o limite diário fica na reserva do banco.
const checkAccess = async ({ supabase, user, action, exercise }) => {
    const admin = await isAdminUser(supabase, user.id);
    if (admin) return true;
    if (ADMIN_ONLY.has(action)) throw new ChatHttpError(403, 'Só administradores geram animações');
    const ownAiExercise = exercise.created_by_ai && exercise.created_by === user.id && !exercise.image_url;
    if (!ownAiExercise) throw new ChatHttpError(403, 'Sem permissão para gerar esta imagem');
    return false;
};

export const defaultPrompt = (exercise, kind, adjustment = '') => {
    if (kind === 'poses') {
        return ['start', 'end'].map(pose => buildPosePrompt(exercise, pose, adjustment)).join(POSE_SEPARATOR);
    }
    return kind === 'video' ? buildVideoPrompt(exercise, adjustment) : buildImagePrompt(exercise, adjustment);
};

export const splitPosePrompt = (prompt) => {
    const parts = prompt.split(/\n\s*---\s*\n/).map(part => part.trim()).filter(Boolean);
    if (parts.length !== 2) {
        throw new ChatHttpError(400, 'Nas duas poses, mantenha uma linha só com --- separando a pose inicial da final');
    }
    return parts;
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

const rpcError = (error, fallback) => {
    console.error('[api/media] Falha no banco:', error.message);
    const status = { '42501': 403, '54000': 429, '55000': 409, 'P0002': 404 }[error.code] || 500;
    return new ChatHttpError(status, error.message || fallback);
};

const submit = async (supabase, payload) => {
    const { data, error } = await supabase.rpc('b_media_submit', payload);
    if (error) throw rpcError(error, 'Não foi possível registrar a mídia');
    return data;
};

const finish = async (supabase, mediaId, { url = null, frames = null, paths = [], failure = null }) => {
    const { data, error } = await supabase.rpc('b_media_finish_job', {
        p_media_id: mediaId, p_url: url, p_frames: frames, p_storage_paths: paths, p_error: failure,
    });
    if (error) throw rpcError(error, 'Não foi possível concluir a mídia');
    return data;
};

// Imagem e duas poses: reserva a vaga no banco (permissão e limite diário)
// antes de pagar a geração; qualquer falha depois marca a reserva como "falhou".
const generateReserved = async (supabase, exercise, kind, prompt, produce) => {
    const { data: reservation, error } = await supabase.rpc('b_media_reserve', {
        p_entity_type: 'exercise', p_entity_id: exercise.id, p_kind: kind, p_prompt: prompt,
    });
    if (error) throw rpcError(error, 'Não foi possível reservar a geração');
    try {
        return await finish(supabase, reservation.id, await produce());
    } catch (e) {
        await finish(supabase, reservation.id, { failure: e.message }).catch(() => {});
        throw e;
    }
};

const requireExerciseImage = async (exercise) => {
    const image = await fetchImage(exercise.image_url);
    if (!image) throw new ChatHttpError(400, 'O exercício precisa de uma imagem aprovada antes da animação');
    return image;
};

async function handleImage({ supabase, exercise, adjustment, customPrompt }) {
    const prompt = customPrompt || buildImagePrompt(exercise, adjustment);
    return generateReserved(supabase, exercise, 'image', prompt, async () => {
        const [references, english] = await Promise.all([styleReferences(supabase, exercise.id), translatePrompt(prompt)]);
        const image = await generateImage({ prompt: english, references });
        const path = mediaPath(exercise, 'imagem', image.mimeType);
        const url = await uploadMedia(supabase, path, Buffer.from(image.data, 'base64'), image.mimeType);
        return { url, paths: [path] };
    });
}

async function handlePoses({ supabase, exercise, adjustment, customPrompt }) {
    const prompts = customPrompt
        ? splitPosePrompt(customPrompt)
        : ['start', 'end'].map(pose => buildPosePrompt(exercise, pose, adjustment));
    const reference = await requireExerciseImage(exercise);
    return generateReserved(supabase, exercise, 'poses', prompts.join('\n---\n'), async () => {
        const english = await Promise.all(prompts.map(prompt => translatePrompt(prompt)));
        // A pose final parte da inicial: mesma pessoa, ângulo e enquadramento, só o corpo muda.
        const start = await generateImage({ prompt: english[0], references: [reference] });
        const end = await generateImage({ prompt: english[1], references: [start, reference] });
        const images = [start, end];
        const paths = images.map((image, i) => mediaPath(exercise, i === 0 ? 'pose-inicio' : 'pose-fim', image.mimeType));
        const frames = await Promise.all(images.map((image, i) =>
            uploadMedia(supabase, paths[i], Buffer.from(image.data, 'base64'), image.mimeType)));
        return { frames, paths };
    });
}

async function handleVideo({ supabase, exercise, adjustment, customPrompt }) {
    const image = await requireExerciseImage(exercise);
    const prompt = customPrompt || buildVideoPrompt(exercise, adjustment);
    const { job } = await startVideo({ prompt: await translatePrompt(prompt), image });
    return submit(supabase, {
        p_entity_type: 'exercise', p_entity_id: exercise.id, p_kind: 'video',
        p_url: null, p_frames: null, p_storage_paths: [], p_prompt: prompt, p_job: job,
    });
}

async function handleVideoStatus({ supabase, mediaId }) {
    const { data: media, error } = await supabase.from('b_media').select('*').eq('id', mediaId).maybeSingle();
    if (error || !media) throw new ChatHttpError(404, 'Mídia não encontrada');
    // Só vídeo tem operação no Veo; imagem e poses "gerando" concluem sozinhas.
    if (media.status !== 'gerando' || media.kind !== 'video' || !media.job) return media;

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
    return finish(supabase, media.id, { url, paths, failure });
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }
    const { action, exerciseId, mediaId, adjustment, kind, prompt } = req.body || {};
    if (!ACTIONS.has(action)) {
        return res.status(400).json({ error: 'Ação inválida' });
    }
    const cleanAdjustment = typeof adjustment === 'string' ? adjustment.trim().slice(0, 500) : '';
    const customPrompt = typeof prompt === 'string' ? prompt.trim() : '';
    if (customPrompt.length > PROMPT_MAX) {
        return res.status(400).json({ error: `A descrição pode ter até ${PROMPT_MAX} caracteres` });
    }

    try {
        const { supabase, user } = await requireUser(getBearerToken(req));

        if (action === 'video-status') {
            if (!mediaId) return res.status(400).json({ error: 'Campo "mediaId" é obrigatório' });
            const media = await handleVideoStatus({ supabase, mediaId });
            return res.status(200).json({ media });
        }

        if (!exerciseId) return res.status(400).json({ error: 'Campo "exerciseId" é obrigatório' });
        const exercise = await loadExercise(supabase, exerciseId);
        const admin = await checkAccess({ supabase, user, action, exercise });

        if (action === 'prompt') {
            if (!KINDS.has(kind)) return res.status(400).json({ error: 'Tipo de mídia inválido' });
            return res.status(200).json({ prompt: defaultPrompt(exercise, kind, cleanAdjustment) });
        }
        if (customPrompt && !admin) {
            return res.status(403).json({ error: 'Só administradores editam a descrição' });
        }

        const run = { image: handleImage, poses: handlePoses, video: handleVideo }[action];
        const media = await run({ supabase, exercise, adjustment: cleanAdjustment, customPrompt });
        return res.status(200).json({ media });
    } catch (error) {
        if (error instanceof ChatHttpError) {
            return res.status(error.status).json({ error: error.message });
        }
        console.error('[api/media] Erro:', error);
        return res.status(500).json({ error: 'Falha ao gerar a mídia' });
    }
}
