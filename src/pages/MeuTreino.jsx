import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Dumbbell, ChevronRight } from 'lucide-react';
import MotivationalCard from '../components/MotivationalCard';
import ExerciseCard from '../components/ExerciseCard';
import ExerciseDetailModal from '../components/ExerciseDetailModal';
import { SkeletonMeuTreino } from '../components/SkeletonLoader';
import { supabase, supabaseHelpers } from '../lib/supabase';
import './MeuTreino.css';

const MeuTreino = () => {
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [todaysWorkout, setTodaysWorkout] = useState(null);
    const [exercises, setExercises] = useState([]);
    const [completedExercises, setCompletedExercises] = useState(new Set());
    const [selectedExercise, setSelectedExercise] = useState(null);
    const [selectedWorkoutExercise, setSelectedWorkoutExercise] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        loadWorkoutData();
    }, []);

    const loadWorkoutData = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                setTodaysWorkout(null);
                setExercises([]);
                return;
            }

            const activePlans = await supabaseHelpers.getUserActivePlans(user.id);
            const selectedPlan = activePlans.find((plan) => plan.status === 'em_andamento') || activePlans[0];

            if (!selectedPlan?.workout_id) {
                setTodaysWorkout(null);
                setExercises([]);
                return;
            }

            const { data: daysData, error: daysError } = await supabase
                .from('b_workout_days')
                .select('id, day_name, day_number')
                .eq('workout_id', selectedPlan.workout_id)
                .order('day_number');

            if (daysError) throw daysError;

            const todayWeekday = new Date().getDay();
            const normalizedWeekday = todayWeekday === 0 ? 7 : todayWeekday;
            const selectedDay = (daysData || []).find((day) => day.day_number === normalizedWeekday) || daysData?.[0];

            if (!selectedDay) {
                setTodaysWorkout(null);
                setExercises([]);
                return;
            }

            const { data: exerciseRows, error: exerciseRowsError } = await supabase
                .from('b_workout_exercises')
                .select(`
                    exercise_id,
                    sets,
                    reps,
                    rest_seconds,
                    notes,
                    order_index,
                    b_exercises (*)
                `)
                .eq('workout_day_id', selectedDay.id)
                .order('order_index');

            if (exerciseRowsError) throw exerciseRowsError;

            const mappedExercises = (exerciseRows || [])
                .filter((row) => row.b_exercises)
                .map((row) => ({
                    exercise: row.b_exercises,
                    workoutExercise: row
                }));

            setExercises(mappedExercises);
            setTodaysWorkout({
                workout_id: selectedPlan.workout_id,
                workout_day_id: selectedDay.id,
                title: selectedPlan.b_workouts?.title || 'Plano Ativo',
                difficulty: selectedPlan.b_workouts?.difficulty || 'Intermediário',
                day_name: selectedDay.day_name || `Dia ${selectedDay.day_number}`,
                estimated_duration: selectedPlan.b_workouts?.estimated_duration || 45,
                exercise_count: mappedExercises.length
            });

            const { data: openSession } = await supabase
                .from('b_workout_sessions')
                .select('id')
                .eq('user_id', user.id)
                .eq('workout_id', selectedPlan.workout_id)
                .eq('workout_day_id', selectedDay.id)
                .is('ended_at', null)
                .order('started_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (openSession?.id) {
                const { data: logs } = await supabase
                    .from('b_session_logs')
                    .select('exercise_id')
                    .eq('session_id', openSession.id)
                    .eq('user_id', user.id);

                const completedIds = new Set((logs || []).map((item) => item.exercise_id).filter(Boolean));
                setCompletedExercises(completedIds);
            } else {
                setCompletedExercises(new Set());
            }

        } catch (error) {
            console.error('Error loading workout data:', error);
            window.dispatchEvent(new CustomEvent('app-toast', {
                detail: { message: 'Erro ao carregar dados do treino.', type: 'error' }
            }));
        } finally {
            setLoading(false);
        }
    };

    const handleExerciseComplete = async (exerciseId) => {
        const newCompleted = new Set(completedExercises);
        if (newCompleted.has(exerciseId)) {
            newCompleted.delete(exerciseId);
        } else {
            newCompleted.add(exerciseId);

            // TODO: Create log entry in B_Session_Logs
            // TODO: If all exercises complete, create B_Daily_Workout_Logs entry
        }
        setCompletedExercises(newCompleted);
    };

    const handleExerciseClick = (exercise, workoutExercise) => {
        setSelectedExercise(exercise);
        setSelectedWorkoutExercise(workoutExercise);
        setIsModalOpen(true);
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        setSelectedExercise(null);
        setSelectedWorkoutExercise(null);
    };

    if (loading) {
        return <SkeletonMeuTreino />;
    }

    return (
        <div className="meu-treino-container">
            {/* Motivational Card */}
            <MotivationalCard
                message={todaysWorkout ? 'Treino de hoje pronto' : 'Nenhum treino ativo'}
                subtitle={todaysWorkout
                    ? `${todaysWorkout.day_name} • ${todaysWorkout.title}`
                    : 'Atribua um plano para começar e registrar sua evolução.'}
                intensity={todaysWorkout?.difficulty || 'Sem sessão'}
            />

            {/* Today's Routine */}
            <div className="routine-section">
                <div className="routine-header">
                    <h2 className="routine-title">Rotina de Hoje</h2>
                    <button
                        className="btn-ghost flex items-center gap-1 text-xs"
                        onClick={() => {
                            if (todaysWorkout?.workout_id && todaysWorkout?.workout_day_id) {
                                navigate(`/treino/${todaysWorkout.workout_id}/dia/${todaysWorkout.workout_day_id}`);
                            }
                        }}
                        disabled={!todaysWorkout?.workout_id || !todaysWorkout?.workout_day_id}
                        data-tooltip="Abrir sessão do dia"
                    >
                        Ver Detalhes
                        <ChevronRight size={14} />
                    </button>
                </div>

                <div className="routine-meta">
                    <span className="meta-item">
                        <Clock size={16} />
                        {todaysWorkout?.estimated_duration || 45} min
                    </span>
                    <span className="meta-item">
                        <Dumbbell size={16} />
                        {todaysWorkout?.exercise_count ?? exercises.length} Exercícios
                    </span>
                </div>
            </div>

            {/* Exercise List */}
            <div className="exercises-list">
                {exercises.length === 0 ? (
                    <p className="empty-workout-message">Sem exercícios para hoje.</p>
                ) : (
                    exercises.map(({ exercise, workoutExercise }) => (
                        <ExerciseCard
                            key={exercise.id}
                            exercise={exercise}
                            workoutExercise={workoutExercise}
                            isCompleted={completedExercises.has(exercise.id)}
                            onComplete={handleExerciseComplete}
                            onClick={handleExerciseClick}
                        />
                    ))
                )}
            </div>

            {/* Exercise Detail Modal */}
            <ExerciseDetailModal
                isOpen={isModalOpen}
                exercise={selectedExercise}
                workoutExercise={selectedWorkoutExercise}
                onClose={handleModalClose}
            />
        </div>
    );
};

export default MeuTreino;
