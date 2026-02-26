import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Activity, Clock, Flame, Dumbbell, Calendar, ChevronDown,
    Check, Timer, TrendingUp, Zap, Play, CircleDot
} from 'lucide-react';
import { supabaseHelpers } from '../lib/supabase';
import Modal from './Modal';
import './ActivityHistory.css';

// ==========================================
// Helpers de formatação
// ==========================================
const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: '2-digit',
        weekday: 'short'
    });
};

const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
    });
};

const formatDuration = (startStr, endStr) => {
    if (!startStr || !endStr) return null;
    const start = new Date(startStr);
    const end = new Date(endStr);
    const diffMs = end - start;
    const diffMinutes = Math.round(diffMs / 60000);
    if (diffMinutes < 60) return `${diffMinutes}min`;
    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    return `${hours}h${mins > 0 ? ` ${mins}min` : ''}`;
};

const getRelativeDate = (dateStr) => {
    if (!dateStr) return 'Sem data';
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());

    if (dateOnly.getTime() === todayOnly.getTime()) return 'Hoje';
    if (dateOnly.getTime() === yesterdayOnly.getTime()) return 'Ontem';
    return formatDate(dateStr);
};

const STATUS_LABELS = {
    'atribuido': 'Atribuído',
    'em_andamento': 'Em Andamento',
    'concluido': 'Concluído',
    'ativo': 'Ativo'
};

const STATUS_ICONS = {
    'atribuido': CircleDot,
    'em_andamento': Play,
    'concluido': Check
};

