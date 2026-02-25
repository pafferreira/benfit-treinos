import { useState, useEffect, useRef } from 'react';
import { Check, Target, Repeat, Timer, Play, Layers, StickyNote, ClipboardList, Dumbbell, Tags, ChevronDown } from 'lucide-react';
import './SessionExerciseItem.css';

const SessionExerciseItem = ({
    exercise,
    workoutExercise,
    isCompleted = false,
    onToggleComplete,
    isActive = false,
    onSelect,
    orderIndex
}) => {
    const [showUndo, setShowUndo] = useState(false);
    const [undoTimeLeft, setUndoTimeLeft] = useState(10);
    const itemRef = useRef(null);

    // Rolar para o topo do Acordeão quando ativado
    useEffect(() => {
        if (isActive && itemRef.current) {
            // Um pequeno timeout garante que a expansão tenha começado (DOM repainted)
            setTimeout(() => {
                // scrollIntoView funciona em qualquer container overflow filho, compensando o header nativamente graças ao css scroll-margin-top
                itemRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
    }, [isActive]);

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
            // Desvincular cronômetro do botão de completado, conforme feedback
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
        return `${val}s`;
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
        <div ref={itemRef} className={`session-exercise-item ${isCompleted ? 'completed' : ''} ${showUndo ? 'undo-mode' : ''} ${isActive ? 'active-accordion' : ''}`}>
            {/* Header / Clickable Area */}
            <div
                className="session-exercise-header-row"
                onClick={onSelect}
                style={{ cursor: 'pointer', padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                    <div className="accordion-chevron" style={{ transform: isActive ? 'rotate(180deg)' : 'rotate(0deg)', marginLeft: '-0.2rem' }}>
                        <ChevronDown size={20} strokeWidth={2.5} />
                    </div>

                    {!isActive && (
                        <div className="session-header-avatar">
                            {safeImage ? (
                                <img src={safeImage} alt={safeName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <Target size={20} color="var(--color-primary)" opacity={0.5} />
                            )}
                        </div>
                    )}

                    <h4 className="session-exercise-name" style={{ margin: 0, fontSize: '1.1rem', lineHeight: 1.25 }}>
                        {orderIndex}. {safeName}
                    </h4>
                </div>

                <div className="completion-area" onClick={(e) => e.stopPropagation()}>
                    <div className="completion-label">
                        <span className={isCompleted ? 'status-done' : 'status-pending'}>
                            {isCompleted ? 'Feito' : 'Feito?'}
                        </span>
                        {showUndo && (
                            <span className="undo-countdown">
                                {undoTimeLeft}s
                            </span>
                        )}
                    </div>
                    <div className="completion-actions">
                        <button
                            className={`session-checkbox-btn ${isCompleted ? 'checked' : ''}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleToggleComplete();
                            }}
                            disabled={isCompleted && !showUndo}
                            title={isCompleted ? "Feito" : "Marcar como feito"}
                        >
                            {isCompleted && <Check size={18} strokeWidth={3} />}
                        </button>
                        {showUndo && (
                            <button
                                className="undo-chip"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleComplete();
                                }}
                            >
                                Desfazer
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Expansible Content */}
            {isActive && (
                <div className="session-accordion-content fade-in">
                    <div className="session-exercise-main" style={{ flexDirection: 'column', padding: '0 1rem 0.75rem' }}>

                        {/* Imagem Completa e Bem Visível (Hero Image) */}
                        <div className="session-exercise-hero-image" style={{ width: '100%', borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: '1.25rem', backgroundColor: '#eef2f7', border: '1px solid #dbe3ee', display: 'flex', justifyContent: 'center' }}>
                            {safeImage ? (
                                <img src={safeImage} alt={safeName} style={{ width: '100%', maxHeight: '350px', objectFit: 'contain' }} />
                            ) : (
                                <div className="session-avatar-placeholder" style={{ padding: '3rem' }}>
                                    <Target size={40} color="var(--color-primary)" opacity={0.5} />
                                </div>
                            )}
                        </div>

                        {/* ── Stats Cards: Séries / Reps / Descanso ── */}
                        <div className="session-stats-grid">
                            <div className="session-stat-card session-stat-sets">
                                <Layers size={14} className="session-stat-icon" />
                                <span className="session-stat-number">{workoutExercise.sets || '--'}</span>
                                <span className="session-stat-label">Séries</span>
                            </div>

                            <div className="session-stat-card session-stat-reps">
                                <Repeat size={14} className="session-stat-icon" />
                                <span className="session-stat-number">{workoutExercise.reps || '--'}</span>
                                <span className="session-stat-label">Reps</span>
                            </div>

                            <div className="session-stat-card session-stat-rest">
                                <Timer size={14} className="session-stat-icon" />
                                <span className="session-stat-number">{formatRestTime(workoutExercise.rest_seconds)}</span>
                                <span className="session-stat-label">Descanso</span>
                            </div>
                        </div>

                        {/* ── Muscle / Equipment badges ── */}
                        <div className="session-exercise-meta">
                            {safeMuscle && (
                                <span className="session-meta-badge">
                                    <Target size={13} />
                                    {safeMuscle}
                                </span>
                            )}
                            {safeEquipment && (
                                <span className="session-meta-badge">
                                    <Dumbbell size={13} />
                                    {safeEquipment}
                                </span>
                            )}
                            {workoutExercise.weight && (
                                <span className="session-meta-badge">
                                    <Dumbbell size={13} />
                                    {workoutExercise.weight}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Detalhes de Texto */}
                    <div className="session-exercise-details">
                        {safeNotes && (
                            <div className="session-detail-section">
                                <strong><StickyNote size={14} className="inline mr-1" /> Notas:</strong>
                                <p>{safeNotes}</p>
                            </div>
                        )}

                        {safeTags.length > 0 && (
                            <div className="session-detail-section">
                                <strong><Tags size={14} className="inline mr-1" /> Tags:</strong>
                                <div className="session-detail-tags-row">
                                    {safeTags.map((tag) => (
                                        <span key={tag} className="session-detail-tag">{tag}</span>
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
                                <div className="session-detail-section">
                                    <strong><ClipboardList size={14} className="inline mr-1" /> Instruções:</strong>
                                    <ul>
                                        {list.map((instruction, idx) => (
                                            <li key={idx}>{instruction}</li>
                                        ))}
                                    </ul>
                                </div>
                            );
                        })()}

                        <div className="session-exercise-actions">
                            {safeVideo && (
                                <a
                                    href={safeVideo}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="session-video-link"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <Play size={16} />
                                    Assistir vídeo demonstrativo
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SessionExerciseItem;
