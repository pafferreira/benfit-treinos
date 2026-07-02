/**
 * context.js — Benfit Coach Context Builder
 *
 * Monta um "snapshot estruturado" do usuário para enriquecer
 * cada conversa com o Coach IA. Consulta diretamente as tabelas
 * do Supabase e formata os dados como texto para o modelo Gemini.
 *
 * Dados incluídos:
 *  - Perfil (nome, idade, peso, altura, objetivo)
 *  - Planos de treino ativos
 *  - Histórico das últimas sessões (exercícios, feeling, calorias)
 *  - Metas ativas
 *  - Exercícios disponíveis no catálogo (por grupo muscular)
 */

import { supabase, supabaseHelpers } from '../lib/supabase';

/**
 * Calcula a idade a partir de birth_date.
 */
const calcAge = (birthDateStr) => {
    if (!birthDateStr) return null;
    const birth = new Date(birthDateStr);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
};

/**
 * Formata uma data ISO para "dd/mm/yyyy".
 */
const fmtDate = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('pt-BR');
};

/**
 * Constrói um snapshot de contexto estruturado do usuário como texto,
 * pronto para ser injetado no prompt do Benfit Coach.
 *
 * @param {string} userId - UUID do usuário autenticado
 * @returns {Promise<string>} Texto de contexto formatado
 */
// Cache do catálogo de exercícios (muda raramente; evita query de 600 linhas por mensagem)
let catalogCache = { text: null, at: 0 };
const CATALOG_TTL_MS = 10 * 60 * 1000;

const getCatalogSection = async () => {
    if (catalogCache.text && Date.now() - catalogCache.at < CATALOG_TTL_MS) {
        return catalogCache.text;
    }
    const { data: exercises } = await supabase
        .from('b_exercises')
        .select('name, muscle_group, equipment')
        .order('muscle_group')
        .limit(600);

    if (!exercises || exercises.length === 0) return null;

    const byGroup = exercises.reduce((acc, ex) => {
        const group = ex.muscle_group || 'Outros';
        if (!acc[group]) acc[group] = [];
        acc[group].push(ex.name);
        return acc;
    }, {});

    const catalogLines = Object.entries(byGroup)
        .map(([group, names]) => `• ${group}: ${names.join(', ')}`)
        .join('\n');
    const text = `## Catálogo Completo de Exercícios Disponíveis\n${catalogLines}`;
    catalogCache = { text, at: Date.now() };
    return text;
};

/**
 * Estatísticas agregadas de TODO o histórico de exercícios do usuário.
 * Usado quando o aluno pergunta sobre seu histórico completo
 * ("quantos exercícios de tríceps fiz até hoje?").
 */
export const buildExerciseStats = async (userId) => {
    const { data: logs, error } = await supabase
        .from('b_session_logs')
        .select('exercise_id, created_at, b_exercises(name, muscle_group)')
        .eq('user_id', userId)
        .limit(3000);

    if (error || !logs || logs.length === 0) return null;

    const byGroup = {};
    for (const log of logs) {
        const group = log.b_exercises?.muscle_group || 'Outros';
        const name = log.b_exercises?.name || 'Desconhecido';
        if (!byGroup[group]) byGroup[group] = { total: 0, exercises: {} };
        byGroup[group].total++;
        byGroup[group].exercises[name] = (byGroup[group].exercises[name] || 0) + 1;
    }

    const lines = Object.entries(byGroup)
        .sort((a, b) => b[1].total - a[1].total)
        .map(([group, g]) => {
            const exList = Object.entries(g.exercises)
                .sort((a, b) => b[1] - a[1])
                .map(([name, n]) => `${name} (${n}x)`)
                .join(', ');
            return `• ${group}: ${g.total} série(s)/registro(s) no total — ${exList}`;
        });

    return `## Estatísticas Completas de Exercícios (todo o histórico)\n(cada registro = uma série/execução concluída)\n${lines.join('\n')}`;
};

