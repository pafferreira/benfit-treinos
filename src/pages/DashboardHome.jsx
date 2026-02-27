import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Bot, Dumbbell, Flame, TrendingUp, Activity,
    ChevronRight, Calendar, Clock, Sparkles, Zap
} from 'lucide-react';
import { supabase, supabaseHelpers } from '../lib/supabase';
import './DashboardHome.css';

// Saudação dinâmica baseada no horário
const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 6) return 'Boa madrugada';
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
};

// Status labels
const STATUS_CONFIG = {
    'atribuido': { label: 'Atribuído', className: 'status-atribuido' },
    'em_andamento': { label: 'Em Andamento', className: 'status-em-andamento' },
    'concluido': { label: 'Concluído', className: 'status-concluido' }
};

const FEELING_MICROCOPY = {
    1: 'Exausto', 2: 'Muito Cansado', 3: 'Cansado', 4: 'Levemente Cansado',
    5: 'Normal', 6: 'Bem', 7: 'Muito Bem',
    8: 'Motivado', 9: 'Incrível', 10: 'Imparável'
};

// Difficulty icons / colors
const DIFFICULTY_COLORS = {
    'Iniciante': '#10B981',
    'Intermediário': '#F59E0B',
    'Avançado': '#EF4444'
};

const DashboardHome = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [plans, setPlans] = useState([]);
    const [stats, setStats] = useState({
        sessionsThisWeek: 0,
        completedThisWeek: 0,
        caloriesThisWeek: 0,
        lastSession: null
    });

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            setLoading(true);

            // Buscar usuário autenticado
            const currentUser = await supabaseHelpers.getCurrentUser();
            if (!currentUser) return;
            setUser(currentUser);

            // Buscar planos ativos e stats em paralelo
            const [activePlans, dashStats] = await Promise.all([
                supabaseHelpers.getUserActivePlans(currentUser.id),
                supabaseHelpers.getDashboardStats(currentUser.id)
            ]);

            setPlans(activePlans || []);
            setStats(dashStats);
        } catch (error) {
            console.error('Error loading dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="dashboard-loading">
                <div className="skeleton-welcome" />
                <div className="skeleton-stats" />
                <div className="skeleton-card" />
                <div className="skeleton-card" />
            </div>
        );
    }

    const firstName = user?.name?.split(' ')[0]
        || user?.full_name?.split(' ')[0]
        || user?.display_name
        || user?.email?.split('@')[0]
        || 'Atleta';

    const getDynamicSubtitle = () => {
        if (plans.length === 0) {
            return (
                <>
                    Comece atribuindo um plano de treino — <a onClick={() => navigate('/treinos')} className="link-choose-plan" style={{ cursor: 'pointer' }}>Escolher um plano</a>
                </>
            );
        }

        if (stats.lastSession?.ended_at) {
            const lastDate = new Date(stats.lastSession.ended_at);
            const today = new Date();
            const lastDateZeroed = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate());
            const todayZeroed = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const diffTime = todayZeroed.getTime() - lastDateZeroed.getTime();
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

            const feelingScore = stats.lastSession.feeling;
            const feelingText = feelingScore ? (FEELING_MICROCOPY[feelingScore] || `nota ${feelingScore}`).toString().toLowerCase() : '';
            const feelingSuffix = feelingText ? ` Seu último treino vc estava se sentindo ${feelingText}.` : '';

            if (diffDays === 0) return "Ótimo trabalho hoje! Descanse e recupere-se bem. 🔋";
            if (diffDays === 1) return `Pronto para o treino de hoje? 🔥${feelingSuffix}`;
            if (diffDays === 2) return `Já descansou? Bora voltar pro treino! 💪${feelingSuffix}`;

            if (feelingText) {
                return `Seu último treino vc estava se sentindo ${feelingText}. Bora voltar à ativa? ⚡`;
            } else {
                return `Faz ${diffDays} dias desde seu último treino. Vamos voltar à ativa? 💪`;
            }
        }

        const dayOfWeek = new Date().getDay();
        if (dayOfWeek === 1) return "Segunda-feira é dia de começar com tudo. Vamos lá? 🚀";
        if (dayOfWeek === 5) return "Que tal um treino para fechar bem a semana? 🎯";
        if (dayOfWeek === 0 || dayOfWeek === 6) return "Fim de semana também é dia de movimento! 🏃‍♂️";

        return Object.keys(plans).length > 0 ? "O momento perfeito para treinar é agora. ⚡" : '';
    };

    return (
        <div className="dashboard-home">
            {/* Welcome Banner */}
            <section className="welcome-banner">
                <div className="welcome-content">
                    <div className="welcome-greeting">
                        <h2 className="welcome-title">{getGreeting()}, {firstName}!</h2>
                        <p className="welcome-subtitle">
                            {getDynamicSubtitle()}
                        </p>
                    </div>
                    <button
                        className="welcome-coach-btn"
                        onClick={() => navigate('/coach')}
                        title="Coach Benfit"
                    >
                        <Bot size={20} />
                    </button>
                </div>
                <div className="welcome-decoration" />
            </section>

            {/* Quick Stats */}
            <section className="quick-stats">
                <div className="quick-stat-item">
                    <div className="qs-icon qs-blue">
                        <Activity size={16} />
                    </div>
                    <div className="qs-info">
                        <span className="qs-value">{stats.sessionsThisWeek}</span>
                        <span className="qs-label">Sessões</span>
                    </div>
                </div>
                <div className="quick-stat-divider" />
                <div className="quick-stat-item">
                    <div className="qs-icon qs-green">
                        <TrendingUp size={16} />
                    </div>
                    <div className="qs-info">
                        <span className="qs-value">{stats.completedThisWeek}</span>
                        <span className="qs-label">Concluídas</span>
                    </div>
                </div>
                <div className="quick-stat-divider" />
                <div className="quick-stat-item">
                    <div className="qs-icon qs-orange">
                        <Flame size={16} />
                    </div>
                    <div className="qs-info">
                        <span className="qs-value">{stats.caloriesThisWeek}</span>
                        <span className="qs-label">kcal</span>
                    </div>
                </div>
            </section>

            {/* Active Plans */}
            <section className="dash-section">
                <div className="dash-section-header">
                    <h3 className="dash-section-title">
                        <Dumbbell size={18} />
                        Planos Ativos
                    </h3>

                </div>

                {plans.length === 0 ? (
                    <div className="dash-empty-state">
                        <div className="dash-empty-icon">
                            <Sparkles size={28} />
                        </div>
                        <h4>Nenhum plano ativo</h4>
                        <p>Vá para Planos e atribua um treino para começar!</p>
                        <button
                            className="btn-primary dash-empty-btn"
                            onClick={() => navigate('/treinos')}
                        >
                            <Dumbbell size={16} />
                            Explorar Planos
                        </button>
                    </div>
                ) : (
                    <div className="dash-plans-list">
                        {plans.map(plan => {
                            const workout = plan.b_workouts;
                            const statusCfg = STATUS_CONFIG[plan.status] || STATUS_CONFIG['atribuido'];
                            const diffColor = DIFFICULTY_COLORS[workout?.difficulty] || '#6B7280';

                            return (
                                <div
                                    key={plan.id}
                                    className="dash-plan-card"
                                    onClick={() => navigate(`/treino/${plan.workout_id}`)}
                                >
                                    {/* Cover image / gradient fallback */}
                                    <div className="dpc-cover">
                                        {workout?.cover_image ? (
                                            <img
                                                src={workout.cover_image}
                                                alt={workout?.title}
                                                onError={(e) => {
                                                    e.target.style.display = 'none';
                                                }}
                                            />
                                        ) : (
                                            <div className="dpc-cover-fallback">
                                                <Dumbbell size={24} />
                                            </div>
                                        )}
                                    </div>

                                    <div className="dpc-info">
                                        <div className="dpc-header">
                                            <h4 className="dpc-title">{workout?.title || 'Treino'}</h4>
                                            <span className={`dpc-status ${statusCfg.className}`}>
                                                {statusCfg.label}
                                            </span>
                                        </div>
                                        <div className="dpc-meta">
                                            {workout?.difficulty && (
                                                <span className="dpc-meta-tag" style={{ color: diffColor }}>
                                                    <Zap size={11} />
                                                    {workout.difficulty}
                                                </span>
                                            )}
                                            {workout?.estimated_duration && (
                                                <span className="dpc-meta-tag">
                                                    <Clock size={11} />
                                                    {workout.estimated_duration} min
                                                </span>
                                            )}
                                            {workout?.days_per_week && (
                                                <span className="dpc-meta-tag">
                                                    <Calendar size={11} />
                                                    {workout.days_per_week}x/sem
                                                </span>
                                            )}
                                        </div>
                                        {plan.started_at && (
                                            <div className="dpc-started">
                                                Iniciado em {new Date(plan.started_at).toLocaleDateString('pt-BR', {
                                                    day: '2-digit', month: 'short'
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    <ChevronRight size={18} className="dpc-arrow" />
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* Motivational tip */}
            <section className="dash-tip">
                <div className="dash-tip-icon">
                    <Sparkles size={16} />
                </div>
                <p className="dash-tip-text">
                    <strong>Dica Benfit:</strong> Consistência supera intensidade.
                    Treine ao menos 3x por semana para resultados duradouros.
                </p>
            </section>
        </div>
    );
};

export default DashboardHome;
