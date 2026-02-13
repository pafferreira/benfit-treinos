import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkouts, useExercises, useUserRole } from '../hooks/useSupabase';
import { supabaseHelpers } from '../lib/supabase';
import { supabase } from '../lib/supabase';
import { Calendar, Clock, Plus, Search, Loader2, Dumbbell } from 'lucide-react';
import WorkoutModal from '../components/WorkoutModal';
import ActionButton from '../components/ActionButton';
import PlanSelectorModal from '../components/PlanSelectorModal';
import ConfirmationModal from '../components/ConfirmationModal';
import { SkeletonWorkouts } from '../components/SkeletonLoader';
import './Workouts.css';

const Workouts = () => {
    const navigate = useNavigate();
    const { workouts, loading: workoutsLoading, error: workoutsError, reload } = useWorkouts();
    const { isAdmin, isPersonal } = useUserRole();
    const { exercises } = useExercises();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isPlanSelectorOpen, setIsPlanSelectorOpen] = useState(false);
    const [editingWorkout, setEditingWorkout] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [difficultyFilter, setDifficultyFilter] = useState('all');
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
    const [userActivePlanIds, setUserActivePlanIds] = useState([]);

    // Carregar planos ativos do usuário
    useEffect(() => {
        loadUserActivePlans();
    }, []);

    const loadUserActivePlans = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const activePlans = await supabaseHelpers.getUserActivePlans(user.id);
            setUserActivePlanIds(activePlans.map(p => p.workout_id));
        } catch (err) {
            console.error('Erro ao carregar planos ativos:', err);
        }
    };

    useEffect(() => {
        if (!isModalOpen) return;
        const onKeyDown = (e) => {
            if (e.key === 'Escape' || e.key === 'Esc') {
                setIsModalOpen(false);
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isModalOpen]);

    const filteredWorkouts = useMemo(() => {
        if (!workouts) return [];
        return workouts.filter(w => {
            const matchesSearch = !searchTerm || (w.title && w.title.toLowerCase().includes(searchTerm.toLowerCase())) || (w.description && w.description.toLowerCase().includes(searchTerm.toLowerCase()));
            const matchesDifficulty = difficultyFilter === 'all' || w.difficulty === difficultyFilter;
            return matchesSearch && matchesDifficulty;
        });
    }, [workouts, searchTerm, difficultyFilter]);

    // Abrir o seletor de planos (ao invés do WorkoutModal)
    const handleCreateWorkout = () => {
        setIsPlanSelectorOpen(true);
    };

    // Selecionar um plano existente
    const handleSelectPlan = async (plan) => {
        try {
            setIsSaving(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                alert('Usuário não autenticado.');
                return;
            }

            await supabaseHelpers.assignPlanToUser(user.id, plan.id);
            setIsPlanSelectorOpen(false);
            await loadUserActivePlans();
            reload();
            alert(`Plano "${plan.title}" atribuído com sucesso! 🎉`);
        } catch (err) {
            console.error('Erro ao atribuir plano:', err);
            alert(err.message || 'Erro ao atribuir plano.');
        } finally {
            setIsSaving(false);
        }
    };

    // Criar novo plano (abre WorkoutModal a partir do PlanSelector)
    const handleCreateNewPlan = () => {
        setIsPlanSelectorOpen(false);
        setEditingWorkout(null);
        setIsModalOpen(true);
    };

    const handleEditWorkout = (e, workout) => {
        e.stopPropagation();
        setEditingWorkout(workout);
        setIsModalOpen(true);
    };

    const handleDeleteWorkout = (e, workout) => {
        e.stopPropagation();
        setConfirmModal({
            isOpen: true,
            title: 'Excluir Plano',
            message: `Tem certeza que deseja excluir o plano "${workout.title}"? Esta ação não pode ser desfeita.`,
            onConfirm: () => confirmDeleteWorkout(workout)
        });
    };

    const confirmDeleteWorkout = async (workout) => {
        try {
            await supabaseHelpers.deleteWorkout(workout.id);
            reload();
        } catch (err) {
            console.error('Error deleting workout:', err);
            alert('Erro ao excluir treino: ' + err.message);
        } finally {
            setConfirmModal({ ...confirmModal, isOpen: false });
        }
    };

    const handleSaveWorkout = async (workoutData) => {
        setIsSaving(true);
        try {
            if (editingWorkout) {
                await supabaseHelpers.updateWorkout(editingWorkout.id, workoutData);
                alert('Treino atualizado com sucesso!');
            } else {
                const newWorkout = await supabaseHelpers.createWorkout(workoutData);
                // Atribuir o novo plano ao usuário automaticamente
                const { data: { user } } = await supabase.auth.getUser();
                if (user && newWorkout) {
                    try {
                        await supabaseHelpers.assignPlanToUser(user.id, newWorkout.id);
                    } catch (assignErr) {
                        console.error('Erro ao atribuir plano automaticamente:', assignErr);
                    }
                }
                await loadUserActivePlans();
                alert('Treino criado e atribuído com sucesso! 🎉');
            }
            setIsModalOpen(false);
            reload();
        } catch (err) {
            console.error('Error saving workout:', err);
            alert('Erro ao salvar treino: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    if (workoutsLoading) {
        return <SkeletonWorkouts />;
    }

    if (workoutsError) {
        return (
            <div className="error-container">
                <p>⚠️ Erro ao carregar treinos: {workoutsError}</p>
            </div>
        );
    }

    return (
        <div className="workouts-container">
            {/* Header */}
            <div className="workouts-topbar">
                <h3 className="section-title">Planos Ativos</h3>
                {(isAdmin || isPersonal) && (
                    <button className="new-plan-btn" onClick={handleCreateWorkout}>
                        <Plus size={16} /> Novo Plano
                    </button>
                )}
            </div>

            {/* Workouts List */}
            <div className="plans-grid">
                {filteredWorkouts.map((workout, index) => {
                    const isActive = userActivePlanIds.includes(workout.id);
                    const iconColor = isActive ? 'green' : 'orange';
                    const status = isActive ? 'Ativo' : 'Disponível';

                    return (
                        <div
                            key={workout.id}
                            className={`plan-card ${!isActive ? 'plan-card-inactive' : ''}`}
                            onClick={() => navigate(`/treino/${workout.id}`)}
                        >
                            <div className={`plan-icon-container ${iconColor}`}>
                                {isActive ? <Dumbbell size={24} strokeWidth={2.5} /> : <Clock size={24} strokeWidth={2.5} />}
                            </div>
                            <div className="plan-content">
                                <h4 className="plan-title">{workout.title}</h4>
                                <div className="plan-bottom-row">
                                    <span className="plan-meta">{workout.difficulty} • {workout.days_per_week}x/sem</span>
                                    <span className={`status-badge ${status.toLowerCase()}`}>{status}</span>
                                </div>
                            </div>
                            {(isAdmin || isPersonal) && (
                                <div className="plan-actions-vertical">
                                    <ActionButton
                                        variant="edit"
                                        onClick={(e) => handleEditWorkout(e, workout)}
                                        tooltip="Editar"
                                    />
                                    <ActionButton
                                        variant="delete"
                                        onClick={(e) => handleDeleteWorkout(e, workout)}
                                        tooltip="Excluir"
                                    />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Plan Selector Modal */}
            <PlanSelectorModal
                isOpen={isPlanSelectorOpen}
                onClose={() => setIsPlanSelectorOpen(false)}
                onSelectPlan={handleSelectPlan}
                onCreateNew={handleCreateNewPlan}
                userActivePlanIds={userActivePlanIds}
            />

            {/* Workout Modal */}
            <WorkoutModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveWorkout}
                workout={editingWorkout}
                isLoading={isSaving}
            />

            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
            />
        </div>
    );
};

export default Workouts;
