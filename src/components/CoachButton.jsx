import { BenfitAvatar } from './icons/BenfitIcons';
import { useCoach } from '../context/coach';
import './CoachSheet.css';

// Botão do Benfit Coach para cabeçalhos: abre o painel sobre a tela atual.
const CoachButton = ({ className = '' }) => {
    const { openCoach } = useCoach();
    return (
        <button
            type="button"
            className={`coach-launch-btn ${className}`}
            onClick={() => openCoach()}
            aria-label="Abrir Benfit"
            title="Benfit"
        >
            <BenfitAvatar size={38} />
        </button>
    );
};

export default CoachButton;
