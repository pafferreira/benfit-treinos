// Geração de mídia dos exercícios (v2, etapa 2C): imagem e duas poses pelo
// Gemini, vídeo em loop pelo Veo. Princípio do plano v2: a IA gera uma vez, o
// app guarda no Storage e a fila b_media decide quando a mídia entra no ar.
import { ChatHttpError } from './_conversation-history.js';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';
// Modelos trocáveis no Vercel; o segundo modelo de imagem é reserva caso o
// primeiro seja aposentado ou rejeite o pedido.
const IMAGE_MODELS = [
    process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image',
    'gemini-3.1-flash-image-preview',
].filter((model, index, list) => list.indexOf(model) === index);
const VIDEO_MODEL = process.env.GEMINI_VIDEO_MODEL || 'veo-3.1-fast-generate-preview';
// O Veo 3.1 aceita 4, 6 ou 8 segundos; 6 cobre uma repetição completa sem pressa.
const VIDEO_SECONDS = Number(process.env.BENFIT_VIDEO_SECONDS) || 6;

export const BUCKET = 'benfit-assets';

// Nomes em inglês para o prompt: o modelo acerta mais a anatomia assim.
const MUSCLES_EN = {
    'Peitoral': 'chest (pectorals)',
    'Ombros': 'shoulders (deltoids)',
    'Bíceps': 'biceps',
    'Tríceps': 'triceps',
    'Antebraços': 'forearms',
    'Abdômen': 'abdominals',
    'Trapézio': 'trapezius',
    'Costas (dorsais)': 'lats (latissimus dorsi)',
    'Lombar': 'lower back (erector spinae)',
    'Glúteos': 'glutes (gluteus maximus)',
    'Glúteo médio': 'gluteus medius',
    'Quadríceps': 'quadriceps',
    'Posteriores de coxa': 'hamstrings',
    'Adutores': 'adductors (inner thigh)',
    'Panturrilhas': 'calves',
    'Cardio': 'whole body (cardio)',
    'Corpo Todo': 'whole body',
};

const STYLE = [
    'Match the visual style of the reference images exactly:',
    'a realistic 3D render of one athletic adult person in dark gray gym clothes,',
    'on a pure white background with no scenery,',
    'the worked muscles highlighted in red with visible muscle fibers, like an anatomy fitness illustration.',
    'Whole body and the whole equipment inside the frame, side or three-quarter view that shows the technique clearly.',
    'No text, no labels, no logos, no watermark. Landscape 16:9.',
].join(' ');

const muscleList = (groups = []) => groups.map(g => MUSCLES_EN[g] || g).join(', ');

export const exerciseGroups = (exercise) => (
    Array.isArray(exercise?.muscle_groups) && exercise.muscle_groups.length > 0
        ? exercise.muscle_groups
        : [exercise?.muscle_group].filter(Boolean)
);

export const buildImagePrompt = (exercise, adjustment = '') => {
    const groups = exerciseGroups(exercise);
    const steps = (exercise?.instructions || []).filter(Boolean).slice(0, 6).join(' ');
    return [
        STYLE,
        `Exercise: ${exercise.name}.`,
        exercise.equipment ? `Equipment: ${exercise.equipment}.` : '',
        groups[0] ? `Main muscle, strong red highlight: ${muscleList(groups.slice(0, 1))}.` : '',
        groups.length > 1 ? `Secondary muscles, lighter red highlight: ${muscleList(groups.slice(1))}.` : '',
        steps ? `How it is performed (in Portuguese): ${steps}` : '',
        'Show the most recognizable moment of the movement with correct, safe technique.',
        adjustment ? `Adjustment requested by the reviewer: ${adjustment}` : '',
    ].filter(Boolean).join('\n');
};

