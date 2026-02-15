import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkouts, useUserRole } from '../hooks/useSupabase';
import { supabaseHelpers, supabase } from '../lib/supabase';
import { Clock, Plus, Dumbbell } from 'lucide-react';
import ActionButton from '../components/ActionButton';
import ConfirmationModal from '../components/ConfirmationModal';
import { SkeletonWorkouts } from '../components/SkeletonLoader';
import MiniCalendar from '../components/MiniCalendar';
import './Workouts.css';

const Workouts = () => {
    const navigate = useNavigate();
    const { workouts, loading: workoutsLoading, error: workoutsError, reload } = useWorkouts();
    const { isAdmin, isPersonal, isUser } = useUserRole();

    const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
    const [userActivePlanIds, setUserActivePlanIds] = useState([]);
    const [processingWorkoutId, setProcessingWorkoutId] = useState(null);
    const [completedDates, setCompletedDates] = useState([]);
    const [incompleteDates, setIncompleteDates] = useState([]);

    useEffect(() => {
        loadUserActivePlans();
        loadCalendarDates();
    }, []);

    const loadUserActivePlans = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const activePlans = await supabaseHelpers.getUserActivePlans(user.id);
            setUserActivePlanIds(activePlans.map((p) => p.workout_id));
        } catch (err) {
            console.error('Erro ao carregar planos ativos:', err);
        }
    };

    const loadCalendarDates = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setCompletedDates([]);
                setIncompleteDates([]);
                return;
            }
            const calendarDates = await supabaseHelpers.getUserWorkoutCalendarDates(user.id, 45);
            setCompletedDates(calendarDates.completedDates || []);
            setIncompleteDates(calendarDates.incompleteDates || []);
        } catch (err) {
            console.error('Erro ao carregar calendário de treinos:', err);
        }
    };

    const handleCreateWorkout = () => {
        navigate('/treinos/novo');
    };

    const handleToggleAssign = async (e, workout) => {
        e.stopPropagation();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Usuário não autenticado.', type: 'error' } }));
            return;
        }

        const isActive = userActivePlanIds.includes(workout.id);

        if (isActive) {
            setConfirmModal({
                isOpen: true,
                title: 'Remover Plano',
                message: `Deseja remover o plano "${workout.title}"? Isso não afetará treinos já iniciados.`,
                onConfirm: async () => {
                    try {
                        setProcessingWorkoutId(workout.id);
                        await supabaseHelpers.unassignPlanFromUser(user.id, workout.id);
                        window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: `Plano "${workout.title}" removido.`, type: 'success' } }));
                        await loadUserActivePlans();
                        reload();
                    } catch (err) {
                        console.error('Erro ao remover plano:', err);
                        window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: err.message || 'Não foi possível remover o plano.', type: 'error' } }));
                    } finally {
                        setProcessingWorkoutId(null);
                        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
                    }
                }
            });
            return;
        }

        try {
            setProcessingWorkoutId(workout.id);
            await supabaseHelpers.assignPlanToUser(user.id, workout.id);
            window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: `Plano "${workout.title}" atribuído com sucesso!`, type: 'success' } }));
            await loadUserActivePlans();
            reload();
        } catch (err) {
            console.error('Erro ao atribuir plano:', err);
            window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: err.message || 'Erro ao atribuir plano.', type: 'error' } }));
        } finally {
            setProcessingWorkoutId(null);
        }
    };

    const canManageWorkout = (workout) => {
        if (!workout) return false;
        if (isAdmin) return true;
        if (isPersonal) return workout.is_public === true;
        return false;
    };

    const handleEditWorkout = (e, workout) => {
        e.stopPropagation();
        if (!canManageWorkout(workout)) {
            window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Personal só pode editar planos públicos.', type: 'error' } }));
            return;
        }

        navigate(`/treinos/${workout.id}/editar`);
    };

    const handleDeleteWorkout = (e, workout) => {
        e.stopPropagation();
        if (!canManageWorkout(workout)) {
            window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Personal só pode excluir planos públicos.', type: 'error' } }));
            return;
        }

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
            window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: `Erro ao excluir treino: ${err.message || ''}`, type: 'error' } }));
        } finally {
            setConfirmModal((prev) => ({ ...prev, isOpen: false }));
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
            <div className="workouts-topbar">
                <h3 className="section-title">Meus Planos</h3>
                {(isAdmin || isPersonal) && (
                    <button className="new-plan-btn" onClick={handleCreateWorkout}>
                        <Plus size={16} /> Novo Plano
                    </button>
                )}
            </div>

            <div className="calendar-section">
                <MiniCalendar
                    completedDates={completedDates}
                    incompleteDates={incompleteDates}
                    currentDate={new Date()}
                />
            </div>

            <div className="plans-grid">
                {workouts.map((workout) => {
                    const isActive = userActivePlanIds.includes(workout.id);
                    const iconColor = isActive ? 'green' : 'orange';
                    const status = isActive ? 'Ativo' : 'Disponível';
                    const canManage = canManageWorkout(workout);

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

                            {canManage && (
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

                            {isUser && (
                                <div className="plan-actions-checkbox" onClick={(e) => e.stopPropagation()}>
                                    <label className="plan-checkbox-label">
                                        <input
                                            type="checkbox"
                                            checked={isActive}
                                            disabled={processingWorkoutId && processingWorkoutId !== workout.id}
                                            onChange={(e) => handleToggleAssign(e, workout)}
                                        />
                                        <span>{isActive ? 'Escolhido' : 'Escolher'}</span>
                                        {processingWorkoutId === workout.id && <span className="small-spinner" aria-hidden="true" />}
                                    </label>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

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
