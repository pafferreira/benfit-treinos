import { Bot, PlusCircle, Dumbbell, Footprints, Waves, User, Star, ChevronRight } from 'lucide-react';
import './DashboardHome.css';

const DashboardHome = () => {
    return (
        <>
            {/* AI Coach Card Section */}
            <section className="coach-section">
                <div className="coach-content">
                    <div className="coach-badge">
                        <Bot size={16} className="mr-1" /> " COACH BENFIT
                    </div>
                    <div className="coach-text">
                        <h2 className="coach-title">Precisa de um plano personalizado?</h2>
                        <p>A IA cria uma rotina para você.</p>
                    </div>
                    <button className="coach-button">
                        Perguntar ao Benfit
                    </button>
                </div>
                <div className="coach-image-container">
                    <img
                        alt="AI Coach Avatar"
                        className="coach-image"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuA7n79YS5pbm0fb5mjotFE1XMHbkrqEtlrCRg8x3m5pIdrLcp31KLzgMtaeqLXBIVtU8sII5idrvYjnpsgXIWUvbgHmOBHT4H_Ix0F6hvXTVIAUNdrfkwWpVjj_MpANdBNuEISWGq_HogpRDydTHbMbY4QnsrZShHrgx_MxcvtUqTnmdCxUPLqs5LnVJMBORsMshTE-87nEkdWUel-1Sg2z9MmyREdUW0VzmEfVUF2_DzNbmrem_weZyiMm0ZdDEHhaPk1_4w409RY"
                    />
                </div>
            </section >

            {/* Active Plans Section */}
            < section className="plans-section" >
                <div className="section-header">
                    <h3 className="section-title">Planos Ativos</h3>
                    <button className="new-plan-btn">
                        <PlusCircle size={16} className="mr-1" /> Novo Plano
                    </button>
                </div>

                {/* Plan Card 1 */}
                <div className="plan-card">
                    <div className="plan-icon-container green">
                        <Dumbbell size={32} className="text-secondary" />
                    </div>
                    <div className="plan-details">
                        <div className="plan-header">
                            <div>
                                <h4 className="plan-name">Muscle Build Pro</h4>
                                <p className="plan-meta">Intermediário • 4 semanas restantes</p>
                            </div>
                            <span className="status-badge active">Ativo</span>
                        </div>
                        <div className="progress-container">
                            <div className="progress-bar-bg">
                                <div className="progress-bar-fill green" style={{ width: '65%' }}></div>
                            </div>
                            <div className="progress-text">
                                <span>65% Concluído</span>
                                <span className="week-text">Semana 4/12</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Plan Card 2 */}
                <div className="plan-card opacity-60">
                    <div className="plan-icon-container orange">
                        <Footprints size={32} className="text-orange" />
                    </div>
                    <div className="plan-details">
                        <div className="plan-header">
                            <div>
                                <h4 className="plan-name">Cardio Matinal</h4>
                                <p className="plan-meta">Iniciante • Pausado</p>
                            </div>
                            <span className="status-badge paused">Pausado</span>
                        </div>
                        <div className="progress-container">
                            <div className="progress-bar-bg">
                                <div className="progress-bar-fill orange" style={{ width: '20%' }}></div>
                            </div>
                            <div className="progress-text">
                                <span>20% Concluído</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section >

            {/* Completed History Section */}
            < section className="history-section" >
                <h3 className="section-title">Histórico de Concluídos</h3>
                <div className="history-grid">
                    <div className="history-card">
                        <div className="history-icon blue">
                            <Waves size={24} />
                        </div>
                        <h5 className="history-name">Natação de Verão</h5>
                        <p className="history-date">Ago 2023</p>
                        <div className="rating">
                            <Star size={14} fill="currentColor" />
                            <Star size={14} fill="currentColor" />
                            <Star size={14} fill="currentColor" />
                            <Star size={14} fill="currentColor" />
                            <Star size={14} fill="currentColor" className="half" />
                        </div>
                    </div>
                    <div className="history-card">
                        <div className="history-icon purple">
                            <User size={24} />
                        </div>
                        <h5 className="history-name">Yoga Básico</h5>
                        <p className="history-date">Jun 2023</p>
                        <div className="rating">
                            <Star size={14} fill="currentColor" />
                            <Star size={14} fill="currentColor" />
                            <Star size={14} fill="currentColor" />
                            <Star size={14} fill="currentColor" />
                            <Star size={14} className="text-gray-300" />
                        </div>
                    </div>
                </div>
            </section >

            {/* Train with Friends Section */}
            < section className="friends-section" >
                <div className="friends-image-container">
                    <img
                        alt="Couple working out"
                        className="friends-image"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuCWQAHavkgoooB3hCQxVdzv333jYr6zsGp80nxkN8kCD_kFIh0WRyeUCw3VDF18ZBVe5XEZuAXqX3rqDofKNjaYPtNEpQK3OnFQNfuM5AyK7rWojJHTJn0ZRtQMhSKmUe7HIeC_AIFcw2CN9VUPSB7g7yGAu_CYyK1_0eQsa6vgdQeXqamXPKbld2n0FHgo4yEMJgi5YK3QB5t1ce08SdS2-Xa6WiowT4wx_1ln5pfZE1iomX5fooIGhu5cIMJtzYa2aoQHoLxVNX8"
                    />
                </div>
                <div className="friends-content">
                    <h4 className="friends-title">Treine com Amigos</h4>
                    <p className="friends-subtitle">Convide amigos para se juntarem ao seu plano.</p>
                </div>
                <button className="friends-arrow">
                    <ChevronRight size={16} />
                </button>
            </section >
        </>
    );
};

export default DashboardHome;
