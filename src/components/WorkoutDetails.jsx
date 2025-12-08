import { useState } from 'react';
import { ChevronDown, ChevronLeft, Calendar, Clock, Dumbbell, Info, Target, Repeat, Timer, Layers } from 'lucide-react';
import './WorkoutDetails.css';

const WorkoutDetails = ({ workout, onBack, allExercises = [] }) => {
    // State for accordions
    // openDays: array of day indices that are open
    const [openDays, setOpenDays] = useState([0]);
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

    const toggleDay = (index) => {
        setOpenDays(prev =>
            prev.includes(index)
                ? prev.filter(i => i !== index)
                : [...prev, index]
        );
    };

    const toggleExercise = (dayIndex, exIndex, e) => {
        e.stopPropagation(); // Prevent triggering day toggle
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
            <button className="back-btn" onClick={onBack} style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '1rem' }}>
                <ChevronLeft size={20} />
                Voltar para lista
            </button>

            {/* Header */}
            <div className="details-header">
                <div className="header-top">
                    <div className="header-title">
                        <h1>{workout.title}</h1>
                        <div className="header-description">{workout.description}</div>
                    </div>
                </div>

                <div className="header-meta">
                    <div className="meta-badge">
                        <Clock size={18} />
                        {workout.estimated_duration} min/sessão
                    </div>
                    <div className="meta-badge">
                        <Calendar size={18} />
                        {workout.days_per_week} dias/semana
                    </div>
                    <div className="meta-badge">
                        <Layers size={18} />
                        {workout.difficulty}
                    </div>
                </div>
            </div>

            {/* Days Accordion (Level 1) */}
            <div className="days-container">
                {workout.schedule.map((day, dayIndex) => {
                    const isDayOpen = openDays.includes(dayIndex);

                    return (
                        <div key={dayIndex} className={`accordion-item ${isDayOpen ? 'open' : ''}`}>
                            <button
                                className="accordion-trigger"
                                onClick={() => toggleDay(dayIndex)}
                            >
                                <div className="day-header-content">
                                    <div className="day-icon">
                                        <Dumbbell size={20} />
                                    </div>
                                    <div>
                                        <div className="day-title">{day.day_name}</div>
                                        <div className="day-subtitle">{day.exercises.length} exercícios</div>
                                    </div>
                                </div>
                                <ChevronDown className="chevron" size={20} />
                            </button>

                            <div className="accordion-content">
                                <div className="exercises-list">
                                    {day.exercises.map((exItem, exIndex) => {
                                        const details = getExerciseDetails(exItem.exercise_id);
                                        const isExOpen = (openExercises[dayIndex] || []).includes(exIndex);

                                        return (
                                            <div key={exIndex} className="exercise-item">
                                                {/* Exercise Trigger (Level 2) */}
                                                <button
                                                    className="exercise-trigger"
                                                    onClick={(e) => toggleExercise(dayIndex, exIndex, e)}
                                                >
                                                    <div className="exercise-header-info">
                                                        <div className="exercise-number">{exIndex + 1}</div>
                                                        <div className="exercise-name">{details.name}</div>
                                                    </div>

                                                    <div className="exercise-summary">
                                                        <span className="summary-tag">
                                                            <Repeat size={14} />
                                                            {exItem.sets} x {exItem.reps}
                                                        </span>
                                                        <span className="summary-tag">
                                                            <Target size={14} />
                                                            {details.muscle_group}
                                                        </span>
                                                    </div>

                                                    <ChevronDown
                                                        size={16}
                                                        className="chevron"
                                                        style={{ transform: isExOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                                                    />
                                                </button>

                                                {/* Exercise Details Content */}
                                                {isExOpen && (
                                                    <div className="exercise-details">
                                                        <div className="detail-card">
                                                            <div className="detail-label">
                                                                <Layers size={14} /> Séries
                                                            </div>
                                                            <div className="detail-value">{exItem.sets}</div>
                                                        </div>

                                                        <div className="detail-card">
                                                            <div className="detail-label">
                                                                <Repeat size={14} /> Repetições
                                                            </div>
                                                            <div className="detail-value">{exItem.reps}</div>
                                                        </div>

                                                        <div className="detail-card">
                                                            <div className="detail-label">
                                                                <Timer size={14} /> Descanso
                                                            </div>
                                                            <div className="detail-value">
                                                                {exItem.rest_seconds ? `${exItem.rest_seconds}s` : '-'}
                                                            </div>
                                                        </div>

                                                        <div className="detail-card">
                                                            <div className="detail-label">
                                                                <Target size={14} /> Músculo Alvo
                                                            </div>
                                                            <div className="detail-value">{details.muscle_group}</div>
                                                        </div>

                                                        {/* Notes Section (Highlighted) */}
                                                        {exItem.notes && (
                                                            <div className="detail-card notes-section">
                                                                <div className="detail-label">
                                                                    <Info size={14} /> Notas de Execução
                                                                </div>
                                                                <div className="detail-value">
                                                                    {exItem.notes}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Instructions Tooltip/Info */}
                                                        {details.instructions && details.instructions.length > 0 && (
                                                            <div className="detail-card" style={{ gridColumn: '1 / -1' }}>
                                                                <div className="detail-label">
                                                                    <Info size={14} /> Instruções do Exercício
                                                                </div>
                                                                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                                                                    {Array.isArray(details.instructions)
                                                                        ? details.instructions.join('. ')
                                                                        : details.instructions}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default WorkoutDetails;
