import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Calendar, Clock, Layers, ChevronRight } from 'lucide-react';
import WeeklyCalendar from '../components/WeeklyCalendar';
import { SkeletonWorkouts } from '../components/SkeletonLoader';
import { supabase } from '../lib/supabase';
import './WorkoutPlan.css';

const WorkoutPlan = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [workout, setWorkout] = useState(null);
    const [days, setDays] = useState([]);
    const [selectedDate, setSelectedDate] = useState(null);

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
                const { data: workoutExercises, error: exercisesError } = await supabase
                    .from('b_workout_exercises')
                    .select('workout_day_id')
                    .in('workout_day_id', dayIds);

                if (exercisesError) throw exercisesError;

                (workoutExercises || []).forEach((item) => {
                    exerciseCountByDay[item.workout_day_id] = (exerciseCountByDay[item.workout_day_id] || 0) + 1;
                });
            }

            const normalizedDays = (daysData || []).map((day) => ({
                ...day,
                exercise_count: exerciseCountByDay[day.id] || 0
            }));

            setDays(normalizedDays);
        } catch (error) {
            console.error('Erro ao carregar dados do treino:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDay = (day) => {
        navigate(`/treino/${id}/dia/${day.id}`);
    };

    const handleDayClick = (date) => {
        const dayOfWeek = date.getDay();
        const selectedDay = days.find((d) => {
            const dayNum = d.day_number - 1;
            const adjustedDayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
            return dayNum === adjustedDayOfWeek;
        });

        setSelectedDate(date);
        if (selectedDay) {
            handleOpenDay(selectedDay);
        }
    };

    const scheduledDays = days.map((d) => {
        const dayNum = d.day_number - 1;
        return dayNum === -1 ? 6 : dayNum;
    });

    if (loading) {
        return <SkeletonWorkouts />;
    }

    if (!workout) {
        return (
            <div className="error-container">
                <p>⚠️ Treino não encontrado</p>
                <button onClick={() => navigate('/treinos')}>Voltar para lista</button>
            </div>
        );
    }

    return (
        <div className="workout-plan-container">
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

            <WeeklyCalendar
                currentDate={new Date()}
                scheduledDays={scheduledDays}
                completedDates={[]}
                onDayClick={handleDayClick}
                selectedDate={selectedDate}
            />

            <div className="days-section">
                <h2 className="section-title">Sessões desta Semana</h2>

                {days.length === 0 ? (
                    <p className="empty-message">
                        Nenhum dia de treino configurado neste plano.
                    </p>
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
                                    <p className="day-open-meta">
                                        {day.exercise_count || 0} exercícios
                                    </p>
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
