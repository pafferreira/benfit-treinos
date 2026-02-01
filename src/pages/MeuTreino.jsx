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
                title: 'Upper Body Strength',
                day_name: 'Day 1 - Chest & Triceps',
                estimated_duration: 45,
                exercise_count: 6
            };
            setTodaysWorkout(mockWorkout);

            // Mock exercises for today
            const mockExercises = [
                {
                    exercise: {
                        id: '1',
                        name: 'Dumbbell Press',
                        muscle_group: 'Chest & Triceps',
                        video_url: null,
                        instructions: ['Keep your back flat on the bench', 'Lower the weights slowly', 'Press up explosively']
                    },
                    workoutExercise: {
                        sets: 3,
                        reps: '12',
                        rest_seconds: 60,
                        notes: 'Focus on form over weight'
                    }
                },
                {
                    exercise: {
                        id: '2',
                        name: 'Kettlebell Swings',
                        muscle_group: 'Full Body',
                        video_url: null,
                        instructions: ['Hinge at the hips', 'Keep your core tight', 'Drive through your heels']
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
                        name: 'Warm-Up Cardio',
                        muscle_group: 'Cardio',
                        video_url: null,
                        instructions: ['Start slow', 'Gradually increase intensity', 'Maintain steady breathing']
                    },
                    workoutExercise: {
                        sets: 1,
                        reps: '10 Min',
                        rest_seconds: 0,
                        notes: 'Light jog or bike'
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
                <p>Loading your workout...</p>
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
                message="Let's crush it!"
                subtitle="Today is upper body strength. Ready to beat your PR?"
                intensity="High Intensity"
            />

            {/* Today's Routine */}
            <div className="routine-section">
                <div className="routine-header">
                    <h2 className="routine-title">Today's Routine</h2>
                    <button className="see-details-btn">
                        See Details
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
                        {exercises.length} Exercises
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
