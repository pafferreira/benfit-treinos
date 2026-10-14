import { useEffect, useState } from 'react';
import './ExerciseAnimation.css';

// Animação de execução (v2, etapa 2C): vídeo curto em loop, sem som, com a
// imagem como capa enquanto carrega; ou duas poses (início e fim) alternando.
// Tocar pausa e retoma.
const ExerciseAnimation = ({ videoUrl, frames, poster, alt = '', className = '' }) => {
    const [paused, setPaused] = useState(false);
    const [frame, setFrame] = useState(0);
    const poses = Array.isArray(frames) ? frames.filter(Boolean) : [];
    const usePoses = !videoUrl && poses.length >= 2;

    useEffect(() => {
        if (!usePoses || paused) return undefined;
        const timer = setInterval(() => setFrame(f => (f + 1) % poses.length), 1250);
        return () => clearInterval(timer);
    }, [usePoses, paused, poses.length]);

    if (!videoUrl && !usePoses) return null;

    const toggle = (event) => {
        if (videoUrl) {
            const video = event.currentTarget.querySelector('video');
            if (video) {
                if (video.paused) video.play().catch(() => {});
                else video.pause();
            }
        }
        setPaused(p => !p);
    };

    return (
        <button
            type="button"
            className={`exercise-animation ${className}`}
            onClick={toggle}
            aria-label={paused ? 'Continuar animação' : 'Pausar animação'}
        >
            {videoUrl ? (
                <video src={videoUrl} poster={poster || undefined} autoPlay loop muted playsInline preload="metadata" />
            ) : (
                poses.map((src, i) => (
                    <img key={src} src={src} alt={i === 0 ? alt : ''} className={i === frame ? 'is-visible' : ''} />
                ))
            )}
            {paused && <span className="exercise-animation-paused">Pausado</span>}
        </button>
    );
};

export default ExerciseAnimation;
