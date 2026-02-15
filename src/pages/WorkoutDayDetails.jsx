import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Calendar, Clock, Layers, Timer, Flame, Activity } from 'lucide-react';
import RestTimer from '../components/RestTimer';
import SessionExerciseItem from '../components/SessionExerciseItem';
import ErrorBoundary from '../components/ErrorBoundary';
import { SkeletonWorkouts } from '../components/SkeletonLoader';
import Modal from '../components/Modal';
import { supabase, supabaseHelpers } from '../lib/supabase';
import './WorkoutDayDetails.css';

const FEELING_MICROCOPY = {
    1: 'Sessão muito pesada hoje. Priorize recuperação e hidratação.',
    2: 'Treino puxado. Amanhã vale reduzir carga e focar na técnica.',
    3: 'Foi difícil, mas você manteve constância. Bom trabalho.',
    4: 'Sessão exigente. Respeite o ritmo e ajuste o descanso.',
    5: 'Treino moderado. Boa base para evoluir na próxima sessão.',
    6: 'Boa intensidade. Você manteve consistência de execução.',
    7: 'Treino forte e estável. Ótimo padrão de esforço.',
    8: 'Sessão excelente. Ritmo e controle muito bons.',
    9: 'Performance alta hoje. Grande execução.',
    10: 'Dia de destaque total. Você voou no treino.'
};

const DIFFICULTY_MET = {
    iniciante: 4.5,
    intermediario: 6.0,
    avançado: 7.5,
    avancado: 7.5
};

const normalizeDifficulty = (value) => {
    if (!value || typeof value !== 'string') return 'intermediario';
    return value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
};

const getSessionDurationMinutes = (startedAt) => {
    if (!startedAt) return 0;
    const elapsedMs = Date.now() - new Date(startedAt).getTime();
    const elapsedMinutes = Math.round(elapsedMs / 60000);
    return Math.max(1, elapsedMinutes);
};

const estimateCalories = ({ startedAt, userWeightKg, difficulty }) => {
    const durationMinutes = getSessionDurationMinutes(startedAt);
    const safeWeight = Number.isFinite(Number(userWeightKg)) && Number(userWeightKg) > 0
        ? Number(userWeightKg)
        : 70;
    const met = DIFFICULTY_MET[normalizeDifficulty(difficulty)] || 6.0;
    const calories = ((met * 3.5 * safeWeight) / 200) * durationMinutes;
    return Math.max(1, Math.round(calories));
};

