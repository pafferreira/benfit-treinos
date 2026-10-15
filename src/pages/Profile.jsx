import React, { useState, useEffect } from 'react';
import { User, Settings, Bell, Moon, LogOut, ChevronRight, Award, Activity, Plus, Trash2, Camera, Image, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase, supabaseHelpers } from '../lib/supabase';
import { saveToMemory } from '../services/memory';
import { useAvatars, useUserRole } from '../hooks/useSupabase';
import Modal from '../components/Modal';
import EditProfileModal from '../components/EditProfileModal';
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
    const [loadingStats, setLoadingStats] = useState(true);
    const [goals, setGoals] = useState([]);

    // Custom Hooks
    const { avatars, loading: loadingAvatars } = useAvatars();
    const { isAdmin, isRealAdmin, isPersonal } = useUserRole();
    const navigate = useNavigate();

    // Modals state
    const [showEditProfile, setShowEditProfile] = useState(false);
    const [showGoals, setShowGoals] = useState(false);
    const [showAvatarSelector, setShowAvatarSelector] = useState(false);
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });


    // Edit form state
    const [formData, setFormData] = useState({});
    const [saving, setSaving] = useState(false);

    // Goals form state
    const [newGoal, setNewGoal] = useState({ title: '', description: '', deadline: '' });
    const [isAddingGoal, setIsAddingGoal] = useState(false);

    useEffect(() => {
        fetchUserData();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const fetchUserData = async () => {
        try {
            setLoading(true);

            // Phase 1: user profile — unblocks render ASAP
            const currentUser = await supabaseHelpers.getCurrentUser();
            if (!currentUser) return;

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
            setLoading(false); // Show profile immediately

            // Phase 2: stats + goals in parallel — don't block the render
            try {
                const [totalWorkouts, , progress, userGoals] = await Promise.all([
                    supabaseHelpers.getUserFrequency(currentUser.id, 365),
                    supabaseHelpers.getUserTotalCalories(currentUser.id),
                    supabase
                        .from('b_user_progress')
                        .select('weight_kg')
                        .eq('user_id', currentUser.id)
                        .order('created_at', { ascending: false })
                        .limit(1),
                    supabaseHelpers.getUserGoals(currentUser.id),
                ]);

                setStats({
                    workouts: totalWorkouts,
                    hours: Math.round(totalWorkouts * 0.75),
                    weight: progress?.data?.length > 0 ? progress.data[0].weight_kg : 0,
                });
                setGoals(userGoals || []);
            } finally {
                setLoadingStats(false);
            }
        } catch (error) {
            console.error('Error loading profile:', error);
            setLoading(false);
            setLoadingStats(false);
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

                // --- BENFIT COACH: Salva a meta na memória vetorial (fire-and-forget) ---
                try {
                    const deadlineText = newGoal.deadline ? ` Prazo: ${new Date(newGoal.deadline).toLocaleDateString('pt-BR')}.` : '';
                    const descText = newGoal.description ? ` Descrição: ${newGoal.description}.` : '';
                    const contentSummary = `Nova meta definida: "${newGoal.title}".${descText}${deadlineText}`;
                    const metadata = {
                        type: 'goal',
                        goal_id: added.id,
                        goal_title: newGoal.title,
                        deadline: newGoal.deadline || null,
                        date: new Date().toISOString()
                    };
                    saveToMemory(user.id, contentSummary, metadata).catch(err =>
                        console.warn('[Benfit Coach] Não foi possível salvar memória da meta:', err?.message)
                    );
                } catch (memErr) {
                    console.warn('[Benfit Coach] Erro ao montar resumo da meta para memória:', memErr);
                }
                // ---------------------------------------------------------------------------
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
    if (loading) return <SkeletonProfile />;

    const displayWeight = (user && user.weight_kg)
        ? user.weight_kg
        : ((stats && stats.weight) ? stats.weight : '-');

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
                        {loadingStats
                            ? <span className="block w-8 h-5 rounded shimmer mx-auto" />
                            : <span className="p-stat-value">{stats.workouts}</span>}
                        <span className="p-stat-label">Treinos</span>
                    </div>
                    <div className="p-stat">
                        {loadingStats
                            ? <span className="block w-8 h-5 rounded shimmer mx-auto" />
                            : <span className="p-stat-value">{stats.hours}</span>}
                        <span className="p-stat-label">Horas</span>
                    </div>
                    <div className="p-stat">
                        {loadingStats
                            ? <span className="block w-12 h-5 rounded shimmer mx-auto" />
                            : <span className="p-stat-value">{displayWeight}kg</span>}
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
                    <div className="settings-item" onClick={() => navigate('/historico')}>
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
                    {isRealAdmin && (
                        <div className="settings-item" onClick={() => navigate('/admin/midias')}>
                            <div className="item-left">
                                <Image size={20} className="item-icon" />
                                <span>Mídias Benfit</span>
                            </div>
                            <ChevronRight size={20} color="var(--color-subtext-light)" />
                        </div>
                    )}
                    {(isAdmin || isPersonal) && (
                        <div className="settings-item" onClick={() => navigate('/conhecimento')}>
                            <div className="item-left">
                                <BookOpen size={20} className="item-icon" />
                                <span>Base de Conhecimento</span>
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
