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
            {/* Absolute Fixed Header */}
            <div className={`page-header-container ${isHeaderStuck ? 'stuck' : ''}`}>
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleBack}
                        className="p-2 -ml-2 text-gray-500 hover:text-[#034EA2] hover:bg-blue-50 rounded-full transition-all"
                        title="Voltar"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold text-[#034EA2]">Histórico de Atividades</h1>
                        <p className="text-xs text-gray-500 font-medium mt-0.5">Visão completa da sua jornada.</p>
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