const WorkoutDayDetails = () => {
    const { id, dayId } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [workout, setWorkout] = useState(null);
    const [day, setDay] = useState(null);
    const [workoutExercises, setWorkoutExercises] = useState([]);
    const [completedExercises, setCompletedExercises] = useState([]);
    const [showRestTimer, setShowRestTimer] = useState(false);
    const [restDuration, setRestDuration] = useState(60);
    const [currentSessionId, setCurrentSessionId] = useState(null);
    const [currentSessionStartedAt, setCurrentSessionStartedAt] = useState(null);
    const [userWeightKg, setUserWeightKg] = useState(70);
    const [showFinishModal, setShowFinishModal] = useState(false);
    const [feelingScore, setFeelingScore] = useState(6);
    const [finishingSession, setFinishingSession] = useState(false);
    const finishModalHistoryRef = useRef(false);

    useEffect(() => {
        const handlePopState = () => {
            if (showFinishModal) {
                finishModalHistoryRef.current = false;
                setShowFinishModal(false);
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [showFinishModal]);

    useEffect(() => {
        if (!showFinishModal || finishModalHistoryRef.current) return;
        window.history.pushState({ ...(window.history.state || {}), finishWorkoutModal: true }, '');
        finishModalHistoryRef.current = true;
    }, [showFinishModal]);

    const closeFinishModal = useCallback((fromPopState = false) => {
        setShowFinishModal(false);
        if (!fromPopState && finishModalHistoryRef.current) {
            finishModalHistoryRef.current = false;
            window.history.back();
            return;
        }
        finishModalHistoryRef.current = false;
    }, []);

    const loadOpenSessionProgress = async (workoutId, workoutDayId, userId) => {
        const { data: openSession, error: openSessionError } = await supabase
            .from('b_workout_sessions')
            .select('id, started_at')
            .eq('user_id', userId)
            .eq('workout_id', workoutId)
            .eq('workout_day_id', workoutDayId)
            .is('ended_at', null)
            .order('started_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (openSessionError) throw openSessionError;

        if (!openSession) {
            setCurrentSessionId(null);
            setCurrentSessionStartedAt(null);
            setCompletedExercises([]);
            return;
        }

        setCurrentSessionId(openSession.id);
        setCurrentSessionStartedAt(openSession.started_at);

        const { data: sessionLogs, error: logsError } = await supabase
            .from('b_session_logs')
            .select('exercise_id')
            .eq('session_id', openSession.id)
            .eq('user_id', userId);

        if (logsError) throw logsError;

        const completedIds = [...new Set((sessionLogs || []).map((log) => log.exercise_id).filter(Boolean))];
        setCompletedExercises(completedIds);
    };

    const loadDayDetails = useCallback(async () => {
        try {
            setLoading(true);

            const { data: workoutData, error: workoutError } = await supabase
                .from('b_workouts')
                .select('*')
                .eq('id', id)
                .single();
            if (workoutError) throw workoutError;
            setWorkout(workoutData);

            const { data: dayData, error: dayError } = await supabase
                .from('b_workout_days')
                .select('*')
                .eq('id', dayId)
                .eq('workout_id', id)
                .single();
            if (dayError) throw dayError;
            setDay(dayData);

            const { data: exercisesData, error: exercisesError } = await supabase
                .from('b_workout_exercises')
                .select(`
                    *,
                    b_exercises (*)
                `)
                .eq('workout_day_id', dayId)
                .order('order_index');
            if (exercisesError) throw exercisesError;
            setWorkoutExercises(exercisesData || []);

            const currentUser = await supabaseHelpers.getCurrentUser();
            if (currentUser?.weight_kg) {
                setUserWeightKg(Number(currentUser.weight_kg));
            }

            if (currentUser?.id) {
                await loadOpenSessionProgress(workoutData.id, dayData.id, currentUser.id);
            } else {
                setCompletedExercises([]);
                setCurrentSessionId(null);
                setCurrentSessionStartedAt(null);
            }
        } catch (error) {
            console.error('Erro ao carregar detalhes do dia:', error);
        } finally {
            setLoading(false);
        }
    }, [id, dayId]);

    useEffect(() => {
        loadDayDetails();
    }, [loadDayDetails]);

    const handleExerciseComplete = (exerciseId, isComplete) => {
        setCompletedExercises((prev) => {
            if (isComplete) {
                return [...new Set([...prev, exerciseId])];
            }
            return prev.filter((idItem) => idItem !== exerciseId);
        });

        const saveLog = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user || !workout || !day) return;

                if (isComplete) {
                    let sessionId = currentSessionId;
                    if (!sessionId) {
                        const session = await supabaseHelpers.startWorkoutSession(user.id, workout.id, day.id);
                        sessionId = session.id;
                        setCurrentSessionId(sessionId);
                        setCurrentSessionStartedAt(session.started_at || new Date().toISOString());
                    }

                    await supabaseHelpers.logExerciseComplete(sessionId, user.id, exerciseId);
                } else if (currentSessionId) {
                    await supabaseHelpers.removeExerciseLog(currentSessionId, user.id, exerciseId);
                }
            } catch (err) {
                console.error('Erro ao salvar progresso do exercício:', err);
            }
        };

        saveLog();
    };

    const handleStartRest = (seconds) => {
        setRestDuration(seconds);
        setShowRestTimer(true);
    };

    const handleOpenFinishModal = () => {
        if (!currentSessionId) {
            window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Inicie o treino marcando ao menos um exercício.', type: 'warn' } }));
            return;
        }
        setShowFinishModal(true);
    };

    const totalExercises = workoutExercises.length;
    const completedCount = completedExercises.length;
    const isFullyCompleted = totalExercises > 0 && completedCount >= totalExercises;

    const sessionDurationMinutes = useMemo(
        () => getSessionDurationMinutes(currentSessionStartedAt),
        [currentSessionStartedAt]
    );

    const estimatedSessionCalories = useMemo(
        () => estimateCalories({
            startedAt: currentSessionStartedAt,
            userWeightKg,
            difficulty: workout?.difficulty
        }),
        [currentSessionStartedAt, userWeightKg, workout?.difficulty]
    );

    const handleFinishSession = async () => {
        if (!currentSessionId || !workout || !day) return;

        try {
            setFinishingSession(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Usuário não autenticado.');

            await supabaseHelpers.finalizeWorkoutSession({
                sessionId: currentSessionId,
                userId: user.id,
                workoutId: workout.id,
                workoutDayId: day.id,
                caloriesBurned: estimatedSessionCalories,
                feeling: feelingScore,
                isFullyCompleted
            });

            closeFinishModal();
            setCurrentSessionId(null);
            setCurrentSessionStartedAt(null);
            setShowRestTimer(false);

            window.dispatchEvent(new CustomEvent('app-toast', {
                detail: {
                    message: isFullyCompleted
                        ? `Treino finalizado! ${estimatedSessionCalories} kcal registradas.`
                        : `Sessão registrada como incompleta (${estimatedSessionCalories} kcal).`,
                    type: isFullyCompleted ? 'success' : 'warn'
                }
            }));
        } catch (error) {
            console.error('Erro ao finalizar sessão:', error);
            window.dispatchEvent(new CustomEvent('app-toast', {
                detail: { message: error?.message || 'Não foi possível finalizar a sessão.', type: 'error' }
            }));
        } finally {
            setFinishingSession(false);
        }
    };

    if (loading) {
        return <SkeletonWorkouts />;
    }

    if (!workout || !day) {
        return (
            <div className="error-container">
                <p>⚠️ Sessão não encontrada</p>
                <button onClick={() => navigate(`/treino/${id}`)}>Voltar para o plano</button>
            </div>
        );
    }

    return (
        <div className="workout-day-screen">
            <div className="workout-day-top">
                <button
                    className="day-back-btn"
                    onClick={() => navigate(`/treino/${id}`)}
                    data-tooltip="Voltar para o plano"
                >
                    <ChevronLeft size={22} />
                </button>
                <div className="workout-day-title-wrap">
                    <h1 className="workout-day-title">{day.day_name || `Dia ${day.day_number}`}</h1>
                    <p className="workout-day-subtitle">{workout.title}</p>
                </div>
            </div>

            <div className="workout-day-stats">
                <span className="day-stat-badge">
                    <Layers size={14} />
                    {workout.difficulty}
                </span>
                <span className="day-stat-badge">
                    <Calendar size={14} />
                    Dia {day.day_number}
                </span>
                {workout.estimated_duration && (
                    <span className="day-stat-badge">
                        <Clock size={14} />
                        {workout.estimated_duration} min
                    </span>
                )}
            </div>

            <section className="workout-day-panel">
                <div className="workout-day-panel-header">
                    <h2>Exercícios da Sessão</h2>
                    <span>{workoutExercises.length} itens</span>
                </div>

                <div className="workout-day-exercises-list">
                    {workoutExercises.length === 0 ? (
                        <p className="empty-message">Nenhum exercício cadastrado para este dia.</p>
                    ) : (
                        workoutExercises.map((item, index) => (
                            <ErrorBoundary key={item.id || `${item.exercise_id}-${index}`}>
                                <SessionExerciseItem
                                    exercise={item.b_exercises}
                                    workoutExercise={item}
                                    isCompleted={completedExercises.includes(item.exercise_id)}
                                    onToggleComplete={handleExerciseComplete}
                                    onStartRest={handleStartRest}
                                    orderIndex={index + 1}
                                />
                            </ErrorBoundary>
                        ))
                    )}
                </div>
            </section>

            <div className="workout-day-footer-actions">
                <div className="day-progress-summary">
                    <span className="progress-title">Progresso da sessão</span>
                    <strong>{completedCount}/{totalExercises} exercícios</strong>
                </div>
                <button
                    className="btn-primary finish-session-btn"
                    onClick={handleOpenFinishModal}
                    disabled={!currentSessionId || finishingSession}
                    data-tooltip="Finalizar sessão"
                >
                    Finalizar Treino
                </button>
            </div>

            <button
                className={`day-floating-timer-btn ${showRestTimer ? 'active' : ''}`}
                onClick={() => setShowRestTimer((prev) => !prev)}
                data-tooltip={showRestTimer ? 'Fechar cronômetro' : 'Abrir cronômetro'}
            >
                <Timer size={24} />
            </button>

            {showRestTimer && (
                <div className="day-rest-timer-overlay">
                    <div className="day-rest-timer-wrapper">
                        <button
                            className="day-close-timer-btn"
                            onClick={() => setShowRestTimer(false)}
                            data-tooltip="Fechar cronômetro"
                        >
                            ✕
                        </button>
                        <RestTimer
                            suggestedRestSeconds={restDuration}
                            onComplete={() => { }}
                        />
                    </div>
                </div>
            )}

            <Modal
                isOpen={showFinishModal}
                onClose={closeFinishModal}
                title="Finalizar Sessão"
                size="medium"
            >
                <div className="finish-session-modal-content">
                    <div className="finish-session-summary">
                        <div className="finish-summary-item">
                            <Clock size={16} />
                            <span>{sessionDurationMinutes} min de treino</span>
                        </div>
                        <div className="finish-summary-item">
                            <Flame size={16} />
                            <span>{estimatedSessionCalories} kcal estimadas</span>
                        </div>
                    </div>

                    <div className="feeling-field">
                        <label htmlFor="feeling-slider">
                            <Activity size={16} />
                            Como você se sentiu hoje? ({feelingScore}/10)
                        </label>
                        <input
                            id="feeling-slider"
                            type="range"
                            min="1"
                            max="10"
                            value={feelingScore}
                            onChange={(event) => setFeelingScore(Number(event.target.value))}
                        />
                        <div className="feeling-scale-labels">
                            <span>1</span>
                            <span>10</span>
                        </div>
                        <p className="feeling-microcopy">{FEELING_MICROCOPY[feelingScore]}</p>
                    </div>

                    <div className="finish-session-actions">
                        <button
                            type="button"
                            className="btn-secondary"
                            onClick={closeFinishModal}
                            disabled={finishingSession}
                            data-tooltip="Cancelar"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            className="btn-primary"
                            onClick={handleFinishSession}
                            disabled={finishingSession}
                            data-tooltip="Salvar finalização"
                        >
                            {finishingSession ? 'Finalizando...' : 'Salvar e Finalizar'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default WorkoutDayDetails;
