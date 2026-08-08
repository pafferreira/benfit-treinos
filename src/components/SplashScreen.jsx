import { useEffect, useState } from 'react';
import './SplashScreen.css';

const SPLASH_SESSION_KEY = 'benfit_splash_shown';
// halter-spin.webm/mp4 tem 2300ms — a splash fica visível esse tanto + folga
// antes do fade, pra dar tempo do giro do halter terminar.
const SPLASH_DURATION = 2800;
const FADE_DURATION = 300;

// Fonte do halter animado.
//
// Vídeo de verdade (Halter_Spin_02.mp4, 2,7 MB original é pesado demais pra
// primeira tela). public/halter-spin.webm (~120 KB) e public/halter-spin.mp4
// (~83 KB, fallback Safari) são gerados a partir dele via ffmpeg: recorte de
// 1.4s–3.7s (só o trecho já com o ícone bem enquadrado, antes da transição
// pro halter 3D realista mais adiante no vídeo original), crop central
// quadrado 720×720 + scale pra 336×336, sem áudio.
const USE_VIDEO = true;

const prefersReducedMotion = () =>
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const SplashScreen = () => {
    const [visible, setVisible] = useState(() => {
        if (typeof window === 'undefined') return false;
        return !sessionStorage.getItem(SPLASH_SESSION_KEY);
    });
    const [fadingOut, setFadingOut] = useState(false);
    const reduceMotion = prefersReducedMotion();

    useEffect(() => {
        if (!visible) return;
        sessionStorage.setItem(SPLASH_SESSION_KEY, '1');

        const fadeTimer = setTimeout(() => setFadingOut(true), SPLASH_DURATION);
        const removeTimer = setTimeout(() => setVisible(false), SPLASH_DURATION + FADE_DURATION);

        return () => {
            clearTimeout(fadeTimer);
            clearTimeout(removeTimer);
        };
    }, [visible]);

    // Replay sob demanda (clique na versão no rodapé) — ignora o "só uma vez
    // por sessão" e roda a mesma animação de novo.
    useEffect(() => {
        const handleReplay = () => {
            setFadingOut(false);
            setVisible(true);
        };
        window.addEventListener('splash-replay', handleReplay);
        return () => window.removeEventListener('splash-replay', handleReplay);
    }, []);

    if (!visible) return null;

    return (
        <div
            className={`splash-screen ${fadingOut ? 'splash-fade-out' : ''}`}
            role="presentation"
            aria-hidden="true"
        >
            <div className="splash-stage">
                <span className="splash-glow" />
                {/* O vídeo já gira sozinho — o balanço 3D em CSS (splash-media--animated)
                    é só pro fallback estático, senão dobra o movimento. */}
                <div className={`splash-media ${(reduceMotion || USE_VIDEO) ? '' : 'splash-media--animated'}`}>
                    {USE_VIDEO && !reduceMotion ? (
                        <video
                            className="splash-video"
                            poster="/splash/icon-256.png"
                            autoPlay
                            muted
                            loop
                            playsInline
                        >
                            <source src="/splash/halter-spin.webm" type="video/webm" />
                            <source src="/splash/halter-spin.mp4" type="video/mp4" />
                        </video>
                    ) : (
                        <img
                            className="splash-image"
                            src="/splash/icon-256.png"
                            alt=""
                            width={256}
                            height={256}
                            decoding="async"
                        />
                    )}
                </div>
            </div>

            <div className="splash-logo">
                <span className="splash-logo-text">
                    BEN<span className="splash-highlight">FIT</span>
                </span>
                <span className="splash-logo-subtitle">Treinos</span>
            </div>
        </div>
    );
};

export default SplashScreen;
