import { useState, useEffect } from 'react';
import { supabase, supabaseHelpers } from '../lib/supabase';
import { useUserRole } from '../hooks/useSupabase';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, User, Shield, ClipboardList, ChevronDown, ArrowLeft, Edit2, CheckCircle, XCircle } from 'lucide-react';
import EditProfileModal from '../components/EditProfileModal';

const AdminUsers = () => {
    const { isRealAdmin, impersonate, restoreRole, isImpersonating, role, loading: roleLoading } = useUserRole();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [updatingUserId, setUpdatingUserId] = useState(null);
    const [editUser, setEditUser] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        if (isRealAdmin) {
            fetchUsers();
        }
    }, [isRealAdmin]);

    // Estilo PAF: Handle ESC to return to Profile
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                if (!isEditModalOpen) {
                    navigate('/perfil');
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [navigate, isEditModalOpen]);

    // ... (fetchUsers and handleRoleChange remain the same)

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('b_users')
                .select('*')
                .order('name');

            if (error) throw error;
            setUsers(data || []);
        } catch (err) {
            console.error('Error fetching users:', err);
            alert('Erro ao carregar usuários.');
        } finally {
            setLoading(false);
        }
    };

    const handleRoleChange = async (userId, newRole) => {
        try {
            setUpdatingUserId(userId);

            // Use helper that ensures the authenticated user is admin before attempting the update
            const updated = await supabaseHelpers.updateUserRoleAsAdmin(userId, newRole);

            // Update local state with the new role
            setUsers((prev) => prev.map(u => u.id === userId ? { ...u, role: updated.role } : u));
            window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Papel atualizado.', type: 'success' } }));
        } catch (err) {
            console.error('Error updating role:', err);
            window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Erro ao atualizar papel do usuário: ' + (err.message || ''), type: 'error' } }));
        } finally {
            setUpdatingUserId(null);
        }
    };

    const handleToggleActive = async (user) => {
        try {
            const newActive = user.active === false ? true : false;
            // Optimistic UI update could be done here, but safe to wait or just refresh logic

            const { error } = await supabase.from('b_users').update({ active: newActive }).eq('id', user.id);
            if (error) throw error;

            setUsers(prev => prev.map(u => u.id === user.id ? { ...u, active: newActive } : u));
            window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: `Usuário ${newActive ? 'ativado' : 'desativado'}.`, type: 'success' } }));
        } catch (e) {
            console.error(e);
            window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Erro ao alterar status.', type: 'error' } }));
        }
    };

    const handleEditClick = (user) => {
        setEditUser(user);
        setIsEditModalOpen(true);
    };

    const handleSaveUser = async (formData) => {
        try {
            setLoading(true); // Re-use main loading or manage separate
            const updates = {
                name: formData.name,
                phone: formData.phone,
                role: formData.role,
                active: formData.active,
                birth_date: formData.birth_date || null,
                gender: formData.gender || null,
                height_cm: formData.height_cm === '' ? null : formData.height_cm,
                weight_kg: formData.weight_kg === '' ? null : formData.weight_kg,
                avatar_url: formData.avatar_url
            };

            const { error } = await supabase.from('b_users').update(updates).eq('id', editUser.id);
            if (error) throw error;

            setUsers(prev => prev.map(u => u.id === editUser.id ? { ...u, ...updates } : u));
            window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Dados atualizados com sucesso.', type: 'success' } }));
            setIsEditModalOpen(false);
            setEditUser(null);
        } catch (err) {
            console.error(err);
            window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Erro ao salvar dados.', type: 'error' } }));
        } finally {
            setLoading(false);
        }
    };

    const handleImpersonationToggle = (e) => {
        if (e.target.checked) {
            impersonate('user');
        } else {
            restoreRole();
        }
    };

    const filteredUsers = users.filter(user =>
    (user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (roleLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-blue-500" /></div>;
    // Use isRealAdmin for access control so checking 'Act as User' doesn't lock you out
    if (!isRealAdmin) return <div className="p-8 text-center text-red-500 font-bold">Acesso Negado. Esta área é restrita para Administradores.</div>;

    return (
        <div className="p-4 sm:p-6 pb-24 w-full mx-auto">
            {/* Header with Back Button */}
            <div className="flex items-center gap-4 mb-6">
                <button
                    onClick={() => navigate('/perfil')}
                    className="p-2 -ml-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-all"
                    title="Voltar para Perfil"
                >
                    <ArrowLeft size={24} />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-[#034EA2]">Gerenciar Usuários</h1>
                    <p className="text-gray-500 text-sm">Administração de permissões e acessos.</p>
                </div>
            </div>

            {/* Impersonation Control - Estilo PAF (Blue) */}
            <div className="mb-6 bg-[#F3F4F6] border border-gray-200 rounded-lg p-4 sm:p-5 shadow-sm">
                <div className="grid grid-cols-[84px_minmax(0,1fr)] sm:grid-cols-[96px_minmax(0,1fr)] items-stretch gap-4">
                    <div className="flex items-center justify-center rounded-lg bg-blue-100 text-[#034EA2]">
                        <User size={32} className="shrink-0" />
                    </div>

                    <div className="min-w-0 flex flex-col justify-center gap-2">
                        <div>
                            <h3 className="text-sm font-bold text-gray-800">Visualizar como ...</h3>
                            <p className="text-xs text-gray-600">Explore o app com diferentes permissões.</p>
                        </div>

                        <div className="relative w-full max-w-xs">
                            <select
                                value={isImpersonating ? role : 'admin'}
                                onChange={(e) => {
                                    const selected = e.target.value;
                                    if (selected === 'admin') {
                                        restoreRole();
                                    } else {
                                        impersonate(selected);
                                    }
                                }}
                                className="w-full appearance-none bg-white border border-gray-300 text-gray-700 py-2.5 pl-3 pr-10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#008ACF] focus:border-[#008ACF] shadow-sm font-medium"
                            >
                                <option value="admin">Admin (Original)</option>
                                <option value="personal">Personal Trainer</option>
                                <option value="user">Aluno / Usuário</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={16} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="mb-6 relative">
                <input
                    type="text"
                    placeholder="Buscar por nome ou email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#008ACF] focus:border-[#008ACF] outline-none placeholder-gray-400"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            </div>
            {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[#034EA2] w-8 h-8" /></div>
            ) : (
                <div className="bg-transparent md:bg-white md:rounded-lg md:shadow-sm md:border md:border-gray-200 md:overflow-hidden">

                    {/* Desktop View: Table */}
                    {/* Desktop View: Table */}
                    {/* Desktop View: Table with Maximized Width */}
                    <div className="hidden md:block overflow-x-auto min-h-[400px]">
                        <table className="w-full text-left whitespace-nowrap">
                            <thead className="bg-[#F9FAFB] border-b border-gray-200 sticky top-0 z-10">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold text-[#034EA2] uppercase tracking-wider w-[45%]">Usuário / Email</th>
                                    <th className="px-6 py-4 text-xs font-bold text-[#034EA2] uppercase tracking-wider w-[45%]">Perfil</th>
                                    <th className="px-6 py-4 text-xs font-bold text-[#034EA2] uppercase tracking-wider w-[10%] text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                                {filteredUsers.map(user => (
                                    <tr key={user.id} className={`transition-colors group border-l-4 
                                        ${user.role === 'admin' ? 'bg-purple-50 border-purple-500 hover:bg-purple-100' :
                                            user.role === 'personal' ? 'bg-blue-50 border-[#034EA2] hover:bg-blue-100' :
                                                'bg-white border-gray-200 hover:bg-gray-50'}`}>

                                        {/* User & Email Column with Integrated Status Toggle */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="relative shrink-0">
                                                    <img
                                                        src={user.avatar_url || '/avatar_skeleton.png'}
                                                        alt=""
                                                        className={`w-12 h-12 rounded-full object-cover border-2 shadow-sm transition-all ${user.active !== false ? 'border-green-500' : 'border-red-500 grayscale'}`}
                                                        onError={(e) => e.target.src = '/avatar_skeleton.png'}
                                                    />

                                                    {/* Status Toggle Button overlay */}
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleToggleActive(user); }}
                                                        className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center transition-all shadow-md hover:scale-110 ${user.active !== false ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}
                                                        title={user.active !== false ? 'Clique para Desativar' : 'Clique para Ativar'}
                                                    >
                                                        {user.active !== false ? <CheckCircle size={10} strokeWidth={4} /> : <XCircle size={10} strokeWidth={4} />}
                                                    </button>
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className={`font-bold text-sm truncate ${user.active !== false ? 'text-gray-900' : 'text-gray-400'}`}>
                                                        {user.name || 'Sem nome'}
                                                    </span>
                                                    <span className="text-xs text-gray-500 font-medium truncate">{user.email}</span>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Profile (Role) Column - Icon + Text */}
                                        <td className="px-6 py-4">
                                            <div className={`flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wide
                                                ${user.role === 'admin' ? 'text-purple-700' :
                                                    user.role === 'personal' ? 'text-[#034EA2]' :
                                                        'text-gray-500'}`}
                                            >
                                                {user.role === 'admin' && <Shield size={14} />}
                                                {user.role === 'personal' && <ClipboardList size={14} />}
                                                {user.role === 'user' && <User size={14} />}
                                                <span>
                                                    {user.role === 'admin' ? 'Admin' : user.role === 'personal' ? 'Personal' : 'Usuário'}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Actions Column */}
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleEditClick(user)}
                                                className="p-2 text-gray-400 hover:text-[#034EA2] hover:bg-white rounded-lg transition-all transform hover:scale-110 active:scale-95 shadow-sm border border-transparent hover:shadow-md"
                                                title="Editar"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table >
                    </div >

                    {/* Mobile View: Cards */}
                    <div className="md:hidden space-y-4">
                        {filteredUsers.map(user => (
                            <div key={user.id} className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm flex flex-col gap-4">
                                <div className="flex items-center gap-3">
                                    <img
                                        src={user.avatar_url || '/avatar_skeleton.png'}
                                        alt=""
                                        className="w-12 h-12 rounded-full bg-gray-100 object-cover border border-gray-100"
                                        onError={(e) => e.target.src = '/avatar_skeleton.png'}
                                    />
                                    <div className="flex flex-col min-w-0">
                                        <span className="font-bold text-gray-900 text-lg leading-tight truncate">{user.name || 'Sem nome'}</span>
                                        <span className="text-sm text-gray-500 break-all">{user.email}</span>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${user.active !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {user.active !== false ? 'Ativo' : 'Inativo'}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleEditClick(user)}
                                        className="ml-auto p-2 text-gray-400 hover:text-[#008ACF] bg-gray-50 hover:bg-blue-50 rounded-lg border border-gray-100"
                                    >
                                        <Edit2 size={20} />
                                    </button>
                                </div>

                                <div className="flex items-center justify-between border-t border-gray-100 pt-3 mt-1">
                                    <span className="text-xs font-semibold text-gray-500 uppercase">Papel Atual</span>
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wide border
                                    ${user.role === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                            user.role === 'personal' ? 'bg-blue-50 text-[#034EA2] border-blue-200' :
                                                'bg-gray-50 text-gray-600 border-gray-200'}`}>
                                        {user.role === 'admin' && <Shield size={12} />}
                                        {user.role === 'personal' && <ClipboardList size={12} />}
                                        {user.role === 'user' && <User size={12} />}
                                        {user.role || 'user'}
                                    </span>
                                </div>

                                <div className="pt-2">
                                    <label className="text-xs font-semibold text-gray-500 mb-2 block uppercase">Alterar Permissão</label>
                                    <div className="relative w-full">
                                        <select
                                            disabled={updatingUserId === user.id}
                                            value={user.role || 'user'}
                                            onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                            className="w-full appearance-none bg-gray-50 border border-gray-200 text-gray-700 py-3 pl-4 pr-10 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#008ACF] focus:border-[#008ACF] cursor-pointer disabled:opacity-50"
                                        >
                                            <option value="user">Usuário</option>
                                            <option value="personal">Personal</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                        {updatingUserId === user.id ? (
                                            <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-[#008ACF]" size={18} />
                                        ) : (
                                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={18} />
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {
                        filteredUsers.length === 0 && (
                            <div className="p-8 text-center text-gray-500">
                                Nenhum usuário encontrado.
                            </div>
                        )
                    }
                </div >
            )
            }

            {isEditModalOpen && editUser && (
                <EditProfileModal
                    isOpen={isEditModalOpen}
                    onClose={() => { setIsEditModalOpen(false); setEditUser(null); }}
                    onSave={handleSaveUser}
                    user={editUser}
                    isLoading={loading}
                />
            )}
        </div >
    );
};

export default AdminUsers;
