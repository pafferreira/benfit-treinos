import assert from 'node:assert/strict';
import test from 'node:test';
import process from 'node:process';

import {
    buildImagePrompt,
    buildPosePrompt,
    buildVideoPrompt,
    mediaPath,
    parseImageResponse,
    parseVideoOperation,
    startVideo,
    translatePrompt,
} from '../api/_media.js';
import { COACH_TOOLS, MUSCLE_NAMES, createToolRunner } from '../api/_coach-tools.js';
import { MUSCLES } from '../src/lib/muscles.js';
import mediaHandler, { defaultPrompt, freeDefaultPrompt, splitPosePrompt } from '../api/media.js';

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

test('descrição da imagem em português traz estilo, músculos e ajuste', () => {
    const prompt = buildImagePrompt(exercise, 'mulher');
    assert.match(prompt, /fundo branco puro/);
    assert.match(prompt, /Músculo principal, vermelho forte: Glúteos/);
    assert.match(prompt, /Músculos auxiliares, vermelho mais claro: Posteriores de coxa/);
    assert.match(prompt, /Ponte de Glúteo/);
    assert.match(prompt, /Ajuste pedido na revisão: mulher/);
});

test('descrições das poses e do vídeo pedem a mesma cena', () => {
    assert.match(buildPosePrompt(exercise, 'start'), /posição INICIAL/);
    assert.match(buildPosePrompt(exercise, 'end'), /posição FINAL/);
    assert.match(buildVideoPrompt(exercise), /loop sem emenda/);
});

test('descrição padrão das duas poses separa início e fim, e a editada precisa manter o separador', () => {
    const poses = defaultPrompt(exercise, 'poses');
    assert.deepEqual(splitPosePrompt(poses).map(p => /INICIAL/.test(p) || /FINAL/.test(p)), [true, true]);
    assert.deepEqual(splitPosePrompt('início\n ---\nfim'), ['início', 'fim']);
    assert.throws(() => splitPosePrompt('só uma parte'), err => err.status === 400);
});

test('translatePrompt usa a tradução e cai para o português se falhar', async () => {
    assert.equal(await translatePrompt('Fundo branco', async () => ({ text: 'White background' })), 'White background');
    assert.equal(await translatePrompt('Fundo branco', async () => { throw new Error('fora do ar'); }), 'Fundo branco');
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

test('startVideo tenta formatos mais simples quando o Veo recusa com 400', async () => {
    process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'teste';
    const bodies = [];
    const fetchImpl = async (_url, init) => {
        bodies.push(JSON.parse(init.body));
        if (bodies.length < 3) {
            return { ok: false, status: 400, text: async () => JSON.stringify({ error: { message: 'formato recusado' } }) };
        }
        return { ok: true, json: async () => ({ name: 'operations/abc' }) };
    };
    const result = await startVideo({ prompt: 'p', image: { mimeType: 'image/png', data: 'AAA' }, fetchImpl });
    assert.equal(result.job, 'operations/abc');
    assert.equal(bodies.length, 3);
    assert.equal(bodies[0].parameters.durationSeconds, 8);
    assert.deepEqual(bodies[0].instances[0].lastFrame, { inlineData: { mimeType: 'image/png', data: 'AAA' } });
    assert.equal(bodies[1].instances[0].lastFrame, undefined);
    assert.equal(bodies[2].instances[0].image.bytesBase64Encoded, 'AAA');
});

test('startVideo mostra a mensagem do Veo quando nenhum formato serve', async () => {
    process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'teste';
    const fetchImpl = async () => ({ ok: false, status: 400, text: async () => JSON.stringify({ error: { message: 'billing required' } }) });
    await assert.rejects(
        startVideo({ prompt: 'p', image: { mimeType: 'image/png', data: 'AAA' }, fetchImpl }),
        err => err.status === 502 && /\(400\): billing required/.test(err.message),
    );
});

test('avatar e outro têm descrição padrão e só aceitam imagem', async () => {
    assert.match(freeDefaultPrompt('avatar', { gender: 'male', style: '3d' }), /homem adulto/);
    assert.match(freeDefaultPrompt('avatar', { gender: 'female', style: 'real' }), /Foto realista/);
    assert.match(freeDefaultPrompt('other'), /^Exemplo/);
    const res = fakeResponse();
    await mediaHandler({ method: 'POST', body: { action: 'poses', entityType: 'avatar' } }, res);
    assert.equal(res.statusCode, 400);
});
