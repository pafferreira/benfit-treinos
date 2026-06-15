import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Clock, Layers, Calendar, Flame, Activity } from 'lucide-react';

import { SkeletonWorkouts } from '../components/SkeletonLoader';
import { supabase, supabaseHelpers } from '../lib/supabase';
import './WorkoutPlan.css';

const DIFFICULTY_COLOR = {
    'Iniciante': { bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)', text: '#15803d' },
    'Intermediário': { bg: 'rgba(234,179,8,0.12)', border: 'rgba(234,179,8,0.3)', text: '#a16207' },
    'Avançado': { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', text: '#b91c1c' },
};

const FEELING_LABEL = {
    1: 'Muito pesado', 2: 'Puxado', 3: 'Difícil', 4: 'Exigente',
    5: 'Moderado', 6: 'Boa intensidade', 7: 'Forte e estável',
    8: 'Excelente', 9: 'Alta performance', 10: 'Dia de destaque'
};

const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

// Formata "Seg, 09 Jun" (dia da semana + data). Aceita tanto chave 'YYYY-MM-DD'
// (parse local, evitando off-by-one por fuso) quanto timestamps ISO completos.
const formatDateWithWeekday = (value) => {
    if (!value) return '';
    let d;
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const [y, m, day] = value.split('-').map(Number);
        d = new Date(y, m - 1, day);
    } else {
        d = new Date(value);
    }
    if (isNaN(d.getTime())) return '';
    return `${WEEKDAYS_SHORT[d.getDay()]}, ${String(d.getDate()).padStart(2, '0')} ${MONTHS_SHORT[d.getMonth()]}`;
};

