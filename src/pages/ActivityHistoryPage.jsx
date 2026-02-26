/* ActivityHistoryPage.jsx */
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useUserRole } from '../hooks/useSupabase';
import ActivityHistory from '../components/ActivityHistory';
import './ActivityHistoryPage.css';

const ActivityHistoryPage = () => {
    const { userId } = useParams();
    const { isRealAdmin } = useUserRole();
    const navigate = useNavigate();
    const [isHeaderStuck, setIsHeaderStuck] = React.useState(false);

    React.useEffect(() => {
        const handleScroll = (e) => {
            // 10px threshold for sticking, checking the target element's scrollTop
            setIsHeaderStuck(e.target.scrollTop > 10);
        };

        const mainContent = document.querySelector('.layout-content');
        if (mainContent) {
            mainContent.addEventListener('scroll', handleScroll);
        }

        return () => {
            if (mainContent) {
                mainContent.removeEventListener('scroll', handleScroll);
            }
        };
    }, []);

    // Helper to go back
    const handleBack = () => {
        if (window.history.length > 2) {
            navigate(-1);
        } else {
            navigate('/');
        }
    };

    return (
        <div className="activity-history-page animate-in fade-in">
            {/* Sticky Header - Estilo PAF */}
            <div className={`page-header-container ${isHeaderStuck ? 'stuck' : ''}`}>
                <div className="page-header-inner">
                    <button
                        onClick={handleBack}
                        className="page-back-btn"
                        title="Voltar"
                    >
                        <ChevronLeft size={22} />
                    </button>

                    <div className="page-header-titles">
                        <h1 className="page-header-title">Histórico de Atividades</h1>
                        <p className="page-header-subtitle">Visão completa da sua jornada.</p>
                    </div>
                </div>
            </div>



            <div className="activity-page-content mt-4 md:mt-6">
                <ActivityHistory
                    isOpen={true}
                    onClose={handleBack}
                    userId={userId}
                    isPage={true}
                />
            </div>
        </div>
    );
};

export default ActivityHistoryPage;
