import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeMuscleTerms, summarizeMuscles, getExerciseMuscles } from '../src/lib/muscles.js';

const slugs = (groups) => normalizeMuscleTerms(groups).map(m => `${m.slug}:${m.papel[0]}`);

test('normaliza os textos legados de muscle_group', () => {
    assert.deepEqual(slugs('Pernas / Glúteo'), ['quadriceps:p', 'gluteos:s', 'posteriores:s']);
    assert.deepEqual(slugs('Posterior / Glúteo'), ['posteriores:p', 'gluteos:s']);
    assert.deepEqual(slugs('Ombros (Posterior)'), ['ombros:p']);
    assert.deepEqual(slugs('Ombros / Trapézio'), ['ombros:p', 'trapezio:s']);
    assert.deepEqual(slugs('Glúteo Médio (Lateral)'), ['gluteo_medio:p']);
    assert.deepEqual(slugs('Adutores (Interno Coxa)'), ['adutores:p']);
    assert.deepEqual(slugs('Posterior de Coxa'), ['posteriores:p']);
    assert.deepEqual(slugs('Costas'), ['dorsais:p']);
    assert.deepEqual(slugs('Cardio'), []);
});

test('muscle_groups (lista) tem prioridade e o primeiro é o principal', () => {
    const ex = { id: 'e1', muscle_group: 'Peito', muscle_groups: ['Tríceps', 'Peitoral', 'Ombros'] };
    assert.deepEqual(getExerciseMuscles(ex).map(m => m.slug), ['triceps', 'peitoral', 'ombros']);
    const fromDb = { e1: [{ slug: 'peitoral', papel: 'principal' }] };
    assert.deepEqual(getExerciseMuscles(ex, fromDb), fromDb.e1);
});

test('resumo do dia soma principal 1 e auxiliar 0,5', () => {
    const day = [{ id: 'a', muscle_group: 'Peito / Tríceps' }, { id: 'b', muscle_group: 'Tríceps' }];
    const summary = summarizeMuscles(day).map(s => `${s.slug}:${s.pct}`);
    assert.deepEqual(summary, ['triceps:60', 'peitoral:40']);
});
