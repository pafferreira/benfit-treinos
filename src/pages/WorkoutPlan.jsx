import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Clock, Layers, Calendar, Flame, Activity } from 'lucide-react';

import { SkeletonWorkouts } from '../components/SkeletonLoader';
import { supabaseHelpers } from '../lib/supabase';
import { cacheGet, swr } from '../lib/dataCache';
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

    // Se já visitamos este plano nesta sessão, renderiza direto do cache:
    // sem skeleton, sem espera — a revalidação acontece em segundo plano.
    const cacheKey = `plan:${id}`;
    const initial = cacheGet(cacheKey)?.value || null;

    const [loading, setLoading] = useState(!initial);
    const [workout, setWorkout] = useState(initial?.workout || null);
    const [days, setDays] = useState(initial?.days || []);
    const [lastFeeling, setLastFeeling] = useState(initial?.lastFeeling || null);
    const [headerStuck, setHeaderStuck] = useState(false);

    // Track the day the user just visited (navigated into and came back from)
    const [lastVisitedDayId] = useState(() => sessionStorage.getItem(`benfit_lastVisitedDay_${id}`) || null);

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

    const loadWorkoutData = useCallback(async () => {
        try {
            await swr(
                `plan:${id}`,
                async () => {
                    const currentUser = await supabaseHelpers.getCurrentUser();
                    return supabaseHelpers.getWorkoutPlanOverview(currentUser?.id, id);
                },
                {
                    onData: ({ workout: w, days: d, lastFeeling: f }) => {
                        setWorkout(w);
                        setDays(d);
                        setLastFeeling(f);
                        setLoading(false);
                    },
                }
            );
        } catch (error) {
            console.error('Erro ao carregar dados do treino:', error);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        loadWorkoutData();
    }, [loadWorkoutData]);


    const handleOpenDay = (day) => {
        sessionStorage.setItem(`benfit_lastVisitedDay_${id}`, day.id);
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
                        {(() => {
                            // Determine the most recently used day (by session date)
                            let lastUsedDayId = null;
                            let latestDate = null;
                            for (const day of days) {
                                const d = day.last_done_date || day.last_session_date;
                                if (d && (!latestDate || d > latestDate)) {
                                    latestDate = d;
                                    lastUsedDayId = day.id;
                                }
                            }
                            return days.map((day) => {
                            const dateValue = day.last_done_date || day.last_completed_date || day.last_session_date;
                            const isFinalized = Boolean(day.finalized);
                            const isLastUsed = day.id === lastUsedDayId;
                            const isLastVisited = day.id === lastVisitedDayId;
                            return (
                            <button
                                key={day.id}
                                className={`day-open-btn${isLastVisited ? ' day-open-btn--last-visited' : ''}`}
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
                                {isLastUsed && (
                                    <span className="day-last-used-label">Último treino</span>
                                )}
                                {isFinalized && (
                                    <span className="day-status-badge">Finalizado</span>
                                )}
                                <span className="day-open-arrow">
                                    <ChevronRight size={18} />
                                </span>
                            </button>
                            );
                        });
                        })()}
                    </div>
                )}
            </div>
        </div>
    );
};

export default WorkoutPlan;
