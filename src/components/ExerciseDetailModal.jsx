import { useState } from 'react';
import { X, Target, Info, Check } from 'lucide-react';
import RestTimer from './RestTimer';
import './ExerciseDetailModal.css';

const ExerciseDetailModal = ({
    isOpen,
    exercise,
    workoutExercise,
    onClose,
    onSetComplete
}) => {
    const [completedSets, setCompletedSets] = useState(new Set());

    if (!isOpen || !exercise) return null;

    const sets = workoutExercise?.sets || 3;
    const reps = workoutExercise?.reps || '10-12';
    const restSeconds = workoutExercise?.rest_seconds || 60;
    const notes = workoutExercise?.notes || '';

    const handleSetToggle = (setNum) => {
        const newCompleted = new Set(completedSets);
        if (newCompleted.has(setNum)) {
            newCompleted.delete(setNum);
        } else {
            newCompleted.add(setNum);
        }
        setCompletedSets(newCompleted);

        if (onSetComplete) {
            onSetComplete(setNum, !completedSets.has(setNum));
        }
    };

    const instructions = Array.isArray(exercise.instructions)
        ? exercise.instructions
        : exercise.instructions
            ? [exercise.instructions]
            : ['Siga a forma correta e mantenha o controle durante todo o movimento.'];

    return (
        <div className="exercise-detail-modal">
            <div className="modal-overlay" onClick={onClose} />

            <div className="modal-content">
                <button className="modal-close-btn" onClick={onClose}>
                    <X size={24} />
                </button>

                <div className="modal-header">
                    <div className="exercise-image-large">
                        <img
                            src={exercise.video_url || 'https://via.placeholder.com/400x300'}
                            alt={exercise.name}
                            onError={(e) => e.target.src = 'https://via.placeholder.com/400x300'}
                        />
                    </div>

                    <div className="exercise-title-section">
                        <h2 className="exercise-title">{exercise.name}</h2>
                        <div className="exercise-muscle-tag">
                            <Target size={16} />
                            {exercise.muscle_group}
                        </div>
                    </div>
                </div>

                <div className="modal-body">
                    {/* Sets Section */}
                    <div className="sets-section">
                        <h3 className="section-title">Séries & Repetições</h3>
                        <div className="sets-grid">
                            {Array.from({ length: sets }, (_, i) => i + 1).map(setNum => (
                                <div
                                    key={setNum}
                                    className={`set-item ${completedSets.has(setNum) ? 'completed' : ''}`}
                                >
                                    <div className="set-info">
                                        <div className="set-number">SÉRIE {setNum}</div>
                                        <div className="set-prescription">{reps.split('-')[0]} x 15kg</div>
                                    </div>
                                    <label className="set-checkbox">
                                        <input
                                            type="checkbox"
                                            checked={completedSets.has(setNum)}
                                            onChange={() => handleSetToggle(setNum)}
                                        />
                                        <span className="checkmark">
                                            <Check size={16} />
                                        </span>
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Rest Timer Section */}
                    <div className="rest-section">
                        <h3 className="section-title">Descanso</h3>
                        <RestTimer suggestedRestSeconds={restSeconds} />
                    </div>

                    {/* Instructions Section */}
                    <div className="instructions-section">
                        <h3 className="section-title">
                            <Info size={18} />
                            Dicas & Instruções
                        </h3>
                        <ul className="instructions-list">
                            {instructions.map((instruction, idx) => (
                                <li key={idx}>{instruction}</li>
                            ))}
                        </ul>
                        {notes && (
                            <div className="exercise-notes">
                                <strong>Nota:</strong> {notes}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExerciseDetailModal;