export const buildPosePrompt = (exercise, pose, adjustment = '') => [
    'Recreate the reference image: same person, same clothes, same equipment, same camera angle, same framing, same style and the same red muscle highlights.',
    pose === 'start'
        ? `Change only the body position to the STARTING position of the exercise "${exercise.name}".`
        : `Change only the body position to the END position (peak contraction) of the exercise "${exercise.name}".`,
    'Pure white background. No text. Landscape 16:9.',
    adjustment ? `Adjustment requested by the reviewer: ${adjustment}` : '',
].filter(Boolean).join('\n');

export const buildVideoPrompt = (exercise, adjustment = '') => [
    `The person in the image performs one slow, controlled repetition of the exercise "${exercise.name}" with correct technique`,
    'and returns exactly to the starting position, so the clip loops seamlessly.',
    'Fixed camera, no camera movement, no zoom. Pure white background.',
    'Keep the same 3D render style and the red highlighted muscles visible the whole time.',
    adjustment ? `Adjustment requested by the reviewer: ${adjustment}` : '',
].filter(Boolean).join(' ');

const geminiKey = () => {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new ChatHttpError(500, 'GEMINI_API_KEY não configurada');
    return key;
};

// Baixa uma imagem pública (referência de estilo ou a imagem do exercício).
export const fetchImage = async (url, fetchImpl = fetch) => {
    if (!url) return null;
    const res = await fetchImpl(url);
    if (!res.ok) return null;
    const mimeType = (res.headers.get('content-type') || 'image/png').split(';')[0];
    if (!mimeType.startsWith('image/')) return null;
    const data = Buffer.from(await res.arrayBuffer()).toString('base64');
    return { mimeType, data };
};

export const parseImageResponse = (data) => {
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const image = parts.find(part => part?.inlineData?.data || part?.inline_data?.data);
    if (!image) return null;
    const inline = image.inlineData || image.inline_data;
    return { mimeType: inline.mimeType || inline.mime_type || 'image/png', data: inline.data };
};

