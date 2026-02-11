import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Calendar, Clock, Layers, Timer } from 'lucide-react';
import WeeklyCalendar from '../components/WeeklyCalendar';
import DayAccordion from '../components/DayAccordion';
import RestTimer from '../components/RestTimer';
import { SkeletonWorkouts } from '../components/SkeletonLoader';
import { supabase } from '../lib/supabase';
import './WorkoutPlan.css';

const WorkoutPlan = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [workout, setWorkout] = useState(null);
    const [days, setDays] = useState([]);
    const [exercises, setExercises] = useState([]);
    const [selectedDate, setSelectedDate] = useState(null);
    const [openDayIndex, setOpenDayIndex] = useState(null);
    const [completedExercises, setCompletedExercises] = useState({});
    const [showRestTimer, setShowRestTimer] = useState(false);
    const [restDuration, setRestDuration] = useState(60);

    // Debug log para verificar montagem
    console.log("DEBUG: WorkoutPlan mounting, ID:", id);

    useEffect(() => {
        loadWorkoutData();
    }, [id]);

    const loadWorkoutData = async () => {
        try {
            setLoading(true);

            // Buscar o workout
            const { data: workoutData, error: workoutError } = await supabase
                .from('b_workouts')
                .select('*')
                .eq('id', id)
                .single();

            if (workoutError) throw workoutError;
            setWorkout(workoutData);

            // Buscar dias do workout
            const { data: daysData, error: daysError } = await supabase
                .from('b_workout_days')
                .select('*')
                .eq('workout_id', id)
                .order('day_number');

            if (daysError) throw daysError;

            // Buscar exercícios de cada dia
            const daysWithExercises = await Promise.all(
                daysData.map(async (day) => {
                    const { data: exercisesData, error: exercisesError } = await supabase
                        .from('b_workout_exercises')
                        .select('*')
                        .eq('workout_day_id', day.id)
                        .order('order_index');

                    if (exercisesError) throw exercisesError;

                    return {
                        ...day,
                        exercises: exercisesData || []
                    };
                })
            );

            setDays(daysWithExercises);

            // Buscar biblioteca completa de exercícios
            const { data: exercisesLib, error: exercisesError } = await supabase
                .from('b_exercises')
                .select('*');

            if (exercisesError) throw exercisesError;
            setExercises(exercisesLib || []);

            // TODO: Buscar exercícios completados do usuário de forma real
            // Por enquanto simulado ou vazio

        } catch (error) {
            console.error('Erro ao carregar dados do treino:', error);
            // Alert opcional: alert('Erro ao carregar treino: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDayClick = (date) => {
        const dayOfWeek = date.getDay();
        const dayIndex = days.findIndex(d => {
            const dayNum = d.day_number - 1;
            const adjustedDayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
            return dayNum === adjustedDayOfWeek;
        });

        if (dayIndex !== -1) {
            setSelectedDate(date);
            setOpenDayIndex(openDayIndex === dayIndex ? null : dayIndex);
        }
    };

    const handleDayToggle = (index) => {
        const isOpening = openDayIndex !== index;
        setOpenDayIndex(isOpening ? index : null);

        // Scroll tanto para abrir quanto para fechar
        setTimeout(() => {
            try {
                const dayElements = document.querySelectorAll('.day-accordion');
                if (!dayElements || dayElements.length <= index) return;

                const element = dayElements[index];

                if (element) {
                    element.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            } catch (e) {
                console.error("Erro no scroll automático:", e);
            }
        }, 300); // 300ms espera a animação de fechar/abrir
    };

    const handleExerciseComplete = (dayIndex, exerciseId, isComplete) => {
        setCompletedExercises(prev => {
            const dayKey = `day_${dayIndex}`;
            const currentDayCompleted = prev[dayKey] || [];

            if (isComplete) {
                return {
                    ...prev,
                    [dayKey]: [...new Set([...currentDayCompleted, exerciseId])]
                };
            } else {
                return {
                    ...prev,
                    [dayKey]: currentDayCompleted.filter(id => id !== exerciseId)
                };
            }
        });

        const saveLog = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const day = days[dayIndex];
                if (!day) return;

                const dateStr = new Date().toISOString().split('T')[0];
                let dailyLogId;

                const { data: existingLog } = await supabase
                    .from('b_daily_workout_logs')
                    .select('id')
                    .eq('user_id', user.id)
                    .eq('workout_day_id', day.id)
                    .eq('date', dateStr)
                    .maybeSingle();

                if (existingLog) {
                    dailyLogId = existingLog.id;
                } else {
                    const { data: newLog, error: createError } = await supabase
                        .from('b_daily_workout_logs')
                        .insert({
                            user_id: user.id,
                            workout_day_id: day.id,
                            workout_id: workout.id,
                            date: dateStr,
                            started_at: new Date().toISOString()
                        })
                        .select()
                        .single();

                    if (createError) throw createError;
                    dailyLogId = newLog.id;
                }

                if (!dailyLogId) throw new Error("Falha ao obter ID do log diário");

                if (isComplete) {
                    const { error } = await supabase
                        .from('b_session_logs')
                        .upsert({
                            daily_log_id: dailyLogId,
                            exercise_id: exerciseId,
                            completed_at: new Date().toISOString()
                        }, { onConflict: 'daily_log_id, exercise_id' });
                    if (error) throw error;
                } else {
                    const { error } = await supabase
                        .from('b_session_logs')
                        .delete()
                        .match({
                            daily_log_id: dailyLogId,
                            exercise_id: exerciseId
                        });
                    if (error) throw error;
                }
            } catch (err) {
                console.error('Erro ao salvar progresso:', err);
            }
        };
        saveLog();
    };

    const handleStartRest = (seconds) => {
        setRestDuration(seconds);
        setShowRestTimer(true);
    };

    const scheduledDays = days.map(d => {
        const dayNum = d.day_number - 1;
        return dayNum === -1 ? 6 : dayNum;
    });

    const completedDates = [];

    if (loading) {
        return <SkeletonWorkouts />;
    }

    if (!workout) {
        return (
            <div className="error-container">
                <p>⚠️ Treino não encontrado</p>
                <button onClick={() => navigate('/workouts')}>Voltar para lista</button>
            </div>
        );
    }

    return (
        <div className="workout-plan-container">
            {/* Sticky Header */}
            <div className="header-top-row">
                <button
                    className="back-btn-icon"
                    onClick={() => navigate('/treinos')}
                    title="Voltar"
                >
                    <ChevronLeft size={24} />
                </button>
                <h1 className="plan-title">{workout.title}</h1>
            </div>

            {/* Info Section */}
            <div className="plan-header">
                <div className="plan-info-section">
                    {workout.description && (
                        <p className="plan-description">{workout.description}</p>
                    )}

                    <div className="plan-stats">
                        <span className="stat-badge">
                            <Layers size={14} />
                            {workout.difficulty}
                        </span>
                        <span className="stat-badge">
                            <Calendar size={14} />
                            {workout.days_per_week}x/sem
                        </span>
                        {workout.estimated_duration && (
                            <span className="stat-badge">
                                <Clock size={14} />
                                {workout.estimated_duration} min
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Weekly Calendar */}
            <WeeklyCalendar
                currentDate={new Date()}
                scheduledDays={scheduledDays}
                completedDates={completedDates}
                onDayClick={handleDayClick}
                selectedDate={selectedDate}
            />

            {/* Days List */}
            <div className="days-section">
                <h2 className="section-title">Sessões desta Semana</h2>

                {days.length === 0 ? (
                    <p className="empty-message">
                        Nenhum dia de treino configurado neste plano.
                    </p>
                ) : (
                    days.map((day, index) => {
                        const isSelected = selectedDate && (() => {
                            const dayOfWeek = selectedDate.getDay();
                            const dayNum = day.day_number - 1;
                            const adjustedDayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                            return dayNum === adjustedDayOfWeek;
                        })();

                        return (
                            <DayAccordion
                                key={day.id}
                                day={{
                                    ...day,
                                    dayName: day.day_name,
                                    estimatedDuration: workout.estimated_duration
                                }}
                                exercises={exercises}
                                isOpen={openDayIndex === index}
                                onToggle={() => handleDayToggle(index)}
                                completedExercises={completedExercises[`day_${index}`] || []}
                                onExerciseComplete={(exerciseId, isComplete) =>
                                    handleExerciseComplete(index, exerciseId, isComplete)
                                }
                                onStartRest={handleStartRest}
                                isSelected={isSelected}
                            />
                        );
                    })
                )}
            </div>

            {/* Floating Timer Button */}
            <button
                className={`floating-timer-btn ${showRestTimer ? 'active' : ''}`}
                onClick={() => setShowRestTimer(prev => !prev)}
                title={showRestTimer ? "Fechar cronômetro" : "Abrir cronômetro"}
            >
                <Timer size={24} />
            </button>

            {/* Rest Timer Overlay */}
            {showRestTimer && (
                <div className="rest-timer-overlay">
                    <div className="rest-timer-wrapper">
                        <button
                            className="close-timer-btn"
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

export default WorkoutPlan;
