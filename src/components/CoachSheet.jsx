import { lazy, Suspense, useEffect, useState } from 'react';
import { useCoach } from '../context/coach';
import './CoachSheet.css';

const AICoach = lazy(() => import('../pages/AICoach'));

// Painel do Coach que sobe de baixo, sobre qualquer tela.
// Toque no puxador alterna entre meia altura e quase tela cheia.
const CoachSheet = () => {
    const { isOpen, isMounted, closeCoach } = useCoach();
    const [tall, setTall] = useState(false);

    useEffect(() => {
        if (!isOpen) return undefined;
        const onKey = (e) => {
            if (e.key === 'Escape') closeCoach();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [isOpen, closeCoach]);

    if (!isMounted) return null;

    return (
        <>
            <div
                className={`coach-sheet-overlay ${isOpen ? 'open' : ''}`}
                onClick={closeCoach}
                aria-hidden="true"
            />
            <section
                className={`coach-sheet ${isOpen ? 'open' : ''} ${tall ? 'tall' : ''}`}
                role="dialog"
                aria-modal="true"
                aria-label="Benfit"
                aria-hidden={!isOpen}
            >
                <button
                    type="button"
                    className="coach-sheet-handle"
                    onClick={() => setTall((v) => !v)}
                    aria-label={tall ? 'Reduzir painel' : 'Aumentar painel'}
                >
                    <span />
                </button>
                <div className="coach-sheet-body">
                    <Suspense fallback={<div className="coach-sheet-loading">Abrindo o Benfit...</div>}>
                        <AICoach variant="sheet" />
                    </Suspense>
                </div>
            </section>
        </>
    );
};

export default CoachSheet;
