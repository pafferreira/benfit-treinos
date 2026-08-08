import { useState, useEffect } from 'react';
import { useAvatars, useUserRole } from '../hooks/useSupabase';
import Modal from './Modal';
import { X, Check, MoreHorizontal, ChevronDown, ChevronUp, Image as ImageIcon, Youtube, List, Tag, Dumbbell, Target, Weight, Video as VideoIcon, Lock } from 'lucide-react';
import ExerciseUsageTab from './ExerciseUsageTab';
import ExerciseHistoryTab from './ExerciseHistoryTab';
import './ExerciseModal.css';

const Accordion = ({ title, icon: Icon, children, defaultOpen = false, collapsedPreview = null }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="border border-gray-200 rounded-xl overflow-hidden mb-4 bg-white shadow-sm">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 bg-gray-50/50 hover:bg-gray-50 transition-colors"
            >
                <div className="flex items-center gap-3 min-w-0">
                    {Icon && <Icon className="text-blue-500 shrink-0" size={20} />}
                    <span className="font-semibold text-gray-700 shrink-0">{title}</span>
                    {!isOpen && collapsedPreview && (
                        <div className="flex items-center gap-1.5 flex-wrap min-w-0 overflow-hidden">
                            {collapsedPreview}
                        </div>
                    )}
                </div>
                {isOpen ? <ChevronUp size={20} className="text-gray-400 shrink-0" /> : <ChevronDown size={20} className="text-gray-400 shrink-0" />}
            </button>

            {isOpen && (
                <div className="p-4 border-t border-gray-100 animate-in slide-in-from-top-2 duration-200">
                    {children}
                </div>
            )}
        </div>
    );
};

