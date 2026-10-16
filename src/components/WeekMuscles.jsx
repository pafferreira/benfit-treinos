import { useEffect, useMemo, useState } from 'react';
import { supabaseHelpers } from '../lib/supabase';
import { useExerciseMuscleMap } from '../hooks/useSupabase';
import { summarizeMuscles, missingRegions } from '../lib/muscles';
import BodyMap, { MuscleChips } from './BodyMap';
import './WeekMuscles.css';

const PERIODS = [7, 15, 30];

// Músculos trabalhados nos últimos 7, 15 ou 30 dias, a partir dos exercícios registrados.
// Cada exercício conta uma vez por sessão (principal = 1, auxiliar = 0,5).
const WeekMuscles = ({ userId, onSummary }) => {
    const muscleMap = useExerciseMuscleMap();
    const [days, setDays] = useState(7);
    const [data, setData] = useState(null); // { period, exercises, sessions, days }

    useEffect(() => {
        if (!userId) return;
        let alive = true;
        supabaseHelpers.getRecentTrainedExercises(userId, days)
            .then(res => { if (alive) setData({ ...res, period: days }); })
            .catch(err => {
                console.error('Erro ao carregar músculos trabalhados:', err);
                if (alive) setData({ period: days, exercises: [], sessions: 0, days: 0 });
            });
        return () => { alive = false; };
    }, [userId, days]);

    // Ao trocar o período, mantém o resultado anterior (esmaecido) até chegar o novo.
    const refreshing = !!data && data.period !== days;

    const summary = useMemo(
        () => (data ? summarizeMuscles(data.exercises, muscleMap) : []),
        [data, muscleMap]
    );
    const missing = useMemo(() => missingRegions(summary), [summary]);

    useEffect(() => {
        if (data && onSummary) onSummary({ summary, missing, trainedDays: data.days, days: data.period });
    }, [data, summary, missing, onSummary]);

    if (!data) {
        return (
            <section className="week-muscles" aria-busy="true" aria-label="Carregando músculos da semana">
                <div className="week-muscles-head">
                    <span className="week-muscles-skel week-muscles-skel--title" />
                    <span className="week-muscles-skel week-muscles-skel--sub" />
                </div>
                <div className="week-muscles-body">
                    <span className="week-muscles-skel week-muscles-skel--map" />
                    <div className="week-muscles-side">
                        <span className="week-muscles-skel week-muscles-skel--chips" />
                        <span className="week-muscles-skel week-muscles-skel--chips" />
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className={`week-muscles ${refreshing ? 'is-refreshing' : ''}`} aria-busy={refreshing}>
            <header className="week-muscles-head">
                <div>
                    <h2 className="week-muscles-title">Músculos trabalhados</h2>
                    <span className="week-muscles-sub">
                        Últimos {data.period} dias · Treinou: {data.days} {data.days === 1 ? 'dia' : 'dias'}
                    </span>
                </div>
                <div className="week-muscles-periods" role="group" aria-label="Período">
                    {PERIODS.map(p => (
                        <button
                            key={p}
                            type="button"
                            className={`week-muscles-period ${days === p ? 'is-active' : ''}`}
                            aria-pressed={days === p}
                            onClick={() => setDays(p)}
                        >
                            {p} dias
                        </button>
                    ))}
                </div>
            </header>

            {summary.length === 0 ? (
                <p className="week-muscles-empty">Nenhum exercício registrado nos últimos {data.period} dias.</p>
            ) : (
                <div className="week-muscles-body">
                    <BodyMap
                        compact
                        muscles={summary.map(m => ({ slug: m.slug, papel: m.pct >= 15 ? 'principal' : 'secundario' }))}
                    />
                    <div className="week-muscles-side">
                        <MuscleChips muscles={summary.map(m => ({ slug: m.slug, pct: m.pct }))} />
                        {missing.length > 0 && (
                            <p className="week-muscles-missing">
                                <strong>Sem treino no período:</strong> {missing.map(r => r.nome).join(', ')}.
                            </p>
                        )}
                    </div>
                </div>
            )}
        </section>
    );
};

export default WeekMuscles;
