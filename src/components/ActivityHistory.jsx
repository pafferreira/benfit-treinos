import React, { useState, useEffect, useCallback } from 'react';
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
        year: 'numeric'
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
const SessionExercises = ({ sessionId }) => {
    const [exercises, setExercises] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchExercises = async () => {
            try {
                setLoading(true);
                const data = await supabaseHelpers.getSessionExercises(sessionId);
                setExercises(data);
            } catch (error) {
                console.error('Error fetching session exercises:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchExercises();
    }, [sessionId]);

    if (loading) {
        return (
            <div className="exercises-loading">
                <div className="spinner-small" />
                <span>Carregando exercícios...</span>
            </div>
        );
    }

    if (exercises.length === 0) {
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
                sets: []
            };
        }
        grouped[key].sets.push(ex);
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
                        </div>
                        <div className="exercise-log-details">
                            <span className="exercise-log-detail-tag">
                                <Zap size={10} />
                                {group.sets.length} {group.sets.length === 1 ? 'série' : 'séries'}
                            </span>
                            {group.exercise?.muscle_group && (
                                <span className="exercise-log-detail-tag">
                                    {group.exercise.muscle_group}
                                </span>
                            )}
                            {group.sets.some(s => s.weight_kg) && (
                                <span className="exercise-log-detail-tag">
                                    {Math.max(...group.sets.map(s => s.weight_kg || 0))}kg
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="exercise-log-check">
                        <Check size={12} />
                    </div>
                </div>
            ))}
        </div>
    );
};

