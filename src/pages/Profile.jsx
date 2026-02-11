import React, { useState, useEffect } from 'react';
import { User, Settings, Bell, Shield, CircleHelp, LogOut, ChevronRight, Award, Activity, Edit2, Plus, Trash2, X, Check, Camera, Image } from 'lucide-react';
import { supabase, supabaseHelpers } from '../lib/supabase';
import { useAvatars } from '../hooks/useSupabase';
import Modal from '../components/Modal';
import EditProfileModal from '../components/EditProfileModal';
import AvatarModal from '../components/AvatarModal';
import ConfirmationModal from '../components/ConfirmationModal';
import { SkeletonProfile } from '../components/SkeletonLoader';
import './Profile.css';



const SUGGESTED_GOALS = [
    { title: 'Longevidade', description: 'Manter corpo funcional e sem dores por longo prazo.' },
    { title: 'Mobilidade', description: 'Melhorar amplitude de movimento e flexibilidade.' },
    { title: 'Força Funcional', description: 'Ganhar força para atividades do dia a dia.' },
    { title: 'Isometria', description: 'Fortalecimento seguro através de exercícios estáticos.' }
];

const Profile = () => {
    const [user, setUser] = useState(null);
    const [stats, setStats] = useState({ workouts: 0, hours: 0, weight: 0 });
    const [loading, setLoading] = useState(true);
    const [goals, setGoals] = useState([]);

    // Custom Hooks
    const { avatars, loading: loadingAvatars } = useAvatars();

    // Modals state
    const [showEditProfile, setShowEditProfile] = useState(false);
    const [showGoals, setShowGoals] = useState(false);
    const [showAvatarSelector, setShowAvatarSelector] = useState(false);
    const [showAvatarManager, setShowAvatarManager] = useState(false);
    const [showAvatarModal, setShowAvatarModal] = useState(false);
    const [selectedAvatar, setSelectedAvatar] = useState(null);
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

    // Edit form state
    const [formData, setFormData] = useState({});
    const [saving, setSaving] = useState(false);

    // Goals form state
    const [newGoal, setNewGoal] = useState({ title: '', description: '', deadline: '' });
    const [isAddingGoal, setIsAddingGoal] = useState(false);

    useEffect(() => {
        fetchUserData();
    }, []);

    const fetchUserData = async () => {
        try {
            setLoading(true);
            const currentUser = await supabaseHelpers.getCurrentUser();
            if (currentUser) {
                setUser(currentUser);
                setFormData({
                    name: currentUser.name || '',
                    phone: currentUser.phone || '',
                    birth_date: currentUser.birth_date || '',
                    gender: currentUser.gender || '',
                    height_cm: currentUser.height_cm || '',
                    weight_kg: currentUser.weight_kg || '',
                    avatar_url: currentUser.avatar_url || AVATARS[0]
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

                // Fetch Goals
                if (currentUser) {
                    const userGoals = await supabaseHelpers.getUserGoals(currentUser.id);
                    setGoals(userGoals || []);
                }
            }
        } catch (error) {
            console.error('Error loading profile:', error);
        } finally {
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
            // Reload avatars list
            window.location.reload(); // Simple approach, could use context/state management
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
            // Reload avatars list
            window.location.reload(); // Simple approach
        } catch (err) {
            console.error('Error saving avatar:', err);
            alert('Erro ao salvar avatar: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <SkeletonProfile />;

    const displayWeight = user?.weight_kg
        ? user.weight_kg
        : (stats.weight ? stats.weight : '-');

    return (
        <div className="profile-container fade-in">
            {/* Profile Header */}
            <div className="profile-header">
                <div className="profile-avatar-wrapper" onClick={() => setShowAvatarSelector(true)}>
                    <img
                        src={user?.avatar_url || AVATARS[0]}
                        alt="Profile"
                        className="profile-avatar-large"
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
                    <div className="settings-item">
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
                    <div className="settings-item" onClick={() => setShowAvatarManager(true)}>
                        <div className="item-left">
                            <Image size={20} className="item-icon" />
                            <span>Gerenciar Avatares</span>
                        </div>
                        <ChevronRight size={20} color="var(--color-subtext-light)" />
                    </div>
                    <div className="settings-item">
                        <div className="item-left">
                            <Bell size={20} className="item-icon" />
                            <span>Notificações</span>
                        </div>
                    </div>
                    <div className="settings-item">
                        <div className="item-left">
                            <Shield size={20} className="item-icon" />
                            <span>Privacidade</span>
                        </div>
                    </div>
                </div>
            </div>

            <button className="logout-btn" onClick={handleLogout}>
                <LogOut size={20} />
                Sair da Conta
            </button>

            {/* MODAL: EDIT PROFILE */}
            <EditProfileModal
                isOpen={showEditProfile}
                onClose={() => setShowEditProfile(false)}
                onSave={handleSaveProfile}
                user={user}
                isLoading={saving}
            />

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
                        {avatars.map((avatar) => (
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
                <div className="form-actions">
                    <button className="btn-secondary" onClick={() => setShowAvatarSelector(false)}>Fechar</button>
                </div>
            </Modal>

            {/* MODAL: GOALS */}
            <Modal
                isOpen={showGoals}
                onClose={() => setShowGoals(false)}
                title="Minhas Metas"
                size="large"
            >
                {goals.length === 0 && !isAddingGoal && (
                    <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--color-subtext-light)' }}>
                        <p>Nenhuma meta definida ainda.</p>
                    </div>
                )}

                {goals.map(goal => (
                    <div key={goal.id} className="goal-card">
                        <div>
                            <h4 className="goal-title">{goal.title}</h4>
                            <p className="goal-desc">{goal.description}</p>
                            {goal.deadline && (
                                <span className="goal-meta">Meta até: {new Date(goal.deadline).toLocaleDateString()}</span>
                            )}
                        </div>
                        <button onClick={() => handleDeleteGoalRequest(goal.id)} className="close-btn">
                            <Trash2 size={18} />
                        </button>
                    </div>
                ))}

                {isAddingGoal ? (
                    <div className="form-group" style={{ marginTop: '1rem' }}>
                        <label>Título da Meta</label>
                        <input
                            type="text"
                            placeholder="Ex: Correr 5km"
                            className="form-input"
                            style={{ marginBottom: '0.5rem' }}
                            value={newGoal.title}
                            onChange={e => setNewGoal({ ...newGoal, title: e.target.value })}
                        />

                        <label>Descrição Detalhada</label>
                        <textarea
                            placeholder="Descreva como atingir..."
                            className="form-textarea"
                            style={{ marginBottom: '0.5rem' }}
                            value={newGoal.description}
                            onChange={e => setNewGoal({ ...newGoal, description: e.target.value })}
                        />

                        <label>Prazo / Data Alvo</label>
                        <input
                            type="date"
                            className="form-input"
                            style={{ marginBottom: '0.5rem' }}
                            value={newGoal.deadline}
                            onChange={e => setNewGoal({ ...newGoal, deadline: e.target.value })}
                        />

                        <div className="modal-actions">
                            <button className="btn-secondary" onClick={() => setIsAddingGoal(false)}>Cancelar</button>
                            <button className="btn-primary" onClick={handleAddGoal}>Salvar</button>
                        </div>
                    </div>
                ) : (
                    <button className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 font-medium hover:border-blue-500 hover:text-blue-500 hover:bg-blue-50 transition-all flex items-center justify-center gap-2" onClick={() => setIsAddingGoal(true)}>
                        <Plus size={20} />
                        Adicionar Nova Meta
                    </button>
                )}

                {!isAddingGoal && (
                    <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid #374151' }}>
                        <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--color-subtext-light)', marginBottom: '0.5rem' }}>Sugestões Benfit</p>
                        <div className="suggested-goals">
                            {SUGGESTED_GOALS.map((sg, i) => (
                                <button
                                    key={i}
                                    onClick={() => {
                                        setNewGoal({ ...newGoal, title: sg.title, description: sg.description });
                                        setIsAddingGoal(true);
                                    }}
                                    className="suggestion-chip"
                                >
                                    {sg.title}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </Modal>

            {/* MODAL: AVATAR MANAGER */}
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
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-4">
                                    {avatars.map((avatar) => (
                                        <div key={avatar.id} className="relative group bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all">
                                            <div className="aspect-square w-full bg-gray-100">
                                                <img
                                                    src={avatar.public_url}
                                                    alt={avatar.name}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        e.target.onerror = null;
                                                        e.target.src = 'https://via.placeholder.com/150?text=Error';
                                                    }}
                                                />
                                            </div>
                                            <div className="p-3">
                                                <h4 className="font-semibold text-sm text-gray-900 truncate">{avatar.name}</h4>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-xs text-gray-500">{avatar.category}</span>
                                                    {avatar.gender && (
                                                        <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{avatar.gender}</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleEditAvatar(avatar)}
                                                    className="p-2 bg-white/90 backdrop-blur-sm hover:bg-white text-blue-500 rounded-lg shadow-lg transition-transform hover:scale-105"
                                                    title="Editar"
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteAvatar(avatar)}
                                                    className="p-2 bg-white/90 backdrop-blur-sm hover:bg-white text-red-500 rounded-lg shadow-lg transition-transform hover:scale-105"
                                                    title="Deletar"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                            {!avatar.is_active && (
                                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                                    <span className="text-white text-xs font-bold bg-red-500 px-2 py-1 rounded">INATIVO</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                        </div>

                        {/* Fixed Button at Bottom */}
                            <div className="sticky bottom-0 pt-4 pb-2 bg-white border-t border-gray-200 mt-auto">
                                <button
                                    onClick={handleCreateAvatar}
                                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    <Plus size={20} />
                                    Adicionar Novo Avatar
                                </button>
                            </div>
                        </div>
                )}
                    </Modal>

            {/* MODAL: AVATAR CRUD */}
                <AvatarModal
                    isOpen={showAvatarModal}
                    onClose={() => setShowAvatarModal(false)}
                    onSave={handleSaveAvatar}
                    avatar={selectedAvatar}
                    isLoading={saving}
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

export default Profile;
