import { useState, useEffect } from 'react';
import { X, Plus, Dumbbell, ChevronRight, Loader2, Globe } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { supabaseHelpers } from '../lib/supabase';
import './PlanSelectorModal.css';

const PlanSelectorModal = ({ isOpen, onClose, onSelectPlan, onCreateNew, userActivePlanIds = [] }) => {
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            loadPlans();
        }
    }, [isOpen]);

    const loadPlans = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();

            // Buscar planos públicos + planos do próprio criador
            const { data, error } = await supabase
                .from('b_workouts')
                .select('id, title, description, difficulty, days_per_week, estimated_duration, is_public, creator_id')
                .or(`is_public.eq.true${user ? `,creator_id.eq.${user.id}` : ''}`)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPlans(data || []);
        } catch (err) {
            console.error('Erro ao carregar planos:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectPlan = async (plan) => {
        if (userActivePlanIds.includes(plan.id)) return;
        onSelectPlan(plan);
    };

    if (!isOpen) return null;

    return (
        <div className="plan-selector-overlay" onClick={onClose}>
            <div className="plan-selector-modal" onClick={(e) => e.stopPropagation()}>
                {/* Handle bar */}
                <div className="plan-selector-handle">
                    <div className="plan-selector-handle-bar" />
                </div>

                {/* Header */}
                <div className="plan-selector-header">
                    <h3 className="plan-selector-title">Selecionar Plano</h3>
                    <button className="plan-selector-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                {/* Create new button */}
                <button className="plan-selector-create-btn" onClick={onCreateNew}>
                    <Plus size={18} />
                    Criar Novo Plano
                </button>

                {/* Divider */}
                <div className="plan-selector-divider">
                    ou selecione um existente
                </div>

                {/* Plans list */}
                <div className="plan-selector-list">
                    {loading ? (
                        <div className="plan-selector-loading">
                            <Loader2 size={20} className="spinner-icon" />
                            Carregando planos...
                        </div>
                    ) : plans.length === 0 ? (
                        <div className="plan-selector-empty">
                            Nenhum plano disponível. Crie o primeiro! 💪
                        </div>
                    ) : (
                        plans.map((plan) => {
                            const isAssigned = userActivePlanIds.includes(plan.id);
                            return (
                                <div
                                    key={plan.id}
                                    className={`plan-selector-item ${isAssigned ? 'already-assigned' : ''}`}
                                    onClick={() => handleSelectPlan(plan)}
                                >
                                    <div className="plan-selector-item-icon">
                                        <Dumbbell size={22} />
                                    </div>
                                    <div className="plan-selector-item-info">
                                        <div className="plan-selector-item-title">
                                            {plan.title}
                                        </div>
                                        <div className="plan-selector-item-meta">
                                            <span>{plan.difficulty || 'Livre'}</span>
                                            <span className="meta-dot" />
                                            <span>{plan.days_per_week || '—'}x/sem</span>
                                            {plan.estimated_duration && (
                                                <>
                                                    <span className="meta-dot" />
                                                    <span>{plan.estimated_duration} min</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    {plan.is_public && (
                                        <span className="plan-badge-public" title="Plano público">
                                            <Globe size={10} style={{ marginRight: '2px', verticalAlign: 'middle' }} />
                                            Público
                                        </span>
                                    )}
                                    {isAssigned && (
                                        <span className="plan-badge-assigned">Atribuído</span>
                                    )}
                                    {!isAssigned && (
                                        <ChevronRight size={16} className="plan-selector-item-arrow" />
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

export default PlanSelectorModal;
