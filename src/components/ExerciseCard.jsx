import { useState } from 'react';
import { Target, Repeat, Timer, Check } from 'lucide-react';
import RestTimer from './RestTimer';
import './ExerciseCard.css';

const ExerciseCard = ({
    exercise,
    workoutExercise,
    onComplete,
    onClick,
    isCompleted = false
}) => {
    const [selectedSet, setSelectedSet] = useState(1);
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

    return (
        <div className={`exercise-card-container ${isCompleted ? 'completed' : ''}`}>
            <div className="exercise-card-main" onClick={handleCardClick}>
                <div className="exercise-card-image">
                    <img
                        src={exercise.video_url || 'https://via.placeholder.com/80'}
                        alt={exercise.name}
                        onError={(e) => e.target.src = 'https://via.placeholder.com/80'}
                    />
                </div>

                <div className="exercise-card-info">
                    <div className="exercise-card-header">
                        <div>
                            <h3 className="exercise-card-name">{exercise.name}</h3>
                            <div className="exercise-card-muscle">
                                <Target size={12} />
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

                    <div className="exercise-card-meta">
                        <span className="meta-item">
                            <Repeat size={14} />
                            {sets} Séries • {reps} Reps
                        </span>
                    </div>

                    <div className="set-selector">
                        {Array.from({ length: sets }, (_, i) => i + 1).map(setNum => (
                            <button
                                key={setNum}
                                className={`set-btn ${selectedSet === setNum ? 'active' : ''}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedSet(setNum);
                                }}
                            >
                                <div className="set-label">SÉRIE {setNum}</div>
                                <div className="set-value">{reps.split('-')[0]} x</div>
                                <div className="set-weight">15kg</div>
                            </button>
                        ))}
                    </div>

                    {showTimer ? (
                        <div className="timer-section" onClick={(e) => e.stopPropagation()}>
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
                            <Timer size={16} />
                            Iniciar Descanso ({restSeconds}s)
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ExerciseCard;