export async function generateImage({ prompt, references = [], fetchImpl = fetch }) {
    const key = geminiKey();
    const parts = [
        ...references.filter(Boolean).map(ref => ({ inline_data: { mime_type: ref.mimeType, data: ref.data } })),
        { text: prompt },
    ];
    let lastError = '';
    for (const model of IMAGE_MODELS) {
        const res = await fetchImpl(`${GEMINI_BASE}/models/${model}:generateContent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
            body: JSON.stringify({
                contents: [{ role: 'user', parts }],
                generationConfig: {
                    responseModalities: ['IMAGE'],
                    imageConfig: { aspectRatio: '16:9' },
                },
            }),
        });
        if (!res.ok) {
            lastError = `${model}: ${res.status} ${(await res.text()).slice(0, 200)}`;
            console.warn('[api/media] Falha na imagem:', lastError);
            continue;
        }
        const image = parseImageResponse(await res.json());
        if (image) return { ...image, model };
        lastError = `${model}: resposta sem imagem`;
    }
    throw new ChatHttpError(502, `Não foi possível gerar a imagem (${lastError})`);
}

// O Veo leva alguns minutos: aqui só começa a geração e devolve a operação.
// Primeiro e último quadro iguais (a imagem do exercício) deixam o loop sem salto.
// Formatos aceitos variam entre versões do Veo na Gemini API: tenta do mais
// completo (mesmo quadro no início e no fim, para o loop fechar) ao mais simples.
// Pedido recusado (400) não é cobrado, então vale tentar a próxima variante.
export const videoRequestVariants = ({ prompt, image }) => {
    const inline = { inlineData: { mimeType: image.mimeType, data: image.data } };
    const encoded = { bytesBase64Encoded: image.data, mimeType: image.mimeType };
    const negativePrompt = 'text, captions, camera movement, zoom, extra people, distorted anatomy, extra limbs';
    return [
        // Interpolação (primeiro e último quadro) exige 8 s no Veo 3.1.
        { instances: [{ prompt, image: inline, lastFrame: inline }],
            parameters: { aspectRatio: '16:9', durationSeconds: 8, negativePrompt } },
        { instances: [{ prompt, image: inline }],
            parameters: { aspectRatio: '16:9', durationSeconds: VIDEO_SECONDS, negativePrompt } },
        { instances: [{ prompt, image: encoded }],
            parameters: { aspectRatio: '16:9', durationSeconds: VIDEO_SECONDS } },
    ];
};

const veoErrorMessage = (text) => {
    try {
        return JSON.parse(text)?.error?.message || text;
    } catch {
        return text;
    }
};

export async function startVideo({ prompt, image, fetchImpl = fetch }) {
    const key = geminiKey();
    let lastStatus = 0;
    let lastMessage = '';
    for (const body of videoRequestVariants({ prompt, image })) {
        const res = await fetchImpl(`${GEMINI_BASE}/models/${VIDEO_MODEL}:predictLongRunning`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
            body: JSON.stringify(body),
        });
        if (res.ok) {
            const operation = await res.json();
            if (!operation?.name) throw new ChatHttpError(502, 'O Veo não devolveu a operação do vídeo');
            return { job: operation.name, model: VIDEO_MODEL };
        }
        lastStatus = res.status;
        lastMessage = veoErrorMessage((await res.text()).slice(0, 500)).slice(0, 300);
        console.warn('[api/media] Falha ao iniciar vídeo:', res.status, lastMessage);
        if (res.status !== 400) break;
    }
    throw new ChatHttpError(502, `Não foi possível iniciar o vídeo (${lastStatus}): ${lastMessage}`);
}

// done=false: ainda gerando. done=true: uri do vídeo ou erro.
export const parseVideoOperation = (operation) => {
    if (!operation?.done) return { done: false };
    if (operation.error) {
        return { done: true, error: operation.error.message || 'Falha na geração do vídeo' };
    }
    const response = operation.response?.generateVideoResponse;
    const uri = response?.generatedSamples?.[0]?.video?.uri;
    if (!uri) {
        const reasons = response?.raiMediaFilteredReasons;
        return {
            done: true,
            error: Array.isArray(reasons) && reasons.length > 0
                ? `Vídeo bloqueado pelo filtro do Google: ${reasons.join('; ')}`
                : 'O Veo terminou sem vídeo',
        };
    }
    return { done: true, uri };
};

export async function checkVideo({ job, fetchImpl = fetch }) {
    const key = geminiKey();
    if (!/^models\/[\w.-]+\/operations\/[\w-]+$/.test(job || '')) {
        return { done: true, error: 'Operação de vídeo inválida' };
    }
    const res = await fetchImpl(`${GEMINI_BASE}/${job}`, { headers: { 'x-goog-api-key': key } });
    if (!res.ok) {
        // Falha momentânea na consulta: tenta de novo na próxima vez.
        console.warn('[api/media] Falha ao consultar vídeo:', res.status);
        return { done: false };
    }
    return parseVideoOperation(await res.json());
}

export async function downloadVideo({ uri, fetchImpl = fetch }) {
    const res = await fetchImpl(uri, { headers: { 'x-goog-api-key': geminiKey() } });
    if (!res.ok) throw new ChatHttpError(502, `Não foi possível baixar o vídeo (${res.status})`);
    return Buffer.from(await res.arrayBuffer());
}

const EXTENSIONS = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'video/mp4': 'mp4' };

// Arquivos da IA ficam em exercises/ia/; o status na b_media decide se está no ar.
export const mediaPath = (exercise, label, mimeType) => {
    const key = String(exercise.exercise_key || exercise.id).replace(/[^a-z0-9_-]/gi, '_').slice(0, 60);
    return `exercises/ia/${key}-${label}-${Date.now()}.${EXTENSIONS[mimeType] || 'bin'}`;
};

export async function uploadMedia(supabase, path, body, contentType) {
    const { error } = await supabase.storage.from(BUCKET).upload(path, body, { contentType, upsert: false });
    if (error) {
        console.error('[api/media] Falha no upload:', error.message);
        throw new ChatHttpError(500, 'Não foi possível salvar o arquivo gerado');
    }
    return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