export const buildUserContext = async (userId) => {
    // Todas as fontes em paralelo — antes eram 5 queries sequenciais por mensagem
    const [profileR, goalsR, workoutsR, sessionsR, catalogR] = await Promise.allSettled([
        supabaseHelpers.getCurrentUser(),
        supabaseHelpers.getUserGoals(userId),
        // Planos ativos do aluno vêm de b_daily_workout_logs (b_workouts não tem user_id)
        supabaseHelpers.getUserActivePlans(userId),
        supabase
            .from('b_workout_sessions')
            .select(`
                id, started_at, ended_at, feeling, calories_burned,
                b_workouts(title),
                b_workout_days(day_name, day_number),
                b_session_logs(
                    set_number, reps_completed, weight_kg,
                    b_exercises(name, muscle_group)
                )
            `)
            .eq('user_id', userId)
            .not('ended_at', 'is', null)
            .order('ended_at', { ascending: false })
            .limit(7),
        getCatalogSection(),
    ]);

    const sections = [];

    // ── 1. PERFIL DO USUÁRIO ───────────────────────────────────────
    try {
        const profile = profileR.status === 'fulfilled' ? profileR.value : null;
        if (profile) {
            const age = calcAge(profile.birth_date);
            const parts = [
                `Nome: ${profile.name || 'Não informado'}`,
                age ? `Idade: ${age} anos` : null,
                profile.gender ? `Gênero: ${profile.gender}` : null,
                profile.weight_kg ? `Peso: ${profile.weight_kg} kg` : null,
                profile.height_cm ? `Altura: ${profile.height_cm} cm` : null,
                profile.role ? `Perfil: ${profile.role}` : null,
            ].filter(Boolean);
            sections.push(`## Perfil do Aluno\n${parts.join(' | ')}`);
        }
    } catch (e) {
        console.warn('[Context] Erro ao buscar perfil:', e?.message);
    }

    // ── 2. METAS ATIVAS ────────────────────────────────────────────
    try {
        const goals = goalsR.status === 'fulfilled' ? goalsR.value : null;
        if (goals && goals.length > 0) {
            const goalLines = goals
                .filter(g => g.status === 'active')
                .slice(0, 5)
                .map(g => {
                    const deadline = g.deadline ? ` (prazo: ${fmtDate(g.deadline)})` : '';
                    return `• ${g.title}${deadline}${g.description ? `: ${g.description}` : ''}`;
                });
            if (goalLines.length > 0) {
                sections.push(`## Metas Ativas\n${goalLines.join('\n')}`);
            }
        }
    } catch (e) {
        console.warn('[Context] Erro ao buscar metas:', e?.message);
    }

    // ── 3. PLANOS DE TREINO DO USUÁRIO ────────────────────────────
    try {
        const plans = workoutsR.status === 'fulfilled' ? workoutsR.value : null;

        if (plans && plans.length > 0) {
            const seen = new Set();
            const wLines = [];
            for (const p of plans) {
                const w = p.b_workouts;
                if (!w || seen.has(w.id)) continue;
                seen.add(w.id);
                wLines.push(`• ${w.title} | Nível: ${w.difficulty || 'n/a'} | Duração: ${w.estimated_duration ? `${w.estimated_duration} min` : 'N/A'} | Dias/semana: ${w.days_per_week || 'N/A'}`);
            }
            if (wLines.length > 0) sections.push(`## Planos de Treino\n${wLines.join('\n')}`);
        }
    } catch (e) {
        console.warn('[Context] Erro ao montar planos:', e?.message);
    }

    // ── 4. HISTÓRICO RECENTE DE SESSÕES ───────────────────────────
    try {
        const sessions = sessionsR.status === 'fulfilled' ? sessionsR.value?.data : null;

        if (sessions && sessions.length > 0) {
            const sessionLines = sessions.map((s) => {
                const dayLabel = s.b_workout_days?.day_name || `Dia ${s.b_workout_days?.day_number || '?'}`;
                const workoutTitle = s.b_workouts?.title || 'Treino';
                const dateStr = fmtDate(s.ended_at || s.started_at);
                const feeling = s.feeling ? `feeling: ${s.feeling}/10` : '';
                const calories = s.calories_burned ? `${s.calories_burned} kcal` : '';

                // Agrega logs por exercício: total de séries, melhor carga, reps típicas
                const byExercise = {};
                for (const log of (s.b_session_logs || [])) {
                    const name = log.b_exercises?.name;
                    if (!name) continue;
                    if (!byExercise[name]) {
                        byExercise[name] = { sets: 0, topWeight: 0, reps: [], muscle: log.b_exercises?.muscle_group };
                    }
                    byExercise[name].sets++;
                    if (log.weight_kg > byExercise[name].topWeight) byExercise[name].topWeight = log.weight_kg;
                    if (log.reps_completed) byExercise[name].reps.push(log.reps_completed);
                }

                const exerciseLines = Object.entries(byExercise).map(([name, ex]) => {
                    const reps = ex.reps.length > 0 ? `${Math.min(...ex.reps)}-${Math.max(...ex.reps)} reps` : '';
                    const weight = ex.topWeight > 0 ? `até ${ex.topWeight} kg` : '';
                    const detail = [`${ex.sets} série(s)`, reps, weight].filter(Boolean).join(', ');
                    return `    - ${name}${ex.muscle ? ` [${ex.muscle}]` : ''}: ${detail}`;
                });

                const header = `• ${dateStr}: ${workoutTitle} – ${dayLabel} ${[feeling, calories].filter(Boolean).join(', ')}`.trimEnd();
                return exerciseLines.length > 0 ? `${header}\n${exerciseLines.join('\n')}` : header;
            });
            sections.push(
                `## Histórico Detalhado de Treinos Recentes\n` +
                `(use estes dados para avaliar progressão de carga, detectar grupos musculares negligenciados e sugerir os próximos exercícios)\n` +
                sessionLines.join('\n')
            );
        }
    } catch (e) {
        console.warn('[Context] Erro ao buscar histórico de sessões:', e?.message);
    }

    // ── 5. CATÁLOGO DE EXERCÍCIOS (cacheado por 10 min) ───────────
    if (catalogR.status === 'fulfilled' && catalogR.value) {
        sections.push(catalogR.value);
    } else if (catalogR.status === 'rejected') {
        console.warn('[Context] Erro ao buscar catálogo de exercícios:', catalogR.reason?.message);
    }

    console.log(`[Context] Snapshot final montado: ${sections.length} seções.`, { catalogo: sections.some(s => s.includes('Catálogo')) });

    if (sections.length === 0) {
        return 'Nenhum dado estruturado disponível para este usuário.';
    }

    return `# CONTEXTO COMPLETO DO ALUNO (CATÁLOGO E HISTÓRICO)\n\n${sections.join('\n\n')}`;
};
