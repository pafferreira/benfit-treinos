import assert from 'node:assert/strict';
import test from 'node:test';
import { COACH_TOOLS, MEAL_TYPES, createToolRunner, searchTerms, planMediaRequest } from '../api/_coach-tools.js';
import { buildDishImagePrompt, mediaPath } from '../api/_media.js';
import { defaultPrompt } from '../api/media.js';

const dish = {
    id: 'd1',
    dish_key: 'frango_batata_doce',
    name: 'Frango com Batata-Doce',
    description: 'Clássico pós-treino',
    ingredients: [{ item: 'Peito de frango', quantidade: '150 g' }, { item: 'Batata-doce', quantidade: '200 g' }],
};

// Imita o encadeamento do supabase-js e guarda os filtros usados.
const fakeQuery = (rows, calls) => {
    const chain = {
        select: () => chain,
        order: () => chain,
        limit: () => chain,
        or: (filter) => { calls.push(['or', filter]); return chain; },
        eq: (col, value) => { calls.push(['eq', col, value]); return chain; },
        then: (resolve) => resolve({ data: rows, error: null }),
    };
    return chain;
};

test('ferramentas de prato existem e usam os tipos de refeição do banco', () => {
    const names = COACH_TOOLS.map(t => t.name);
    assert.deepEqual(names, ['propor_exercicio_novo', 'buscar_pratos', 'sugerir_prato', 'gerar_midia']);
    const suggest = COACH_TOOLS.find(t => t.name === 'sugerir_prato').input_schema;
    assert.deepEqual(suggest.properties.meal_type.enum, MEAL_TYPES);
    assert.ok(suggest.required.includes('protein_g'));
});

test('searchTerms limpa a busca para o filtro', () => {
    assert.deepEqual(searchTerms('Frango, batata-doce (assada) e ovo'), ['frango', 'batata-doce', 'assada', 'ovo']);
    assert.deepEqual(searchTerms('a,b'), []);
});

test('buscar_pratos acha pelo nome ou ingrediente, sem acento, e filtra por refeição', async () => {
    const calls = [];
    const rows = [
        { id: 'd1', name: 'Frango com Batata-Doce', meal_type: 'pos_treino', kcal: 520, protein_g: '45.5', ingredients: [{ item: 'Peito de frango' }] },
        { id: 'd2', name: 'Bowl Verde', description: 'Leve', meal_type: 'pos_treino', kcal: 410, protein_g: '20', ingredients: [{ item: 'Quinoa' }, { item: 'Brócolis' }] },
    ];
    const run = createToolRunner({ from: () => fakeQuery(rows, calls) });
    const found = await run('buscar_pratos', { busca: 'frango', meal_type: 'pos_treino' });
    assert.match(found.content, /Frango com Batata-Doce \(pós-treino; 520 kcal, 45.5 g de proteína\)/);
    assert.doesNotMatch(found.content, /Bowl Verde/);
    assert.deepEqual(calls, [['eq', 'meal_type', 'pos_treino']]);

    const byIngredient = await run('buscar_pratos', { busca: 'prato com quinoa e brocolis' });
    assert.match(byIngredient.content, /Bowl Verde/);
    assert.doesNotMatch(byIngredient.content, /Frango/);

    const empty = await run('buscar_pratos', { busca: 'xyz' });
    assert.match(empty.content, /Nenhum prato/);
});

test('sugerir_prato cadastra e devolve a ação para gerar a foto', async () => {
    const run = createToolRunner({ rpc: async (fn, args) => {
        assert.equal(fn, 'b_create_ai_dish');
        assert.equal(args.p_data.name, 'Omelete');
        return { data: { id: 'd9', name: 'Omelete', existing: false }, error: null };
    } });
    const created = await run('sugerir_prato', { name: 'Omelete' });
    assert.deepEqual(created.action, { type: 'dish_created', dishId: 'd9', name: 'Omelete', existing: false });
    assert.match(created.content, /cadastrado no catálogo de Dieta/);

    const failing = createToolRunner({ rpc: async () => ({ data: null, error: { message: 'Limite diário de pratos novos atingido' } }) });
    const failure = await failing('sugerir_prato', {});
    assert.equal(failure.isError, true);
});

