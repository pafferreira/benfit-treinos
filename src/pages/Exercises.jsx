import { useState, useMemo, useEffect } from 'react';
import { useExercises } from '../hooks/useSupabase';
import { supabaseHelpers } from '../lib/supabase';
import { Search, Plus, Edit2, Trash2, Target, Package, LayoutGrid, List, Dumbbell, Filter, X } from 'lucide-react';
import ExerciseModal from '../components/ExerciseModal';
import ConfirmationModal from '../components/ConfirmationModal';
import { Skeleton } from '../components/Skeleton';
import Tooltip from '../components/Tooltip';

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
            } else {
                await supabaseHelpers.createExercise(exerciseData);
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
            <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-500">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col gap-2">
                            <Skeleton className="h-8 w-12" />
                            <Skeleton className="h-4 w-24" />
                        </div>
                    ))}
                </div>
                <div className="flex flex-col md:flex-row gap-4">
                    <Skeleton className="h-12 w-full rounded-xl" />
                    <Skeleton className="h-12 w-48 rounded-xl" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                        <div key={i} className="rounded-2xl overflow-hidden shadow-sm bg-white">
                            <Skeleton className="w-full h-48" />
                            <div className="p-4 space-y-3">
                                <Skeleton className="h-6 w-3/4 rounded-md" />
                                <div className="flex gap-2">
                                    <Skeleton className="h-5 w-16 rounded-full" />
                                    <Skeleton className="h-5 w-16 rounded-full" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center bg-red-50 rounded-3xl border border-red-100 mx-4 mt-8">
                <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4">
                    <Dumbbell size={32} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Ops, algo deu errado</h3>
                <p className="text-gray-600 mb-6 max-w-md">Não conseguimos carregar seus exercícios no momento. Tente novamente.</p>
                <button onClick={reload} className="btn-primary w-auto inline-flex items-center justify-center">
                    Tentar novamente
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col w-full min-h-screen bg-gray-50/50 pb-24">
            {/* Header Hero Section */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    {/* Stats Compact Row */}
                    <div className="flex items-center gap-3 mb-4 overflow-x-auto pb-2 scrollbar-hide">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50/50 rounded-lg border border-blue-100/50 whitespace-nowrap">
                            <span className="text-sm font-bold text-blue-700">{stats.total}</span>
                            <span className="text-xs font-medium text-blue-500 uppercase">Exercícios</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50/50 rounded-lg border border-emerald-100/50 whitespace-nowrap">
                            <span className="text-sm font-bold text-emerald-700">{stats.muscleGroups}</span>
                            <span className="text-xs font-medium text-emerald-500 uppercase">Grupos</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50/50 rounded-lg border border-purple-100/50 whitespace-nowrap">
                            <span className="text-sm font-bold text-purple-700">{stats.equipmentTypes}</span>
                            <span className="text-xs font-medium text-purple-500 uppercase">Equipamentos</span>
                        </div>
                    </div>

                    {/* Search & Filters */}
                    <div className="flex flex-col gap-3">
                        {/* Row 1: Search + View Toggles */}
                        <div className="flex items-center gap-3 w-full">
                            <div className="relative flex-1 group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Search className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                </div>
                                <input
                                    type="text"
                                    className="block w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all sm:text-sm shadow-sm"
                                    placeholder="Buscar exercício..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                {searchTerm && (
                                    <button
                                        onClick={() => setSearchTerm('')}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>

                            <div className="flex bg-gray-100 p-1 rounded-xl shrink-0">
                                <Tooltip content="Visualização em Grade">
                                    <button
                                        onClick={() => setViewMode('grid')}
                                        className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                    >
                                        <LayoutGrid size={20} />
                                    </button>
                                </Tooltip>
                                <Tooltip content="Visualização em Lista">
                                    <button
                                        onClick={() => setViewMode('list')}
                                        className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                    >
                                        <List size={20} />
                                    </button>
                                </Tooltip>
                            </div>
                        </div>

                        {/* Row 2: Filters Dropdowns */}
                        <div className="grid grid-cols-2 gap-3 w-full">
                            <div className="relative">
                                <Tooltip content="Filtrar por Grupo Muscular" className="w-full">
                                    <select
                                        value={muscleFilter}
                                        onChange={(e) => setMuscleFilter(e.target.value)}
                                        className="w-full appearance-none pl-10 pr-8 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm transition-all cursor-pointer"
                                    >
                                        <option value="all">Todos Músculos</option>
                                        {filterOptions.muscles.map(group => (
                                            <option key={group} value={group}>{group}</option>
                                        ))}
                                    </select>
                                </Tooltip>
                                <Target className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                            </div>

                            <div className="relative">
                                <Tooltip content="Filtrar por Equipamento" className="w-full">
                                    <select
                                        value={equipmentFilter}
                                        onChange={(e) => setEquipmentFilter(e.target.value)}
                                        className="w-full appearance-none pl-10 pr-8 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm transition-all cursor-pointer"
                                    >
                                        <option value="all">Todos Eqp.</option>
                                        {filterOptions.equipment.map(type => (
                                            <option key={type} value={type}>{type}</option>
                                        ))}
                                    </select>
                                </Tooltip>
                                <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
                {filteredExercises.length > 0 ? (
                    viewMode === 'grid' ? (
                        <div className="grid grid-cols-1 gap-6">
                            {filteredExercises.map(exercise => (
                                <div key={exercise.id} onClick={() => handleEditExercise(exercise)} className="group bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl hover:border-blue-100 transition-all duration-300 flex flex-col md:flex-row h-full cursor-pointer">
                                    {/* Image Container - Larger in single column view */}
                                    <div className="relative w-full md:w-1/3 aspect-[4/3] md:aspect-auto bg-gray-50 overflow-hidden">
                                        <img
                                            src={exercise.image_url ?
                                                (exercise.image_url.startsWith('http') ? exercise.image_url :
                                                    `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/exercises/${exercise.image_url}`)
                                                : (exercise.video_url || 'https://via.placeholder.com/400x300')}
                                            alt={exercise.name}
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                            onError={(e) => {
                                                e.target.onerror = null;
                                                e.target.src = 'https://via.placeholder.com/400x300?text=Sem+Imagem';
                                            }}
                                        />
                                        {/* Overlay Actions */}
                                        <div className="absolute top-2 right-2 flex gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">

                                            <Tooltip content="Excluir Exercício">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteExercise(exercise); }}
                                                    className="bg-white/90 backdrop-blur-sm hover:bg-white text-red-500 p-2 rounded-xl shadow-lg transition-transform hover:scale-105 active:scale-95"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </Tooltip>
                                        </div>

                                        {/* Muscle Badge */}
                                        <div className="absolute bottom-2 left-2 pointer-events-none">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/90 backdrop-blur-sm text-gray-800 shadow-sm border border-gray-200/50">
                                                <Target size={12} className="mr-1 text-blue-500" />
                                                {exercise.muscle_group}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Card Content */}
                                    <div className="p-6 flex flex-col flex-1 gap-2">
                                        <div className="flex justify-between items-start">
                                            <h3 className="text-xl font-bold text-gray-900 leading-tight">
                                                {exercise.name}
                                            </h3>
                                        </div>

                                        <p className="text-sm text-gray-500 line-clamp-2 md:line-clamp-3">
                                            {(Array.isArray(exercise.instructions) ? exercise.instructions.join(' ') : exercise.instructions || 'Sem instruções.')}
                                        </p>

                                        <div className="mt-auto pt-4 flex items-center gap-3">
                                            <span className="inline-flex items-center text-sm font-medium text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg">
                                                <Package size={14} className="mr-2 text-gray-500" />
                                                {exercise.equipment}
                                            </span>
                                            {exercise.tags && exercise.tags.length > 0 && (
                                                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg uppercase tracking-wide">
                                                    {exercise.tags[0]}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3 w-full">
                            {filteredExercises.map(exercise => (
                                <div key={exercise.id} onClick={() => handleEditExercise(exercise)} className="group bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-100 transition-all flex items-center gap-4 w-full cursor-pointer">
                                    <div className="h-16 w-16 rounded-xl bg-gray-100 shrink-0 overflow-hidden relative">
                                        <img
                                            src={exercise.image_url ?
                                                (exercise.image_url.startsWith('http') ? exercise.image_url :
                                                    `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/exercises/${exercise.image_url}`)
                                                : (exercise.video_url || 'https://via.placeholder.com/150')}
                                            alt={exercise.name}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                e.target.onerror = null;
                                                e.target.src = 'https://via.placeholder.com/150';
                                            }}
                                        />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-base font-bold text-gray-900 truncate">{exercise.name}</h3>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="inline-flex items-center text-xs text-gray-500">
                                                <Target size={12} className="mr-1 text-blue-500" />
                                                {exercise.muscle_group}
                                            </span>
                                            <span className="inline-flex items-center text-xs text-gray-500">
                                                <Package size={12} className="mr-1 text-gray-400" />
                                                {exercise.equipment}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">

                                        <Tooltip content="Excluir Exercício">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDeleteExercise(exercise); }}
                                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </Tooltip>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                ) : (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                            <Filter size={32} className="text-gray-300" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Nenhum exercício encontrado</h3>
                        <p className="text-gray-500 max-w-sm mx-auto">
                            Tente buscar por outro termo ou ajuste os filtros de músculo e equipamento.
                        </p>
                        <button
                            onClick={() => { setSearchTerm(''); setMuscleFilter('all'); setEquipmentFilter('all'); }}
                            className="mt-6 text-blue-600 font-medium hover:text-blue-700 hover:underline"
                        >
                            Limpar filtros
                        </button>
                    </div>
                )}
            </div>

            {/* Floating FAB - Premium Gradient */}
            <Tooltip content="Adicionar Novo Exercício">
                <button
                    onClick={handleCreateExercise}
                    className="fixed bottom-8 right-8 w-16 h-16 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-full shadow-lg shadow-blue-600/30 flex items-center justify-center transition-transform hover:scale-110 active:scale-95 z-40 group"
                >
                    <Plus size={32} className="transition-transform group-hover:rotate-90" />
                </button>
            </Tooltip>

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
