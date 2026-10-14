import { MUSCLE_BY_SLUG } from '../lib/muscles';
import './BodyMap.css';

// Mapa do corpo (frente e costas) desenhado em SVG fixo: a IA erra anatomia,
// então o desenho é nosso e cada músculo é uma região pintável.
//
// Modos:
// - colorido (padrão): todos os músculos nas cores fixas; `selected` destaca um.
// - foco (`muscles` = [{ slug, papel }]): principal na cor cheia, auxiliar
//   na cor clara e o resto em cinza. Usado no detalhe do exercício e no dia de treino.

const SILHOUETTE = 'M100 58 C118 58 134 60 144 68 C153 75 157 86 158 98 L163 138 L170 188 L174 226 L166 230 L156 190 L148 146 L143 118 L139 160 L136 204 L138 232 L134 300 L130 352 L128 404 L110 406 L107 352 L104 292 L100 252 L96 292 L93 352 L90 406 L72 404 L70 352 L66 300 L62 232 L64 204 L61 160 L57 118 L52 146 L44 190 L34 230 L26 226 L30 188 L37 138 L42 98 C43 86 47 75 56 68 C66 60 82 58 100 58 Z';

const mirror = (shape) => ({ ...shape, cx: 200 - shape.cx, rotate: shape.rotate ? -shape.rotate : 0 });
const pair = (shape) => [shape, mirror(shape)];

const FRONT = [
    ...pair({ slug: 'ombros', cx: 56, cy: 82, rx: 12, ry: 15, rotate: 15 }),
    { slug: 'peitoral', d: 'M99 74 C88 71 72 72 66 82 C62 92 68 104 82 106 C92 107 99 101 99 92 Z' },
    { slug: 'peitoral', d: 'M101 74 C112 71 128 72 134 82 C138 92 132 104 118 106 C108 107 101 101 101 92 Z' },
    ...pair({ slug: 'biceps', cx: 49, cy: 120, rx: 7, ry: 17, rotate: 10 }),
    ...pair({ slug: 'antebracos', cx: 39, cy: 172, rx: 6, ry: 22, rotate: 14 }),
    { slug: 'abdomen', d: 'M88 110 L112 110 C115 140 115 170 110 196 L90 196 C85 170 85 140 88 110 Z' },
    ...pair({ slug: 'quadriceps', cx: 82, cy: 276, rx: 13, ry: 40, rotate: 4 }),
    ...pair({ slug: 'adutores', cx: 95, cy: 258, rx: 4.5, ry: 22, rotate: -4 }),
    ...pair({ slug: 'panturrilhas', cx: 80, cy: 360, rx: 7, ry: 24, rotate: 2 }),
];

const BACK = [
    { slug: 'trapezio', d: 'M100 60 C92 62 84 66 74 72 C84 78 92 92 100 112 C108 92 116 78 126 72 C116 66 108 62 100 60 Z' },
    ...pair({ slug: 'ombros', cx: 56, cy: 84, rx: 12, ry: 15, rotate: 15 }),
    { slug: 'dorsais', d: 'M97 112 C90 96 78 88 66 94 C64 120 72 150 96 176 Z' },
    { slug: 'dorsais', d: 'M103 112 C110 96 122 88 134 94 C136 120 128 150 104 176 Z' },
    ...pair({ slug: 'triceps', cx: 49, cy: 120, rx: 7, ry: 17, rotate: 10 }),
    ...pair({ slug: 'antebracos', cx: 39, cy: 172, rx: 6, ry: 22, rotate: 14 }),
    { slug: 'lombar', d: 'M88 178 L112 178 L114 204 L86 204 Z' },
    ...pair({ slug: 'gluteo_medio', cx: 72, cy: 214, rx: 8, ry: 11, rotate: -20 }),
    ...pair({ slug: 'gluteos', cx: 86, cy: 236, rx: 15, ry: 17 }),
    ...pair({ slug: 'posteriores', cx: 83, cy: 294, rx: 12, ry: 32, rotate: 3 }),
    ...pair({ slug: 'panturrilhas', cx: 81, cy: 354, rx: 9, ry: 25, rotate: 2 }),
];

