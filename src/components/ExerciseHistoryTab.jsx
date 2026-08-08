import { useState, useEffect } from 'react';
import { Activity, Clock, Dumbbell } from 'lucide-react';
import { supabaseHelpers } from '../lib/supabase';
import { cacheGet, swr } from '../lib/dataCache';
import './ActivityHistory.css';

// Mesmos helpers de formatação de data usados no Histórico de Atividades
// (ActivityHistory.jsx), pra manter o texto igual ("Hoje", "Ontem"...).
const formatTime = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
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
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit', weekday: 'short' });
};

const ExerciseHistoryTab = ({ exerciseId, exerciseImageUrl }) => {
    const cacheKey = `exercise-history:${exerciseId}`;
    const cached = cacheGet(cacheKey)?.value || null;

    const [loading, setLoading] = useState(!cached);
    const [history, setHistory] = useState(cached || []);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!exerciseId) return;
        let cancelled = false;

        const fetcher = async () => {
            const user = await supabaseHelpers.getCurrentUser();
            if (!user) return [];
            return supabaseHelpers.getExerciseHistory(user.id, exerciseId, 10);
        };

        swr(cacheKey, fetcher, {
            onData: (data) => {
                if (cancelled) return;
                setHistory(data);
                setError(null);
                setLoading(false);
            },
        }).catch((err) => {
            if (cancelled) return;
            console.error('Erro ao carregar histórico do exercício:', err);
            setError('Não foi possível carregar o histórico.');
            setLoading(false);
        });

        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [exerciseId]);

    // Agrupa por data relativa (Hoje/Ontem/data), igual ActivityHistory
    const groups = {};
    history.forEach((session) => {
        const key = getRelativeDate(session.performed_at);
        if (!groups[key]) groups[key] = [];
        groups[key].push(session);
    });

    if (loading) {
        return (
            <div className="exercises-loading">
                <div className="spinner-small" />
                <span>Carregando histórico...</span>
            </div>
        );
    }

    if (error) {
        return <div className="py-8 text-center text-sm text-red-500">{error}</div>;
    }

    if (history.length === 0) {
        return (
            <div className="activity-empty">
                <div className="activity-empty-icon">
                    <Activity size={28} />
                </div>
                <h4>Nenhuma execução registrada</h4>
                <p>Você ainda não registrou execuções deste exercício.</p>
            </div>
        );
    }

    return (
        <div className="activity-timeline">
            {Object.entries(groups).map(([dateLabel, sessions]) => (
                <div key={dateLabel} className="activity-date-group">
                    <div className="activity-date-label">{dateLabel}</div>
                    {sessions.map((session) => {
                        const maxWeight = Math.max(0, ...session.sets.map((s) => s.weight_kg || 0));
                        return (
                            <div key={session.session_id} className="activity-exercise-card">
                                <div className="exercise-card-grid">
                                    <div className="exercise-col-photo">
                                        {exerciseImageUrl ? (
                                            <img
                                                src={exerciseImageUrl}
                                                alt=""
                                                className="exercise-card-img"
                                                onError={(e) => { e.target.style.display = 'none'; }}
                                            />
                                        ) : (
                                            <div className="exercise-card-icon-placeholder">
                                                <Dumbbell size={20} color="var(--color-primary)" />
                                            </div>
                                        )}
                                    </div>

                                    <div className="exercise-col-details">
                                        <h4 className="exercise-card-name">
                                            {session.workout_title || 'Treino Avulso'}
                                        </h4>
                                        {session.day_name && (
                                            <div className="exercise-card-session-text">{session.day_name}</div>
                                        )}
                                    </div>

                                    <div className="exercise-col-meta">
                                        {maxWeight > 0 && (
                                            <span className="exercise-detail-tag">{maxWeight}kg</span>
                                        )}
                                        <span className="exercise-card-time">
                                            <Clock size={12} style={{ color: 'var(--color-primary)' }} />
                                            {formatTime(session.performed_at)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
    );
};

export default ExerciseHistoryTab;
