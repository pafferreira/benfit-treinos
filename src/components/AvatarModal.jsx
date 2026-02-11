import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Modal from './Modal';
import { X, ChevronDown, ChevronUp, Image as ImageIcon, Tag, User, Users, Upload, Loader } from 'lucide-react';

const Accordion = ({ title, icon: Icon, children, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="border border-gray-200 rounded-xl overflow-hidden mb-4 bg-white shadow-sm">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 bg-gray-50/50 hover:bg-gray-50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    {Icon && <Icon className="text-blue-500" size={20} />}
                    <span className="font-semibold text-gray-700">{title}</span>
                </div>
                {isOpen ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
            </button>

            {isOpen && (
                <div className="p-4 border-t border-gray-100 animate-in slide-in-from-top-2 duration-200">
                    {children}
                </div>
            )}
        </div>
    );
};

const AvatarModal = ({ isOpen, onClose, onSave, avatar = null, isLoading = false }) => {
    const [formData, setFormData] = useState({
        name: '',
        public_url: '',
        storage_path: '',
        category: '3D',
        gender: '',
        tags: [],
        is_active: true
    });
    const [tagInput, setTagInput] = useState('');
    const [imagePreview, setImagePreview] = useState('');
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    useEffect(() => {
        if (avatar) {
            setFormData({
                name: avatar.name || '',
                public_url: avatar.public_url || '',
                storage_path: avatar.storage_path || '',
                category: avatar.category || '3D',
                gender: avatar.gender || '',
                tags: avatar.tags || [],
                is_active: avatar.is_active !== undefined ? avatar.is_active : true
            });
            setImagePreview(avatar.public_url || '');
        } else {
            setFormData({
                name: '',
                public_url: '',
                storage_path: '',
                category: '3D',
                gender: '',
                tags: [],
                is_active: true
            });
            setImagePreview('');
        }
    }, [avatar, isOpen]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        const newValue = type === 'checkbox' ? checked : value;
        setFormData(prev => ({ ...prev, [name]: newValue }));

        // Update image preview when URL changes
        if (name === 'public_url') {
            setImagePreview(value);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
        if (!validTypes.includes(file.type)) {
            alert('Por favor, selecione apenas arquivos PNG ou JPG.');
            return;
        }

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            alert('O arquivo deve ter no máximo 5MB.');
            return;
        }

        try {
            setUploading(true);
            setUploadProgress(10);

            // Generate unique filename
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `avatars/${fileName}`;

            setUploadProgress(30);

            // Upload to Supabase Storage
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('benfit-assets')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) {
                console.error('Upload error:', uploadError);
                throw new Error('Erro ao fazer upload da imagem: ' + uploadError.message);
            }

            setUploadProgress(70);

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('benfit-assets')
                .getPublicUrl(filePath);

            setUploadProgress(90);

            // Update form data
            setFormData(prev => ({
                ...prev,
                public_url: publicUrl,
                storage_path: filePath
            }));

            // Update preview
            setImagePreview(publicUrl);

            setUploadProgress(100);

            // Show success message briefly
            setTimeout(() => {
                setUploading(false);
                setUploadProgress(0);
            }, 500);

        } catch (error) {
            console.error('Error uploading file:', error);
            alert(error.message || 'Erro ao fazer upload do arquivo.');
            setUploading(false);
            setUploadProgress(0);
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
        if (!formData.name.trim() || !formData.public_url.trim()) {
            alert('Por favor, preencha o nome e a URL da imagem.');
            return;
        }

        onSave(formData);
    };

    const DEFAULT_CATEGORIES = ['3D', 'Real', 'Avatar', 'exercicio', 'Outro'];
    const categories = [...new Set([...DEFAULT_CATEGORIES, formData.category].filter(Boolean))].sort();

    const genderOptions = ['', 'male', 'female', 'neutral'];

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={avatar ? 'Editar Avatar' : 'Novo Avatar'} size="full">
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">

                {/* Top Section: Form Fields & Preview */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* Left Column: Form Fields (8 cols) */}
                    <div className="lg:col-span-8 flex flex-col gap-6">

                        {/* Collapsible Sections */}
                        <div className="space-y-4">

                            <Accordion title="Informações Básicas" icon={ImageIcon} defaultOpen={true}>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Nome do Avatar <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            placeholder="Ex: Ana Feliz, Coach 1"
                                            className="w-full px-4 py-3 text-lg font-medium border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:font-normal"
                                            required
                                        />
                                    </div>

                                    {/* File Upload Section */}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Selecionar Arquivo <span className="text-red-500">*</span>
                                        </label>

                                        <div className="relative">
                                            <input
                                                type="file"
                                                accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                                                onChange={handleFileUpload}
                                                disabled={uploading}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                            />
                                            <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${uploading ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50/50'}`}>
                                                {uploading ? (
                                                    <div className="space-y-3">
                                                        <Loader className="w-8 h-8 text-blue-600 mx-auto animate-spin" />
                                                        <p className="text-sm font-medium text-blue-700">Fazendo upload... {uploadProgress}%</p>
                                                        <div className="w-full bg-blue-200 rounded-full h-2">
                                                            <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <Upload className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                                                        <p className="text-sm font-medium text-gray-700">Clique para selecionar ou arraste aqui</p>
                                                        <p className="text-xs text-gray-500 mt-1">PNG ou JPG (máx. 5MB)</p>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {formData.public_url && !uploading && (
                                            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                                                <p className="text-xs text-green-700 font-medium flex items-center gap-1">
                                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                    </svg>
                                                    Imagem carregada com sucesso
                                                </p>
                                                <p className="text-xs text-gray-600 mt-1 truncate">{formData.storage_path || 'URL externa'}</p>
                                            </div>
                                        )}

                                        <details className="group mt-2">
                                            <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1">
                                                <ChevronDown className="w-3 h-3 transition-transform group-open:rotate-180" />
                                                Ou inserir URL manualmente (avançado)
                                            </summary>
                                            <div className="mt-2 space-y-2">
                                                <input
                                                    type="url"
                                                    name="public_url"
                                                    value={formData.public_url}
                                                    onChange={handleChange}
                                                    placeholder="https://exemplo.com/avatar.png"
                                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                                                />
                                                <p className="text-xs text-gray-500">Use apenas se souber o que está fazendo</p>
                                            </div>
                                        </details>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Caminho de Armazenamento (Opcional)
                                        </label>
                                        <input
                                            type="text"
                                            name="storage_path"
                                            value={formData.storage_path}
                                            onChange={handleChange}
                                            placeholder="avatars/avatar_ana_feliz.png"
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
                                        />
                                        <p className="text-xs text-gray-500 mt-1 pl-1">
                                            Caminho dentro do storage bucket (se aplicável)
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                                Categoria <span className="text-red-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <select
                                                    name="category"
                                                    value={formData.category}
                                                    onChange={handleChange}
                                                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none appearance-none cursor-pointer text-gray-700 font-medium"
                                                    required
                                                >
                                                    {categories.map(cat => (
                                                        <option key={cat} value={cat}>{cat}</option>
                                                    ))}
                                                </select>
                                                <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                                Gênero
                                            </label>
                                            <div className="relative">
                                                <select
                                                    name="gender"
                                                    value={formData.gender}
                                                    onChange={handleChange}
                                                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none appearance-none cursor-pointer text-gray-700 font-medium"
                                                >
                                                    <option value="">Não especificado</option>
                                                    <option value="male">Masculino</option>
                                                    <option value="female">Feminino</option>
                                                    <option value="neutral">Neutro</option>
                                                </select>
                                                <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                                        <div className="flex-1">
                                            <label className="block text-sm font-semibold text-gray-700">
                                                Avatar Ativo
                                            </label>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                Avatares inativos não aparecem nas opções de seleção
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, is_active: !prev.is_active }))}
                                            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${formData.is_active ? 'bg-blue-600' : 'bg-gray-300'}`}
                                        >
                                            <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${formData.is_active ? 'translate-x-7' : 'translate-x-1'}`} />
                                        </button>
                                    </div>
                                </div>
                            </Accordion>

                            <Accordion title="Tags e Metadados" icon={Tag}>
                                <div className="space-y-3">
                                    <div className="flex flex-wrap gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl min-h-[50px]">
                                        {formData.tags.map((tag, index) => (
                                            <span key={index} className="inline-flex items-center px-3 py-1 rounded-lg text-sm bg-white border border-gray-200 text-gray-700 shadow-sm">
                                                {tag}
                                                <button
                                                    type="button"
                                                    onClick={() => removeTag(tag)}
                                                    className="ml-2 text-gray-400 hover:text-red-500 transition-colors"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </span>
                                        ))}
                                        <input
                                            type="text"
                                            value={tagInput}
                                            onChange={(e) => setTagInput(e.target.value)}
                                            onKeyDown={handleTagKeyDown}
                                            placeholder="Digite uma tag e pressione Enter..."
                                            className="bg-transparent border-none outline-none text-sm min-w-[150px] placeholder-gray-400 focus:ring-0"
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500 pl-1">Tags ajudam a organizar e filtrar avatares (ex: feliz, triste, neutro).</p>
                                </div>
                            </Accordion>

                        </div>

                    </div>

                    {/* Right Column: Image Preview (4 cols) */}
                    <div className="lg:col-span-4 flex flex-col gap-4">
                        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                <ImageIcon size={18} className="text-blue-500" />
                                Visualização
                            </h3>

                            {/* Image Preview Area */}
                            <div className="relative aspect-square w-full bg-gray-100 rounded-xl overflow-hidden border border-gray-200">
                                {imagePreview ? (
                                    <img
                                        src={imagePreview}
                                        alt="Preview"
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = 'https://via.placeholder.com/300?text=Erro+ao+Carregar';
                                        }}
                                    />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                                        <ImageIcon size={48} className="mb-2 opacity-50" />
                                        <span className="text-xs">Sem imagem</span>
                                    </div>
                                )}
                            </div>

                            <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                                <p className="text-xs text-blue-700 font-medium mb-2">💡 Dica:</p>
                                <p className="text-xs text-blue-600">
                                    Para imagens locais, coloque os arquivos na pasta <code className="bg-white px-1 py-0.5 rounded">public/</code>
                                    e use caminhos como <code className="bg-white px-1 py-0.5 rounded">/avatar.png</code>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 mt-auto">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2.5 text-gray-700 font-medium hover:bg-gray-100 rounded-xl transition-colors"
                        disabled={isLoading}
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="px-8 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-xl shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40 hover:scale-105 active:scale-95 transition-all disabled:opacity-70 disabled:pointer-events-none"
                    >
                        {isLoading ? 'Salvando...' : avatar ? 'Salvar Alterações' : 'Criar Avatar'}
                    </button>
                </div>

            </form>
        </Modal>
    );
};

export default AvatarModal;
