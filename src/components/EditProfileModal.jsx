import { useState, useEffect } from 'react';
import { useAvatars } from '../hooks/useSupabase';
import Modal from './Modal';
import { User, Settings, Camera, Save, X, ChevronDown, ChevronUp, UserCircle, Calculator, Phone, Mail, Check, Calendar } from 'lucide-react';

const Accordion = ({ title, icon: Icon, children, defaultOpen = false, className = '' }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className={`border border-gray-200 rounded-xl overflow-hidden mb-4 bg-white shadow-sm ${className}`}>
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
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        birth_date: '',
        gender: '',
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
                height_cm: user.height_cm || '',
                weight_kg: user.weight_kg || '',
                avatar_url: user.avatar_url || ''
            });
        }
    }, [user, isOpen]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Editar Dados Pessoais" size="full">
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">

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
                                    src={formData.avatar_url || 'https://via.placeholder.com/150'}
                                    alt="Profile Preview"
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = 'https://via.placeholder.com/150';
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
                                <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200 animate-in slide-in-from-top-2">
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
                                            {avatars.map((avatar) => (
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
                                        className="w-full px-4 py-3 text-lg font-medium border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:font-normal"
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
                                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-500 font-medium cursor-not-allowed select-none"
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
                                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Collapsible Physical Data Section */}
                        <Accordion title="Dados Físicos" icon={Calculator} defaultOpen={false}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                        Data de Nascimento
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="date"
                                            name="birth_date"
                                            value={formData.birth_date}
                                            onChange={handleChange}
                                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                        />
                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
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
                                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none appearance-none cursor-pointer"
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
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
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
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                    />
                                </div>
                            </div>
                        </Accordion>
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
                        className="px-8 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-xl shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40 hover:scale-105 active:scale-95 transition-all disabled:opacity-70 disabled:pointer-events-none flex items-center gap-2"
                    >
                        {isLoading ? 'Salvando...' : (
                            <>
                                <Save size={18} />
                                Salvar Alterações
                            </>
                        )}
                    </button>
                </div>

            </form>
        </Modal>
    );
};

export default EditProfileModal;
