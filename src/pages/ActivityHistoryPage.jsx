/* ActivityHistoryPage.jsx */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useUserRole } from '../hooks/useSupabase';
import { supabase, supabaseHelpers } from '../lib/supabase';
import ActivityHistory from '../components/ActivityHistory';
import './ActivityHistoryPage.css';

const ActivityHistoryPage = () => {
    const { userId } = useParams();
    const { isRealAdmin } = useUserRole();
    const navigate = useNavigate();
    const [isHeaderStuck, setIsHeaderStuck] = useState(false);
    const [finalizedDates, setFinalizedDates] = useState([]);
    const [doneDates, setDoneDates] = useState([]);

    useEffect(() => {
        const handleScroll = (e) => {
            setIsHeaderStuck(e.target.scrollTop > 10);
        };

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                handleBack();
            }
        };

        const mainContent = document.querySelector('.layout-content');
        if (mainContent) {
            mainContent.addEventListener('scroll', handleScroll);
        }
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            if (mainContent) {
                mainContent.removeEventListener('scroll', handleScroll);
            }
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    // Load calendar dates for MiniCalendar
    useEffect(() => {
        const loadCalendarDates = async () => {
            try {
                let uid = userId;
                if (!uid) {
                    const { data: { user } } = await supabase.auth.getUser();
                    uid = user?.id;
                }
                if (!uid) return;
                const res = await supabaseHelpers.getExerciseDoneCalendarDates(uid);
                setFinalizedDates(res.finalizedDates || []);
                setDoneDates(res.doneDates || []);
            } catch (err) {
                console.error('Erro ao carregar calendário:', err);
            }
        };
        loadCalendarDates();
    }, [userId]);

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



            <div className="activity-page-content">
                <ActivityHistory
                    isOpen={true}
                    onClose={handleBack}
                    userId={userId}
                    isPage={true}
                    finalizedDates={finalizedDates}
                    doneDates={doneDates}
                />
            </div>
        </div>
    );
};

export default ActivityHistoryPage;
