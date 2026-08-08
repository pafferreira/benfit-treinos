import { useState, useEffect } from 'react';
import { Layers, ListChecks } from 'lucide-react';
import { supabaseHelpers } from '../lib/supabase';

const DIFFICULTY_COLOR = {
    'Iniciante': { bg: 'rgba(34,197,94,0.12)', text: '#15803d' },
    'Intermediário': { bg: 'rgba(234,179,8,0.12)', text: '#a16207' },
    'Avançado': { bg: 'rgba(239,68,68,0.12)', text: '#b91c1c' },
};

const ExerciseUsageTab = ({ exerciseId }) => {
    const [loading, setLoading] = useState(true);
    const [usage, setUsage] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await supabaseHelpers.getExerciseUsage(exerciseId);
                if (!cancelled) setUsage(data);
            } catch (err) {
                console.error('Erro ao carregar planos do exercício:', err);
                if (!cancelled) setError('Não foi possível carregar os planos.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        if (exerciseId) load();
        return () => { cancelled = true; };
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
                <Layers size={28} className="mb-2 opacity-50" />
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
                            <h4 className="font-semibold text-gray-800">{plan.workout_title}</h4>
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
                            {plan.days.map(day => (
                                <div key={day.id} className="flex items-center gap-2 text-sm text-gray-600">
                                    <ListChecks size={14} className="text-blue-400 shrink-0" />
                                    <span className="font-medium">{day.day_name || `Dia ${day.day_number}`}</span>
                                    <span className="text-gray-400">
                                        {day.sets}x{day.reps}{day.rest_seconds ? ` · ${day.rest_seconds}s descanso` : ''}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default ExerciseUsageTab;
