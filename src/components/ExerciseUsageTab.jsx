import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ListChecks, ChevronRight } from 'lucide-react';
import { supabaseHelpers } from '../lib/supabase';
import { cacheGet, swr } from '../lib/dataCache';

const DIFFICULTY_COLOR = {
    'Iniciante': { bg: 'rgba(34,197,94,0.12)', text: '#15803d' },
    'Intermediário': { bg: 'rgba(234,179,8,0.12)', text: '#a16207' },
    'Avançado': { bg: 'rgba(239,68,68,0.12)', text: '#b91c1c' },
};

const ExerciseUsageTab = ({ exerciseId, onNavigate }) => {
    const navigate = useNavigate();
    const cacheKey = `exercise-usage:${exerciseId}`;
    const cached = cacheGet(cacheKey)?.value || null;

    const [loading, setLoading] = useState(!cached);
    const [usage, setUsage] = useState(cached || []);
    const [error, setError] = useState(null);

    const goToDay = (workoutId, dayId) => {
        if (onNavigate) onNavigate();
        navigate(`/treino/${workoutId}/dia/${dayId}`);
    };

    useEffect(() => {
        if (!exerciseId) return;
        let cancelled = false;

        swr(cacheKey, () => supabaseHelpers.getExerciseUsage(exerciseId), {
            onData: (data) => {
                if (cancelled) return;
                setUsage(data);
                setError(null);
                setLoading(false);
            },
        }).catch((err) => {
            if (cancelled) return;
            console.error('Erro ao carregar planos do exercício:', err);
            setError('Não foi possível carregar os planos.');
            setLoading(false);
        });

        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [exerciseId]);

    if (loading) {
        return <div className="py-8 text-center text-sm text-gray-400">Carregando planos...</div>;
    }

    if (error) {
        return <div className="py-8 text-center text-sm text-red-500">{error}</div>;
    }

    if (usage.length === 0) {
        return (
            <div className="py-10 flex flex-col items-center text-center text-gray-400">
                <img src="/Halter_02.png" alt="" className="w-16 h-16 object-contain mb-2 opacity-50" />
                <p className="text-sm">Este exercício ainda não está em nenhum plano.</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {usage.map(plan => {
                const diffStyle = DIFFICULTY_COLOR[plan.difficulty] || DIFFICULTY_COLOR['Intermediário'];
                return (
                    <div key={plan.workout_id} className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm">
                        <div className="flex items-center justify-between gap-2 mb-2">
                            <h4 className="font-semibold text-gray-800 min-w-0 truncate">{plan.workout_title}</h4>
                            {plan.difficulty && (
                                <span
                                    className="px-2 py-0.5 rounded-full text-xs font-semibold shrink-0"
                                    style={{ background: diffStyle.bg, color: diffStyle.text }}
                                >
                                    {plan.difficulty}
                                </span>
                            )}
                        </div>
                        <div className="space-y-1.5">
                            {plan.days.map(day => {
                                const [main] = day.entries;
                                const duplicated = day.entries.length > 1;
                                return (
                                    <button
                                        key={day.id}
                                        type="button"
                                        onClick={() => goToDay(plan.workout_id, day.id)}
                                        className="w-full flex items-center gap-2 text-sm text-gray-600 text-left p-1.5 -mx-1.5 rounded-lg hover:bg-blue-50 hover:text-blue-700 transition-colors group"
                                        title="Ir para este dia no plano"
                                    >
                                        <ListChecks size={14} className="text-blue-400 shrink-0" />
                                        <span className="font-medium min-w-0 truncate">{day.day_name || `Dia ${day.day_number}`}</span>
                                        <span className="text-gray-400 group-hover:text-blue-500 shrink-0 whitespace-nowrap">
                                            {main.sets}x{main.reps}{main.rest_seconds ? ` · ${main.rest_seconds}s descanso` : ''}
                                        </span>
                                        {duplicated && (
                                            <span
                                                className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full shrink-0"
                                                title="Exercício adicionado mais de uma vez neste dia — possível duplicidade nos dados"
                                            >
                                                ×{day.entries.length}
                                            </span>
                                        )}
                                        <ChevronRight size={14} className="ml-auto text-gray-300 group-hover:text-blue-500 shrink-0" />
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default ExerciseUsageTab;
