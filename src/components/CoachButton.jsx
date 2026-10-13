import { RobotCoachIcon } from './icons/BenfitIcons';
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
            aria-label="Abrir Benfit Coach"
            title="Benfit Coach"
        >
            <RobotCoachIcon size={20} />
        </button>
    );
};

export default CoachButton;