const BodyView = ({ shapes, label, fillFor, onSelect, selected }) => (
    <figure className="bodymap-view">
        <svg viewBox="0 0 200 420" role="img" aria-label={`Corpo, ${label}`}>
            <circle className="bodymap-base" cx="100" cy="30" r="20" />
            <rect className="bodymap-base" x="92" y="46" width="16" height="16" rx="4" />
            <path className="bodymap-base" d={SILHOUETTE} />
            {shapes.map((shape, i) => {
                const muscle = MUSCLE_BY_SLUG[shape.slug];
                const { fill, opacity } = fillFor(shape.slug);
                const key = `${shape.slug}-${i}`;
                const common = {
                    fill,
                    fillOpacity: opacity,
                    className: `bodymap-muscle ${onSelect ? 'is-clickable' : ''} ${selected === shape.slug ? 'is-selected' : ''}`,
                    onClick: onSelect ? () => onSelect(shape.slug) : undefined,
                };
                const body = shape.d
                    ? <path key={key} {...common} d={shape.d} />
                    : <ellipse key={key} {...common} cx={shape.cx} cy={shape.cy} rx={shape.rx} ry={shape.ry}
                        transform={shape.rotate ? `rotate(${shape.rotate} ${shape.cx} ${shape.cy})` : undefined} />;
                return onSelect ? (
                    <g key={key} role="button" tabIndex={-1} aria-label={muscle?.nome}>
                        <title>{muscle?.nome}</title>
                        {body}
                    </g>
                ) : body;
            })}
        </svg>
        <figcaption>{label}</figcaption>
    </figure>
);

const IDLE = '#D5DEE9';

const BodyMap = ({ muscles, selected, onSelect, compact = false, className = '' }) => {
    const roles = muscles ? Object.fromEntries(muscles.map(m => [m.slug, m.papel])) : null;

    const fillFor = (slug) => {
        const cor = MUSCLE_BY_SLUG[slug]?.cor || IDLE;
        if (roles) {
            if (roles[slug] === 'principal') return { fill: cor, opacity: 1 };
            if (roles[slug] === 'secundario') return { fill: cor, opacity: 0.45 };
            return { fill: IDLE, opacity: 1 };
        }
        if (selected && selected !== slug) return { fill: cor, opacity: 0.3 };
        return { fill: cor, opacity: 0.9 };
    };

    return (
        <div className={`bodymap ${compact ? 'bodymap--compact' : ''} ${className}`}>
            <BodyView shapes={FRONT} label="Frente" fillFor={fillFor} onSelect={onSelect} selected={selected} />
            <BodyView shapes={BACK} label="Costas" fillFor={fillFor} onSelect={onSelect} selected={selected} />
        </div>
    );
};

// Chips com a cor fixa de cada músculo. `muscles` = [{ slug, papel?, pct? }].
export const MuscleChips = ({ muscles, onSelect, selected }) => (
    <div className="muscle-chips">
        {muscles.map(({ slug, papel, pct }) => {
            const muscle = MUSCLE_BY_SLUG[slug];
            if (!muscle) return null;
            const Tag = onSelect ? 'button' : 'span';
            return (
                <Tag
                    key={slug}
                    type={onSelect ? 'button' : undefined}
                    className={`muscle-chip ${papel === 'secundario' ? 'muscle-chip--secondary' : ''} ${selected === slug ? 'is-selected' : ''}`}
                    style={{ '--muscle-color': muscle.cor }}
                    onClick={onSelect ? () => onSelect(slug) : undefined}
                >
                    <span className="muscle-chip-dot" />
                    {muscle.nome}
                    {pct != null && <strong>{pct}%</strong>}
                    {papel === 'secundario' && pct == null && <em>auxiliar</em>}
                </Tag>
            );
        })}
    </div>
);

export default BodyMap;
