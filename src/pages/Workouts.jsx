import { useState, useEffect, useMemo } from 'react';
import { useWorkouts, useExercises } from '../hooks/useSupabase';
import { supabaseHelpers } from '../lib/supabase';
import { Calendar, Clock, ChevronLeft, Dumbbell, Info, Loader2, Plus, Edit2, Trash2, Search } from 'lucide-react';
import WorkoutModal from '../components/WorkoutModal';
import './Workouts.css';



const Workouts = () => {
    const { workouts, loading: workoutsLoading, error: workoutsError, reload } = useWorkouts();
    const { exercises, loading: exercisesLoading } = useExercises();
    const [selectedWorkout, setSelectedWorkout] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingWorkout, setEditingWorkout] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [difficultyFilter, setDifficultyFilter] = useState('all');

    const getExerciseDetails = (id) => {
        return exercises.find(ex => ex.id === id) || { name: 'Exercício não encontrado', muscle_group: '-' };
    };

    // Accordion state: which days are open and which exercise details are open
    const [openDays, setOpenDays] = useState(() => new Set());
    const [openExercises, setOpenExercises] = useState(() => ({}));

    const toggleDay = (dayIndex) => {
        setOpenDays(prev => {
            const next = new Set(prev);
            if (next.has(dayIndex)) next.delete(dayIndex);
            else next.add(dayIndex);
            return next;
        });
    };

    const toggleExercise = (dayIndex, exIndex) => {
        const key = `${dayIndex}-${exIndex}`;
        setOpenExercises(prev => ({ ...prev, [key]: !prev[key] }));
    };

    useEffect(() => {
        // Close expanded workout detail with ESC when it's open
        // but don't intercept if a modal is open for editing
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
            <div className="workouts-container">
                <button className="back-btn" onClick={() => setSelectedWorkout(null)}>
                    <ChevronLeft size={20} />
                    Voltar para lista
                </button>

                <div className="workout-details">
                    <div className="workouts-header">
                        <h1>{selectedWorkout.title}</h1>
                        <p>{selectedWorkout.description}</p>
                        <div className="plan-meta" style={{ marginTop: '1rem' }}>
                            <div className="meta-item">
                                <Clock size={16} />
                                {selectedWorkout.estimated_duration} min/sessão
                            </div>
                            <div className="meta-item">
                                <Calendar size={16} />
                                {selectedWorkout.days_per_week} dias/semana
                            </div>
                        </div>
                    </div>

                    <div className="days-list">
                        {selectedWorkout.schedule.map((day, index) => {
                            const dayOpen = openDays.has(index);
                            return (
                                <div key={index} className={`day-card ${dayOpen ? 'open' : 'collapsed'}`}>
                                    <button
                                        type="button"
                                        className="day-title clickable"
                                        onClick={() => toggleDay(index)}
                                        aria-expanded={dayOpen}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <Dumbbell size={18} />
                                            <div>{day.day_name}</div>
                                        </div>
                                        <div className="day-meta">{(day.exercises || []).length} exercícios</div>
                                    </button>

                                    <div className="exercises-list" style={{ display: dayOpen ? 'block' : 'none' }}>
                                        {day.exercises.map((exItem, idx) => {
                                            const details = getExerciseDetails(exItem.exercise_id);
                                            const key = `${index}-${idx}`;
                                            const exerciseOpen = !!openExercises[key];
                                            return (
                                                <div key={idx} className={`exercise-item ${exerciseOpen ? 'open' : 'collapsed'}`}>
                                                    <div className="exercise-main" onClick={() => toggleExercise(index, idx)} role="button" tabIndex={0} onKeyDown={(e)=>{ if(e.key==='Enter'||e.key===' ') toggleExercise(index, idx); }}>
                                                        <div className="exercise-info">
                                                            <h4 className="exercise-name">{details.name}</h4>
                                                            <div className="exercise-sub">{details.muscle_group} · {details.equipment || ''}</div>
                                                        </div>
                                                        <div className="exercise-sets">{exItem.sets}x</div>
                                                        <div className="exercise-reps">{exItem.reps}</div>
                                                    </div>

                                                    <div className="exercise-details" style={{ display: exerciseOpen ? 'block' : 'none' }}>
                                                        {exItem.notes && (
                                                            <div className="exercise-notes">
                                                                <Info size={12} style={{ display: 'inline', marginRight: 6 }} />
                                                                {exItem.notes}
                                                            </div>
                                                        )}
                                                        {/* if we have more details in `details`, show them */}
                                                        {details.instructions && details.instructions.length > 0 && (
                                                            <div className="exercise-instructions">
                                                                <strong>Instruções:</strong>
                                                                <ul>
                                                                    {details.instructions.map((ins, i) => <li key={i}>{ins}</li>)}
                                                                </ul>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    // Loading state

    if (workoutsLoading || exercisesLoading) {
        return (
            <div className="workouts-container">
                <div className="workouts-header">
                    <h1>Meus Treinos</h1>
                    <p>Carregando treinos...</p>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                    <Loader2 size={48} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
                </div>
            </div>
        );
    }

    // Error state
    if (workoutsError) {
        return (
            <div className="workouts-container">
                <div className="workouts-header">
                    <h1>Meus Treinos</h1>
                    <p style={{ color: 'var(--error, #ef4444)' }}>
                        ⚠️ Erro ao carregar treinos: {workoutsError}
                    </p>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        Usando dados locais como fallback.
                    </p>
                </div>
            </div>
        );
    }

    // CRUD Handlers
    const handleCreateWorkout = () => {
        setEditingWorkout(null);
        setIsModalOpen(true);
    };

    const handleEditWorkout = (e, workout) => {
        e.stopPropagation(); // Prevent card click
        setEditingWorkout(workout);
        setIsModalOpen(true);
    };

    const handleDeleteWorkout = async (e, workout) => {
        e.stopPropagation(); // Prevent card click
        if (!confirm(`Tem certeza que deseja excluir "${workout.title}"?`)) {
            return;
        }

        try {
            await supabaseHelpers.deleteWorkout(workout.id);
            alert('Treino excluído com sucesso!');
            reload(); // Reload the workouts list
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
                // Update existing workout
                await supabaseHelpers.updateWorkout(editingWorkout.id, workoutData);
                alert('Treino atualizado com sucesso!');
            } else {
                // Create new workout
                await supabaseHelpers.createWorkout(workoutData);
                alert('Treino criado com sucesso!');
            }
            setIsModalOpen(false);
            reload(); // Reload the workouts list
        } catch (err) {
            console.error('Error saving workout:', err);
            alert('Erro ao salvar treino: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="workouts-container">
            <div className="workouts-header compact">
                <div>
                    <h1>Meus Treinos</h1>
                    <p>Selecione um programa para ver os detalhes.</p>
                </div>
                <button className="add-workout-btn" onClick={handleCreateWorkout} title="Criar novo treino">
                    <Plus size={20} />
                    Novo Treino
                </button>
            </div>

            {/* compact stats and search area */}
            <div className="workouts-topbar">
                <div className="workouts-stats">
                    <div className="stat-chip">Total: {filteredWorkouts.length}</div>
                </div>
                <div className="filter-bar compact">
                    <div className="search-box">
                        <Search className="search-icon" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar treinos..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select className="filter-select compact" value={difficultyFilter} onChange={(e) => setDifficultyFilter(e.target.value)}>
                        <option value="all">Todos</option>
                        <option value="Iniciante">Iniciante</option>
                        <option value="Intermediário">Intermediário</option>
                        <option value="Avançado">Avançado</option>
                    </select>
                </div>
            </div>

            <div className="plans-grid">
                {filteredWorkouts.map(workout => (
                    <div
                        key={workout.id}
                        className="plan-card"
                        onClick={() => setSelectedWorkout(workout)}
                    >
                        <div className="plan-header">
                            <h3 className="plan-title">{workout.title}</h3>
                            <div className="plan-actions">
                                <span className="plan-difficulty">{workout.difficulty}</span>
                                <div className="action-buttons">
                                    <button
                                        className="icon-btn"
                                        onClick={(e) => handleEditWorkout(e, workout)}
                                        title="Editar treino"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        className="icon-btn"
                                        onClick={(e) => handleDeleteWorkout(e, workout)}
                                        title="Excluir treino"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                        <p className="plan-description">
                            {workout.description.length > 100
                                ? workout.description.substring(0, 100) + '...'
                                : workout.description}
                        </p>
                        <div className="plan-meta">
                            <div className="meta-item">
                                <Clock size={14} />
                                {workout.estimated_duration} min
                            </div>
                            <div className="meta-item">
                                <Calendar size={14} />
                                {workout.days_per_week} dias/sem
                            </div>
                        </div>
                    </div>
                ))}
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
