import { useState, useMemo } from 'react';
import { ChevronDown, Clock, Dumbbell, CheckCircle } from 'lucide-react';
import SessionExerciseItem from './SessionExerciseItem';
import ErrorBoundary from './ErrorBoundary'; // Importar ErrorBoundary
import './DayAccordion.css';

const DayAccordion = ({
    day,
    exercises = [], // biblioteca completa de exercícios
    isOpen = false,
    onToggle,
    completedExercises = [], // IDs dos exercícios completados
    onExerciseComplete,
    onStartRest,
    isCompleted = false,
    isSelected = false
}) => {
    // Calculando métricas
    const totalExercises = day.exercises?.length || 0;

    // Contar exercícios deste dia que estão concluídos
    const completedCountForDay = day.exercises
        ? day.exercises.filter(we => completedExercises.includes(we.exercise_id)).length
        : 0;

    const progress = totalExercises > 0 ? (completedCountForDay / totalExercises) * 100 : 0;

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' });
    };

    return (
        <div className={`day-accordion ${isOpen ? 'open' : ''} ${isCompleted ? 'fully-completed' : ''} ${isSelected && !isOpen ? 'selected' : ''}`}>
            <button className="accordion-header" onClick={onToggle}>
                <div className="header-left">
                    <div className="day-status-icon">
                        {isCompleted ? (
                            <CheckCircle size={24} className="check-icon" />
                        ) : (
                            <div className="progress-ring">
                                <svg width="24" height="24" viewBox="0 0 24 24">
                                    <circle
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        fill="none"
                                        stroke="#E5E7EB"
                                        strokeWidth="2"
                                    />
                                    <circle
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        fill="none"
                                        stroke="var(--color-primary)"
                                        strokeWidth="2"
                                        strokeDasharray={`${progress * 0.628} 62.8`}
                                        strokeLinecap="round"
                                        transform="rotate(-90 12 12)"
                                    />
                                </svg>
                            </div>
                        )}
                    </div>

                    <div className="header-info">
                        <h3 className="day-title">
                            {day.date ? formatDate(day.date) : day.dayName || 'Sessão de Treino'}
                        </h3>
                        <div className="day-meta">
                            <span className="meta-item">
                                <Dumbbell size={14} />
                                {totalExercises} exercícios
                            </span>
                            {day.estimatedDuration && (
                                <span className="meta-item">
                                    <Clock size={14} />
                                    {day.estimatedDuration} min
                                </span>
                            )}
                            <span className="meta-item progress-text">
                                {completedCountForDay}/{totalExercises} concluídos
                            </span>
                        </div>
                    </div>
                </div>

                <div className="header-right">
                    <ChevronDown size={20} className={`chevron ${isOpen ? 'rotated' : ''}`} />
                </div>
            </button>

            {isOpen && (
                <div className="accordion-content">
                    {isCompleted && (
                        <div className="completion-banner">
                            <CheckCircle size={20} />
                            <span>Treino do dia concluído! Parabéns! 🎉</span>
                        </div>
                    )}

                    <div className="exercises-list">
                        {(!day.exercises || day.exercises.length === 0) ? (
                            <p className="empty-message">Nenhum exercício programado para este dia.</p>
                        ) : (
                            day.exercises.map((workoutExercise, idx) => {
                                // Encontrar details do exercício
                                const exercise = exercises.find(ex => ex.id === workoutExercise.exercise_id);
                                if (!exercise) return null; // Skip se não encontrar

                                const isExerciseCompleted = completedExercises.includes(workoutExercise.exercise_id);

                                return (
                                    <ErrorBoundary key={workoutExercise.exercise_id}>
                                        <SessionExerciseItem
                                            exercise={exercise}
                                            workoutExercise={workoutExercise}
                                            isCompleted={isExerciseCompleted}
                                            onToggleComplete={onExerciseComplete}
                                            onStartRest={onStartRest}
                                            orderIndex={idx + 1}
                                        />
                                    </ErrorBoundary>
                                );
                            })
                        )}
                    </div>

                    {!isCompleted && completedCountForDay === totalExercises && totalExercises > 0 && (
                        <div className="completion-prompt">
                            <p>Todos os exercícios foram marcados como concluídos!</p>
                            <p className="completion-note">
                                Este treino será automaticamente registrado como completo.
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default DayAccordion;
