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

    // If no userId in params, try to get current user (handled inside ActivityHistory mostly, but let's be explicit if needed)
    // Actually ActivityHistory takes userId prop. If params has it, use it. If not, maybe use current user from context?
    // But this page is likely linked from somewhere with an ID, or for the logged-in user.
    // Let's assume if no ID, it's for current user. But let's see how ActivityHistory handles it.

    return (
        <div className="activity-history-page animate-in fade-in">
            <div className="page-header mb-6">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
                >
                    <ChevronLeft size={20} />
                    <span className="ml-1 font-medium">Voltar</span>
                </button>
                <h1 className="text-2xl font-bold text-gray-800 mt-2">Histórico de Atividades</h1>
            </div>

            <div className="mt-4">
                <ActivityHistory
                    isOpen={true}
                    onClose={() => navigate(-1)}
                    userId={userId}
                    isPage={true}
                />
            </div>
        </div>
    );
};

export default ActivityHistoryPage;
