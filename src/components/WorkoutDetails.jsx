import { useState } from 'react';
import { ChevronDown, ChevronLeft, Calendar, Clock, Dumbbell, Info, Target, Repeat, Timer, Layers } from 'lucide-react';
import './WorkoutDetails.css';

const WorkoutDetails = ({ workout, onBack, allExercises = [] }) => {
    // State for accordions
    // openExercises: object where key is dayIndex, value is array of exercise indices
    const [openExercises, setOpenExercises] = useState({});

    const getExerciseDetails = (id) => {
        return allExercises.find(ex => ex.id === id) || {
            name: 'Exercício não encontrado',
            muscle_group: '-',
            equipment: '-',
            instructions: []
        };
    };

    const toggleExercise = (dayIndex, exIndex) => {
        setOpenExercises(prev => {
            const dayExercises = prev[dayIndex] || [];
            const isOpen = dayExercises.includes(exIndex);

            return {
                ...prev,
                [dayIndex]: isOpen
                    ? dayExercises.filter(i => i !== exIndex)
                    : [...dayExercises, exIndex]
            };
        });
    };

    if (!workout) return null;

    return (
        <div className="workout-details-container">
            <button className="back-btn" onClick={onBack}>
                <ChevronLeft size={20} />
                Voltar para lista
            </button>

            {/* Header */}
            <div className="details-header">
                <div className="header-content">
                    <div className="header-main">
                        <h1>{workout.title}</h1>
                        <p className="header-description">{workout.description}</p>
                    </div>

                    <div className="header-stats">
                        <div className="stat-pill">
                            <Clock size={16} />
                            <span>{workout.estimated_duration} min</span>
                        </div>
                        <div className="stat-pill">
                            <Calendar size={16} />
                            <span>{workout.days_per_week} dias/sem</span>
                        </div>
                        <div className="stat-pill">
                            <Layers size={16} />
                            <span>{workout.difficulty}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Days List */}
            <div className="days-list">
                {workout.schedule.map((day, dayIndex) => (
                    <div key={dayIndex} className="day-section">
                        <div className="day-header">
                            <div className="day-badge">Dia {dayIndex + 1}</div>
                            <h2 className="day-title">{day.day_name}</h2>
                            <span className="day-count">{day.exercises.length} exercícios</span>
                        </div>

                        <div className="exercises-grid">
                            {day.exercises.map((exItem, exIndex) => {
                                const details = getExerciseDetails(exItem.exercise_id);
                                const isExOpen = (openExercises[dayIndex] || []).includes(exIndex);

                                return (
                                    <div key={exIndex} className={`exercise-card ${isExOpen ? 'open' : ''}`}>
                                        <button
                                            className="exercise-header"
                                            onClick={() => toggleExercise(dayIndex, exIndex)}
                                        >
                                            <div className="exercise-info">
                                                <div className="exercise-index">{exIndex + 1}</div>
                                                <div className="exercise-main-info">
                                                    <h3>{details.name}</h3>
                                                    <div className="exercise-tags">
                                                        <span className="tag">
                                                            <Target size={12} />
                                                            {details.muscle_group}
                                                        </span>
                                                        <span className="tag">
                                                            <Repeat size={12} />
                                                            {exItem.sets} x {exItem.reps}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <ChevronDown
                                                size={20}
                                                className={`chevron ${isExOpen ? 'rotated' : ''}`}
                                            />
                                        </button>

                                        <div className={`exercise-content ${isExOpen ? 'expanded' : ''}`}>
                                            <div className="exercise-details-grid">
                                                <div className="detail-item">
                                                    <span className="label"><Layers size={14} /> Séries</span>
                                                    <span className="value">{exItem.sets}</span>
                                                </div>
                                                <div className="detail-item">
                                                    <span className="label"><Repeat size={14} /> Repetições</span>
                                                    <span className="value">{exItem.reps}</span>
                                                </div>
                                                <div className="detail-item">
                                                    <span className="label"><Timer size={14} /> Descanço</span>
                                                    <span className="value">{exItem.rest_seconds ? `${exItem.rest_seconds}s` : '-'}</span>
                                                </div>
                                                <div className="detail-item">
                                                    <span className="label"><Dumbbell size={14} /> Equipamento</span>
                                                    <span className="value">{details.equipment || '-'}</span>
                                                </div>
                                            </div>

                                            {exItem.notes && (
                                                <div className="exercise-notes">
                                                    <div className="note-label"><Info size={14} /> Notas</div>
                                                    <p>{exItem.notes}</p>
                                                </div>
                                            )}

                                            {details.instructions && details.instructions.length > 0 && (
                                                <div className="exercise-instructions">
                                                    <div className="instruction-label">Instruções</div>
                                                    <p>
                                                        {Array.isArray(details.instructions)
                                                            ? details.instructions.join('. ')
                                                            : details.instructions}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default WorkoutDetails;
