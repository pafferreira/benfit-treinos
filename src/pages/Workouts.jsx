import { useState, useMemo, useEffect } from 'react';
import { useWorkouts, useExercises } from '../hooks/useSupabase';
import { supabaseHelpers } from '../lib/supabase';
import { Calendar, Clock, Plus, Edit2, Trash2, Search, Loader2, Dumbbell } from 'lucide-react';
import WorkoutModal from '../components/WorkoutModal';
import WorkoutDetails from '../components/WorkoutDetails';
import './Workouts.css';

const Workouts = () => {
    const { workouts, loading: workoutsLoading, error: workoutsError, reload } = useWorkouts();
    const { exercises } = useExercises();
    const [selectedWorkout, setSelectedWorkout] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingWorkout, setEditingWorkout] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [difficultyFilter, setDifficultyFilter] = useState('all');

    useEffect(() => {
        if (!selectedWorkout || isModalOpen) return;
        const onKeyDown = (e) => {
            if (e.key === 'Escape' || e.key === 'Esc') {
                setSelectedWorkout(null);
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [selectedWorkout, isModalOpen]);

    const filteredWorkouts = useMemo(() => {
        if (!workouts) return [];
        return workouts.filter(w => {
            const matchesSearch = !searchTerm || (w.title && w.title.toLowerCase().includes(searchTerm.toLowerCase())) || (w.description && w.description.toLowerCase().includes(searchTerm.toLowerCase()));
            const matchesDifficulty = difficultyFilter === 'all' || w.difficulty === difficultyFilter;
            return matchesSearch && matchesDifficulty;
        });
    }, [workouts, searchTerm, difficultyFilter]);

    if (selectedWorkout) {
        return (
            <WorkoutDetails
                workout={selectedWorkout}
                onBack={() => setSelectedWorkout(null)}
                allExercises={exercises}
            />
        );
    }

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

    const handleDeleteWorkout = async (e, workout) => {
        e.stopPropagation();
        if (!confirm(`Tem certeza que deseja excluir "${workout.title}"?`)) {
            return;
        }

        try {
            await supabaseHelpers.deleteWorkout(workout.id);
            alert('Treino excluído com sucesso!');
            reload();
            if (selectedWorkout?.id === workout.id) {
                setSelectedWorkout(null);
            }
        } catch (err) {
            console.error('Error deleting workout:', err);
            alert('Erro ao excluir treino: ' + err.message);
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
        return (
            <div className="loading-container">
                <Loader2 size={48} className="spinner" />
                <p>Carregando treinos...</p>
            </div>
        );
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
                            onClick={() => setSelectedWorkout(workout)}
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
        </div>
    );
};

export default Workouts;
