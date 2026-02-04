import { useState, useMemo, useEffect } from 'react';
import { useExercises } from '../hooks/useSupabase';
import { supabaseHelpers } from '../lib/supabase';
import { Search, Plus, Edit2, Trash2, Target, Package, Loader2, LayoutGrid, List } from 'lucide-react';
import ExerciseModal from '../components/ExerciseModal';
import ConfirmationModal from '../components/ConfirmationModal';
import './Exercises.css';

const Exercises = () => {
    const { exercises, loading, error, reload } = useExercises();
    const [searchTerm, setSearchTerm] = useState('');
    const [muscleFilter, setMuscleFilter] = useState('all');
    const [equipmentFilter, setEquipmentFilter] = useState('all');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedExercise, setSelectedExercise] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [viewMode, setViewMode] = useState(() => localStorage.getItem('exercises-view') || 'grid');
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

    const filteredExercises = useMemo(() => {
        return exercises.filter(exercise => {
            const q = searchTerm.trim().toLowerCase();
            const matchesSearch = !q || [
                exercise.name,
                exercise.muscle_group,
                exercise.equipment,
                (exercise.tags || []).join(' '),
                (Array.isArray(exercise.instructions) ? exercise.instructions.join(' ') : exercise.instructions || '')
            ].some(field => (field || '').toString().toLowerCase().includes(q));
            const matchesMuscle = muscleFilter === 'all' || exercise.muscle_group === muscleFilter;
            const matchesEquipment = equipmentFilter === 'all' || exercise.equipment === equipmentFilter;

            return matchesSearch && matchesMuscle && matchesEquipment;
        });
    }, [exercises, searchTerm, muscleFilter, equipmentFilter]);

    const stats = useMemo(() => {
        const uniqueMuscles = new Set(filteredExercises.map(ex => ex.muscle_group));
        const uniqueEquipment = new Set(filteredExercises.map(ex => ex.equipment));

        return {
            total: filteredExercises.length,
            muscleGroups: uniqueMuscles.size,
            equipmentTypes: uniqueEquipment.size
        };
    }, [filteredExercises]);

    const filterOptions = useMemo(() => {
        const muscles = [...new Set(exercises.map(ex => ex.muscle_group))].sort();
        const equipment = [...new Set(exercises.map(ex => ex.equipment))].sort();
        return { muscles, equipment };
    }, [exercises]);

    const handleCreateExercise = () => {
        setSelectedExercise(null);
        setIsModalOpen(true);
    };

    const handleEditExercise = (exercise) => {
        setSelectedExercise(exercise);
        setIsModalOpen(true);
    };

    const handleDeleteExercise = (exercise) => {
        setConfirmModal({
            isOpen: true,
            title: 'Excluir Exercício',
            message: `Tem certeza que deseja excluir o exercício "${exercise.name}"? Esta ação não pode ser desfeita e pode afetar treinos existentes.`,
            onConfirm: () => confirmDeleteExercise(exercise)
        });
    };

    const confirmDeleteExercise = async (exercise) => {
        try {
            await supabaseHelpers.deleteExercise(exercise.id);
            // alert('Exercício excluído com sucesso!'); // Optional
            reload();
        } catch (err) {
            console.error('Error deleting exercise:', err);
            alert('Erro ao excluir exercício: ' + err.message);
        } finally {
            setConfirmModal({ ...confirmModal, isOpen: false });
        }
    };

    const handleSaveExercise = async (exerciseData) => {
        setIsSaving(true);
        try {
            if (selectedExercise) {
                await supabaseHelpers.updateExercise(selectedExercise.id, exerciseData);
                alert('Exercício atualizado com sucesso!');
            } else {
                await supabaseHelpers.createExercise(exerciseData);
                alert('Exercício criado com sucesso!');
            }
            setIsModalOpen(false);
            reload();
        } catch (err) {
            console.error('Error saving exercise:', err);
            alert('Erro ao salvar exercício: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    useEffect(() => {
        try {
            localStorage.setItem('exercises-view', viewMode);
        } catch (err) {
            // ignore
        }
    }, [viewMode]);

    if (loading) {
        return (
            <div className="loading-container">
                <Loader2 size={48} className="spinner" />
                <p>Carregando exercícios...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="error-container">
                <p>⚠️ Erro ao carregar exercícios: {error}</p>
            </div>
        );
    }

    return (
        <div className="exercises-container">
            {/* Stats */}
            <div className="stats-bar">
                <div className="stat-item">
                    <div className="stat-value">{stats.total}</div>
                    <div className="stat-label">Exercícios</div>
                </div>
                <div className="stat-item">
                    <div className="stat-value">{stats.muscleGroups}</div>
                    <div className="stat-label">Músculos</div>
                </div>
                <div className="stat-item">
                    <div className="stat-value">{stats.equipmentTypes}</div>
                    <div className="stat-label">Equipamentos</div>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="filter-bar">
                <div className="search-box">
                    <Search className="search-icon" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar exercícios..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="filters-row">
                    <select
                        className="filter-select"
                        value={muscleFilter}
                        onChange={(e) => setMuscleFilter(e.target.value)}
                    >
                        <option value="all">Todos Músculos</option>
                        {filterOptions.muscles.map(group => (
                            <option key={group} value={group}>{group}</option>
                        ))}
                    </select>

                    <select
                        className="filter-select"
                        value={equipmentFilter}
                        onChange={(e) => setEquipmentFilter(e.target.value)}
                    >
                        <option value="all">Todos Equipamentos</option>
                        {filterOptions.equipment.map(type => (
                            <option key={type} value={type}>{type}</option>
                        ))}
                    </select>
                </div>

                <div className="view-toggle">
                    <button
                        className={`toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                        onClick={() => setViewMode('grid')}
                        title="Grade"
                    >
                        <LayoutGrid size={20} />
                    </button>
                    <button
                        className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
                        onClick={() => setViewMode('list')}
                        title="Lista"
                    >
                        <List size={20} />
                    </button>
                </div>
            </div>

            {/* Exercises Content */}
            {filteredExercises.length > 0 ? (
                viewMode === 'grid' ? (
                    <div className="exercises-grid">
                        {filteredExercises.map(exercise => (
                            <div key={exercise.id} className="exercise-card">
                                <div className="exercise-card-header">
                                    <div>
                                        <h3 className="exercise-name">{exercise.name}</h3>
                                        <div className="exercise-muscle">
                                            <Target size={14} />
                                            {exercise.muscle_group}
                                        </div>
                                    </div>
                                    <div className="exercise-actions">
                                        <button
                                            className="action-btn"
                                            onClick={() => handleEditExercise(exercise)}
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            className="action-btn"
                                            onClick={() => handleDeleteExercise(exercise)}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                <div className="exercise-equipment">
                                    <Package size={14} />
                                    {exercise.equipment}
                                </div>

                                {exercise.tags && exercise.tags.length > 0 && (
                                    <div className="exercise-tags">
                                        {exercise.tags.map((tag, idx) => (
                                            <span key={idx} className="tag">{tag}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="exercises-list-view">
                        {filteredExercises.map(exercise => (
                            <div key={exercise.id} className="exercise-list-item">
                                <div className="list-item-main">
                                    <h3 className="exercise-name">{exercise.name}</h3>
                                    <div className="list-item-meta">
                                        <span className="meta-tag"><Target size={14} /> {exercise.muscle_group}</span>
                                        <span className="meta-tag"><Package size={14} /> {exercise.equipment}</span>
                                    </div>
                                </div>
                                <div className="exercise-actions">
                                    <button
                                        className="action-btn"
                                        onClick={() => handleEditExercise(exercise)}
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        className="action-btn"
                                        onClick={() => handleDeleteExercise(exercise)}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            ) : (
                <div className="empty-state">
                    <Search size={48} />
                    <h3>Nenhum exercício encontrado</h3>
                    <p>Tente ajustar os filtros.</p>
                </div>
            )}

            {/* Floating Add Button */}
            <button className="add-exercise-btn" onClick={handleCreateExercise}>
                <Plus size={24} />
            </button>

            {/* Exercise Modal */}
            <ExerciseModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveExercise}
                exercise={selectedExercise}
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

export default Exercises;