const WorkoutPlan = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const headerRef = useRef(null);
    const lastScrollY = useRef(0);

    const [loading, setLoading] = useState(true);
    const [workout, setWorkout] = useState(null);
    const [days, setDays] = useState([]);
    const [lastFeeling, setLastFeeling] = useState(null);
    const [headerStuck, setHeaderStuck] = useState(false);

    // Sticky header on scroll
    useEffect(() => {
        const scrollContainer = document.querySelector('.layout-content');
        if (!scrollContainer) return;

        const handleScroll = () => {
            const currentY = scrollContainer.scrollTop;
            setHeaderStuck(currentY > 8);
            lastScrollY.current = currentY;
        };

        scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
        return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        loadWorkoutData();
    }, [id]);

    const loadWorkoutData = async () => {
        try {
            setLoading(true);

            const { data: workoutData, error: workoutError } = await supabase
                .from('b_workouts')
                .select('*')
                .eq('id', id)
                .single();

            if (workoutError) throw workoutError;
            setWorkout(workoutData);

            // Fetch days and include exercises inline to avoid a second query for counts
            const { data: daysData, error: daysError } = await supabase
                .from('b_workout_days')
                .select('*, b_workout_exercises ( id, exercise_id )')
                .eq('workout_id', id)
                .order('day_number');

            if (daysError) throw daysError;

            const dayIds = (daysData || []).map((d) => d.id);

            // Enrich days with user-specific progress: last session date, exercises done in last session and completed flag
            let enrichedDays = (daysData || []).map((day) => ({
                ...day,
                // use nested b_workout_exercises length if available
                exercise_count: (day.b_workout_exercises && day.b_workout_exercises.length) || 0,
                last_session_date: null,
                exercises_done: 0,
                completed: false
            }));

            try {
                const currentUser = await supabaseHelpers.getCurrentUser();
                if (currentUser?.id) {
                    // Fetch recent sessions for all days in a single query
                    // Limitar número de sessões buscadas para reduzir payload e latência.
                    // Buscamos as sessões mais recentes do usuário para esse treino, limitando a um múltiplo do número de dias.
                    const fetchLimit = Math.max(10, dayIds.length * 2);

                    // Single batched query: sessions with nested logs (b_session_logs)
                    const { data: sessionsWithLogs } = await supabase
                        .from('b_workout_sessions')
                        .select('id, workout_day_id, started_at, ended_at, b_session_logs (exercise_id)')
                        .eq('user_id', currentUser.id)
                        .eq('workout_id', id)
                        .in('workout_day_id', dayIds)
                        .order('started_at', { ascending: false })
                        .limit(fetchLimit);

                    if (sessionsWithLogs && sessionsWithLogs.length > 0) {
                        // Pick the latest session per day (by started_at desc)
                        const latestSessionByDay = {};
                        for (const s of sessionsWithLogs) {
                            if (!latestSessionByDay[s.workout_day_id]) {
                                latestSessionByDay[s.workout_day_id] = s;
                            }
                        }

                        // Assign counts to days using nested logs
                        enrichedDays = enrichedDays.map(d => {
                            const s = latestSessionByDay[d.id];
                            if (!s) return d;
                            d.last_session_date = s.ended_at || s.started_at || null;
                            d.finalized = Boolean(s.ended_at); // sessão finalizada (mesmo critério do minicalendário)
                            const logs = s.b_session_logs || [];
                            const distinctExerciseIds = new Set((logs || []).map(l => l.exercise_id).filter(Boolean));
                            d.exercises_done = distinctExerciseIds.size;
                            d.completed = d.exercise_count > 0 ? (d.exercises_done >= d.exercise_count) : false;
                            return d;
                        });
                    }

                    // Additionally fetch latest completed date per day (Feito) to show most recent completion
                    try {
                        const latestByDay = await supabaseHelpers.getLatestCompletedDatePerDay(currentUser.id, id, dayIds);
                        enrichedDays = enrichedDays.map(d => ({
                            ...d,
                            // Apenas datas REALMENTE finalizadas+completas (sem fallback p/ last_session_date,
                            // senão todo dia com sessão ficaria marcado como finalizado/verde).
                            last_completed_date: latestByDay[d.id] || null,
                            per_exercise_done_dates: {},
                        }));
                        
                        // Also fetch per-exercise latest done dates + per-day last "Feito" date
                        try {
                            const exDates = await supabaseHelpers.getUserExerciseDoneDates(currentUser.id, 365);
                            // exDates.perExerciseLatest: { dayId: { exerciseId: 'YYYY-MM-DD' } }
                            // exDates.perDayLastDone: { dayId: 'YYYY-MM-DD' } (data do último exercício feito)
                            enrichedDays = enrichedDays.map(d => ({
                                ...d,
                                per_exercise_done_dates: exDates.perExerciseLatest[d.id] || {},
                                last_done_date: exDates.perDayLastDone?.[d.id] || null,
                            }));
                        } catch (err) {
                            console.warn('Could not fetch per-exercise done dates:', err);
                        }
                    } catch (err) {
                        console.warn('Could not fetch latest completed date per day:', err);
                        enrichedDays = enrichedDays.map(d => ({ ...d, last_completed_date: null }));
                    }
                }
            } catch (err) {
                console.warn('Could not load per-day session info:', err);
            }

            setDays(enrichedDays);

            // Load last feeling for this workout plan
            try {
                const currentUser = await supabaseHelpers.getCurrentUser();
                if (currentUser?.id) {
                    const { data: lastSession } = await supabase
                        .from('b_workout_sessions')
                        .select('feeling, ended_at, calories_burned, workout_day_id')
                        .eq('user_id', currentUser.id)
                        .eq('workout_id', id)
                        .not('ended_at', 'is', null)
                        .not('feeling', 'is', null)
                        .order('ended_at', { ascending: false })
                        .limit(1)
                        .maybeSingle();

                    if (lastSession?.feeling) {
                        setLastFeeling(lastSession);
                    }
                }
            } catch { /* feeling is optional */ }

        } catch (error) {
            console.error('Erro ao carregar dados do treino:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDay = (day) => {
        navigate(`/treino/${id}/dia/${day.id}`);
    };

    if (loading) return <SkeletonWorkouts />;

    if (!workout) {
        return (
            <div className="error-container">
                <p>⚠️ Treino não encontrado</p>
                <button onClick={() => navigate('/treinos')}>Voltar para lista</button>
            </div>
        );
    }

    const diffStyle = DIFFICULTY_COLOR[workout.difficulty] || DIFFICULTY_COLOR['Intermediário'];

    const lastFeelingLabel = lastFeeling?.ended_at
        ? new Date(lastFeeling.ended_at).toLocaleString('pt-BR', {
            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
        })
        : null;

    // Helper to find day name
    const getLastSessionDayName = () => {
        if (!lastFeeling?.workout_day_id) return 'Último treino';
        const day = days.find(d => d.id === lastFeeling.workout_day_id);
        return day ? (day.day_name || `Dia ${day.day_number}`) : 'Último treino';
    };

    return (
        <div className="workout-plan-container">

            {/* ── Sticky header: back button + title ── */}
            <div ref={headerRef} className={`plan-sticky-header ${headerStuck ? 'plan-sticky-header--stuck' : ''}`}>
                <button
                    className="back-btn-icon"
                    onClick={() => navigate('/treinos')}
                    title="Voltar"
                >
                    <ChevronLeft size={22} />
                </button>
                <h1 className="plan-title-inline">{workout.title}</h1>
            </div>

            {/* ── Plan info card ── */}
            <div className="plan-info-card">
                {workout.description && (
                    <p className="plan-description">{workout.description}</p>
                )}

                {/* Stats row — same badge style as WorkoutDayDetails */}
                <div className="plan-stat-badges">
                    <span className="plan-stat-badge" style={{
                        background: diffStyle.bg,
                        borderColor: diffStyle.border,
                        color: diffStyle.text
                    }}>
                        <Layers size={14} />
                        {workout.difficulty}
                    </span>
                    {workout.estimated_duration && (
                        <span className="plan-stat-badge">
                            <Clock size={14} />
                            {workout.estimated_duration} min
                        </span>
                    )}
                    {workout.days_per_week && (
                        <span className="plan-stat-badge">
                            <Calendar size={14} />
                            {workout.days_per_week}x / semana
                        </span>
                    )}
                </div>

                {/* Last feeling card */}
                {lastFeeling && (
                    <div className="plan-feeling-card">
                        <span className="plan-feeling-pill">{lastFeeling.feeling}/10</span>
                        <div className="plan-feeling-meta">
                            <strong>{getLastSessionDayName()}</strong>
                            {lastFeelingLabel && <small>{lastFeelingLabel}</small>}
                            {lastFeeling.calories_burned > 0 && (
                                <div className="plan-feeling-calories">
                                    <Flame size={12} />
                                    {lastFeeling.calories_burned} kcal
                                </div>
                            )}
                        </div>
                        <Activity size={18} className="plan-feeling-icon" />
                    </div>
                )}
            </div>

            {/* ── Days list ── */}
            <div className="days-section">
                <h2 className="section-title">Sessões do Plano</h2>

                {days.length === 0 ? (
                    <p className="empty-message">Nenhum dia de treino configurado neste plano.</p>
                ) : (
                    <div className="day-buttons-list">
                        {days.map((day) => {
                            const dateValue = day.last_done_date || day.last_completed_date || day.last_session_date;
                            // Reflete a SESSÃO MAIS RECENTE do dia (mesma semântica do minicalendário):
                            // última sessão finalizada (ended_at) → verde "Finalizado";
                            // sessão em andamento / apenas exercícios "Feito" → azul.
                            // Não usar last_completed_date aqui: ele guarda uma finalização ANTIGA e
                            // marcaria como verde um dia que hoje só tem exercícios parciais.
                            const isFinalized = Boolean(day.finalized);
                            return (
                            <button
                                key={day.id}
                                className="day-open-btn"
                                onClick={() => handleOpenDay(day)}
                            >
                                <div className="day-open-main">
                                    <h3 className="day-open-title">{day.day_name || `Dia ${day.day_number}`}</h3>
                                    <div className="day-open-meta-row">
                                        <p className="day-open-meta">{(day.exercises_done ?? 0)}/{day.exercise_count || 0} exercícios</p>
                                        {dateValue && (
                                            <small className={isFinalized ? 'day-last-completed' : 'day-last-session'}>
                                                {formatDateWithWeekday(dateValue)}
                                            </small>
                                        )}
                                    </div>
                                </div>
                                {isFinalized && (
                                    <span className="day-status-badge">Finalizado</span>
                                )}
                                <span className="day-open-arrow">
                                    <ChevronRight size={18} />
                                </span>
                            </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default WorkoutPlan;
