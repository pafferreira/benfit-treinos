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

            const { data: daysData, error: daysError } = await supabase
                .from('b_workout_days')
                .select('*')
                .eq('workout_id', id)
                .order('day_number');

            if (daysError) throw daysError;

            const dayIds = (daysData || []).map((d) => d.id);
            const exerciseCountByDay = {};

            if (dayIds.length > 0) {
                const { data: workoutExercises } = await supabase
                    .from('b_workout_exercises')
                    .select('workout_day_id')
                    .in('workout_day_id', dayIds);

                (workoutExercises || []).forEach((item) => {
                    exerciseCountByDay[item.workout_day_id] = (exerciseCountByDay[item.workout_day_id] || 0) + 1;
                });
            }

            setDays((daysData || []).map((day) => ({
                ...day,
                exercise_count: exerciseCountByDay[day.id] || 0
            })));

            // Load last feeling for this workout plan
            try {
                const currentUser = await supabaseHelpers.getCurrentUser();
                if (currentUser?.id) {
                    const { data: lastSession } = await supabase
                        .from('b_workout_sessions')
                        .select('feeling, ended_at, calories_burned')
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
            } catch (_) { /* feeling is optional */ }

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
                            <strong>{FEELING_LABEL[lastFeeling.feeling] || 'Feeling registrado'}</strong>
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
                        {days.map((day) => (
                            <button
                                key={day.id}
                                className="day-open-btn"
                                onClick={() => handleOpenDay(day)}
                            >
                                <div className="day-open-main">
                                    <h3 className="day-open-title">{day.day_name || `Dia ${day.day_number}`}</h3>
                                    <p className="day-open-meta">{day.exercise_count || 0} exercícios</p>
                                </div>
                                <span className="day-open-arrow">
                                    <ChevronRight size={18} />
                                </span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default WorkoutPlan;
