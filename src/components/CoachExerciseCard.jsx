import { useMemo } from 'react';
import BodyMap, { MuscleChips } from './BodyMap';
import { getExerciseMuscles } from '../lib/muscles';
import { exerciseImageUrl } from '../lib/exerciseImage';
import './CoachExerciseCard.css';

const plain = (text) => String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

// Cartão do exercício no chat do Coach: quando a resposta cita um exercício
// da base pelo nome, mostra a imagem e os músculos dele logo abaixo do texto.
// Vale para qualquer provedor e para conversas antigas, pois lê só o texto.
const CoachExerciseCard = ({ text, exercises, muscleMap }) => {
    // Nomes mais longos primeiro: "Agachamento Sumô" ganha de "Agachamento".
    const candidates = useMemo(() => (exercises || [])
        .filter(ex => ex?.name && ex.name.length >= 5)
        .map(ex => ({ ex, key: plain(ex.name) }))
        .sort((a, b) => b.key.length - a.key.length), [exercises]);

    const match = useMemo(() => {
        const haystack = plain(text);
        if (!haystack) return null;
        return candidates.find(c => haystack.includes(c.key))?.ex || null;
    }, [candidates, text]);

    if (!match) return null;
    const muscles = getExerciseMuscles(match, muscleMap);
    if (muscles.length === 0) return null;
    const thumb = exerciseImageUrl(match);

    return (
        <div className="coach-exercise-card">
            <div className="coach-exercise-head">
                {thumb && <img src={thumb} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
                <div>
                    <strong>{match.name}</strong>
                    <MuscleChips muscles={muscles} />
                </div>
            </div>
            <BodyMap muscles={muscles} compact />
        </div>
    );
};

export default CoachExerciseCard;
