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

// A descrição fica em português (o admin lê e edita na tela Aprovar mídias);
// translatePrompt passa para inglês na hora de gerar, onde os modelos acertam mais.
const STYLE = [
    'Siga exatamente o estilo visual das imagens de referência:',
    'render 3D realista de uma pessoa adulta atlética com roupa de academia cinza-escura,',
    'em fundo branco puro, sem cenário,',
    'com os músculos trabalhados destacados em vermelho e fibras musculares visíveis, como uma ilustração de anatomia fitness.',
    'Corpo inteiro e equipamento inteiro dentro do quadro, em vista lateral ou de três quartos que mostre bem a técnica.',
    'Sem texto, sem legendas, sem logotipos, sem marca d\'água. Formato paisagem 16:9.',
].join(' ');

const muscleList = (groups = []) => groups.join(', ');

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
        `Exercício: ${exercise.name}.`,
        exercise.equipment ? `Equipamento: ${exercise.equipment}.` : '',
        groups[0] ? `Músculo principal, vermelho forte: ${muscleList(groups.slice(0, 1))}.` : '',
        groups.length > 1 ? `Músculos auxiliares, vermelho mais claro: ${muscleList(groups.slice(1))}.` : '',
        steps ? `Como é feito: ${steps}` : '',
        'Mostre o momento mais reconhecível do movimento, com técnica correta e segura.',
        adjustment ? `Ajuste pedido na revisão: ${adjustment}` : '',
    ].filter(Boolean).join('\n');
};

export const buildPosePrompt = (exercise, pose, adjustment = '') => [
    'Recrie a imagem de referência: mesma pessoa, mesma roupa, mesmo equipamento, mesmo ângulo de câmera, mesmo enquadramento, mesmo estilo e os mesmos músculos destacados em vermelho.',
    pose === 'start'
        ? `Mude só a posição do corpo para a posição INICIAL do exercício "${exercise.name}".`
        : `A primeira imagem de referência é a posição inicial: mantenha tudo igual a ela e mude só a posição do corpo para a posição FINAL (pico da contração) do exercício "${exercise.name}".`,
    'Fundo branco puro. Sem texto. Formato paisagem 16:9.',
    adjustment ? `Ajuste pedido na revisão: ${adjustment}` : '',
].filter(Boolean).join('\n');

export const buildVideoPrompt = (exercise, adjustment = '') => [
    `A pessoa da imagem faz uma repetição lenta e controlada do exercício "${exercise.name}", com técnica correta,`,
    'e volta exatamente à posição inicial, para o vídeo repetir em loop sem emenda.',
    'Câmera parada, sem movimento de câmera, sem zoom. Fundo branco puro.',
    'Mantenha o mesmo estilo de render 3D e os músculos destacados em vermelho visíveis o tempo todo.',
    adjustment ? `Ajuste pedido na revisão: ${adjustment}` : '',
].filter(Boolean).join(' ');

// Foto dos pratos (etapa 2D): sempre o mesmo estilo, para o catálogo ficar uniforme.
const DISH_STYLE = [
    'Fotografia realista de comida, vista de cima (flat lay), luz natural suave vinda da lateral,',
    'prato de cerâmica branca sobre mesa de madeira clara, fundo limpo, poucos objetos ao redor.',
    'Porção individual, aparência caseira e apetitosa, cores naturais.',
    'Sem texto, sem legendas, sem logotipos, sem marca d\'água, sem pessoas. Formato paisagem 16:9.',
].join(' ');

export const buildDishImagePrompt = (dish, adjustment = '') => {
    const ingredients = (Array.isArray(dish?.ingredients) ? dish.ingredients : [])
        .map(i => [i?.quantidade, i?.item].filter(Boolean).join(' de '))
        .filter(Boolean)
        .slice(0, 12)
        .join(', ');
    return [
        DISH_STYLE,
        `Prato: ${dish.name}.`,
        dish.description ? `Descrição: ${dish.description}` : '',
        ingredients ? `Ingredientes visíveis no prato: ${ingredients}.` : '',
        'Mostre só o que está nos ingredientes, montado como seria servido.',
        adjustment ? `Ajuste pedido na revisão: ${adjustment}` : '',
    ].filter(Boolean).join('\n');
};

const TRANSLATE_SYSTEM = [
    'You translate image and video generation prompts from Brazilian Portuguese to English.',
    'Keep every instruction, the line breaks and any line that is only "---".',
    'Translate gym exercise, equipment and muscle names to the terms used in English-speaking gyms',
    '(for example "Supino" = bench press, "Puxada" = lat pulldown, "Posteriores de coxa" = hamstrings).',
    'Answer with the translated prompt only, no comments.',
].join(' ');

// Traduz a descrição para o inglês. Se nenhum provedor responder, segue em
// português: os modelos do Google também entendem, só com um pouco menos de precisão.
export async function translatePrompt(prompt, chat) {
    try {
        const run = chat || (await import('./_providers.js')).chatWithFallback;
        const { text } = await run({ messages: [{ role: 'user', content: prompt }], systemPrompt: TRANSLATE_SYSTEM });
        return text?.trim() || prompt;
    } catch (e) {
        console.warn('[api/media] Tradução falhou, seguindo em português:', e.message);
        return prompt;
    }
}

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
// Exercícios em exercises/ia/, pratos em dishes/ia/.
export const mediaPath = (item, label, mimeType, folder = 'exercises') => {
    const key = String(item.exercise_key || item.dish_key || item.id).replace(/[^a-z0-9_-]/gi, '_').slice(0, 60);
    return `${folder}/ia/${key}-${label}-${Date.now()}.${EXTENSIONS[mimeType] || 'bin'}`;
};

export async function uploadMedia(supabase, path, body, contentType) {
    const { error } = await supabase.storage.from(BUCKET).upload(path, body, { contentType, upsert: false });
    if (error) {
        console.error('[api/media] Falha no upload:', error.message);
        throw new ChatHttpError(500, 'Não foi possível salvar o arquivo gerado');
    }
    return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
