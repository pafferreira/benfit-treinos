import { useState, useEffect } from 'react';
import { Check, Target, Repeat, Timer, Undo2, Play, Layers, StickyNote, ClipboardList, Dumbbell, Tags } from 'lucide-react';
import './SessionExerciseItem.css';

const SessionExerciseItem = ({
    exercise,
    workoutExercise,
    isCompleted = false,
    onToggleComplete,
    onStartRest,
    orderIndex
}) => {
    const [showUndo, setShowUndo] = useState(false);
    const [undoTimeLeft, setUndoTimeLeft] = useState(10);

    // Fail-safe: Se dados fundamentais faltarem, não renderiza nada para evitar crash
    if (!exercise || !workoutExercise) {
        return null; // Ou um placeholder de erro se preferir
    }

    // Timer de 10 segundos para desfazer
    useEffect(() => {
        let interval;
        if (showUndo && undoTimeLeft > 0) {
            interval = setInterval(() => {
                setUndoTimeLeft(prev => {
                    if (prev <= 1) {
                        setShowUndo(false);
                        return 10;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [showUndo, undoTimeLeft]);

    const handleToggleComplete = () => {
        if (isCompleted && !showUndo) {
            // Já foi completado há mais de 40s, não pode desmarcar
            return;
        }

        if (!isCompleted) {
            // Marcar como feito pela primeira vez
            if (onToggleComplete) onToggleComplete(exercise.id, true);
            setShowUndo(true);
            setUndoTimeLeft(10);
            // Iniciar cronômetro de descanso se houver tempo especificado
            if (workoutExercise.rest_seconds && onStartRest) {
                onStartRest(workoutExercise.rest_seconds);
            }
        } else if (showUndo) {
            // Desfazer dentro dos 10s
            if (onToggleComplete) onToggleComplete(exercise.id, false);
            setShowUndo(false);
            setUndoTimeLeft(10);
        }
    };

    const formatRestTime = (seconds) => {
        const val = parseInt(seconds, 10);
        if (isNaN(val) || val <= 0) return '-';

        const mins = Math.floor(val / 60);
        const secs = val % 60;
        if (mins > 0) {
            return `${mins}min ${secs}s`;
        }
        return `${secs}s`;
    };

    // Safe getters
    const safeName = typeof exercise.name === 'string' ? exercise.name : 'Exercício';
    const safeImage = typeof exercise.image_url === 'string' ? exercise.image_url : null;
    const safeMuscle = typeof exercise.muscle_group === 'string' ? exercise.muscle_group : '';
    const safeEquipment = typeof exercise.equipment === 'string' ? exercise.equipment : '';
    const safeNotes = typeof workoutExercise.notes === 'string' ? workoutExercise.notes : null;
    const safeVideo = typeof exercise.video_url === 'string' ? exercise.video_url : null;
    const safeTags = Array.isArray(exercise.tags)
        ? exercise.tags.filter((tag) => typeof tag === 'string' && tag.trim() !== '')
        : [];

    return (
        <div className={`session-exercise-item ${isCompleted ? 'completed' : ''} ${showUndo ? 'undo-mode' : ''}`}>
            <div className="exercise-main">
                <div className="exercise-avatar">
                    {safeImage ? (
                        <img src={safeImage} alt={safeName} />
                    ) : (
                        <div className="avatar-placeholder">
                            <Target size={24} />
                        </div>
                    )}
                </div>

                <div className="exercise-info">
                    <div className="exercise-header-row">
                        <h4 className="exercise-name">
                            {orderIndex}. {safeName}
                        </h4>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.875rem', color: isCompleted ? '#10B981' : '#9CA3AF', fontWeight: 600 }}>
                                {isCompleted ? 'Feito' : 'Feito?'}
                            </span>
                            <button
                                className={`checkbox-btn ${isCompleted ? 'checked' : ''}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleComplete();
                                }}
                                disabled={isCompleted && !showUndo}
                                title={isCompleted ? "Feito" : "Marcar como feito"}
                            >
                                {isCompleted && <Check size={18} strokeWidth={3} />}
                            </button>
                        </div>
                    </div>

                    <div className="exercise-meta">
                        <span className="meta-badge">
                            <Layers size={14} />
                            {workoutExercise.sets || '-'} séries
                        </span>
                        <span className="meta-badge">
                            <Repeat size={14} />
                            {workoutExercise.reps || '-'} reps
                        </span>
                        <span className="meta-badge">
                            <Timer size={14} />
                            {(() => {
                                const time = formatRestTime(workoutExercise.rest_seconds);
                                return time === '-' ? '-' : `${time} descanso`;
                            })()}
                        </span>
                        <span className="meta-badge">
                            <Target size={14} />
                            {safeMuscle}
                        </span>
                        {safeEquipment && (
                            <span className="meta-badge">
                                <Dumbbell size={14} />
                                {safeEquipment}
                            </span>
                        )}
                    </div>

                    {showUndo && (
                        <div className="undo-bar">
                            <button
                                className="undo-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleComplete();
                                }}
                            >
                                <Undo2 size={14} />
                                Desfazer ({undoTimeLeft}s)
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Detalhes sempre visíveis */}
            <div className="exercise-details open">
                {safeNotes && (
                    <div className="detail-section">
                        <strong><StickyNote size={14} className="inline mr-1" /> Notas:</strong>
                        <p>{safeNotes}</p>
                    </div>
                )}

                {safeTags.length > 0 && (
                    <div className="detail-section">
                        <strong><Tags size={14} className="inline mr-1" /> Tags:</strong>
                        <div className="detail-tags-row">
                            {safeTags.map((tag) => (
                                <span key={tag} className="detail-tag">{tag}</span>
                            ))}
                        </div>
                    </div>
                )}

                {(() => {
                    const inst = exercise.instructions;
                    let list = [];
                    // Tratamento defensivo de instruções
                    try {
                        if (Array.isArray(inst)) {
                            list = inst.map(i => {
                                if (typeof i === 'string') return i;
                                if (typeof i === 'object' && i !== null) return JSON.stringify(i);
                                return String(i);
                            });
                        } else if (typeof inst === 'string') {
                            list = [inst];
                        }
                    } catch (e) {
                        console.error("Error parsing instructions", e);
                        return null;
                    }

                    if (list.length === 0) return null;

                    return (
                        <div className="detail-section">
                            <strong><ClipboardList size={14} className="inline mr-1" /> Instruções:</strong>
                            <ul>
                                {list.map((instruction, idx) => (
                                    <li key={idx}>{instruction}</li>
                                ))}
                            </ul>
                        </div>
                    );
                })()}

                <div className="exercise-actions">
                    {safeVideo && (
                        <a
                            href={safeVideo}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="video-link"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <Play size={16} />
                            Assistir vídeo demonstrativo
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SessionExerciseItem;
