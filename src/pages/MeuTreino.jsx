import { useState, useEffect } from 'react';
import { Clock, Dumbbell, ChevronRight } from 'lucide-react';
import MiniCalendar from '../components/MiniCalendar';
import MotivationalCard from '../components/MotivationalCard';
import ExerciseCard from '../components/ExerciseCard';
import ExerciseDetailModal from '../components/ExerciseDetailModal';
import { supabase } from '../lib/supabase';
import './MeuTreino.css';

const MeuTreino = () => {
    const [loading, setLoading] = useState(true);
    const [completedDates, setCompletedDates] = useState([]);
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

            // For demo purposes, using mock data
            // In production, fetch from Supabase based on user's active workout

            // Mock completed dates (last 7 days with some workouts)
            const mockCompletedDates = [
                new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
                new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
            ];
            setCompletedDates(mockCompletedDates);

            // Mock today's workout
            const mockWorkout = {
                id: '1',
                title: 'Força de Tronco',
                day_name: 'Dia 1 - Peito & Tríceps',
                estimated_duration: 45,
                exercise_count: 6
            };
            setTodaysWorkout(mockWorkout);

            // Mock exercises for today
            const mockExercises = [
                {
                    exercise: {
                        id: '1',
                        name: 'Supino com Halteres',
                        muscle_group: 'Peito & Tríceps',
                        video_url: null,
                        instructions: ['Mantenha as costas apoiadas no banco', 'Abaixe os pesos lentamente', 'Empurre para cima de forma explosiva']
                    },
                    workoutExercise: {
                        sets: 3,
                        reps: '12',
                        rest_seconds: 60,
                        notes: 'Foque na forma mais do que no peso'
                    }
                },
                {
                    exercise: {
                        id: '2',
                        name: 'Swing com Kettlebell',
                        muscle_group: 'Corpo Inteiro',
                        video_url: null,
                        instructions: ['Faça o movimento com os quadris', 'Mantenha o core contraído', 'Empurre através dos calcanhares']
                    },
                    workoutExercise: {
                        sets: 3,
                        reps: '15',
                        rest_seconds: 90,
                        notes: null
                    }
                },
                {
                    exercise: {
                        id: '3',
                        name: 'Aquecimento Cardio',
                        muscle_group: 'Cardio',
                        video_url: null,
                        instructions: ['Comece devagar', 'Aumente a intensidade gradualmente', 'Mantenha a respiração estável']
                    },
                    workoutExercise: {
                        sets: 1,
                        reps: '10 Min',
                        rest_seconds: 0,
                        notes: 'Corrida leve ou bicicleta'
                    }
                }
            ];
            setExercises(mockExercises);

        } catch (error) {
            console.error('Error loading workout data:', error);
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
        return (
            <div className="loading-container">
                <p>Carregando seu treino...</p>
            </div>
        );
    }

    return (
        <div className="meu-treino-container">
            {/* Mini Calendar */}
            <MiniCalendar
                completedDates={completedDates}
                currentDate={new Date()}
            />

            {/* Motivational Card */}
            <MotivationalCard
                message="Vamos com tudo!"
                subtitle="Hoje é treino de força para o tronco. Pronto para bater seu recorde?"
                intensity="Alta Intensidade"
            />

            {/* Today's Routine */}
            <div className="routine-section">
                <div className="routine-header">
                    <h2 className="routine-title">Rotina de Hoje</h2>
                    <button className="see-details-btn">
                        Ver Detalhes
                        <ChevronRight size={16} />
                    </button>
                </div>

                <div className="routine-meta">
                    <span className="meta-item">
                        <Clock size={16} />
                        {todaysWorkout?.estimated_duration || 45} min
                    </span>
                    <span className="meta-item">
                        <Dumbbell size={16} />
                        {exercises.length} Exercícios
                    </span>
                </div>
            </div>

            {/* Exercise List */}
            <div className="exercises-list">
                {exercises.map(({ exercise, workoutExercise }) => (
                    <ExerciseCard
                        key={exercise.id}
                        exercise={exercise}
                        workoutExercise={workoutExercise}
                        isCompleted={completedExercises.has(exercise.id)}
                        onComplete={handleExerciseComplete}
                        onClick={handleExerciseClick}
                    />
                ))}
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
