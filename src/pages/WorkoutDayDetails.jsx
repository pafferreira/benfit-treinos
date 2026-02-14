import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Calendar, Clock, Layers, Timer } from 'lucide-react';
import RestTimer from '../components/RestTimer';
import SessionExerciseItem from '../components/SessionExerciseItem';
import ErrorBoundary from '../components/ErrorBoundary';
import { SkeletonWorkouts } from '../components/SkeletonLoader';
import { supabase, supabaseHelpers } from '../lib/supabase';
import './WorkoutDayDetails.css';

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

    useEffect(() => {
        loadDayDetails();
    }, [id, dayId]);

    const loadDayDetails = async () => {
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
        } catch (error) {
            console.error('Erro ao carregar detalhes do dia:', error);
        } finally {
            setLoading(false);
        }
    };

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
                    title="Voltar para o plano"
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

            <button
                className={`day-floating-timer-btn ${showRestTimer ? 'active' : ''}`}
                onClick={() => setShowRestTimer((prev) => !prev)}
                title={showRestTimer ? 'Fechar cronômetro' : 'Abrir cronômetro'}
            >
                <Timer size={24} />
            </button>

            {showRestTimer && (
                <div className="day-rest-timer-overlay">
                    <div className="day-rest-timer-wrapper">
                        <button
                            className="day-close-timer-btn"
                            onClick={() => setShowRestTimer(false)}
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
        </div>
    );
};

export default WorkoutDayDetails;
