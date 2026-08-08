import { useState, useEffect } from 'react';
import { Activity, Clock, Dumbbell } from 'lucide-react';
import { supabaseHelpers } from '../lib/supabase';

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
    const [loading, setLoading] = useState(true);
    const [history, setHistory] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                setLoading(true);
                setError(null);
                const user = await supabaseHelpers.getCurrentUser();
                if (!user) {
                    if (!cancelled) setHistory([]);
                    return;
                }
                const data = await supabaseHelpers.getExerciseHistory(user.id, exerciseId, 10);
                if (!cancelled) setHistory(data);
            } catch (err) {
                console.error('Erro ao carregar histórico do exercício:', err);
                if (!cancelled) setError('Não foi possível carregar o histórico.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        if (exerciseId) load();
        return () => { cancelled = true; };
    }, [exerciseId]);

    if (loading) {
        return <div className="py-8 text-center text-sm text-gray-400">Carregando histórico...</div>;
    }

    if (error) {
        return <div className="py-8 text-center text-sm text-red-500">{error}</div>;
    }

    if (history.length === 0) {
        return (
            <div className="py-10 flex flex-col items-center text-center text-gray-400">
                <Activity size={28} className="mb-2 opacity-50" />
                <p className="text-sm">Você ainda não registrou execuções deste exercício.</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {history.map(session => (
                <div key={session.session_id} className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        {exerciseImageUrl ? (
                            <img src={exerciseImageUrl} alt="" className="w-10 h-10 rounded-lg object-cover border border-gray-200" />
                        ) : (
                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                                <Dumbbell size={18} className="text-gray-400" />
                            </div>
                        )}
                        <div className="min-w-0">
                            <div className="text-sm font-semibold text-gray-800 truncate">
                                {session.workout_title || 'Treino Avulso'}
                                {session.day_name && <span className="text-gray-400 font-normal"> · {session.day_name}</span>}
                            </div>
                            <div className="text-xs text-gray-400 flex items-center gap-1">
                                <Clock size={11} />
                                {getRelativeDate(session.performed_at)} às {formatTime(session.performed_at)}
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {session.sets.map((set, idx) => (
                            <span key={idx} className="px-2 py-1 rounded-lg bg-gray-50 border border-gray-200 text-xs text-gray-600">
                                {set.weight_kg ? `${set.weight_kg}kg` : '–'} × {set.reps_completed}
                            </span>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default ExerciseHistoryTab;
