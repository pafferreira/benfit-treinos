import { useState, useEffect } from 'react';
import { useAvatars, useUserRole } from '../hooks/useSupabase';
import Modal from './Modal';
import { User, Settings, Camera, Save, X, ChevronDown, ChevronUp, UserCircle, Calculator, Phone, Mail, Check, Calendar } from 'lucide-react';

const Accordion = ({ title, icon: Icon, children, defaultOpen = false, className = '' }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className={`border border-gray-200 rounded-lg overflow-hidden mb-4 bg-white shadow-sm ${className}`}>
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

const EditProfileModal = ({ isOpen, onClose, onSave, user, isLoading = false }) => {
    const { avatars, loading: loadingAvatars } = useAvatars();
    const { isRealAdmin } = useUserRole();
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        birth_date: '',
        gender: '',
        role: 'user',
        height_cm: '',
        weight_kg: '',
        avatar_url: ''
    });
    const [showAvatarSelector, setShowAvatarSelector] = useState(false);

    useEffect(() => {
        if (user && isOpen) {
            setFormData({
                name: user.name || '',
                phone: user.phone || '',
                birth_date: user.birth_date || '',
                gender: user.gender || '',
                role: user.role || 'user',
                height_cm: user.height_cm || '',
                weight_kg: user.weight_kg || '',
                avatar_url: user.avatar_url || '/avatar_skeleton.png',
                active: user.active !== false
            });
        }
    }, [user, isOpen]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const updateBirthDate = (field, value) => {
        let [y, m, d] = (formData.birth_date || '2000-01-01').split('-').map(Number);

        if (field === 'day') d = parseInt(value);
        if (field === 'month') m = parseInt(value);
        if (field === 'year') y = parseInt(value);

        // Clamp day to max days in month (using UTC to be safe)
        const maxDays = new Date(Date.UTC(y, m, 0)).getUTCDate();
        if (d > maxDays) d = maxDays;

        const date = new Date(Date.UTC(y, m - 1, d));
        const isoDate = date.toISOString().split('T')[0];

        setFormData(prev => ({ ...prev, birth_date: isoDate }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    const footerContent = (
        <div className="flex justify-end gap-3 w-full">
            <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                disabled={isLoading}
            >
                Cancelar
            </button>
            <button
                type="submit"
                form="edit-profile-form"
                disabled={isLoading}
                className="px-6 py-2 text-sm bg-[#008ACF] text-white font-medium rounded-lg shadow-sm hover:bg-[#0078B5] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
                {isLoading ? 'Salvando...' : 'Salvar'}
            </button>
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Editar Dados Pessoais" size="full" footer={footerContent}>
            <form id="edit-profile-form" onSubmit={handleSubmit} className="flex flex-col gap-6">

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* Left Column: Avatar & Visuals (4 cols) */}
                    <div className="lg:col-span-4 flex flex-col gap-4">
                        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                <Camera size={18} className="text-blue-500" />
                                Foto de Perfil
                            </h3>

                            {/* Avatar Preview */}
                            <div className="relative aspect-square w-full max-w-[280px] mx-auto bg-gray-50 rounded-full overflow-hidden border-4 border-white shadow-lg group">
                                <img
                                    src={formData.avatar_url || (formData.gender === 'Feminino' ? '/avatar_skeleton_female.png' : '/avatar_skeleton.png')}
                                    alt="Profile Preview"
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = '/avatar_skeleton.png';
                                    }}
                                />

                                {/* Overlay Button */}
                                <button
                                    type="button"
                                    onClick={() => setShowAvatarSelector(!showAvatarSelector)}
                                    className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                >
                                    <span className="bg-white/90 backdrop-blur-sm text-gray-800 px-4 py-2 rounded-full text-sm font-semibold shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform">
                                        Alterar Avatar
                                    </span>
                                </button>
                            </div>

                            {/* Avatar Selector (Collapsible) */}
                            {showAvatarSelector && (
                                <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200 animate-in slide-in-from-top-2">
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-xs font-semibold text-gray-600">Galeria de Avatares</span>
                                        <button type="button" onClick={() => setShowAvatarSelector(false)} className="text-gray-400 hover:text-gray-600">
                                            <X size={14} />
                                        </button>
                                    </div>

                                    {loadingAvatars ? (
                                        <div className="text-center py-4 text-xs text-gray-400">Carregando...</div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1 customize-scrollbar">
                                            {avatars.filter(a => a.category === 'Avatar').map((avatar) => (
                                                <div
                                                    key={avatar.id}
                                                    onClick={() => {
                                                        setFormData(prev => ({ ...prev, avatar_url: avatar.public_url }));
                                                        setShowAvatarSelector(false);
                                                    }}
                                                    className={`cursor-pointer aspect-square rounded-full overflow-hidden border-2 transition-all ${formData.avatar_url === avatar.public_url ? 'border-blue-500 ring-2 ring-blue-200 scale-105' : 'border-transparent hover:border-gray-300 hover:scale-105'}`}
                                                >
                                                    <img src={avatar.public_url} alt={avatar.name} className="w-full h-full object-cover" />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="mt-4 text-center">
                                <p className="text-xs text-gray-500">
                                    Escolha um avatar da nossa galeria exclusiva.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Form Fields (8 cols) */}
                    <div className="lg:col-span-8 flex flex-col gap-6">

                        {/* Basic Info Card */}
                        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <UserCircle size={24} className="text-blue-600" />
                                Informações da Conta
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                        Nome Completo <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        placeholder="Seu nome"
                                        className="w-full px-4 py-3 text-lg font-medium border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:font-normal"
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                                            <Mail size={14} className="text-gray-400" />
                                            E-mail (Login)
                                        </label>
                                        <input
                                            type="email"
                                            value={user?.email || ''}
                                            disabled
                                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-500 font-medium cursor-not-allowed select-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                                            <Phone size={14} className="text-gray-400" />
                                            Telefone
                                        </label>
                                        <input
                                            type="tel"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleChange}
                                            placeholder="(00) 00000-0000"
                                            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Papel
                                        </label>
                                        <div className="relative">
                                            <select
                                                name="role"
                                                value={formData.role || 'user'}
                                                onChange={handleChange}
                                                disabled={!isRealAdmin}
                                                className="w-full pl-3 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none appearance-none cursor-pointer text-gray-700 font-medium"
                                            >
                                                <option value="user">Usuário</option>
                                                <option value="personal">Personal</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                        </div>
                                        {user?.role !== 'admin' && !isRealAdmin && (
                                            <p className="text-xs text-gray-400 mt-2">Somente administradores podem alterar o papel.</p>
                                        )}
                                    </div>

                                    {isRealAdmin && (
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                                Status da Conta
                                            </label>
                                            <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                                                <div className={`w-3 h-3 rounded-full ${formData.active ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`}></div>
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        name="active"
                                                        checked={formData.active}
                                                        onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                                                        className="sr-only peer"
                                                    />
                                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                                    <span className="ms-3 text-sm font-medium text-gray-700">{formData.active ? 'Ativo' : 'Inativo'}</span>
                                                </label>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Collapsible Physical Data Section */}
                        <Accordion title="Dados Físicos" icon={Calculator} defaultOpen={true}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                        Data de Nascimento
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="relative">
                                            <select
                                                value={formData.birth_date ? parseInt(formData.birth_date.split('-')[2]) : ''}
                                                onChange={(e) => updateBirthDate('day', e.target.value)}
                                                className="w-full px-2 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none appearance-none cursor-pointer text-sm text-center"
                                            >
                                                <option value="" disabled>Dia</option>
                                                {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                                                    <option key={d} value={d}>{d}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="relative">
                                            <select
                                                value={formData.birth_date ? parseInt(formData.birth_date.split('-')[1]) : ''}
                                                onChange={(e) => updateBirthDate('month', e.target.value)}
                                                className="w-full px-2 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none appearance-none cursor-pointer text-sm text-center"
                                            >
                                                <option value="" disabled>Mês</option>
                                                {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'].map((m, i) => (
                                                    <option key={i} value={i + 1}>{m}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="relative">
                                            <select
                                                value={formData.birth_date ? parseInt(formData.birth_date.split('-')[0]) : ''}
                                                onChange={(e) => updateBirthDate('year', e.target.value)}
                                                className="w-full px-2 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none appearance-none cursor-pointer text-sm text-center"
                                            >
                                                <option value="" disabled>Ano</option>
                                                {Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i).map(y => (
                                                    <option key={y} value={y}>{y}</option>
                                                ))}
                                            </select>
                                        </div>
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
                                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none appearance-none cursor-pointer"
                                        >
                                            <option value="">Selecione...</option>
                                            <option value="Masculino">Masculino</option>
                                            <option value="Feminino">Feminino</option>
                                            <option value="Outro">Outro</option>
                                        </select>
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                        Altura (cm)
                                    </label>
                                    <input
                                        type="number"
                                        name="height_cm"
                                        value={formData.height_cm}
                                        onChange={handleChange}
                                        placeholder="Ex: 175"
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                        Peso (kg)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        name="weight_kg"
                                        value={formData.weight_kg}
                                        onChange={handleChange}
                                        placeholder="Ex: 70.5"
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                    />
                                </div>
                            </div>
                        </Accordion>
                    </div>
                </div>



            </form>
        </Modal>
    );
};

export default EditProfileModal;
