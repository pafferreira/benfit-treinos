import { MessageCircle, ChevronRight } from 'lucide-react';
import { BowlPlateIcon } from '../components/icons/BenfitIcons';
import { useCoach, useCoachScreen } from '../context/coach';
import './Dieta.css';

// Área de Dieta (v2). O catálogo de pratos com foto e macros chega na etapa 2D;
// até lá, a tela leva as dúvidas de alimentação direto ao Coach.
const QUESTIONS = [
    'O que comer antes do treino?',
    'O que comer depois do treino?',
    'Sugira um almoço rico em proteína',
    'Quanta proteína eu preciso por dia?',
    'Ideias de lanche saudável para a tarde',
];

const Dieta = () => {
    const { openCoach } = useCoach();

    useCoachScreen({
        label: 'Dieta',
        details: 'O aluno está na área de Dieta, buscando orientação de alimentação ligada ao treino.',
        suggestions: QUESTIONS.slice(0, 3),
    });

    return (
        <div className="dieta-page">
            <section className="dieta-hero">
                <div className="dieta-hero-icon"><BowlPlateIcon size={26} /></div>
                <div>
                    <h2 className="dieta-hero-title">Pratos com foto e macros estão chegando</h2>
                    <p className="dieta-hero-text">
                        Em breve o Coach vai sugerir pratos completos, com ingredientes, calorias e proteínas, e você poderá salvar seus favoritos.
                    </p>
                </div>
            </section>

            <section className="dieta-questions">
                <h3 className="dieta-section-title">
                    <MessageCircle size={16} />
                    Pergunte ao Coach agora
                </h3>
                {QUESTIONS.map(q => (
                    <button key={q} type="button" className="dieta-question" onClick={() => openCoach(q)}>
                        <span>{q}</span>
                        <ChevronRight size={16} />
                    </button>
                ))}
            </section>

            <p className="dieta-note">
                Dietas restritivas ou condições de saúde pedem acompanhamento de nutricionista.
            </p>
        </div>
    );
};

export default Dieta;
