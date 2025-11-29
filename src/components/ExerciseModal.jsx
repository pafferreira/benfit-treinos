import { useState, useEffect } from 'react';
import Modal from './Modal';
import { X } from 'lucide-react';

const ExerciseModal = ({ isOpen, onClose, onSave, exercise = null, isLoading = false }) => {
    const [formData, setFormData] = useState({
        name: '',
        muscle_group: '',
        equipment: '',
        video_url: '',
        instructions: [''],
        tags: []
    });
    const [tagInput, setTagInput] = useState('');

    useEffect(() => {
        if (exercise) {
            setFormData({
                name: exercise.name || '',
                muscle_group: exercise.muscle_group || '',
                equipment: exercise.equipment || '',
                video_url: exercise.video_url || '',
                instructions: exercise.instructions || [''],
                tags: exercise.tags || []
            });
        } else {
            setFormData({
                name: '',
                muscle_group: '',
                equipment: '',
                video_url: '',
                instructions: [''],
                tags: []
            });
        }
    }, [exercise, isOpen]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleInstructionChange = (index, value) => {
        const newInstructions = [...formData.instructions];
        newInstructions[index] = value;
        setFormData(prev => ({ ...prev, instructions: newInstructions }));
    };

    const addInstruction = () => {
        setFormData(prev => ({
            ...prev,
            instructions: [...prev.instructions, '']
        }));
    };

    const removeInstruction = (index) => {
        if (formData.instructions.length > 1) {
            const newInstructions = formData.instructions.filter((_, i) => i !== index);
            setFormData(prev => ({ ...prev, instructions: newInstructions }));
        }
    };

    const handleTagKeyDown = (e) => {
        if (e.key === 'Enter' && tagInput.trim()) {
            e.preventDefault();
            if (!formData.tags.includes(tagInput.trim())) {
                setFormData(prev => ({
                    ...prev,
                    tags: [...prev.tags, tagInput.trim()]
                }));
            }
            setTagInput('');
        }
    };

    const removeTag = (tagToRemove) => {
        setFormData(prev => ({
            ...prev,
            tags: prev.tags.filter(tag => tag !== tagToRemove)
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // Validação básica
        if (!formData.name.trim() || !formData.muscle_group.trim() || !formData.equipment.trim()) {
            alert('Por favor, preencha todos os campos obrigatórios.');
            return;
        }

        // Filtrar instruções vazias
        const cleanedData = {
            ...formData,
            instructions: formData.instructions.filter(inst => inst.trim() !== '')
        };

        onSave(cleanedData);
    };

    const MUSCLE_GROUPS = [
        'Peito', 'Costas', 'Pernas', 'Ombros', 'Bíceps', 'Tríceps',
        'Abdômen', 'Glúteos', 'Panturrilha', 'Cardio', 'Corpo Inteiro'
    ].slice().sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));

    const EQUIPMENT_TYPES = [
        'Peso do Corpo', 'Halter', 'Barra', 'Máquina', 'Polia Alta', 'Polia Baixa',
        'Elástico', 'Kettlebell', 'Banco', 'Esteira', 'Bicicleta', 'Outro'
    ].slice().sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={exercise ? 'Editar Exercício' : 'Novo Exercício'} size="large">
            <form className="modal-form" onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>
                        Nome do Exercício <span className="required">*</span>
                    </label>
                    <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Ex: Supino Reto"
                        required
                    />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                        <label>
                            Grupo Muscular <span className="required">*</span>
                        </label>
                        <select
                            name="muscle_group"
                            value={formData.muscle_group}
                            onChange={handleChange}
                            required
                        >
                            <option value="">Selecione...</option>
                            {MUSCLE_GROUPS.map(group => (
                                <option key={group} value={group}>{group}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>
                            Equipamento <span className="required">*</span>
                        </label>
                        <select
                            name="equipment"
                            value={formData.equipment}
                            onChange={handleChange}
                            required
                        >
                            <option value="">Selecione...</option>
                            {EQUIPMENT_TYPES.map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="form-group">
                    <label>URL do Vídeo</label>
                    <input
                        type="url"
                        name="video_url"
                        value={formData.video_url}
                        onChange={handleChange}
                        placeholder="https://youtube.com/..."
                    />
                </div>

                <div className="form-group">
                    <label>Instruções</label>
                    {formData.instructions.map((instruction, index) => (
                        <div key={index} style={{ display: 'flex', gap: '0.5rem' }}>
                            <input
                                type="text"
                                value={instruction}
                                onChange={(e) => handleInstructionChange(index, e.target.value)}
                                placeholder={`Passo ${index + 1}`}
                                style={{ flex: 1 }}
                            />
                            {formData.instructions.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => removeInstruction(index)}
                                    className="btn-secondary"
                                    style={{ padding: '0.75rem' }}
                                    title="Remover instrução"
                                >
                                    <X size={16} />
                                </button>
                            )}
                        </div>
                    ))}
                    <button type="button" onClick={addInstruction} className="btn-secondary" style={{ marginTop: '0.5rem' }}>
                        + Adicionar Instrução
                    </button>
                </div>

                <div className="form-group">
                    <label>Tags</label>
                    <div className="tags-input-container">
                        {formData.tags.map((tag, index) => (
                            <div key={index} className="tag-item">
                                {tag}
                                <button
                                    type="button"
                                    onClick={() => removeTag(tag)}
                                    className="tag-remove-btn"
                                    title="Remover tag"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ))}
                        <input
                            type="text"
                            className="tag-input"
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyDown={handleTagKeyDown}
                            placeholder="Digite e pressione Enter"
                        />
                    </div>
                    <span className="helper-text">Pressione Enter para adicionar uma tag</span>
                </div>

                <div className="form-actions">
                    <button type="button" onClick={onClose} className="btn-secondary" disabled={isLoading}>
                        Cancelar
                    </button>
                    <button type="submit" className="btn-primary" disabled={isLoading}>
                        {isLoading ? 'Salvando...' : exercise ? 'Salvar Alterações' : 'Criar Exercício'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default ExerciseModal;