// ==========================================
// Sub-componente: Exercícios da sessão
// ==========================================
const SessionExercises = ({ exercises }) => {
    if (!exercises || exercises.length === 0) {
        return (
            <div className="exercises-loading">
                <span>Nenhum exercício registrado nesta sessão.</span>
            </div>
        );
    }

    // Agrupar por exercício (pode ter múltiplas séries)
    const grouped = {};
    exercises.forEach(ex => {
        const key = ex.exercise_id;
        if (!grouped[key]) {
            grouped[key] = {
                exercise: ex.b_exercises,
                sets: [],
                last_created_at: ex.created_at
            };
        }
        grouped[key].sets.push(ex);
        // Pega sempre a data/hora do log mais recente desse exercício
        if (new Date(ex.created_at) > new Date(grouped[key].last_created_at)) {
            grouped[key].last_created_at = ex.created_at;
        }
    });

    return (
        <div className="session-exercises-panel">
            {Object.values(grouped).map((group, idx) => (
                <div key={idx} className="exercise-log-item">
                    {group.exercise?.image_url ? (
                        <img
                            src={group.exercise.image_url}
                            alt={group.exercise?.name}
                            className="exercise-log-img"
                            onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = '';
                                e.target.style.display = 'none';
                            }}
                        />
                    ) : (
                        <div className="exercise-log-img" style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <Dumbbell size={16} color="var(--color-subtext-light)" />
                        </div>
                    )}
                    <div className="exercise-log-info">
                        <div className="exercise-log-name">
                            {group.exercise?.name || 'Exercício'}
                            {group.last_created_at && (
                                <span className="exercise-log-time" style={{ display: 'block', fontSize: '0.7rem', color: 'var(--color-subtext-light)', marginTop: '0.25rem' }}>
                                    <Clock size={10} style={{ display: 'inline', marginRight: '4px' }} />
                                    {formatDate(group.last_created_at)} às {formatTime(group.last_created_at)}
                                </span>
                            )}
                        </div>
                        <div className="exercise-log-details">
                            {group.exercise?.muscle_group && (
                                <span className="exercise-log-detail-tag">
                                    {group.exercise.muscle_group}
                                </span>
                            )}
                            {group.exercise?.equipment && (
                                <span className="exercise-log-detail-tag">
                                    {group.exercise.equipment}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

// ==========================================
// Componente Principal
// ==========================================
const ActivityHistory = ({ isOpen, onClose, userId: propUserId, isPage = false }) => {
    const [loading, setLoading] = useState(true);
    const [sessions, setSessions] = useState([]);
    const [plans, setPlans] = useState([]);
    const [activeTab, setActiveTab] = useState('sessoes');
    const [expandedSession, setExpandedSession] = useState(null);
    const [currentUserId, setCurrentUserId] = useState(propUserId);

    useEffect(() => {
        const resolveUser = async () => {
            if (propUserId) {
                setCurrentUserId(propUserId);
            } else {
                const user = await supabaseHelpers.getCurrentUser();
                if (user) setCurrentUserId(user.id);
            }
        };
        resolveUser();
    }, [propUserId]);


    const fetchHistory = useCallback(async () => {
        if (!currentUserId) return;
        try {
            setLoading(true);
            const { sessions: s, plans: p } = await supabaseHelpers.getUserActivityHistory(currentUserId);
            setSessions(s);
            setPlans(p);
        } catch (error) {
            console.error('Error loading activity history:', error);
        } finally {
            setLoading(false);
        }
    }, [currentUserId]);

    useEffect(() => {
        if ((isOpen || isPage) && currentUserId) {
            fetchHistory();
        }
    }, [isOpen, isPage, currentUserId, fetchHistory]);

    // Extrair e achatar todos os exercícios de todas as sessões
    const processedExercises = useMemo(() => {
        const allLogs = [];
        sessions.forEach(session => {
            const logs = session.b_session_logs || [];
            if (logs.length === 0) return;

            // Agrupar os logs da mesma sessão por exercício para não repetir 1 registro pra cada série
            const groupedByEx = {};
            logs.forEach(log => {
                const exId = log.exercise_id;
                if (!groupedByEx[exId]) {
                    groupedByEx[exId] = {
                        ...log,
                        sets_count: 1,
                        session_ref: {
                            id: session.id,
                            workout_title: session.b_workouts?.title || 'Treino sem título',
                        }
                    };
                } else {
                    groupedByEx[exId].sets_count += 1;
                    // Retém a data do log mais recente para o exercício
                    if (new Date(log.created_at) > new Date(groupedByEx[exId].created_at)) {
                        groupedByEx[exId].created_at = log.created_at;
                    }
                }
            });
            allLogs.push(...Object.values(groupedByEx));
        });

        // Ordenar do mais recente pro mais antigo
        return allLogs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }, [sessions]);

    // Stats computados mantêm compatibilidade para a base da dashboard
    const totalSessions = sessions.length;
    const completedSessions = sessions.filter(s => s.ended_at).length;
    const totalCalories = sessions.reduce((sum, s) => sum + (s.calories_burned || 0), 0);

    // Agrupar logs/planos por data
    const groupByDate = (items, type = 'plan') => {
        const groups = {};
        items.forEach(item => {
            let key;
            if (type === 'exercise') {
                key = getRelativeDate(item.created_at);
            } else {
                key = getRelativeDate(item.created_at); // For plans
            }
            if (!groups[key]) groups[key] = [];
            groups[key].push(item);
        });
        return groups;
    };

    // Agrupar a nova lista achatada de exercícios
    const exerciseGroups = groupByDate(processedExercises, 'exercise');
    const planGroups = groupByDate(plans, 'plan');

    const toggleExpand = (id) => {
        setExpandedSession(prev => prev === id ? null : id);
    };

    const renderExerciseCard = (log) => {
        const exercise = log.b_exercises;

        return (
            <div key={log.id} className="activity-exercise-card">
                <div className="exercise-card-grid">
                    <div className="exercise-col-photo">
                        {exercise?.image_url ? (
                            <img
                                src={exercise.image_url}
                                alt={exercise?.name}
                                className="exercise-card-img"
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = '';
                                    e.target.style.display = 'none';
                                }}
                            />
                        ) : (
                            <div className="exercise-card-icon-placeholder">
                                <Dumbbell size={20} color="var(--color-primary)" />
                            </div>
                        )}
                    </div>

                    <div className="exercise-col-details">
                        <h4 className="exercise-card-name">{exercise?.name || 'Exercício'}</h4>
                        <div className="exercise-card-session-text">
                            {log.session_ref ? log.session_ref.workout_title : 'Treino Avulso'}
                        </div>
                    </div>

                    <div className="exercise-col-meta">
                        {exercise?.muscle_group && (
                            <span className="exercise-detail-tag">
                                {exercise.muscle_group}
                            </span>
                        )}
                        <span className="exercise-card-time">
                            <Clock size={12} style={{ color: "var(--color-primary)" }} />
                            {formatTime(log.created_at)}
                        </span>
                    </div>
                </div>
            </div>
        );
    };

    const renderPlanCard = (plan) => {
        const workout = plan.b_workouts;
        const statusClass = `status-${plan.status}`;

        return (
            <div key={plan.id} className="activity-session-card">
                <div className="plan-card-column">
                    <h4 className="plan-card-title">
                        {workout?.title || 'Plano sem título'}
                    </h4>

                    <div className="plan-card-dates">
                        <span className="session-meta-item">
                            Selecionado em: {formatDate(plan.created_at)}
                        </span>
                        {plan.started_at && (
                            <span className="session-meta-item">
                                Iniciado em: {formatDate(plan.started_at)}
                            </span>
                        )}
                        {plan.ended_at && (
                            <span className="session-meta-item">
                                Finalizado em: {formatDate(plan.ended_at)}
                            </span>
                        )}
                    </div>

                    <span className={`session-status-badge ${statusClass} plan-card-status`}>
                        {STATUS_LABELS[plan.status] || plan.status}
                    </span>

                    {plan.notes && (
                        <div className="session-day-name" style={{ marginTop: '0.2rem', fontStyle: 'italic', fontSize: '0.8rem' }}>
                            "{plan.notes}"
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const currentItems = activeTab === 'sessoes' ? exerciseGroups : planGroups;
    const hasItems = activeTab === 'sessoes' ? processedExercises.length > 0 : plans.length > 0;

    const Content = (
        <div className={`activity-history ${isPage ? 'is-page-view' : ''}`}>
            {/* Stats Bar */}
            <div className="activity-stats-bar">
                <div className="activity-stat-card stat-card-blue">
                    <div className="stat-icon-wrapper">
                        <Activity size={20} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{totalSessions}</span>
                        <span className="stat-label">Sessões</span>
                    </div>
                </div>
                <div className="activity-stat-card stat-card-green">
                    <div className="stat-icon-wrapper">
                        <TrendingUp size={20} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{completedSessions}</span>
                        <span className="stat-label">Concluídas</span>
                    </div>
                </div>
                <div className="activity-stat-card stat-card-orange">
                    <div className="stat-icon-wrapper">
                        <Flame size={20} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{totalCalories}</span>
                        <span className="stat-label">Calorias</span>
                    </div>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="activity-filter-tabs">
                <button
                    className={`activity-filter-tab ${activeTab === 'sessoes' ? 'active' : ''}`}
                    onClick={() => setActiveTab('sessoes')}
                >
                    <Activity size={14} style={{ marginRight: '0.25rem', verticalAlign: 'middle' }} />
                    Exercícios ({processedExercises.length})
                </button>
                <button
                    className={`activity-filter-tab ${activeTab === 'planos' ? 'active' : ''}`}
                    onClick={() => setActiveTab('planos')}
                >
                    <Calendar size={14} style={{ marginRight: '0.25rem', verticalAlign: 'middle' }} />
                    Planos ({plans.length})
                </button>
            </div>

            {/* Content Body */}
            {loading ? (
                <div className="activity-empty">
                    <div className="exercises-loading">
                        <div className="spinner-small" />
                        <span>Carregando histórico...</span>
                    </div>
                </div>
            ) : !hasItems ? (
                <div className="activity-empty">
                    <div className="activity-empty-icon">
                        <Activity size={28} />
                    </div>
                    <h4>
                        {activeTab === 'sessoes'
                            ? 'Nenhuma sessão registrada'
                            : 'Nenhum plano atribuído'}
                    </h4>
                    <p>
                        {activeTab === 'sessoes'
                            ? 'Comece um treino para registrar suas atividades aqui.'
                            : 'Atribua um plano de treino para acompanhar seu progresso.'}
                    </p>
                </div>
            ) : (
                <div className="activity-timeline">
                    {Object.entries(currentItems).map(([dateLabel, items]) => (
                        <div key={dateLabel} className="activity-date-group">
                            <div className="activity-date-label">{dateLabel}</div>
                            {items.map(item =>
                                activeTab === 'sessoes'
                                    ? renderExerciseCard(item)
                                    : renderPlanCard(item)
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    if (isPage) {
        return Content;
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Histórico de Atividades"
            size="large"
        >
            {Content}
        </Modal>
    );
};

export default ActivityHistory;
