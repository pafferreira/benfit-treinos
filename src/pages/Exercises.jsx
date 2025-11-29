import { useState, useMemo, useEffect } from 'react';
import { useExercises } from '../hooks/useSupabase';
import { supabaseHelpers } from '../lib/supabase';
import { Search, Filter, Plus, Edit2, Trash2, Target, Package, Loader2, LayoutGrid, List } from 'lucide-react';
import ExerciseModal from '../components/ExerciseModal';
import './Exercises.css';

const Exercises = () => {
    const { exercises, loading, error, reload } = useExercises();
    const [searchTerm, setSearchTerm] = useState('');
    const [muscleFilter, setMuscleFilter] = useState('all');
    const [equipmentFilter, setEquipmentFilter] = useState('all');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedExercise, setSelectedExercise] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [viewMode, setViewMode] = useState(() => localStorage.getItem('exercises-view') || 'grid'); // 'grid' or 'list'

    // Filter exercises
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

    // Stats based STRICTLY on filtered results
    const stats = useMemo(() => {
        const uniqueMuscles = new Set(filteredExercises.map(ex => ex.muscle_group));
        const uniqueEquipment = new Set(filteredExercises.map(ex => ex.equipment));

        return {
            total: filteredExercises.length,
            muscleGroups: uniqueMuscles.size,
            equipmentTypes: uniqueEquipment.size
        };
    }, [filteredExercises]);

    // Available options for dropdowns (should remain static or based only on search to allow changing filters)
    const filterOptions = useMemo(() => {
        const muscles = [...new Set(exercises.map(ex => ex.muscle_group))].sort();
        const equipment = [...new Set(exercises.map(ex => ex.equipment))].sort();
        return { muscles, equipment };
    }, [exercises]);

    // CRUD Handlers
    const handleCreateExercise = () => {
        setSelectedExercise(null);
        setIsModalOpen(true);
    };

    const handleEditExercise = (exercise) => {
        setSelectedExercise(exercise);
        setIsModalOpen(true);
    };

    const handleDeleteExercise = async (exercise) => {
        if (!confirm(`Tem certeza que deseja excluir "${exercise.name}"?`)) {
            return;
        }

        try {
            await supabaseHelpers.deleteExercise(exercise.id);
            alert('Exercício excluído com sucesso!');
            reload(); // Reload the exercises list
        } catch (err) {
            console.error('Error deleting exercise:', err);
            alert('Erro ao excluir exercício: ' + err.message);
        }
    };

    const handleSaveExercise = async (exerciseData) => {
        setIsSaving(true);
        try {
            if (selectedExercise) {
                // Update existing exercise
                await supabaseHelpers.updateExercise(selectedExercise.id, exerciseData);
                alert('Exercício atualizado com sucesso!');
            } else {
                // Create new exercise
                await supabaseHelpers.createExercise(exerciseData);
                alert('Exercício criado com sucesso!');
            }
            setIsModalOpen(false);
            reload(); // Reload the exercises list
        } catch (err) {
            console.error('Error saving exercise:', err);
            alert('Erro ao salvar exercício: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    // Persist the user's chosen view mode (grid/list) to localStorage
    useEffect(() => {
        try {
            localStorage.setItem('exercises-view', viewMode);
        } catch (err) {
            // Safari private mode or other storage errors
        }
    }, [viewMode]);

    // Loading state
    if (loading) {
        return (
            <div className="exercises-container">
                <div className="exercises-header">
                    <h1>Lista de Exercícios</h1>
                    <p>Carregando exercícios...</p>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                    <Loader2 size={48} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="exercises-container">
                <div className="exercises-header">
                    <h1>Lista de Exercícios</h1>
                    <p style={{ color: 'var(--error, #ef4444)' }}>
                        ⚠️ Erro ao carregar exercícios: {error}
                    </p>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        Usando dados locais como fallback.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="exercises-container">
            <div className="exercises-header">
                <div>
                    <h1>Lista de Exercícios</h1>
                    <p>Biblioteca completa de exercícios para montar seus treinos</p>
                </div>
                <button className="add-exercise-btn" onClick={handleCreateExercise} title="Adicionar novo exercício">
                    <Plus size={20} />
                    Novo Exercício
                </button>
            </div>

            {/* Stats */}
            <div className="stats-bar">
                <div className="stat-item">
                    <div className="stat-value">{stats.total}</div>
                    <div className="stat-label">Exercícios Encontrados</div>
                </div>
                <div className="stat-item">
                    <div className="stat-value">{stats.muscleGroups}</div>
                    <div className="stat-label">Grupos Musculares</div>
                </div>
                <div className="stat-item">
                    <div className="stat-value">{stats.equipmentTypes}</div>
                    <div className="stat-label">Tipos de Equipamento</div>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="filter-bar">
                <div className="search-box">
                    <Search className="search-icon" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar por nome, músculo, equipamento, tags, instruções..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <select
                    className="filter-select"
                    value={muscleFilter}
                    onChange={(e) => setMuscleFilter(e.target.value)}
                >
                    <option value="all">Todos os Músculos</option>
                    {filterOptions.muscles.map(group => (
                        <option key={group} value={group}>{group}</option>
                    ))}
                </select>

                <select
                    className="filter-select"
                    value={equipmentFilter}
                    onChange={(e) => setEquipmentFilter(e.target.value)}
                >
                    <option value="all">Todos os Equipamentos</option>
                    {filterOptions.equipment.map(type => (
                        <option key={type} value={type}>{type}</option>
                    ))}
                </select>

                <button
                    className="search-btn"
                    onClick={() => { /* mantém compatibilidade com busca instantânea; foco no input */
                        const el = document.querySelector('.search-box input');
                        if (el) el.focus();
                    }}
                    title="Buscar"
                >
                    Buscar
                </button>

                <div className="view-toggle">
                    <button
                        className={`toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                        aria-pressed={viewMode === 'grid'}
                        onClick={() => setViewMode('grid')}
                        title="Visualização em Grade"
                    >
                        <LayoutGrid size={20} />
                    </button>
                    <button
                        className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
                        aria-pressed={viewMode === 'list'}
                        onClick={() => setViewMode('list')}
                        title="Visualização em Lista"
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
                                            title="Editar exercício"
                                            onClick={() => handleEditExercise(exercise)}
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            className="action-btn"
                                            title="Excluir exercício"
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

                                {exercise.tags && exercise.tags.length > 0 && (
                                    <div className="list-item-tags">
                                        {exercise.tags.map((tag, idx) => (
                                            <span key={idx} className="tag">{tag}</span>
                                        ))}
                                    </div>
                                )}

                                <div className="exercise-actions">
                                    <button
                                        className="action-btn"
                                        title="Editar exercício"
                                        onClick={() => handleEditExercise(exercise)}
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        className="action-btn"
                                        title="Excluir exercício"
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
                    <Search size={64} />
                    <h3>Nenhum exercício encontrado</h3>
                    <p>Tente ajustar os filtros ou buscar por outro termo.</p>
                </div>
            )}

            {/* Exercise Modal */}
            <ExerciseModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveExercise}
                exercise={selectedExercise}
                isLoading={isSaving}
            />
        </div>
    );
};

export default Exercises;
