import assert from 'node:assert/strict';
import test from 'node:test';

import {
    buildImagePrompt,
    buildPosePrompt,
    buildVideoPrompt,
    mediaPath,
    parseImageResponse,
    parseVideoOperation,
} from '../api/_media.js';
import { COACH_TOOLS, MUSCLE_NAMES, createToolRunner } from '../api/_coach-tools.js';
import { MUSCLES } from '../src/lib/muscles.js';
import mediaHandler from '../api/media.js';

const fakeResponse = () => ({
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
});

const exercise = {
    id: 'e1',
    exercise_key: 'ponte_de_gluteo',
    name: 'Ponte de Glúteo',
    equipment: 'Solo',
    muscle_groups: ['Glúteos', 'Posteriores de coxa'],
    instructions: ['Deite de costas', 'Suba o quadril'],
};

test('prompt da imagem traz estilo, músculos em inglês e ajuste', () => {
    const prompt = buildImagePrompt(exercise, 'mulher');
    assert.match(prompt, /pure white background/);
    assert.match(prompt, /Main muscle, strong red highlight: glutes/);
    assert.match(prompt, /Secondary muscles, lighter red highlight: hamstrings/);
    assert.match(prompt, /Ponte de Glúteo/);
    assert.match(prompt, /Adjustment requested by the reviewer: mulher/);
});

test('prompts das poses e do vídeo pedem a mesma cena', () => {
    assert.match(buildPosePrompt(exercise, 'start'), /STARTING position/);
    assert.match(buildPosePrompt(exercise, 'end'), /END position/);
    assert.match(buildVideoPrompt(exercise), /loops seamlessly/);
});

test('lê a imagem da resposta do Gemini (camelCase e snake_case)', () => {
    assert.deepEqual(
        parseImageResponse({ candidates: [{ content: { parts: [{ text: 'ok' }, { inlineData: { mimeType: 'image/png', data: 'AAA' } }] } }] }),
        { mimeType: 'image/png', data: 'AAA' },
    );
    assert.deepEqual(
        parseImageResponse({ candidates: [{ content: { parts: [{ inline_data: { mime_type: 'image/jpeg', data: 'BBB' } }] } }] }),
        { mimeType: 'image/jpeg', data: 'BBB' },
    );
    assert.equal(parseImageResponse({ candidates: [{ content: { parts: [{ text: 'sem imagem' }] } }] }), null);
});

test('lê a operação do Veo', () => {
    assert.deepEqual(parseVideoOperation({ done: false }), { done: false });
    assert.deepEqual(
        parseVideoOperation({ done: true, response: { generateVideoResponse: { generatedSamples: [{ video: { uri: 'https://x/v' } }] } } }),
        { done: true, uri: 'https://x/v' },
    );
    assert.match(parseVideoOperation({ done: true, error: { message: 'cota' } }).error, /cota/);
    assert.match(
        parseVideoOperation({ done: true, response: { generateVideoResponse: { raiMediaFilteredReasons: ['pessoa'] } } }).error,
        /filtro do Google: pessoa/,
    );
});

test('arquivo da IA fica em exercises/ia com a extensão certa', () => {
    assert.match(mediaPath(exercise, 'imagem', 'image/png'), /^exercises\/ia\/ponte_de_gluteo-imagem-\d+\.png$/);
    assert.match(mediaPath(exercise, 'video', 'video/mp4'), /\.mp4$/);
});

test('ferramenta do Coach usa os mesmos músculos do app', () => {
    const names = MUSCLES.map(m => m.nome);
    assert.deepEqual(MUSCLE_NAMES.filter(n => !['Cardio', 'Corpo Todo'].includes(n)), names);
    const schema = COACH_TOOLS[0].input_schema;
    assert.deepEqual(schema.properties.muscle_groups.items.enum, MUSCLE_NAMES);
});

test('ferramenta do Coach chama b_create_ai_exercise e devolve a ação', async () => {
    const calls = [];
    const supabase = {
        rpc: async (name, args) => {
            calls.push({ name, args });
            return { data: { id: 'novo', name: 'Ponte de Glúteo', existing: false }, error: null };
        },
    };
    const run = createToolRunner(supabase);
    const result = await run('propor_exercicio_novo', { name: 'Ponte de Glúteo' });
    assert.equal(calls[0].name, 'b_create_ai_exercise');
    assert.deepEqual(calls[0].args, { p_data: { name: 'Ponte de Glúteo' } });
    assert.deepEqual(result.action, { type: 'exercise_created', exerciseId: 'novo', name: 'Ponte de Glúteo', existing: false });
    assert.equal(result.isError, undefined);

    const failing = createToolRunner({ rpc: async () => ({ data: null, error: { message: 'Limite diário' } }) });
    const failure = await failing('propor_exercicio_novo', {});
    assert.equal(failure.isError, true);
    assert.match(failure.content, /Limite diário/);

    const unknown = await run('outra', {});
    assert.equal(unknown.isError, true);
});

test('api/media valida método, ação e sessão', async () => {
    let res = fakeResponse();
    await mediaHandler({ method: 'GET', headers: {} }, res);
    assert.equal(res.statusCode, 405);

    res = fakeResponse();
    await mediaHandler({ method: 'POST', headers: {}, body: { action: 'apagar' } }, res);
    assert.equal(res.statusCode, 400);

    res = fakeResponse();
    await mediaHandler({ method: 'POST', headers: {}, body: { action: 'image', exerciseId: 'e1' } }, res);
    assert.equal(res.statusCode, 401);
});