const ExerciseModal = ({ isOpen, onClose, onSave, exercise = null, isLoading = false, readOnly = false }) => {
    const { avatars, loading: loadingAvatars } = useAvatars();
    const { isAdmin, isPersonal, isUser } = useUserRole();
    const tabsLocked = !!(isUser && !isAdmin && !isPersonal);

    const [activeTab, setActiveTab] = useState('detalhes');

    const [formData, setFormData] = useState({
        name: '',
        // muscle_groups é a fonte de verdade; muscle_group (singular) é derivado
        // do primeiro item para continuar compatível com filtros e Coach IA.
        muscle_groups: [],
        equipment: '',
        image_url: '',
        video_url: '',
        instructions: [''],
        tags: []
    });

    const [tagInput, setTagInput] = useState('');
    const [showAvatarSelector, setShowAvatarSelector] = useState(false);
    const [equipmentTypes, setEquipmentTypes] = useState([]);

    useEffect(() => {
        setActiveTab('detalhes');

        if (exercise) {
            // Exercícios anteriores à migração só têm muscle_group preenchido
            const groups = Array.isArray(exercise.muscle_groups) && exercise.muscle_groups.length > 0
                ? exercise.muscle_groups
                : (exercise.muscle_group ? [exercise.muscle_group] : []);

            setFormData({
                name: exercise.name || '',
                muscle_groups: groups,
                equipment: exercise.equipment || '',
                image_url: exercise.image_url || '',
                video_url: exercise.video_url || '',
                instructions: Array.isArray(exercise.instructions) ? exercise.instructions : (exercise.instructions ? [String(exercise.instructions)] : ['']),
                tags: Array.isArray(exercise.tags) ? exercise.tags : []
            });
        } else {
            setFormData({
                name: '',
                muscle_groups: [],
                equipment: '',
                image_url: '',
                video_url: '',
                instructions: [''],
                tags: []
            });
        }
    }, [exercise]);

    // Fetch distinct equipment types from database
    useEffect(() => {
        const fetchEquipment = async () => {
            try {
                const { supabase } = await import('../lib/supabase');
                const { data, error } = await supabase
                    .from('b_exercises')
                    .select('equipment')
                    .not('equipment', 'is', null);

                if (!error && data) {
                    const uniqueEquipment = [...new Set(data.map(item => item.equipment).filter(Boolean))];
                    if (uniqueEquipment.length > 0) {
                        setEquipmentTypes(uniqueEquipment.sort());
                    }
                }
            } catch (err) {
                console.error('Erro ao buscar equipamentos:', err);
            }
        };
        fetchEquipment();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Adiciona no fim / remove preservando a ordem — assim o "grupo principal"
    // (primeiro item) só muda quando o usuário desmarca de fato.
    const toggleMuscleGroup = (group) => {
        if (readOnly) return;
        setFormData(prev => ({
            ...prev,
            muscle_groups: prev.muscle_groups.includes(group)
                ? prev.muscle_groups.filter(g => g !== group)
                : [...prev.muscle_groups, group]
        }));
    };

    // Remove um valor legado (string composta de antes da migração, ex: "Pernas /
    // Glúteo") que não corresponde a nenhuma opção fixa — só usado pelo chip de
    // reclassificação manual.
    const removeLegacyGroup = (value) => {
        if (readOnly) return;
        setFormData(prev => ({
            ...prev,
            muscle_groups: prev.muscle_groups.filter(g => g !== value)
        }));
    };

    const handleInstructionChange = (index, value) => {
        const newInstructions = [...formData.instructions];
        newInstructions[index] = value;
        setFormData(prev => ({ ...prev, instructions: newInstructions }));
    };

    const addInstruction = () => {
        setFormData(prev => ({ ...prev, instructions: [...prev.instructions, ''] }));
    };

    const removeInstruction = (index) => {
        if (formData.instructions.length <= 1) return;
        const newInstructions = formData.instructions.filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, instructions: newInstructions }));
    };

    const handleTagKeyDown = (e) => {
        if (e.key === 'Enter' && tagInput.trim()) {
            e.preventDefault();
            if (!formData.tags.includes(tagInput.trim())) {
                setFormData(prev => ({ ...prev, tags: [...prev.tags, tagInput.trim()] }));
            }
            setTagInput('');
        }
    };

    const removeTag = (tagToRemove) => {
        setFormData(prev => ({ ...prev, tags: prev.tags.filter(tag => tag !== tagToRemove) }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (formData.muscle_groups.length === 0) {
            window.dispatchEvent(new CustomEvent('app-toast', {
                detail: { message: 'Selecione ao menos um grupo muscular.', type: 'error' }
            }));
            return;
        }

        // Filter empty instructions
        const cleanInstructions = formData.instructions.filter(i => i.trim() !== '');

        // Use generic kettlebell image as default if none selected
        const finalData = {
            ...formData,
            // Campo legado derivado do primeiro grupo (o banco também sincroniza
            // via trigger, mas mandar aqui mantém o payload autoexplicativo)
            muscle_group: formData.muscle_groups[0],
            instructions: cleanInstructions,
            image_url: formData.image_url || '/exercicios/exerc_generico_3.png'
        };

        onSave(finalData);
    };

    const muscleGroups = [
        'Peitoral', 'Costas', 'Ombros', 'Trapézio', 'Bíceps', 'Tríceps', 'Antebraço',
        'Abdômen', 'Lombar', 'Glúteos', 'Quadríceps', 'Posterior de Coxa', 'Adutores',
        'Panturrilha', 'Cardio', 'Corpo Todo',
        // Termos encontrados nos valores compostos legados (ex: "Pernas / Glúteo",
        // "Posterior / Lombar") — adicionados pra permitir reclassificação exata.
        'Pernas', 'Glúteo', 'Posterior'
    ].sort((a, b) => a.localeCompare(b, 'pt-BR'));

    const legacyGroups = formData.muscle_groups.filter(g => !muscleGroups.includes(g));

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={readOnly ? 'Detalhes do Exercício' : (exercise?.id ? 'Editar Exercício' : 'Novo Exercício')} size="full">
            <form onSubmit={!readOnly ? handleSubmit : (e) => e.preventDefault()} className="flex flex-col gap-6">

                {exercise?.id && (
                    <div className="flex gap-1 border-b border-gray-200 -mt-2 mb-2">
                        {[
                            { key: 'detalhes', label: 'Detalhes' },
                            { key: 'planos', label: 'Planos' },
                            { key: 'historico', label: 'Histórico' },
                        ].map(tab => (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => setActiveTab(tab.key)}
                                className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                                    activeTab === tab.key
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                )}

                {activeTab === 'planos' && exercise?.id && (
                    tabsLocked ? (
                        <div className="py-10 flex flex-col items-center text-center text-gray-400">
                            <Lock size={28} className="mb-2 opacity-50" />
                            <p className="text-sm">Disponível apenas para admin e personal.</p>
                        </div>
                    ) : (
                        <ExerciseUsageTab exerciseId={exercise.id} />
                    )
                )}

                {activeTab === 'historico' && exercise?.id && (
                    tabsLocked ? (
                        <div className="py-10 flex flex-col items-center text-center text-gray-400">
                            <Lock size={28} className="mb-2 opacity-50" />
                            <p className="text-sm">Disponível apenas para admin e personal.</p>
                        </div>
                    ) : (
                        <ExerciseHistoryTab exerciseId={exercise.id} exerciseImageUrl={formData.image_url} />
                    )
                )}

                {activeTab === 'detalhes' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-8">

                    {/* Left Column: Form Fields (8 cols) */}
                    <div className="lg:col-span-8 flex flex-col gap-6">

                        {/* Collapsible Sections (Persianas) */}
                        <div className="space-y-4">

                            <Accordion title="Informações Básicas" icon={Dumbbell} defaultOpen={true}>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Nome do Exercício {!readOnly && <span className="text-red-500">*</span>}
                                        </label>
                                        <input
                                            type="text"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            placeholder="Ex: Supino Reto com Halteres"
                                            className={`w-full px-4 py-3 text-lg font-medium border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:font-normal ${readOnly ? 'bg-gray-50 text-gray-800' : ''}`}
                                            required
                                            disabled={readOnly}
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                                Equipamento {!readOnly && <span className="text-red-500">*</span>}
                                            </label>
                                            <div className="relative">
                                                <select
                                                    name="equipment"
                                                    value={formData.equipment}
                                                    onChange={handleChange}
                                                    className={`w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none appearance-none ${!readOnly ? 'cursor-pointer' : ''} text-gray-700 font-medium ${readOnly ? 'bg-gray-50' : ''}`}
                                                    required
                                                    disabled={readOnly}
                                                >
                                                    <option value="">Selecione...</option>
                                                    {equipmentTypes.map(type => (
                                                        <option key={type} value={type}>{type}</option>
                                                    ))}
                                                </select>
                                                <Weight className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                                                {!readOnly && <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Accordion>

                            <Accordion
                                title="Grupos Musculares"
                                icon={Target}
                                defaultOpen={false}
                                collapsedPreview={
                                    formData.muscle_groups.length > 0 ? (
                                        formData.muscle_groups.map(group => (
                                            <span key={group} className="px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium">
                                                {group}
                                            </span>
                                        ))
                                    ) : (
                                        <span className="text-xs text-red-400 italic">Nenhum grupo selecionado</span>
                                    )
                                }
                            >
                                <div>
                                    <p className="text-xs text-gray-400 mb-3">
                                        {!readOnly && <span className="text-red-500 font-semibold">* </span>}
                                        {readOnly
                                            ? 'Grupos trabalhados por este exercício'
                                            : 'Selecione um ou mais. O primeiro escolhido vira o grupo principal.'}
                                    </p>

                                    {legacyGroups.length > 0 && (
                                        <div className="mb-3 p-3 rounded-xl border border-amber-200 bg-amber-50">
                                            <p className="text-xs text-amber-700 font-medium mb-2">
                                                Valor antigo de antes da migração — escolha os grupos corretos abaixo e remova este chip.
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                {legacyGroups.map(value => (
                                                    <span
                                                        key={value}
                                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-200 text-gray-600 text-xs font-medium"
                                                    >
                                                        {value}
                                                        {!readOnly && (
                                                            <button
                                                                type="button"
                                                                onClick={() => removeLegacyGroup(value)}
                                                                className="hover:text-red-600"
                                                                title="Remover valor antigo"
                                                            >
                                                                <X size={12} />
                                                            </button>
                                                        )}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className={`grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 rounded-xl border ${readOnly ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-200'}`}>
                                        {muscleGroups.map(group => {
                                            const checked = formData.muscle_groups.includes(group);
                                            const isPrimary = formData.muscle_groups[0] === group;
                                            return (
                                                <label
                                                    key={group}
                                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all select-none ${
                                                        checked
                                                            ? 'bg-blue-50 border-blue-300 text-blue-700'
                                                            : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                                                    } ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={checked}
                                                        onChange={() => toggleMuscleGroup(group)}
                                                        disabled={readOnly}
                                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500/30 shrink-0"
                                                    />
                                                    <span className="truncate">{group}</span>
                                                    {isPrimary && formData.muscle_groups.length > 1 && (
                                                        <span className="ml-auto text-[10px] font-bold uppercase tracking-wide text-blue-500">
                                                            1º
                                                        </span>
                                                    )}
                                                </label>
                                            );
                                        })}
                                    </div>

                                    {!readOnly && formData.muscle_groups.length === 0 && (
                                        <p className="mt-1.5 text-xs text-red-500">Escolha ao menos um grupo muscular.</p>
                                    )}
                                </div>
                            </Accordion>

                            <Accordion title="Instruções Passo a Passo" icon={List} defaultOpen={false}>
                                <div className="space-y-3">
                                    {formData.instructions.map((instruction, index) => (
                                        <div key={index} className="flex gap-2 items-start group">
                                            <div className="mt-3 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">
                                                {index + 1}
                                            </div>
                                            <div className="flex-1 relative">
                                                <textarea
                                                    value={instruction}
                                                    onChange={(e) => handleInstructionChange(index, e.target.value)}
                                                    placeholder={`Descreva o passo ${index + 1}...`}
                                                    rows={2}
                                                    className={`w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none transition-all text-sm ${readOnly ? 'bg-gray-50' : ''}`}
                                                    disabled={readOnly}
                                                />
                                                {formData.instructions.length > 1 && !readOnly && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeInstruction(index)}
                                                        className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                                        title="Remover passo"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {!readOnly && (
                                        <button
                                            type="button"
                                            onClick={addInstruction}
                                            className="ml-8 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1"
                                        >
                                            <List size={14} />
                                            Adicionar novo passo
                                        </button>
                                    )}
                                </div>
                            </Accordion>

                            <Accordion title="Tags e Metadados" icon={Tag}>
                                <div className="space-y-3">
                                    <div className={`flex flex-wrap gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl min-h-[50px] ${readOnly ? 'bg-gray-100' : ''}`}>
                                        {formData.tags.map((tag, index) => (
                                            <span key={index} className="inline-flex items-center px-3 py-1 rounded-lg text-sm bg-white border border-gray-200 text-gray-700 shadow-sm">
                                                {tag}
                                                {!readOnly && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeTag(tag)}
                                                        className="ml-2 text-gray-400 hover:text-red-500 transition-colors"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                )}
                                            </span>
                                        ))}
                                        {!readOnly && (
                                            <input
                                                type="text"
                                                value={tagInput}
                                                onChange={(e) => setTagInput(e.target.value)}
                                                onKeyDown={handleTagKeyDown}
                                                placeholder="Digite uma tag e Enter..."
                                                className="bg-transparent border-none outline-none text-sm min-w-[150px] placeholder-gray-400 focus:ring-0"
                                            />
                                        )}
                                    </div>
                                    {!readOnly && <p className="text-xs text-gray-500 pl-1">Tags ajudam a categorizar o exercício (ex: iniciante, isolado, alongamento).</p>}
                                </div>
                            </Accordion>

                        </div>

                    </div>

                    {/* Right Column: Image & Media (4 cols) */}
                    <div className="lg:col-span-4 flex flex-col gap-4">
                        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                <ImageIcon size={18} className="text-blue-500" />
                                Visualização
                            </h3>

                            {/* Image Preview Area */}
                            <div className="relative aspect-video w-full bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl overflow-hidden border border-gray-200 group">
                                {formData.image_url ? (
                                    <img
                                        src={formData.image_url}
                                        alt="Preview"
                                        className="w-full h-full object-contain p-1 transition-transform duration-700"
                                    />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                                        <ImageIcon size={48} className="mb-2 opacity-50" />
                                        <span className="text-xs">Sem imagem selecionada</span>
                                    </div>
                                )}

                                {/* Overlay Button - Only if NOT readOnly */}
                                {!readOnly && (
                                    <button
                                        type="button"
                                        onClick={() => setShowAvatarSelector(!showAvatarSelector)}
                                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                    >
                                        <span className="bg-white/90 backdrop-blur-sm text-gray-800 px-4 py-2 rounded-full text-sm font-semibold shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform">
                                            Alterar Imagem
                                        </span>
                                    </button>
                                )}
                            </div>

                            {/* Avatar Selector (Collapsible) - Only if NOT readOnly */}
                            {!readOnly && showAvatarSelector && (
                                <div className="mt-4 p-3 bg-gray-50 rounded-xl border border-gray-200 animate-in slide-in-from-top-2">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs font-semibold text-gray-600">Galeria Benfit</span>
                                        <button type="button" onClick={() => setShowAvatarSelector(false)} className="text-gray-400 hover:text-gray-600">
                                            <X size={14} />
                                        </button>
                                    </div>

                                    {loadingAvatars ? (
                                        <div className="text-center py-4 text-xs text-gray-400">Carregando...</div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1">
                                            {avatars.filter(a => a.category === 'exercicio' || !a.category).map((avatar) => (
                                                <div key={avatar.id} className="avatar-tooltip-wrapper">
                                                    <div
                                                        onClick={() => {
                                                            setFormData(prev => ({ ...prev, image_url: avatar.public_url }));
                                                            setShowAvatarSelector(false);
                                                        }}
                                                        className={`group relative cursor-pointer aspect-video rounded-xl overflow-hidden border-2 transition-all shadow-sm hover:shadow-md ${formData.image_url === avatar.public_url ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-100 hover:border-blue-300'}`}
                                                    >
                                                        <img
                                                            src={avatar.public_url}
                                                            alt={avatar.name}
                                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                        />
                                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                                    </div>
                                                    <span className="avatar-tooltip">{avatar.name}</span>
                                                </div>
                                            ))}
                                            {/* Fallback/Generic Options if needed, or if empty */}
                                            {avatars.filter(a => a.category === 'exercicio').length === 0 && (
                                                <div className="col-span-2 text-center py-4 text-xs text-gray-400">
                                                    Nenhuma imagem encontrada na galeria.
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className="mt-3 pt-3 border-t border-gray-200">
                                        <label className="text-xs text-gray-500 mb-1 block">Ou URL externa:</label>
                                        <input
                                            type="url"
                                            name="image_url"
                                            value={formData.image_url}
                                            onChange={handleChange}
                                            placeholder="https://..."
                                            className="w-full text-xs p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Video URL Input */}
                            <div className="mt-4">
                                <label className="text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                                    <VideoIcon size={14} className="text-red-500" />
                                    Vídeo Demonstrativo (YouTube)
                                </label>
                                <div className="relative">
                                    <input
                                        type="url"
                                        name="video_url"
                                        value={formData.video_url}
                                        onChange={handleChange}
                                        placeholder="https://youtube.com/..."
                                        className={`w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all ${readOnly ? 'bg-gray-50' : ''}`}
                                        disabled={readOnly}
                                    />
                                    <Youtube size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                )}

                {/* Footer Actions */}
                <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 mt-auto">
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn-secondary"
                        disabled={isLoading}
                    >
                        {readOnly ? 'Fechar' : 'Cancelar'}
                    </button>
                    {!readOnly && (
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="btn-primary"
                        >
                            {isLoading ? 'Salvando...' : exercise ? 'Salvar Alterações' : 'Criar Exercício'}
                        </button>
                    )}
                </div>

            </form>
        </Modal>
    );
};

export default ExerciseModal;
