import { Bot, PlusCircle, Dumbbell, Footprints, Waves, User, Star, ChevronRight } from 'lucide-react';
import './DashboardHome.css';

const DashboardHome = () => {
    return (
        <>
            {/* AI Coach Section */}
            <section className="coach-section">
                <div className="coach-content">
                    <div className="coach-badge">
                        <Bot size={16} className="mr-1" /> BENFIT COACH
                    </div>
                    <h2 className="coach-title">Need a custom plan?</h2>
                    <p className="coach-subtitle">Let AI build a routine just for you.</p>
                    <button className="coach-button">
                        Ask Benfit
                    </button>
                </div>
                <div className="coach-image-container">
                    <img
                        alt="AI Coach Avatar"
                        className="coach-image"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuA7n79YS5pbm0fb5mjotFE1XMHbkrqEtlrCRg8x3m5pIdrLcp31KLzgMtaeqLXBIVtU8sII5idrvYjnpsgXIWUvbgHmOBHT4H_Ix0F6hvXTVIAUNdrfkwWpVjj_MpANdBNuEISWGq_HogpRDydTHbMbY4QnsrZShHrgx_MxcvtUqTnmdCxUPLqs5LnVJMBORsMshTE-87nEkdWUel-1Sg2z9MmyREdUW0VzmEfVUF2_DzNbmrem_weZyiMm0ZdDEHhaPk1_4w409RY"
                    />
                </div>
            </section>

            {/* Active Plans Section */}
            <section className="plans-section">
                <div className="section-header">
                    <h3 className="section-title">Active Plans</h3>
                    <button className="new-plan-btn">
                        <PlusCircle size={16} className="mr-1" /> New Plan
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
                                <p className="plan-meta">Intermediate • 4 weeks left</p>
                            </div>
                            <span className="status-badge active">Active</span>
                        </div>
                        <div className="progress-container">
                            <div className="progress-bar-bg">
                                <div className="progress-bar-fill green" style={{ width: '65%' }}></div>
                            </div>
                            <div className="progress-text">
                                <span>65% Completed</span>
                                <span className="week-text">Week 4/12</span>
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
                                <h4 className="plan-name">Morning Cardio</h4>
                                <p className="plan-meta">Beginner • Paused</p>
                            </div>
                            <span className="status-badge paused">Paused</span>
                        </div>
                        <div className="progress-container">
                            <div className="progress-bar-bg">
                                <div className="progress-bar-fill orange" style={{ width: '20%' }}></div>
                            </div>
                            <div className="progress-text">
                                <span>20% Completed</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Completed History Section */}
            <section className="history-section">
                <h3 className="section-title">Completed History</h3>
                <div className="history-grid">
                    <div className="history-card">
                        <div className="history-icon blue">
                            <Waves size={24} />
                        </div>
                        <h5 className="history-name">Summer Swim</h5>
                        <p className="history-date">Aug 2023</p>
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
                        <h5 className="history-name">Yoga Basics</h5>
                        <p className="history-date">June 2023</p>
                        <div className="rating">
                            <Star size={14} fill="currentColor" />
                            <Star size={14} fill="currentColor" />
                            <Star size={14} fill="currentColor" />
                            <Star size={14} fill="currentColor" />
                            <Star size={14} className="text-gray-300" />
                        </div>
                    </div>
                </div>
            </section>

            {/* Train with Friends Section */}
            <section className="friends-section">
                <div className="friends-image-container">
                    <img
                        alt="Couple working out"
                        className="friends-image"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuCWQAHavkgoooB3hCQxVdzv333jYr6zsGp80nxkN8kCD_kFIh0WRyeUCw3VDF18ZBVe5XEZuAXqX3rqDofKNjaYPtNEpQK3OnFQNfuM5AyK7rWojJHTJn0ZRtQMhSKmUe7HIeC_AIFcw2CN9VUPSB7g7yGAu_CYyK1_0eQsa6vgdQeXqamXPKbld2n0FHgo4yEMJgi5YK3QB5t1ce08SdS2-Xa6WiowT4wx_1ln5pfZE1iomX5fooIGhu5cIMJtzYa2aoQHoLxVNX8"
                    />
                </div>
                <div className="friends-content">
                    <h4 className="friends-title">Train with Friends</h4>
                    <p className="friends-subtitle">Invite friends to join your plan.</p>
                </div>
                <button className="friends-arrow">
                    <ChevronRight size={16} />
                </button>
            </section>
        </>
    );
};

export default DashboardHome;
