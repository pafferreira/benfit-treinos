import { useEffect, useMemo, useState } from 'react';
import { supabaseHelpers } from '../lib/supabase';
import { useExerciseMuscleMap } from '../hooks/useSupabase';
import { summarizeMuscles, missingRegions } from '../lib/muscles';
import BodyMap, { MuscleChips } from './BodyMap';
import './WeekMuscles.css';

// Músculos trabalhados nos últimos 7 dias, a partir dos exercícios registrados.
// Cada exercício conta uma vez por sessão (principal = 1, auxiliar = 0,5).
const WeekMuscles = ({ userId, onSummary }) => {
    const muscleMap = useExerciseMuscleMap();
    const [data, setData] = useState(null);

    useEffect(() => {
        if (!userId) return;
        let alive = true;
        supabaseHelpers.getRecentTrainedExercises(userId, 7)
            .then(res => { if (alive) setData(res); })
            .catch(err => {
                console.error('Erro ao carregar músculos da semana:', err);
                if (alive) setData({ exercises: [], sessions: 0 });
            });
        return () => { alive = false; };
    }, [userId]);

    const summary = useMemo(
        () => (data ? summarizeMuscles(data.exercises, muscleMap) : []),
        [data, muscleMap]
    );
    const missing = useMemo(() => missingRegions(summary), [summary]);

    useEffect(() => {
        if (data && onSummary) onSummary({ summary, missing, sessions: data.sessions });
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
        <section className="week-muscles">
            <header className="week-muscles-head">
                <h2 className="week-muscles-title">Músculos da semana</h2>
                <span className="week-muscles-sub">
                    Últimos 7 dias · {data.sessions} {data.sessions === 1 ? 'treino' : 'treinos'}
                </span>
            </header>

            {summary.length === 0 ? (
                <p className="week-muscles-empty">Nenhum exercício registrado nos últimos 7 dias.</p>
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
                                <strong>Sem treino na semana:</strong> {missing.map(r => r.nome).join(', ')}.
                            </p>
                        )}
                    </div>
                </div>
            )}
        </section>
    );
};

export default WeekMuscles;
