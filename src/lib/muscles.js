// Músculos padrão do Benfit (v2, etapa 2B).
// Cada músculo tem cor fixa, usada no mapa do corpo, nos chips e nas listas,
// para o aluno associar cor e músculo em todo o app. A mesma lista é semeada
// em b_muscles (supabase/migrations/20261013_b_muscles.sql); mantenha as duas iguais.

export const MUSCLES = [
    { slug: 'peitoral', nome: 'Peitoral', vista: 'frente', cor: '#1E88E5', regiao: 'superior' },
    { slug: 'ombros', nome: 'Ombros', vista: 'ambas', cor: '#00ACC1', regiao: 'superior' },
    { slug: 'biceps', nome: 'Bíceps', vista: 'frente', cor: '#3949AB', regiao: 'bracos' },
    { slug: 'triceps', nome: 'Tríceps', vista: 'costas', cor: '#7E57C2', regiao: 'bracos' },
    { slug: 'antebracos', nome: 'Antebraços', vista: 'ambas', cor: '#8D6E63', regiao: 'bracos' },
    { slug: 'abdomen', nome: 'Abdômen', vista: 'frente', cor: '#F9A825', regiao: 'core' },
    { slug: 'trapezio', nome: 'Trapézio', vista: 'costas', cor: '#26A69A', regiao: 'superior' },
    { slug: 'dorsais', nome: 'Costas (dorsais)', vista: 'costas', cor: '#1565C0', regiao: 'superior' },
    { slug: 'lombar', nome: 'Lombar', vista: 'costas', cor: '#6D4C41', regiao: 'core' },
    { slug: 'gluteos', nome: 'Glúteos', vista: 'costas', cor: '#8E24AA', regiao: 'pernas' },
    { slug: 'gluteo_medio', nome: 'Glúteo médio', vista: 'costas', cor: '#CE93D8', regiao: 'pernas' },
    { slug: 'quadriceps', nome: 'Quadríceps', vista: 'frente', cor: '#E53935', regiao: 'pernas' },
    { slug: 'posteriores', nome: 'Posteriores de coxa', vista: 'costas', cor: '#43A047', regiao: 'pernas' },
    { slug: 'adutores', nome: 'Adutores', vista: 'frente', cor: '#EC407A', regiao: 'pernas' },
    { slug: 'panturrilhas', nome: 'Panturrilhas', vista: 'ambas', cor: '#FB8C00', regiao: 'pernas' },
];

export const MUSCLE_BY_SLUG = Object.fromEntries(MUSCLES.map(m => [m.slug, m]));

export const REGIONS = [
    { id: 'superior', nome: 'Peito, costas e ombros' },
    { id: 'bracos', nome: 'Braços' },
    { id: 'core', nome: 'Abdômen e lombar' },
    { id: 'pernas', nome: 'Pernas e glúteos' },
];

const plain = (text) => String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();

// Converte um texto livre de grupo muscular ("Pernas / Glúteo", "Ombros (Posterior)")
// em músculos padrão. Regras espelhadas na função b_muscle_slugs() do SQL.
export const slugsForTerm = (term) => {
    const t = plain(term);
    if (!t) return [];
    if (t.includes('ombro')) return ['ombros'];
    if (t.includes('peit')) return ['peitoral'];
    if (t.includes('trapez')) return ['trapezio'];
    if (t.includes('costas') || t.includes('dorsa')) return ['dorsais'];
    if (t.includes('bicep')) return ['biceps'];
    if (t.includes('tricep')) return ['triceps'];
    if (t.includes('antebra')) return ['antebracos'];
    if (t.includes('abdom') || t.includes('core') || t.includes('obliq')) return ['abdomen'];
    if (t.includes('lombar')) return ['lombar'];
    if (t.includes('gluteo medio') || t.includes('abdutor')) return ['gluteo_medio'];
    if (t.includes('glute')) return ['gluteos'];
    if (t.includes('quadri')) return ['quadriceps'];
    if (t.includes('posterior') || t.includes('isquio')) return ['posteriores'];
    if (t.includes('adut')) return ['adutores'];
    if (t.includes('panturr')) return ['panturrilhas'];
    if (t.includes('perna')) return ['quadriceps', 'gluteos', 'posteriores'];
    if (t.includes('corpo')) return ['quadriceps', 'peitoral', 'dorsais', 'abdomen'];
    return []; // ex.: "Cardio" não é um músculo
};

// Lista de grupos (muscle_groups, ou muscle_group legado) → [{ slug, papel }].
// O primeiro músculo encontrado é o principal; os demais são auxiliares.
export const normalizeMuscleTerms = (groups) => {
    const list = Array.isArray(groups) ? groups : [groups];
    const out = [];
    const seen = new Set();
    list
        .flatMap(g => String(g || '').split(/[/,;]/))
        .forEach(term => {
            slugsForTerm(term).forEach(slug => {
                if (seen.has(slug)) return;
                seen.add(slug);
                out.push({ slug, papel: out.length === 0 ? 'principal' : 'secundario' });
            });
        });
    return out;
};

// Músculos de um exercício: usa b_exercise_muscles quando a tabela existir
// (mapa vindo do banco), senão normaliza o texto do próprio exercício.
export const getExerciseMuscles = (exercise, muscleMap) => {
    if (!exercise) return [];
    const fromDb = muscleMap?.[exercise.id];
    if (fromDb && fromDb.length > 0) return fromDb;
    const groups = Array.isArray(exercise.muscle_groups) && exercise.muscle_groups.length > 0
        ? exercise.muscle_groups
        : exercise.muscle_group;
    return normalizeMuscleTerms(groups);
};

// Peso de cada músculo num conjunto de exercícios (principal = 1, auxiliar = 0,5),
// em porcentagem, do maior para o menor. Usado no resumo "Músculos de hoje".
export const summarizeMuscles = (exercises, muscleMap) => {
    const score = {};
    exercises.forEach(ex => {
        getExerciseMuscles(ex, muscleMap).forEach(({ slug, papel }) => {
            score[slug] = (score[slug] || 0) + (papel === 'principal' ? 1 : 0.5);
        });
    });
    const total = Object.values(score).reduce((a, b) => a + b, 0) || 1;
    return Object.entries(score)
        .map(([slug, value]) => ({ slug, pct: Math.round((value / total) * 100), muscle: MUSCLE_BY_SLUG[slug] }))
        .filter(item => item.muscle)
        .sort((a, b) => b.pct - a.pct);
};

// Regiões do corpo sem nenhum músculo no resumo (ex.: semana sem treino de pernas).
export const missingRegions = (summary) => {
    const worked = new Set(summary.map(item => item.muscle?.regiao));
    return REGIONS.filter(region => !worked.has(region.id));
};
