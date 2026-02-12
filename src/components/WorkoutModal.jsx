import { useState, useEffect } from 'react';
import Modal from './Modal';
import { X, Plus, Trash2, ChevronDown } from 'lucide-react';
import { useExercises } from '../hooks/useSupabase';
import './WorkoutModal.css';

const WorkoutModal = ({ isOpen, onClose, onSave, workout = null, isLoading = false }) => {
    const { exercises } = useExercises();
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        difficulty: 'Iniciante',
        estimated_duration: 60,
        days_per_week: 3,
        is_public: true
    });

    const [schedule, setSchedule] = useState([]);
    const [openDays, setOpenDays] = useState([]); // Default all closed

    useEffect(() => {
        if (workout) {
            setFormData({
                title: workout.title || '',
                description: workout.description || '',
                difficulty: workout.difficulty || 'Iniciante',
                estimated_duration: workout.estimated_duration || 60,
                days_per_week: workout.days_per_week || 3,
                is_public: workout.is_public !== undefined ? workout.is_public : true
            });
            setSchedule(workout.schedule || []);
        } else {
            setFormData({
                title: '',
                description: '',
                difficulty: 'Iniciante',
                estimated_duration: 60,
                days_per_week: 3,
                is_public: true
            });
            setSchedule([{ day_name: 'Dia 1', exercises: [] }]);
        }
    }, [workout, isOpen]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    // Schedule Management
    const toggleDay = (index) => {
        // Se já estiver aberto, fecha. Se não, abre este e fecha os outros.
        setOpenDays(prev =>
            prev.includes(index) ? [] : [index]
        );
    };

    const addDay = () => {
        const newIndex = schedule.length;
        setSchedule([...schedule, { day_name: `Dia ${newIndex + 1}`, exercises: [] }]);
        setOpenDays([newIndex]); // Auto-open new day and close others
    };

    const removeDay = (index, e) => {
        e.stopPropagation();
        const newSchedule = schedule.filter((_, i) => i !== index);
        setSchedule(newSchedule);
    };

    const updateDayName = (index, name) => {
        const newSchedule = [...schedule];
        newSchedule[index].day_name = name;
        setSchedule(newSchedule);
    };

    const addExerciseToDay = (dayIndex) => {
        const newSchedule = [...schedule];
        newSchedule[dayIndex].exercises.push({
            exercise_id: '',
            sets: 3,
            reps: '10',
            rest_seconds: 60,
            notes: ''
        });
        setSchedule(newSchedule);
    };

    const removeExerciseFromDay = (dayIndex, exerciseIndex) => {
        const newSchedule = [...schedule];
        newSchedule[dayIndex].exercises = newSchedule[dayIndex].exercises.filter((_, i) => i !== exerciseIndex);
        setSchedule(newSchedule);
    };

    const updateExercise = (dayIndex, exerciseIndex, field, value) => {
        const newSchedule = [...schedule];
        newSchedule[dayIndex].exercises[exerciseIndex][field] = value;
        setSchedule(newSchedule);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.title.trim()) {
            alert('Por favor, preencha o título do treino.');
            return;
        }

        // Validate schedule
        for (const day of schedule) {
            for (const ex of day.exercises) {
                if (!ex.exercise_id) {
                    alert(`Por favor, selecione um exercício para todos os itens no ${day.day_name}.`);
                    return;
                }
            }
        }

        onSave({ ...formData, schedule });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={workout ? 'Editar Treino' : 'Novo Treino'} size="large">
            <form className="modal-form" onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>
                        Título do Treino <span className="required">*</span>
                    </label>
                    <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        placeholder="Ex: Treino de Hipertrofia ABC"
                        required
                    />
                </div>

                <div className="form-group">
                    <label>Descrição</label>
                    <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        placeholder="Descreva o objetivo e detalhes do treino..."
                        rows={3}
                        className="w-full"
                    />
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="form-group">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Dificuldade</label>
                        <select
                            name="difficulty"
                            value={formData.difficulty}
                            onChange={handleChange}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        >
                            <option value="Iniciante">Iniciante</option>
                            <option value="Intermediário">Intermediário</option>
                            <option value="Avançado">Avançado</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Duração (min)</label>
                        <input
                            type="number"
                            name="estimated_duration"
                            value={formData.estimated_duration}
                            onChange={handleChange}
                            min="10"
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        />
                    </div>

                    <div className="form-group">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Dias/Semana</label>
                        <input
                            type="number"
                            name="days_per_week"
                            value={formData.days_per_week}
                            onChange={handleChange}
                            min="1"
                            max="7"
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        />
                    </div>
                </div>

                {/* Workout Builder Section */}
                <div className="workout-builder">
                    <h3>Estrutura do Treino</h3>
                    <div className="days-container">
                        {schedule.map((day, dayIndex) => {
                            const isOpen = openDays.includes(dayIndex);
                            return (
                                <div key={dayIndex} className={`day-block ${isOpen ? 'open' : ''}`}>
                                    <div className="day-header" onClick={() => toggleDay(dayIndex)}>
                                        <div className="day-header-content w-full">
                                            <div className="flex justify-between items-center w-full mb-1">
                                                <div className="flex items-center gap-2 flex-1">
                                                    <ChevronDown size={20} className={`day-toggle-icon ${isOpen ? 'rotate-180' : ''}`} />
                                                    <input
                                                        type="text"
                                                        value={day.day_name}
                                                        onChange={(e) => updateDayName(dayIndex, e.target.value)}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="day-name-input font-bold"
                                                        placeholder="Nome do Dia"
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={(e) => removeDay(dayIndex, e)}
                                                    className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors ml-2"
                                                    data-tooltip="Remover Dia"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                            <div className="text-xs text-gray-500 ml-8 text-left">
                                                {day.exercises.length} exercícios
                                            </div>
                                        </div>
                                    </div>

                                    <div className="day-content">
                                        {day.exercises.map((ex, exIndex) => (
                                            <div key={exIndex} className="exercise-card bg-gray-50 p-4 rounded-xl border border-gray-100 mb-3">
                                                {/* Linha 1: Exercício + Delete */}
                                                <div className="flex gap-3 mb-3 items-end">
                                                    <div className="exercise-field flex-1">
                                                        <label className="text-xs font-semibold text-gray-500 mb-1 block">Exercício</label>
                                                        <select
                                                            value={ex.exercise_id}
                                                            onChange={(e) => updateExercise(dayIndex, exIndex, 'exercise_id', e.target.value)}
                                                            className="exercise-select"
                                                            required
                                                        >
                                                            <option value="">Selecione...</option>
                                                            {exercises.map(opt => (
                                                                <option key={opt.id} value={opt.id}>{opt.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeExerciseFromDay(dayIndex, exIndex)}
                                                        className="mb-[2px] p-2.5 text-red-500 bg-white border border-gray-200 hover:bg-red-50 hover:border-red-200 rounded-lg transition-colors"
                                                        title="Remover Exercício"
                                                    >
                                                        <X size={18} />
                                                    </button>
                                                </div>

                                                {/* Linha 2: Métricas (Séries, Reps, Descanso) */}
                                                <div className="grid grid-cols-3 gap-3 mb-3">
                                                    <div className="exercise-field">
                                                        <label className="text-xs font-semibold text-gray-500 mb-1 block">Séries</label>
                                                        <input
                                                            type="number"
                                                            value={ex.sets}
                                                            onChange={(e) => updateExercise(dayIndex, exIndex, 'sets', e.target.value)}
                                                            placeholder="3"
                                                            className="sets-input text-center"
                                                            min="1"
                                                        />
                                                    </div>

                                                    <div className="exercise-field">
                                                        <label className="text-xs font-semibold text-gray-500 mb-1 block">Reps</label>
                                                        <input
                                                            type="text"
                                                            value={ex.reps}
                                                            onChange={(e) => updateExercise(dayIndex, exIndex, 'reps', e.target.value)}
                                                            placeholder="10-12"
                                                            className="reps-input text-center"
                                                        />
                                                    </div>

                                                    <div className="exercise-field">
                                                        <label className="text-xs font-semibold text-gray-500 mb-1 block whitespace-nowrap">Descanso (s)</label>
                                                        <input
                                                            type="number"
                                                            value={ex.rest_seconds || ''}
                                                            onChange={(e) => updateExercise(dayIndex, exIndex, 'rest_seconds', e.target.value)}
                                                            placeholder="60"
                                                            className="rest-input text-center"
                                                            min="0"
                                                            step="5"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Linha 3: Notas */}
                                                <div className="exercise-field w-full">
                                                    <label className="text-xs font-semibold text-gray-500 mb-1 block">Notas</label>
                                                    <input
                                                        type="text"
                                                        value={ex.notes || ''}
                                                        onChange={(e) => updateExercise(dayIndex, exIndex, 'notes', e.target.value)}
                                                        placeholder="Ex: Drop-set na última"
                                                        className="notes-input w-full"
                                                    />
                                                </div>
                                            </div>
                                        ))}

                                        <button type="button" onClick={() => addExerciseToDay(dayIndex)} className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 font-medium hover:border-blue-500 hover:text-blue-500 hover:bg-blue-50 transition-all flex items-center justify-center gap-2 mt-2">
                                            <Plus size={16} /> Adicionar Exercício
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <button type="button" onClick={addDay} className="w-full py-4 mt-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2">
                        <Plus size={20} /> Adicionar Dia de Treino
                    </button>
                </div>

                <div className="form-group" style={{ marginTop: '1.5rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            name="is_public"
                            checked={formData.is_public}
                            onChange={handleChange}
                        />
                        Tornar este treino público
                    </label>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 mt-8">
                    <button type="button" onClick={onClose} className="btn-secondary" disabled={isLoading}>
                        Cancelar
                    </button>
                    <button type="submit" className="btn-primary" disabled={isLoading}>
                        {isLoading ? 'Salvando...' : workout ? 'Salvar Alterações' : 'Criar Treino'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default WorkoutModal;
