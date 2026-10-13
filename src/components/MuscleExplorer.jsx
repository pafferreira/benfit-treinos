import { useMemo } from 'react';
import { ChevronRight } from 'lucide-react';
import BodyMap, { MuscleChips } from './BodyMap';
import { MUSCLES, MUSCLE_BY_SLUG, getExerciseMuscles } from '../lib/muscles';
import { exerciseImageUrl } from '../lib/exerciseImage';
import './MuscleExplorer.css';

const ExerciseRow = ({ exercise, onOpen }) => {
    const thumb = exerciseImageUrl(exercise);
    return (
        <button type="button" className="mx-row" onClick={() => onOpen(exercise)}>
            <span className="mx-thumb">
                {thumb && <img src={thumb} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
            </span>
            <span className="mx-row-text">
                <span className="mx-row-name">{exercise.name}</span>
                {exercise.equipment && <span className="mx-row-meta">{exercise.equipment}</span>}
            </span>
            <ChevronRight size={16} />
        </button>
    );
};

// "Explorar por músculo": corpo colorido + chips; tocar num músculo lista os
// exercícios que o trabalham, separando principal e auxiliar.
const MuscleExplorer = ({ exercises, muscleMap, selected, onSelect, onOpenExercise }) => {
    const byMuscle = useMemo(() => {
        const index = {};
        exercises.forEach(ex => {
            getExerciseMuscles(ex, muscleMap).forEach(({ slug, papel }) => {
                if (!index[slug]) index[slug] = { principal: [], secundario: [] };
                index[slug][papel].push(ex);
            });
        });
        return index;
    }, [exercises, muscleMap]);

    const available = MUSCLES.filter(m => byMuscle[m.slug]);
    const muscle = selected ? MUSCLE_BY_SLUG[selected] : null;
    const lists = selected ? byMuscle[selected] || { principal: [], secundario: [] } : null;
    const toggle = (slug) => onSelect(selected === slug ? null : slug);

    return (
        <div className="mx">
            <div className="mx-map-card">
                <p className="mx-hint">Toque num músculo para ver os exercícios</p>
                <BodyMap selected={selected} onSelect={toggle} />
                <MuscleChips muscles={available.map(m => ({ slug: m.slug }))} selected={selected} onSelect={toggle} />
            </div>

            {muscle && (
                <section className="mx-results" style={{ '--muscle-color': muscle.cor }}>
                    <header className="mx-results-header">
                        <span className="mx-results-dot" />
                        <h3>{muscle.nome}</h3>
                        <span className="mx-results-count">
                            {lists.principal.length + lists.secundario.length} exercícios
                        </span>
                    </header>

                    {lists.principal.length > 0 && (
                        <>
                            <h4 className="mx-group-title">Trabalha como músculo principal</h4>
                            {lists.principal.map(ex => <ExerciseRow key={ex.id} exercise={ex} onOpen={onOpenExercise} />)}
                        </>
                    )}
                    {lists.secundario.length > 0 && (
                        <>
                            <h4 className="mx-group-title">Também ajuda (auxiliar)</h4>
                            {lists.secundario.map(ex => <ExerciseRow key={ex.id} exercise={ex} onOpen={onOpenExercise} />)}
                        </>
                    )}
                    {lists.principal.length + lists.secundario.length === 0 && (
                        <p className="mx-empty">Nenhum exercício da busca atual trabalha este músculo.</p>
                    )}
                </section>
            )}
        </div>
    );
};

export default MuscleExplorer;
