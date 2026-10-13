// Ícones próprios do Benfit, no mesmo traço dos ícones do lucide-react
// (24×24, stroke em currentColor) para conviver com eles na barra e nos botões.

const base = (size, strokeWidth, props) => ({
    xmlns: 'http://www.w3.org/2000/svg',
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
    ...props,
});

// Robô Coach: a "cara" do Benfit Coach (IA).
export const RobotCoachIcon = ({ size = 24, strokeWidth = 2, ...props }) => (
    <svg {...base(size, strokeWidth, props)}>
        <path d="M12 3v2.5" />
        <circle cx="12" cy="2.5" r="0.6" fill="currentColor" />
        <rect x="4" y="5.5" width="16" height="13" rx="4" />
        <rect x="7" y="8.5" width="10" height="7" rx="2" />
        <circle cx="10" cy="12" r="0.9" fill="currentColor" stroke="none" />
        <circle cx="14" cy="12" r="0.9" fill="currentColor" stroke="none" />
        <path d="M2 10.5v3M22 10.5v3" />
        <path d="M9 21h6" />
    </svg>
);

// Bowl no prato, visto de cima, com garfo e faca: ícone da Dieta.
export const BowlPlateIcon = ({ size = 24, strokeWidth = 2, ...props }) => (
    <svg {...base(size, strokeWidth, props)}>
        <circle cx="12" cy="12" r="7" />
        <path d="M9.5 14.5c0-2.6 2-4.5 5-4.5 0 2.8-2 4.8-5 4.5Z" />
        <circle cx="10" cy="10" r="0.9" fill="currentColor" stroke="none" />
        <path d="M1.5 4v3M3.5 4v3M1.5 7a1 1 0 0 0 2 0M2.5 8v12" />
        <path d="M22.5 4c-1.4 1-1.8 3.2-1.8 5.5h1.8M22.5 4v16" />
    </svg>
);