// ==========================================
// Componente Principal
// ==========================================
const ActivityHistory = ({ isOpen, onClose, userId }) => {
    const [loading, setLoading] = useState(true);
    const [sessions, setSessions] = useState([]);
    const [plans, setPlans] = useState([]);
    const [activeTab, setActiveTab] = useState('sessoes');
    const [expandedSession, setExpandedSession] = useState(null);

    const fetchHistory = useCallback(async () => {
        if (!userId) return;
        try {
            setLoading(true);
            const { sessions: s, plans: p } = await supabaseHelpers.getUserActivityHistory(userId);
            setSessions(s);
            setPlans(p);
        } catch (error) {
            console.error('Error loading activity history:', error);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        if (isOpen && userId) {
            fetchHistory();
        }
    }, [isOpen, userId, fetchHistory]);

    // Stats computados
    const totalSessions = sessions.length;
    const completedSessions = sessions.filter(s => s.ended_at).length;
    const totalCalories = sessions.reduce((sum, s) => sum + (s.calories_burned || 0), 0);

    // Agrupar sessões por data
    const groupByDate = (items, dateField) => {
        const groups = {};
        items.forEach(item => {
            const key = getRelativeDate(item[dateField]);
            if (!groups[key]) groups[key] = [];
            groups[key].push(item);
        });
        return groups;
    };

    const sessionGroups = groupByDate(sessions, 'started_at');
    const planGroups = groupByDate(plans, 'created_at');

    const toggleExpand = (id) => {
        setExpandedSession(prev => prev === id ? null : id);
    };

    const renderSessionCard = (session) => {
        const isExpanded = expandedSession === session.id;
        const workout = session.b_workouts;
        const day = session.b_workout_days;
        const duration = formatDuration(session.started_at, session.ended_at);
        const isActive = !session.ended_at;

        return (
            <div
                key={session.id}
                className={`activity-session-card ${isExpanded ? 'expanded' : ''}`}
            >
                <div className="session-card-rows">
                    {/* Linha 1: Nome do Plano */}
                    <div className="session-row-plan">
                        {session.plans?.b_workouts?.title ? `Plano: ${session.plans.b_workouts.title}` : 'Treino Avulso'}
                    </div>

                    {/* Linha 2: Nome do Treino */}
                    <div className="session-row-workout">
                        {workout?.title || 'Treino sem título'}
                    </div>

                    {/* Linha 3: Detalhes */}
                    <div className="session-row-details">
                        <span className="detail-item">
                            <Calendar size={11} />
                            {formatDate(session.started_at)}
                        </span>
                        {duration && (
                            <span className="detail-item">
                                <Clock size={11} />
                                {duration}
                            </span>
                        )}
                        {session.calories_burned > 0 && (
                            <span className="detail-item">
                                <Flame size={11} />
                                {session.calories_burned} kcal
                            </span>
                        )}
                    </div>

                    {/* Linha 4: Botão de Status e Ação */}
                    <div className="session-row-action">
                        <span className={`session-status-badge ${isActive ? 'status-em_andamento' : 'status-concluido'}`}>
                            {isActive ? 'Em Andamento' : 'Concluído'}
                        </span>

                        <button
                            className="session-view-exercises-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleExpand(session.id);
                            }}
                        >
                            Ver Exercícios
                            <ChevronDown size={14} className={`chevron-icon ${isExpanded ? 'rotated' : ''}`} />
                        </button>
                    </div>
                </div>

                {isExpanded && (
                    <SessionExercises sessionId={session.id} />
                )}
            </div>
        );
    };

    const renderPlanCard = (plan) => {
        const workout = plan.b_workouts;
        const statusClass = `status-${plan.status}`;

        return (
            <div key={plan.id} className="activity-session-card">
                <div className="session-card-header">
                    <div className="session-card-info">
                        <h4 className="session-workout-title">
                            {workout?.title || 'Plano'}
                        </h4>
                        <div className="session-card-meta">
                            <span className="session-meta-item">
                                <Calendar size={12} />
                                Atribuído em {formatDate(plan.created_at)}
                            </span>
                            {plan.started_at && (
                                <span className="session-meta-item">
                                    <Play size={12} />
                                    Iniciado em {formatDate(plan.started_at)}
                                </span>
                            )}
                            {plan.ended_at && (
                                <span className="session-meta-item">
                                    <Check size={12} />
                                    Finalizado em {formatDate(plan.ended_at)}
                                </span>
                            )}
                        </div>
                        {plan.notes && (
                            <div className="session-day-name" style={{ marginTop: '0.35rem', fontStyle: 'italic' }}>
                                "{plan.notes}"
                            </div>
                        )}
                    </div>
                    <span className={`session-status-badge ${statusClass}`}>
                        {STATUS_LABELS[plan.status] || plan.status}
                    </span>
                </div>
            </div>
        );
    };

    const currentItems = activeTab === 'sessoes' ? sessionGroups : planGroups;
    const hasItems = activeTab === 'sessoes' ? sessions.length > 0 : plans.length > 0;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Histórico de Atividades"
            size="large"
        >
            <div className="activity-history">
                {/* Stats Bar */}
                <div className="activity-stats-bar">
                    <div className="activity-stat-card">
                        <div className="stat-icon">
                            <Activity size={16} />
                        </div>
                        <span className="stat-value">{totalSessions}</span>
                        <span className="stat-label">Sessões</span>
                    </div>
                    <div className="activity-stat-card">
                        <div className="stat-icon">
                            <TrendingUp size={16} />
                        </div>
                        <span className="stat-value">{completedSessions}</span>
                        <span className="stat-label">Concluídas</span>
                    </div>
                    <div className="activity-stat-card">
                        <div className="stat-icon">
                            <Flame size={16} />
                        </div>
                        <span className="stat-value">{totalCalories}</span>
                        <span className="stat-label">Calorias</span>
                    </div>
                </div>

                {/* Filter Tabs */}
                <div className="activity-filter-tabs">
                    <button
                        className={`activity-filter-tab ${activeTab === 'sessoes' ? 'active' : ''}`}
                        onClick={() => setActiveTab('sessoes')}
                    >
                        <Activity size={14} style={{ marginRight: '0.25rem', verticalAlign: 'middle' }} />
                        Sessões ({sessions.length})
                    </button>
                    <button
                        className={`activity-filter-tab ${activeTab === 'planos' ? 'active' : ''}`}
                        onClick={() => setActiveTab('planos')}
                    >
                        <Calendar size={14} style={{ marginRight: '0.25rem', verticalAlign: 'middle' }} />
                        Planos ({plans.length})
                    </button>
                </div>

                {/* Content */}
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
                                        ? renderSessionCard(item)
                                        : renderPlanCard(item)
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default ActivityHistory;