test('descrição da foto do prato em português, com ingredientes e estilo fixo', () => {
    const prompt = buildDishImagePrompt(dish, 'mais colorido');
    assert.match(prompt, /vista de cima/);
    assert.match(prompt, /Prato: Frango com Batata-Doce/);
    assert.match(prompt, /150 g de Peito de frango, 200 g de Batata-doce/);
    assert.match(prompt, /Ajuste pedido na revisão: mais colorido/);
    assert.equal(defaultPrompt(dish, 'image', '', 'dish'), buildDishImagePrompt(dish));
});

test('foto do prato vai para dishes/ia/', () => {
    assert.match(mediaPath(dish, 'foto', 'image/png', 'dishes'), /^dishes\/ia\/frango_batata_doce-foto-\d+\.png$/);
});

test('planMediaRequest segue as regras de /api/media', () => {
    const own = { created_by_ai: true, created_by: 'u1', image_url: null };
    const published = { created_by_ai: false, created_by: null, image_url: 'https://x/a.png' };
    assert.deepEqual(planMediaRequest({ item: own, isDish: false, isAdmin: false, userId: 'u1', kinds: ['image', 'video'] }).accepted, ['image']);
    assert.deepEqual(planMediaRequest({ item: published, isDish: false, isAdmin: false, userId: 'u1', kinds: ['image'] }).accepted, []);
    assert.deepEqual(planMediaRequest({ item: published, isDish: false, isAdmin: true, userId: 'u1', kinds: ['image', 'poses', 'video'] }).accepted, ['image', 'poses', 'video']);
    assert.deepEqual(planMediaRequest({ item: own, isDish: false, isAdmin: true, userId: 'u9', kinds: ['image', 'video'] }).accepted, ['image']);
    const dish = planMediaRequest({ item: published, isDish: true, isAdmin: true, userId: 'u1', kinds: ['image', 'video'] });
    assert.deepEqual(dish.accepted, ['image']);
    assert.match(dish.refused[0], /prato só tem foto/);
});

test('gerar_midia acha o item, confere permissão e devolve a ação', async () => {
    const rows = [{ id: 'e1', name: 'Agachamento Livre', image_url: 'https://x/a.png', created_by_ai: false, created_by: null }];
    const query = (data) => {
        const chain = { select: () => chain, ilike: () => chain, order: () => chain, limit: () => chain, then: (r) => r({ data, error: null }) };
        return chain;
    };
    const supabase = { from: () => query(rows), rpc: async (fn) => ({ data: fn === 'is_admin', error: null }) };
    const run = createToolRunner(supabase, { id: 'admin' });
    const res = await run('gerar_midia', { tipo_item: 'exercicio', nome: 'agachamento livre', midias: ['video', 'imagem'] });
    assert.deepEqual(res.action, { type: 'media_requested', entityType: 'exercise', entityId: 'e1', name: 'Agachamento Livre', kinds: ['video', 'image'] });

    const student = createToolRunner({ from: () => query(rows), rpc: async () => ({ data: false, error: null }) }, { id: 'u1' });
    const refused = await student('gerar_midia', { tipo_item: 'exercicio', nome: 'agachamento', midias: ['video'] });
    assert.equal(refused.action, undefined);
    assert.match(refused.content, /só um admin/);

    const none = await createToolRunner({ from: () => query([]), rpc: async () => ({ data: true }) }, { id: 'a' })('gerar_midia', { tipo_item: 'prato', nome: 'xyz', midias: ['imagem'] });
    assert.match(none.content, /Nenhum prato/);
});
