import { useState } from 'react';
import { Target, Timer, Check, Layers, Repeat } from 'lucide-react';
import RestTimer from './RestTimer';
import './ExerciseCard.css';

const ExerciseCard = ({
    exercise,
    workoutExercise,
    onComplete,
    onClick,
    isCompleted = false
}) => {
    const [showTimer, setShowTimer] = useState(false);

    const handleCheckboxChange = (e) => {
        e.stopPropagation();
        if (onComplete) {
            onComplete(exercise.id);
        }
    };

    const handleCardClick = () => {
        if (onClick) {
            onClick(exercise, workoutExercise);
        }
    };

    const sets = workoutExercise?.sets || 3;
    const reps = workoutExercise?.reps || '10-12';
    const restSeconds = workoutExercise?.rest_seconds || 60;

    const formatRest = (seconds) => {
        if (!seconds) return '--';
        if (seconds >= 60) {
            const m = Math.floor(seconds / 60);
            const s = seconds % 60;
            return s > 0 ? `${m}m${s}s` : `${m}min`;
        }
        return `${seconds}s`;
    };

    return (
        <div className={`exercise-card-container ${isCompleted ? 'completed' : ''}`}>
            {/* Top section: image + name + checkbox */}
            <div className="exercise-card-main" onClick={handleCardClick}>
                <div className="exercise-card-image">
                    <img
                        src={exercise.image_url || exercise.video_url || 'https://via.placeholder.com/80'}
                        alt={exercise.name}
                        onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://via.placeholder.com/80';
                        }}
                    />
                </div>

                <div className="exercise-card-info">
                    <div className="exercise-card-header">
                        <div>
                            <h3 className="exercise-card-name">{exercise.name}</h3>
                            <div className="exercise-card-muscle">
                                <Target size={11} />
                                {exercise.muscle_group}
                            </div>
                        </div>
                        <label className="exercise-checkbox" onClick={(e) => e.stopPropagation()}>
                            <input
                                type="checkbox"
                                checked={isCompleted}
                                onChange={handleCheckboxChange}
                            />
                            <span className="checkmark">
                                <Check size={14} />
                            </span>
                        </label>
                    </div>
                </div>
            </div>

            {/* Stats Cards: Séries / Reps / Descanso — destaque máximo */}
            <div className="exercise-stats-grid">
                <div className="stat-card stat-sets">
                    <Layers size={14} className="stat-icon" />
                    <span className="stat-number">{sets}</span>
                    <span className="stat-label">Séries</span>
                </div>

                <div className="stat-card stat-reps">
                    <Repeat size={14} className="stat-icon" />
                    <span className="stat-number">{reps}</span>
                    <span className="stat-label">Reps</span>
                </div>

                <div className="stat-card stat-rest">
                    <Timer size={14} className="stat-icon" />
                    <span className="stat-number">{formatRest(restSeconds)}</span>
                    <span className="stat-label">Descanso</span>
                </div>
            </div>

            {/* Rest timer */}
            <div className="exercise-card-footer" onClick={(e) => e.stopPropagation()}>
                {showTimer ? (
                    <div className="timer-section">
                        <RestTimer
                            suggestedRestSeconds={restSeconds}
                            onComplete={() => setShowTimer(false)}
                        />
                    </div>
                ) : (
                    <button
                        className="start-rest-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowTimer(true);
                        }}
                    >
                        <Timer size={15} />
                        Iniciar Descanso
                        <span className="rest-badge">{formatRest(restSeconds)}</span>
                    </button>
                )}
            </div>
        </div>
    );
};

export default ExerciseCard;
