import React, { useState, useEffect } from 'react';
import { User, Settings, Bell, Shield, CircleHelp, LogOut, ChevronRight, Award, Activity, Edit2, Plus, Trash2, X, Check, Camera } from 'lucide-react';
import { supabase, supabaseHelpers } from '../lib/supabase';
import Modal from '../components/Modal';
import ConfirmationModal from '../components/ConfirmationModal';
import './Profile.css';

const AVATARS = [
    // Public Assets
    '/Elifit_Coach.png',
    '/Modelos FIT.webp',
    '/avatar-female.png',
    '/avatar-male.png',
    '/benfit-hero.jpg',
    '/benfit02.png',
    '/benfit04.png',
    '/benfit_fem.jpg',
    '/benfit_mas.jpg',
    // DiceBear Avatars (Fallbacks)
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
    'https://api.dicebear.com/7.x/notionists/svg?seed=Lily',
    'https://api.dicebear.com/7.x/micah/svg?seed=Micah'
];

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
                const userGoals = await supabaseHelpers.getUserGoals(currentUser.id);
                setGoals(userGoals || []);
            }
        } catch (error) {
            console.error('Error loading profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveProfile = async () => {
        if (!user) {
            alert('Usuário não encontrado. Faça login para editar o perfil.');
            return;
        }
        try {
            setSaving(true);
            const updatedProfile = await supabaseHelpers.updateUserProfile(user.id, formData);
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
        if (!newGoal.title) return;
        try {
            const added = await supabaseHelpers.createUserGoal(user.id, newGoal);
            setGoals([added, ...goals]);
            setNewGoal({ title: '', description: '', deadline: '' });
            setIsAddingGoal(false);
        } catch (error) {
            console.error('Error adding goal:', error);
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

    if (loading) return <div className="profile-container" style={{ padding: '2rem' }}>Carregando perfil...</div>;

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
            <Modal
                isOpen={showEditProfile}
                onClose={() => setShowEditProfile(false)}
                title="Editar Dados Pessoais"
            >
                <form
                    className="modal-form"
                    onSubmit={(e) => { e.preventDefault(); handleSaveProfile(); }}
                >
                    <div className="form-group">
                        <label>Nome Completo</label>
                        <input
                            type="text"
                            value={formData.name || ''}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label>E-mail (Login)</label>
                        <input
                            type="email"
                            value={user?.email || ''}
                            disabled
                            style={{ opacity: 0.7, background: '#f3f4f6' }}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="form-group">
                            <label>Nascimento</label>
                            <input
                                type="date"
                                value={formData.birth_date || ''}
                                onChange={e => setFormData({ ...formData, birth_date: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label>Gênero</label>
                            <select
                                value={formData.gender || ''}
                                onChange={e => setFormData({ ...formData, gender: e.target.value })}
                            >
                                <option value="">Selecione</option>
                                <option value="Masculino">Masculino</option>
                                <option value="Feminino">Feminino</option>
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="form-group">
                            <label>Altura (cm)</label>
                            <input
                                type="number"
                                value={formData.height_cm || ''}
                                onChange={e => setFormData({ ...formData, height_cm: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label>Peso (kg)</label>
                            <input
                                type="number"
                                step="0.1"
                                value={formData.weight_kg || ''}
                                onChange={e => setFormData({ ...formData, weight_kg: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Telefone</label>
                        <input
                            type="tel"
                            value={formData.phone || ''}
                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                        />
                    </div>

                    <div className="form-actions">
                        <button type="button" className="btn-secondary" onClick={() => setShowEditProfile(false)}>
                            Cancelar
                        </button>
                        <button type="submit" className="btn-primary" disabled={saving}>
                            {saving ? 'Salvando...' : 'Salvar Alterações'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* MODAL: AVATAR SELECTOR */}
            <Modal
                isOpen={showAvatarSelector}
                onClose={() => setShowAvatarSelector(false)}
                title="Escolha um Avatar"
                size="medium"
            >
                <div className="avatar-grid">
                    {AVATARS.map((url, idx) => (
                        <img
                            key={idx}
                            src={url}
                            className={`avatar-option ${formData.avatar_url === url ? 'selected' : ''}`}
                            onClick={() => {
                                handleUpdateAvatar(url);
                            }}
                            alt={`Avatar option ${idx}`}
                        />
                    ))}
                </div>
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
                    <button className="add-goal-btn" onClick={() => setIsAddingGoal(true)}>
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
