import { ChatHttpError, getBearerToken, requireUser } from './_conversation-history.js';
import {
    OTHER_EXAMPLE_PROMPT,
    buildAvatarPrompt,
    buildDishImagePrompt,
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

// Mídia dos exercícios (v2, etapa 2C) e foto dos pratos (etapa 2D). Ações:
// - image: imagem nova (exercício ou prato criado pelo Coach, ou admin pedindo outra)
// - poses: início e fim do movimento, alternando no app (só admin)
// - video: animação em loop pelo Veo (só admin); devolve a mídia "gerando"
// - video-status: confere o vídeo e, pronto, salva o arquivo e manda para a fila
// - prompt: devolve a descrição padrão de um tipo, para o admin editar antes de gerar
// O admin pode mandar "prompt" (descrição editada) no lugar da descrição padrão.
// Tudo roda com o token de quem pediu; as funções do banco conferem as permissões.
const ACTIONS = new Set(['image', 'poses', 'video', 'video-status', 'prompt']);
const ADMIN_ONLY = new Set(['poses', 'video', 'prompt']);
const KINDS = new Set(['image', 'poses', 'video']);
const ENTITY_TYPES = new Set(['exercise', 'dish']);
// Avatar e Outro não têm item no banco: a imagem volta direto para a tela
// Nova imagem, que mostra a prévia e só grava na Biblioteca se o admin salvar.
const FREE_TYPES = new Set(['avatar', 'other']);
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

const loadDish = async (supabase, dishId) => {
    const { data, error } = await supabase
        .from('b_dishes')
        .select('id, dish_key, name, description, meal_type, ingredients, image_url, created_by, created_by_ai')
        .eq('id', dishId)
        .maybeSingle();
    if (error) throw new ChatHttpError(500, 'Não foi possível carregar o prato');
    if (!data) throw new ChatHttpError(404, 'Prato não encontrado');
    return data;
};

const isAdminUser = async (supabase, userId) => {
    const { data } = await supabase.from('b_users').select('role').eq('id', userId).maybeSingle();
    return data?.role === 'admin';
};

// Recusa cedo o que nunca seria permitido; o limite diário fica na reserva do banco.
// Prato só tem foto: poses e vídeo são exclusivos dos exercícios.
const checkAccess = async ({ supabase, user, action, item, entityType, kind }) => {
    if (entityType === 'dish' && (action === 'poses' || action === 'video' || (action === 'prompt' && kind !== 'image'))) {
        throw new ChatHttpError(400, 'Prato só tem foto');
    }
    const admin = await isAdminUser(supabase, user.id);
    if (admin) return true;
    if (ADMIN_ONLY.has(action)) throw new ChatHttpError(403, 'Só administradores geram animações');
    const ownAiItem = item.created_by_ai && item.created_by === user.id && !item.image_url;
    if (!ownAiItem) throw new ChatHttpError(403, 'Sem permissão para gerar esta imagem');
    return false;
};

export const defaultPrompt = (exercise, kind, adjustment = '', entityType = 'exercise') => {
    if (entityType === 'dish') return buildDishImagePrompt(exercise, adjustment);
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

// Duas imagens atuais como referência de estilo: as dos exercícios (em
// exercises/) ou, para pratos, fotos de pratos já aprovadas (em dishes/).
const styleReferences = async (supabase, itemId, entityType = 'exercise') => {
    const dish = entityType === 'dish';
    const { data } = await supabase
        .from(dish ? 'b_dishes' : 'b_exercises')
        .select('image_url')
        .like('image_url', dish ? '%/benfit-assets/dishes/%' : '%/benfit-assets/exercises/%')
        .neq('id', itemId)
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
const generateReserved = async (supabase, item, kind, prompt, produce, entityType = 'exercise') => {
    const { data: reservation, error } = await supabase.rpc('b_media_reserve', {
        p_entity_type: entityType, p_entity_id: item.id, p_kind: kind, p_prompt: prompt,
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

async function handleImage({ supabase, exercise: item, adjustment, customPrompt, entityType }) {
    const prompt = customPrompt || defaultPrompt(item, 'image', adjustment, entityType);
    return generateReserved(supabase, item, 'image', prompt, async () => {
        const [references, english] = await Promise.all([
            styleReferences(supabase, item.id, entityType), translatePrompt(prompt),
        ]);
        const image = await generateImage({ prompt: english, references });
        const folder = entityType === 'dish' ? 'dishes' : 'exercises';
        const path = mediaPath(item, entityType === 'dish' ? 'foto' : 'imagem', image.mimeType, folder);
        const url = await uploadMedia(supabase, path, Buffer.from(image.data, 'base64'), image.mimeType);
        return { url, paths: [path] };
    }, entityType);
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

// Referência de estilo do avatar: outros avatares do mesmo gênero (e estilo, se houver).
const avatarReferences = async (supabase, gender, style) => {
    const { data } = await supabase
        .from('b_avatars')
        .select('public_url, tags')
        .eq('category', 'Avatar')
        .eq('gender', gender === 'male' ? 'male' : 'female')
        .eq('is_active', true)
        .like('public_url', '%/benfit-assets/avatars/%')
        .limit(12);
    const rows = data || [];
    const sameStyle = rows.filter(row => (row.tags || []).includes(style));
    const picked = (sameStyle.length ? sameStyle : rows).slice(0, 2);
    const images = await Promise.all(picked.map(row => fetchImage(row.public_url).catch(() => null)));
    return images.filter(Boolean);
};

export const freeDefaultPrompt = (entityType, { gender, style } = {}) => (
    entityType === 'avatar' ? buildAvatarPrompt({ gender, style }) : OTHER_EXAMPLE_PROMPT
);

// Avatar ou Outro: gera, salva o arquivo em avatars/ia e devolve o link.
async function handleFreeImage({ supabase, entityType, prompt, gender, style }) {
    const [references, english] = await Promise.all([
        entityType === 'avatar' ? avatarReferences(supabase, gender, style) : [],
        translatePrompt(prompt),
    ]);
    const image = await generateImage({ prompt: english, references, aspectRatio: '1:1' });
    const path = mediaPath({ id: entityType }, 'imagem', image.mimeType, 'avatars');
    const url = await uploadMedia(supabase, path, Buffer.from(image.data, 'base64'), image.mimeType);
    return { url, path };
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
    const entityType = req.body?.entityType || 'exercise';
    const entityId = req.body?.entityId || exerciseId;
    const free = FREE_TYPES.has(entityType);
    if (!ACTIONS.has(action) || !(ENTITY_TYPES.has(entityType) || free) || (free && !['image', 'prompt'].includes(action))) {
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

        if (free) {
            if (!(await isAdminUser(supabase, user.id))) return res.status(403).json({ error: 'Só administradores geram estas imagens' });
            const options = { gender: req.body?.gender, style: req.body?.style === 'real' ? 'real' : '3d' };
            if (action === 'prompt') return res.status(200).json({ prompt: freeDefaultPrompt(entityType, options) });
            if (!customPrompt) return res.status(400).json({ error: 'Escreva a descrição da imagem' });
            const image = await handleFreeImage({ supabase, entityType, prompt: customPrompt, ...options });
            return res.status(200).json({ image });
        }

        if (!entityId) return res.status(400).json({ error: 'Campo "entityId" é obrigatório' });
        const item = entityType === 'dish' ? await loadDish(supabase, entityId) : await loadExercise(supabase, entityId);
        const admin = await checkAccess({ supabase, user, action, item, entityType, kind });

        if (action === 'prompt') {
            if (!KINDS.has(kind)) return res.status(400).json({ error: 'Tipo de mídia inválido' });
            return res.status(200).json({ prompt: defaultPrompt(item, kind, cleanAdjustment, entityType) });
        }
        if (customPrompt && !admin) {
            return res.status(403).json({ error: 'Só administradores editam a descrição' });
        }

        const run = { image: handleImage, poses: handlePoses, video: handleVideo }[action];
        const media = await run({ supabase, exercise: item, adjustment: cleanAdjustment, customPrompt, entityType });
        return res.status(200).json({ media });
    } catch (error) {
        if (error instanceof ChatHttpError) {
            return res.status(error.status).json({ error: error.message });
        }
        console.error('[api/media] Erro:', error);
        return res.status(500).json({ error: 'Falha ao gerar a mídia' });
    }
}
