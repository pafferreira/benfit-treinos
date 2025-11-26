import { useState, useMemo } from 'react';
import { useExercises } from '../hooks/useSupabase';
import { Search, Filter, Plus, Edit2, Trash2, Target, Package, Loader2 } from 'lucide-react';
import './Exercises.css';



const Exercises = () => {
    const { exercises, loading, error } = useExercises();
    const [searchTerm, setSearchTerm] = useState('');
    const [muscleFilter, setMuscleFilter] = useState('all');
    const [equipmentFilter, setEquipmentFilter] = useState('all');


    // Get unique muscle groups and equipment types
    const muscleGroups = useMemo(() => {
        const groups = [...new Set(exercises.map(ex => ex.muscle_group))];
        return groups.sort();
    }, []);

    const equipmentTypes = useMemo(() => {
        const types = [...new Set(exercises.map(ex => ex.equipment))];
        return types.sort();
    }, []);

    // Filter exercises
    const filteredExercises = useMemo(() => {
        return exercises.filter(exercise => {
            const matchesSearch = exercise.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                exercise.muscle_group.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesMuscle = muscleFilter === 'all' || exercise.muscle_group === muscleFilter;
            const matchesEquipment = equipmentFilter === 'all' || exercise.equipment === equipmentFilter;

            return matchesSearch && matchesMuscle && matchesEquipment;
        });
    }, [searchTerm, muscleFilter, equipmentFilter]);

    // Stats
    const stats = {
        total: exercises.length,
        filtered: filteredExercises.length,
        muscleGroups: muscleGroups.length,
        equipmentTypes: equipmentTypes.length
    };

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
                <h1>Lista de Exercícios</h1>
                <p>Biblioteca completa de exercícios para montar seus treinos</p>
            </div>

            {/* Stats */}
            <div className="stats-bar">
                <div className="stat-item">
                    <div className="stat-value">{stats.total}</div>
                    <div className="stat-label">Total de Exercícios</div>
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

            {/* Filter Bar */}
            <div className="filter-bar">
                <div className="search-box">
                    <Search className="search-icon" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar exercícios..."
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
                    {muscleGroups.map(group => (
                        <option key={group} value={group}>{group}</option>
                    ))}
                </select>

                <select
                    className="filter-select"
                    value={equipmentFilter}
                    onChange={(e) => setEquipmentFilter(e.target.value)}
                >
                    <option value="all">Todos os Equipamentos</option>
                    {equipmentTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                    ))}
                </select>

                <button className="add-exercise-btn">
                    <Plus size={20} />
                    Adicionar Exercício
                </button>
            </div>

            {/* Results count */}
            {searchTerm || muscleFilter !== 'all' || equipmentFilter !== 'all' ? (
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                    Mostrando {filteredExercises.length} de {exercises.length} exercícios
                </p>
            ) : null}

            {/* Exercises Grid */}
            {filteredExercises.length > 0 ? (
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
                                    <button className="action-btn" title="Editar">
                                        <Edit2 size={16} />
                                    </button>
                                    <button className="action-btn" title="Excluir">
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
                <div className="empty-state">
                    <Search size={64} />
                    <h3>Nenhum exercício encontrado</h3>
                    <p>Tente ajustar os filtros ou buscar por outro termo.</p>
                </div>
            )}
        </div>
    );
};

export default Exercises;
