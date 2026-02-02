import React, { useState, useEffect } from 'react';
import { User, Settings, Bell, Shield, CircleHelp, LogOut, ChevronRight, Award, Activity, Edit2, Plus, Trash2, X, Check, Camera } from 'lucide-react';
import { supabase, supabaseHelpers } from '../lib/supabase';
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
            await supabaseHelpers.updateUserProfile(user.id, formData);
            setUser({ ...user, ...formData });
            setShowEditProfile(false);
        } catch (error) {
            console.error('Error updating profile:', error);
            // Show detailed error if available
            const msg = error.message || 'Erro desconhecido';
            const hint = error.hint || '';
            alert(`Erro ao atualizar perfil: ${msg}\n${hint}`);
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
                await supabaseHelpers.updateUserProfile(user.id, { ...user, avatar_url: url });
                setUser(prev => ({ ...prev, avatar_url: url }));
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

    const handleDeleteGoal = async (id) => {
        if (confirm('Tem certeza que deseja excluir esta meta?')) {
            try {
                await supabaseHelpers.deleteUserGoal(id);
                setGoals(goals.filter(g => g.id !== id));
            } catch (error) {
                console.error('Error deleting goal:', error);
            }
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.reload();
    };

    if (loading) return <div className="profile-container" style={{ padding: '2rem' }}>Carregando perfil...</div>;

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

                <h2 className="profile-name">{user?.name || 'Visitante'}</h2>
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
                        <span className="p-stat-value">{stats.weight || '-'}kg</span>
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
            {showEditProfile && (
                <div className="modal-overlay" onClick={() => setShowEditProfile(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Editar Dados Pessoais</h3>
                            <button className="close-btn" onClick={() => setShowEditProfile(false)}><X /></button>
                        </div>

                        <div className="modal-body">
                            <div className="form-group">
                                <label>Nome Completo</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Nascimento</label>
                                    <input
                                        type="date"
                                        className="form-input"
                                        value={formData.birth_date}
                                        onChange={e => setFormData({ ...formData, birth_date: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Gênero</label>
                                    <select
                                        className="form-select"
                                        value={formData.gender}
                                        onChange={e => setFormData({ ...formData, gender: e.target.value })}
                                    >
                                        <option value="">Selecione</option>
                                        <option value="Masculino">Masculino</option>
                                        <option value="Feminino">Feminino</option>
                                        <option value="Outro">Outro</option>
                                    </select>
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Altura (cm)</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={formData.height_cm}
                                        onChange={e => setFormData({ ...formData, height_cm: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Telefone</label>
                                    <input
                                        type="tel"
                                        className="form-input"
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="modal-actions">
                                <button className="btn-secondary" onClick={() => setShowEditProfile(false)}>Cancelar</button>
                                <button className="btn-primary" onClick={handleSaveProfile} disabled={saving}>
                                    {saving ? 'Salvando...' : 'Salvar'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: AVATAR SELECTOR */}
            {showAvatarSelector && (
                <div className="modal-overlay" onClick={() => setShowAvatarSelector(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Escolha um Avatar</h3>
                            <button className="close-btn" onClick={() => setShowAvatarSelector(false)}><X /></button>
                        </div>
                        <div className="avatar-grid">
                            {AVATARS.map((url, idx) => (
                                <img
                                    key={idx}
                                    src={url}
                                    className={`avatar-option ${formData.avatar_url === url ? 'selected' : ''}`}
                                    onClick={() => handleUpdateAvatar(url)}
                                />
                            ))}
                        </div>
                        <div className="modal-actions">
                            <button className="btn-secondary" onClick={() => setShowAvatarSelector(false)}>Fechar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: GOALS */}
            {showGoals && (
                <div className="modal-overlay" onClick={() => setShowGoals(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Minhas Metas</h3>
                            <button className="close-btn" onClick={() => setShowGoals(false)}><X /></button>
                        </div>

                        <div className="modal-body">
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
                                    <button onClick={() => handleDeleteGoal(goal.id)} className="close-btn">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}

                            {isAddingGoal ? (
                                <div className="form-group" style={{ marginTop: '1rem' }}>
                                    <input
                                        type="text"
                                        placeholder="Título (ex: Correr 5km)"
                                        className="form-input"
                                        style={{ marginBottom: '0.5rem' }}
                                        value={newGoal.title}
                                        onChange={e => setNewGoal({ ...newGoal, title: e.target.value })}
                                    />
                                    <textarea
                                        placeholder="Descrição..."
                                        className="form-textarea"
                                        style={{ marginBottom: '0.5rem' }}
                                        value={newGoal.description}
                                        onChange={e => setNewGoal({ ...newGoal, description: e.target.value })}
                                    />
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
                        </div>

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
                    </div>
                </div>
            )}
        </div>
    );
};

export default Profile;
