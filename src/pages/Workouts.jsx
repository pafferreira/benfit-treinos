import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkouts, useExercises } from '../hooks/useSupabase';
import { supabaseHelpers } from '../lib/supabase';
import { Calendar, Clock, Plus, Edit2, Trash2, Search, Loader2, Dumbbell } from 'lucide-react';
import WorkoutModal from '../components/WorkoutModal';
import ConfirmationModal from '../components/ConfirmationModal';
import { SkeletonWorkouts } from '../components/SkeletonLoader';
import './Workouts.css';

const Workouts = () => {
    const navigate = useNavigate();
    const { workouts, loading: workoutsLoading, error: workoutsError, reload } = useWorkouts();
    const { exercises } = useExercises();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingWorkout, setEditingWorkout] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [difficultyFilter, setDifficultyFilter] = useState('all');
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });


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


    // CRUD Handlers
    const handleCreateWorkout = () => {
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
                await supabaseHelpers.createWorkout(workoutData);
                alert('Treino criado com sucesso!');
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
                <button className="new-plan-btn" onClick={handleCreateWorkout}>
                    <Plus size={16} /> Novo Plano
                </button>
            </div>

            {/* Workouts List */}
            <div className="plans-grid">
                {filteredWorkouts.map((workout, index) => {
                    // Mock data for visual matching
                    const isEven = index % 2 === 0;
                    const iconColor = isEven ? 'green' : 'orange';
                    const status = isEven ? 'Ativo' : 'Pausado';
                    const progress = isEven ? 65 : 20;
                    const weeksLeft = isEven ? '4 semanas restantes' : 'Pausado';

                    return (
                        <div
                            key={workout.id}
                            className={`plan-card ${!isEven ? 'opacity-60' : ''}`}
                            onClick={() => navigate(`/treino/${workout.id}`)}
                        >
                            <div className={`plan-icon-container ${iconColor}`}>
                                {isEven ? <Dumbbell size={32} className="text-secondary" /> : <Clock size={32} className="text-orange" />}
                            </div>
                            <div className="plan-details">
                                <div className="plan-header">
                                    <div>
                                        <h4 className="plan-title">{workout.title}</h4>
                                        <p className="plan-meta">{workout.difficulty} • {weeksLeft}</p>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        <span className={`status-badge ${status.toLowerCase()}`}>{status}</span>
                                        {/* Hidden actions for now, or maybe show on hover? Keeping them accessible via long press or similar in future */}
                                        <button
                                            className="action-btn"
                                            onClick={(e) => handleEditWorkout(e, workout)}
                                            style={{ padding: '0.25rem' }}
                                            data-tooltip="Editar"
                                        >
                                            <Edit2 size={14} />
                                        </button>
                                        <button
                                            className="action-btn"
                                            onClick={(e) => handleDeleteWorkout(e, workout)}
                                            style={{ padding: '0.25rem' }}
                                            data-tooltip="Excluir"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                                <div className="progress-container">
                                    <div className="progress-bar-bg">
                                        <div className={`progress-bar-fill ${iconColor}`} style={{ width: `${progress}%` }}></div>
                                    </div>
                                    <div className="progress-text">
                                        <span>{progress}% Concluído</span>
                                        {isEven && <span className="week-text">Semana 4/12</span>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

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
