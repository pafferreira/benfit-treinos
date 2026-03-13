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
export const buildUserContext = async (userId) => {
    const sections = [];

    // ── 1. PERFIL DO USUÁRIO ───────────────────────────────────────
    try {
        const profile = await supabaseHelpers.getCurrentUser();
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
        const goals = await supabaseHelpers.getUserGoals(userId);
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
        const { data: workouts } = await supabase
            .from('b_workouts')
            .select('id, title, difficulty, estimated_duration, b_workout_days(day_name, day_number)')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(5);

        if (workouts && workouts.length > 0) {
            const wLines = workouts.map(w => {
                const days = (w.b_workout_days || []).map(d => d.day_name || `Dia ${d.day_number}`).join(', ');
                return `• ${w.title} | Nível: ${w.difficulty || 'n/a'} | Dias: ${days || 'N/A'}`;
            });
            sections.push(`## Planos de Treino\n${wLines.join('\n')}`);
        }
    } catch (e) {
        console.warn('[Context] Erro ao buscar planos:', e?.message);
    }

    // ── 4. HISTÓRICO RECENTE DE SESSÕES ───────────────────────────
    try {
        const { data: sessions } = await supabase
            .from('b_workout_sessions')
            .select(`
                id, started_at, ended_at, feeling, calories_burned,
                b_workouts(title),
                b_workout_days(day_name, day_number),
                b_session_logs(
                    b_exercises(name, muscle_group)
                )
            `)
            .eq('user_id', userId)
            .not('ended_at', 'is', null)
            .order('ended_at', { ascending: false })
            .limit(7);

        if (sessions && sessions.length > 0) {
            const sessionLines = sessions.map((s, i) => {
                const dayLabel = s.b_workout_days?.day_name || `Dia ${s.b_workout_days?.day_number || '?'}`;
                const workoutTitle = s.b_workouts?.title || 'Treino';
                const dateStr = fmtDate(s.ended_at || s.started_at);
                const feeling = s.feeling ? `feeling: ${s.feeling}/10` : '';
                const calories = s.calories_burned ? `${s.calories_burned} kcal` : '';

                // Extrai grupos musculares únicos
                const muscles = [...new Set(
                    (s.b_session_logs || [])
                        .map(log => log.b_exercises?.muscle_group)
                        .filter(Boolean)
                )].join(', ');

                return `• ${dateStr}: ${workoutTitle} – ${dayLabel}${muscles ? ` (${muscles})` : ''} ${[feeling, calories].filter(Boolean).join(', ')}`;
            });
            sections.push(`## Histórico de Treinos Recentes\n${sessionLines.join('\n')}`);
        }
    } catch (e) {
        console.warn('[Context] Erro ao buscar histórico de sessões:', e?.message);
    }

    // ── 5. CATÁLOGO DE EXERCÍCIOS (resumo por grupo muscular) ─────
    try {
        const { data: exercises } = await supabase
            .from('b_exercises')
            .select('name, muscle_group, equipment, difficulty')
            .order('muscle_group')
            .limit(600);

        if (exercises && exercises.length > 0) {
            // Agrupa por grupo muscular
            const byGroup = exercises.reduce((acc, ex) => {
                const group = ex.muscle_group || 'Outros';
                if (!acc[group]) acc[group] = [];
                acc[group].push(ex.name);
                return acc;
            }, {});

            const catalogLines = Object.entries(byGroup)
                .map(([group, names]) => `• ${group}: ${names.join(', ')}`)
                .join('\n');
            sections.push(`## Catálogo Completo de Exercícios Disponíveis\n${catalogLines}`);
        }
    } catch (e) {
        console.warn('[Context] Erro ao buscar catálogo de exercícios:', e?.message);
    }

    console.log(`[Context] Snapshot final montado: ${sections.length} seções.`, { catalogo: sections.some(s => s.includes('Catálogo')) });

    if (sections.length === 0) {
        return 'Nenhum dado estruturado disponível para este usuário.';
    }

    return `# CONTEXTO COMPLETO DO ALUNO (CATÁLOGO E HISTÓRICO)\n\n${sections.join('\n\n')}`;
};
