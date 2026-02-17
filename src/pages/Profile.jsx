import React, { useState, useEffect } from 'react';
import { User, Settings, Bell, Moon, Sun, CircleHelp, LogOut, ChevronRight, Award, Activity, Plus, Trash2, X, Check, Camera, Image, Search, Filter, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase, supabaseHelpers } from '../lib/supabase';
import { useAvatars, useUserRole } from '../hooks/useSupabase';
import Modal from '../components/Modal';
import EditProfileModal from '../components/EditProfileModal';
import AvatarModal from '../components/AvatarModal';
import ConfirmationModal from '../components/ConfirmationModal';
import ActivityHistory from '../components/ActivityHistory';
import { SkeletonProfile } from '../components/SkeletonLoader';
import './Profile.css';



const DISPLAY_AVATAR = (user) => {
    if (user?.avatar_url) return user.avatar_url;
    if (user?.gender === 'Feminino') return '/avatar_skeleton_female.png';
    return '/avatar_skeleton.png';
};

const Profile = () => {
    const [user, setUser] = useState(null);
    const [stats, setStats] = useState({ workouts: 0, hours: 0, weight: 0 });
    const [loading, setLoading] = useState(true);
    const [goals, setGoals] = useState([]);

    // Custom Hooks
    const { avatars, loading: loadingAvatars, reload: reloadAvatars } = useAvatars();
    const { isAdmin, isRealAdmin } = useUserRole();
    const navigate = useNavigate();

    // Modals state
    const [showEditProfile, setShowEditProfile] = useState(false);
    const [showGoals, setShowGoals] = useState(false);
    const [showAvatarSelector, setShowAvatarSelector] = useState(false);
    const [showAvatarManager, setShowAvatarManager] = useState(false);
    const [showAvatarModal, setShowAvatarModal] = useState(false);
    const [selectedAvatar, setSelectedAvatar] = useState(null);
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
    const [showActivityHistory, setShowActivityHistory] = useState(false);

    // Edit form state
    const [formData, setFormData] = useState({});
    const [saving, setSaving] = useState(false);

    // Goals form state
    const [newGoal, setNewGoal] = useState({ title: '', description: '', deadline: '' });
    const [isAddingGoal, setIsAddingGoal] = useState(false);

    // Avatar Filter State
    const [filterTerm, setFilterTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('Todas');
    const [filterGender, setFilterGender] = useState('Todos');
    const [filterActive, setFilterActive] = useState(true);

    useEffect(() => {
        console.log('Profile: Avatars loading:', loadingAvatars, 'Count:', avatars.length);
        fetchUserData();
    }, [avatars.length]); // Re-run if avatars update (maybe not needed loop, but safe to check)

    const fetchUserData = async () => {
        try {
            console.log('Profile: Starting fetchUserData');
            setLoading(true);
            const currentUser = await supabaseHelpers.getCurrentUser();
            console.log('Profile: Fetched user:', currentUser);

            if (currentUser) {
                setUser(currentUser);
                setFormData({
                    name: currentUser.name || '',
                    phone: currentUser.phone || '',
                    birth_date: currentUser.birth_date || '',
                    gender: currentUser.gender || '',
                    height_cm: currentUser.height_cm || '',
                    weight_kg: currentUser.weight_kg || '',
                    avatar_url: currentUser.avatar_url
                });

                // Fetch Stats
                const totalWorkouts = await supabaseHelpers.getUserFrequency(currentUser.id, 365); // Last year
                const totalCalories = await supabaseHelpers.getUserTotalCalories(currentUser.id);
                // Simplify hours estimate (avg 45 min per workout)
                const totalHours = Math.round(totalWorkouts * 0.75);

                // Fetch weight from progress
                const { data: progress } = await supabase
                    .from('b_user_progress')
                    .select('weight_kg')
                    .eq('user_id', currentUser.id)
                    .order('created_at', { ascending: false })
                    .limit(1);

                setStats({
                    workouts: totalWorkouts,
                    hours: totalHours,
                    weight: progress && progress.length > 0 ? progress[0].weight_kg : 0
                });
                console.log('Profile: Stats set', totalWorkouts, totalHours);

                // Fetch Goals
                if (currentUser) {
                    const userGoals = await supabaseHelpers.getUserGoals(currentUser.id);
                    console.log('Profile: Goals set', userGoals);
                    setGoals(userGoals || []);
                }
            } else {
                console.warn('Profile: No current user found');
            }
        } catch (error) {
            console.error('Error loading profile:', error);
        } finally {
            console.log('Profile: Finished loading, setting loading=false');
            setLoading(false);
        }
    };

    const handleSaveProfile = async (updatedData) => {
        if (!user) {
            alert('Usuário não encontrado. Faça login para editar o perfil.');
            return;
        }
        try {
            setSaving(true);
            const updatedProfile = await supabaseHelpers.updateUserProfile(user.id, updatedData || formData);
            if (updatedProfile) {
                setUser(prev => ({ ...prev, ...updatedProfile }));
                window.dispatchEvent(new Event('profile-updated'));
            }
            setShowEditProfile(false);
        } catch (error) {
            console.error('Error updating profile:', error);
            const msg = error.message || 'Erro desconhecido';
            alert(`Erro ao atualizar perfil: ${msg}`);
        } finally {
            setSaving(false);
        }
    };

    const handleUpdateAvatar = async (url) => {
        if (!user) {
            alert('Usuário não encontrado. Faça login para editar o avatar.');
            return;
        }
        try {
            setFormData(prev => ({ ...prev, avatar_url: url }));
            // If strictly updating avatar outside of full edit mode, save immediately
            if (!showEditProfile) {
                const updatedProfile = await supabaseHelpers.updateUserProfile(user.id, { ...user, avatar_url: url });
                if (updatedProfile) {
                    setUser(prev => ({ ...prev, avatar_url: url }));
                    window.dispatchEvent(new Event('profile-updated'));
                }
                setShowAvatarSelector(false);
            }
        } catch (error) {
            console.error('Error updating avatar:', error);
            alert(`Erro ao atualizar avatar: ${error.message}`);
        }
    };

    const handleAddGoal = async () => {
        if (!user) {
            alert('Usuário não autenticado. Faça login para adicionar metas.');
            return;
        }
        if (!newGoal.title) {
            alert('O título da meta é obrigatório.');
            return;
        }
        try {
            const added = await supabaseHelpers.createUserGoal(user.id, newGoal);
            if (added) {
                setGoals([added, ...goals]);
                setNewGoal({ title: '', description: '', deadline: '' });
                setIsAddingGoal(false);
            }
        } catch (error) {
            console.error('Error adding goal:', error);
            alert(`Erro ao salvar meta: ${error.message || 'Verifique sua conexão.'}`);
        }
    };

    const handleDeleteGoalRequest = (id) => {
        setConfirmModal({
            isOpen: true,
            title: 'Excluir Meta',
            message: 'Tem certeza que deseja excluir esta meta? Esta ação não pode ser desfeita.',
            onConfirm: () => deleteGoal(id)
        });
    };

    const deleteGoal = async (id) => {
        try {
            await supabaseHelpers.deleteUserGoal(id);
            setGoals(goals.filter(g => g.id !== id));
            setConfirmModal({ ...confirmModal, isOpen: false }); // Close modal after deletion
        } catch (error) {
            console.error('Error deleting goal:', error);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.reload();
    };

    // Avatar Management Handlers
    const handleCreateAvatar = () => {
        setSelectedAvatar(null);
        setShowAvatarModal(true);
    };

    const handleEditAvatar = (avatar) => {
        setSelectedAvatar(avatar);
        setShowAvatarModal(true);
    };

    const handleDeleteAvatar = (avatar) => {
        setConfirmModal({
            isOpen: true,
            title: 'Excluir Avatar',
            message: `Tem certeza que deseja excluir o avatar "${avatar.name}"? Esta ação não pode ser desfeita.`,
            onConfirm: () => confirmDeleteAvatar(avatar)
        });
    };

    const confirmDeleteAvatar = async (avatar) => {
        try {
            await supabaseHelpers.deleteAvatar(avatar.id);
            // Reload avatars list using hook
            reloadAvatars && reloadAvatars();
        } catch (err) {
            console.error('Error deleting avatar:', err);
            alert('Erro ao excluir avatar: ' + err.message);
        } finally {
            setConfirmModal({ ...confirmModal, isOpen: false });
        }
    };

    const handleSaveAvatar = async (avatarData) => {
        try {
            setSaving(true);
            if (selectedAvatar) {
                await supabaseHelpers.updateAvatar(selectedAvatar.id, avatarData);
            } else {
                await supabaseHelpers.createAvatar(avatarData);
            }
            setShowAvatarModal(false);
            // Reload avatars list using hook
            reloadAvatars && reloadAvatars();
        } catch (err) {
            console.error('Error saving avatar:', err);
            alert('Erro ao salvar avatar: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <SkeletonProfile />;

    const displayWeight = (user && user.weight_kg)
        ? user.weight_kg
        : ((stats && stats.weight) ? stats.weight : '-');

    // Filtered avatars - search across ALL fields
    const filteredAvatars = avatars.filter(avatar => {
        const term = filterTerm.toLowerCase();
        const matchesSearch = filterTerm === '' ||
            (avatar.name && avatar.name.toLowerCase().includes(term)) ||
            (avatar.category && avatar.category.toLowerCase().includes(term)) ||
            (avatar.gender && avatar.gender.toLowerCase().includes(term)) ||
            (avatar.storage_path && avatar.storage_path.toLowerCase().includes(term)) ||
            (avatar.public_url && avatar.public_url.toLowerCase().includes(term)) ||
            (avatar.tags && avatar.tags.some(tag => tag.toLowerCase().includes(term)));
        const matchesCategory = filterCategory === 'Todas' || avatar.category === filterCategory;
        const matchesGender = filterGender === 'Todos' || avatar.gender === filterGender;
        const matchesActive = avatar.is_active === filterActive;
        return matchesSearch && matchesCategory && matchesGender && matchesActive;
    });

    return (
        <div className="profile-container fade-in">
            {/* Profile Header */}
            <div className="profile-header">
                <div className="profile-avatar-wrapper" onClick={() => setShowAvatarSelector(true)}>
                    <img
                        src={DISPLAY_AVATAR(user)}
                        alt="Profile"
                        className="profile-avatar-large"
                        onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/avatar_skeleton.png';
                        }}
                    />
                    <div className="avatar-edit-overlay">
                        <Camera size={24} color="white" />
                    </div>
                </div>

                <h2 className="profile-name">{user?.name || 'Usuário'}</h2>
                <p className="profile-email">{user?.email}</p>

                <div className="profile-stats">
                    <div className="p-stat">
                        <span className="p-stat-value">{stats.workouts}</span>
                        <span className="p-stat-label">Treinos</span>
                    </div>
                    <div className="p-stat">
                        <span className="p-stat-value">{stats.hours}</span>
                        <span className="p-stat-label">Horas</span>
                    </div>
                    <div className="p-stat">
                        <span className="p-stat-value">{displayWeight}kg</span>
                        <span className="p-stat-label">Peso</span>
                    </div>
                </div>
            </div>

            {/* Account Settings */}
            <div className="settings-section">
                <h3 className="settings-title">Conta</h3>
                <div className="settings-list">
                    <div className="settings-item" onClick={() => setShowEditProfile(true)}>
                        <div className="item-left">
                            <User size={20} className="item-icon" />
                            <span>Dados Pessoais</span>
                        </div>
                        <ChevronRight size={20} color="var(--color-subtext-light)" />
                    </div>
                    <div className="settings-item" onClick={() => setShowGoals(true)}>
                        <div className="item-left">
                            <Award size={20} className="item-icon" />
                            <span>Minhas Metas</span>
                        </div>
                        <ChevronRight size={20} color="var(--color-subtext-light)" />
                    </div>
                    <div className="settings-item" onClick={() => setShowActivityHistory(true)}>
                        <div className="item-left">
                            <Activity size={20} className="item-icon" />
                            <span>Histórico de Atividades</span>
                        </div>
                        <ChevronRight size={20} color="var(--color-subtext-light)" />
                    </div>
                </div>
            </div>

            {/* App Settings */}
            <div className="settings-section">
                <h3 className="settings-title">Aplicativo</h3>
                <div className="settings-list">
                    {(isAdmin || isRealAdmin) && (
                        <div className="settings-item" onClick={() => navigate('/admin/users')}>
                            <div className="item-left">
                                <User size={20} className="item-icon" />
                                <span>Gerenciar Usuários</span>
                            </div>
                            <ChevronRight size={20} color="var(--color-subtext-light)" />
                        </div>
                    )}
                    {isAdmin && (
                        <div className="settings-item" onClick={() => setShowAvatarManager(true)}>
                            <div className="item-left">
                                <Image size={20} className="item-icon" />
                                <span>Gerenciar Avatares</span>
                            </div>
                            <ChevronRight size={20} color="var(--color-subtext-light)" />
                        </div>
                    )}
                    <div className="settings-item">
                        <div className="item-left">
                            <Bell size={20} className="item-icon" />
                            <span>Notificações</span>
                        </div>
                    </div>
                    <div className="settings-item" onClick={() => {
                        const isDark = document.documentElement.classList.toggle('dark');
                        // Force layout re-render if needed
                        document.querySelector('.dashboard-layout')?.classList.toggle('dark', isDark);
                    }}>
                        <div className="item-left">
                            <Moon size={20} className="item-icon" />
                            <span>Tema Escuro</span>
                        </div>
                        <ChevronRight size={20} color="var(--color-subtext-light)" />
                    </div>
                </div>
            </div>

            <button className="logout-btn" onClick={handleLogout}>
                <LogOut size={20} />
                Sair da Conta
            </button>

            {/* MODAL: EDIT PROFILE */}
            {showEditProfile && (
                <EditProfileModal
                    isOpen={showEditProfile}
                    onClose={() => setShowEditProfile(false)}
                    onSave={handleSaveProfile}
                    user={user}
                    isLoading={saving}
                />
            )}

            {/* MODAL: AVATAR SELECTOR */}
            <Modal
                isOpen={showAvatarSelector}
                onClose={() => setShowAvatarSelector(false)}
                title="Escolha um Avatar"
                size="small"
            >
                {loadingAvatars ? (
                    <div style={{ padding: '2rem', textAlign: 'center' }}>Carregando avatares...</div>
                ) : (
                    <div className="avatar-grid">
                        {avatars.filter(a => a.category === 'Avatar').map((avatar) => (
                            <img
                                key={avatar.id}
                                src={avatar.public_url}
                                className={`avatar-option ${formData.avatar_url === avatar.public_url ? 'selected' : ''}`}
                                onClick={() => {
                                    handleUpdateAvatar(avatar.public_url);
                                }}
                                alt={avatar.name}
                                title={avatar.name}
                            />
                        ))}
                    </div>
                )}
                <div className="flex justify-end pt-4 border-t border-gray-200 mt-4">
                    <button
                        onClick={() => setShowAvatarSelector(false)}
                        className="px-6 py-2.5 text-gray-700 font-medium bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-200 transition-all hover:scale-105 active:scale-95 shadow-sm"
                    >
                        Fechar
                    </button>
                </div>
            </Modal>

            {/* MODAL: GOALS */}
            <Modal
                isOpen={showGoals}
                onClose={() => setShowGoals(false)}
                title="Minhas Metas"
                size="large"
            >
                {!isAddingGoal && (
                    <button
                        onClick={() => setIsAddingGoal(true)}
                        className="w-full mb-4 py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 font-medium hover:border-blue-500 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
                    >
                        <Plus size={20} />
                        Adicionar Nova Meta
                    </button>
                )}

                {isAddingGoal && (
                    <div className="bg-gray-50 p-4 rounded-xl mb-6 border border-gray-200 animate-in fade-in slide-in-from-top-2">
                        <h4 className="font-semibold mb-3 text-gray-700">Nova Meta</h4>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Título</label>
                                <input
                                    type="text"
                                    value={newGoal.title}
                                    onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                                    placeholder="Ex: Correr 5km"
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none bg-white"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Descrição</label>
                                <textarea
                                    value={newGoal.description}
                                    onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                                    placeholder="Detalhes sobre a meta..."
                                    rows={2}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none resize-none bg-white"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Prazo</label>
                                <input
                                    type="date"
                                    value={newGoal.deadline}
                                    onChange={(e) => setNewGoal({ ...newGoal, deadline: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none bg-white"
                                />
                            </div>
                            <div className="flex gap-2 pt-2 justify-end">
                                <button
                                    onClick={() => setIsAddingGoal(false)}
                                    className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 bg-white"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleAddGoal}
                                    className="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors shadow-sm font-medium"
                                >
                                    Salvar Meta
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="space-y-3">
                    {goals.length === 0 && !isAddingGoal && (
                        <div className="text-center py-8 text-gray-400">
                            <Award size={48} className="mx-auto mb-2 opacity-20" />
                            <p className="text-sm">Nenhuma meta definida ainda.</p>
                        </div>
                    )}

                    {goals.map(goal => (
                        <div key={goal.id} className="goal-card relative group hover:shadow-md transition-all border border-transparent hover:border-gray-200">
                            <div>
                                <h4 className="goal-title text-gray-800">{goal.title}</h4>
                                <p className="goal-desc text-gray-500 text-sm mt-1">{goal.description}</p>
                                {goal.deadline && (
                                    <div className="flex items-center gap-1 mt-2 text-xs text-blue-600 font-medium">
                                        <Award size={12} />
                                        <span>Meta até: {new Date(goal.deadline).toLocaleDateString()}</span>
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => handleDeleteGoalRequest(goal.id)}
                                className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                title="Excluir Meta"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            </Modal>

            {/* MODAL: AVATAR MANAGER */}
            {showAvatarManager && (
                <Modal
                    isOpen={showAvatarManager}
                    onClose={() => setShowAvatarManager(false)}
                    title="Gerenciar Avatares"
                    size="large"
                >
                    {loadingAvatars ? (
                        <div style={{ padding: '2rem', textAlign: 'center' }}>Carregando avatares...</div>
                    ) : (
                        <div className="flex flex-col h-full" style={{ maxHeight: '70vh' }}>
                            {/* Scrollable Grid Area */}
                            <div className="flex-1 overflow-y-auto pr-2" style={{ maxHeight: 'calc(70vh - 80px)' }}>

                                {/* Avatar Filter Section */}
                                <div className="mb-4 sticky top-0 bg-white z-20 pb-4 border-b border-gray-100 shadow-sm px-1">

                                    {/* Header: Count & Active Toggle */}
                                    <div className="flex justify-between items-center mb-2 px-1">
                                        <span className="text-xs font-semibold text-gray-500">
                                            {filteredAvatars.length} registros encontrados
                                        </span>

                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-medium text-gray-600">{filterActive ? 'Ativos' : 'Não Ativos'}</span>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={filterActive}
                                                    onChange={(e) => setFilterActive(e.target.checked)}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                            </label>
                                        </div>
                                    </div>

                                    {/* Search Bar */}
                                    <div className="relative mb-2">
                                        <input
                                            type="text"
                                            placeholder="Buscar..."
                                            value={filterTerm}
                                            onChange={(e) => setFilterTerm(e.target.value)}
                                            className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                                        />
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                        {filterTerm && (
                                            <button
                                                onClick={() => setFilterTerm('')}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                                            >
                                                <X size={14} />
                                            </button>
                                        )}
                                    </div>

                                    {/* Filters Row */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="relative">
                                            <select
                                                value={filterCategory}
                                                onChange={(e) => setFilterCategory(e.target.value)}
                                                className="w-full pl-2 pr-6 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-blue-500 outline-none appearance-none cursor-pointer text-gray-700"
                                            >
                                                <option value="Todas">Todas Categ.</option>
                                                {[...new Set(avatars.map(a => a.category).filter(Boolean))].map(cat => (
                                                    <option key={cat} value={cat}>{cat}</option>
                                                ))}
                                            </select>
                                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
                                        </div>

                                        <div className="relative">
                                            <select
                                                value={filterGender}
                                                onChange={(e) => setFilterGender(e.target.value)}
                                                className="w-full pl-2 pr-6 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-blue-500 outline-none appearance-none cursor-pointer text-gray-700"
                                            >
                                                <option value="Todos">Todos Gên.</option>
                                                {[...new Set(avatars.map(a => a.gender).filter(Boolean))].map(gen => (
                                                    <option key={gen} value={gen}>{gen}</option>
                                                ))}
                                            </select>
                                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
                                        </div>
                                    </div>
                                </div>

                                {/* Grid Area with Fixed Height */}
                                <div className="min-h-[400px]">
                                    {filteredAvatars.length > 0 ? (
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pb-4">
                                            {filteredAvatars.map((avatar) => (
                                                <div key={avatar.id} className="relative group bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-all">
                                                    <div className="aspect-square w-full bg-gray-100 relative cursor-pointer" onClick={() => handleEditAvatar(avatar)}>
                                                        <img
                                                            src={avatar.public_url}
                                                            alt={avatar.name}
                                                            className={`w-full h-full object-cover transition-all ${!avatar.is_active ? 'opacity-40 grayscale' : 'group-hover:scale-105'}`}
                                                            onError={(e) => {
                                                                e.target.onerror = null;
                                                                e.target.src = 'https://via.placeholder.com/150?text=Sem+Imagem';
                                                            }}
                                                        />
                                                        {/* DELETE BUTTON - Glassmorphism style, hover only */}
                                                        <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleDeleteAvatar(avatar); }}
                                                                className="p-1.5 bg-red-500/20 backdrop-blur-md hover:bg-red-500/40 text-white rounded-lg shadow-lg border border-white/20 transition-all active:scale-90"
                                                                title="Deletar"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>

                                                        {!avatar.is_active && (
                                                            <div className="absolute top-2 left-2 pointer-events-none z-10">
                                                                <span className="text-[9px] font-bold bg-gray-800 text-white px-2 py-0.5 rounded-full shadow-sm">INATIVO</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="p-2.5 cursor-pointer" onClick={() => handleEditAvatar(avatar)}>
                                                        <h4 className="font-semibold text-xs text-gray-900 truncate" title={avatar.name}>{avatar.name}</h4>
                                                        <div className="flex items-center gap-1.5 mt-1">
                                                            <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-100">{avatar.category}</span>
                                                            {avatar.gender && (
                                                                <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">{avatar.gender}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center text-gray-400 py-12">
                                            <Search size={48} className="mb-4 opacity-20" />
                                            <p className="text-sm">Nenhum avatar encontrado.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Fixed Button at Bottom */}
                            <div className="sticky bottom-0 pt-4 pb-2 bg-white border-t border-gray-200 mt-auto">
                                <button
                                    onClick={handleCreateAvatar}
                                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    <Plus size={20} />
                                    Adicionar Novo Avatar
                                </button>
                            </div>
                        </div>
                    )}
                </Modal>
            )}

            {/* MODAL: AVATAR CRUD */}
            {showAvatarModal && (
                <AvatarModal
                    isOpen={showAvatarModal}
                    onClose={() => setShowAvatarModal(false)}
                    onSave={handleSaveAvatar}
                    avatar={selectedAvatar}
                    isLoading={saving}
                />
            )}

            {/* MODAL: ACTIVITY HISTORY */}
            {showActivityHistory && (
                <ActivityHistory
                    isOpen={showActivityHistory}
                    onClose={() => setShowActivityHistory(false)}
                    userId={user?.id}
                />
            )}

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

export default Profile;
