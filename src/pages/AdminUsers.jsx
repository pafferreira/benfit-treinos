import { useState, useEffect } from 'react';
import { supabase, supabaseHelpers } from '../lib/supabase';
import { useUserRole } from '../hooks/useSupabase';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, User, Shield, Briefcase, ChevronDown, ArrowLeft } from 'lucide-react';

const AdminUsers = () => {
    const { isRealAdmin, impersonate, restoreRole, isImpersonating, role, loading: roleLoading } = useUserRole();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [updatingUserId, setUpdatingUserId] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (isRealAdmin) {
            fetchUsers();
        }
    }, [isRealAdmin]);

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
            const { error } = await supabase
                .from('b_users')
                .update({ role: newRole })
                .eq('id', userId);

            if (error) throw error;

            setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
        } catch (err) {
            console.error('Error updating role:', err);
            alert('Erro ao atualizar papel do usuário: ' + err.message);
        } finally {
            setUpdatingUserId(null);
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
        <div className="p-4 sm:p-6 pb-24 w-full mx-auto overflow-hidden">
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
            <div className="mb-6 bg-[#F3F4F6] border border-gray-200 rounded-xl p-4 flex flex-col gap-3 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg text-[#034EA2]">
                        <User size={20} className="shrink-0" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-gray-800">Visualizar Como</h3>
                        <p className="text-xs text-gray-600">Explore o app com diferentes permissões.</p>
                    </div>
                </div>

                <div className="relative w-full sm:max-w-xs">
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
                        className="w-full appearance-none bg-white border border-gray-300 text-gray-700 py-2 pl-3 pr-10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#008ACF] focus:border-[#008ACF] shadow-sm font-medium"
                    >
                        <option value="admin">Admin (Original)</option>
                        <option value="personal">Personal Trainer</option>
                        <option value="user">Aluno / Usuário</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={16} />
                </div>
            </div>

            <div className="mb-6 relative">
                <input
                    type="text"
                    placeholder="Buscar por nome ou email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-[#008ACF] focus:border-[#008ACF] outline-none placeholder-gray-400"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            </div>

            {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[#034EA2] w-8 h-8" /></div>
            ) : (
                <div className="bg-transparent md:bg-white md:rounded-xl md:shadow-sm md:border md:border-gray-200 md:overflow-hidden">

                    {/* Desktop View: Table */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left whitespace-nowrap">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold text-[#034EA2] uppercase tracking-wider">Usuário</th>
                                    <th className="px-6 py-4 text-xs font-bold text-[#034EA2] uppercase tracking-wider">Email</th>
                                    <th className="px-6 py-4 text-xs font-bold text-[#034EA2] uppercase tracking-wider">Papel Atual</th>
                                    <th className="px-6 py-4 text-xs font-bold text-[#034EA2] uppercase tracking-wider text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredUsers.map(user => (
                                    <tr key={user.id} className="hover:bg-blue-50/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <img
                                                    src={user.avatar_url || '/Elifit_Coach.png'}
                                                    alt=""
                                                    className="w-8 h-8 rounded-full bg-gray-100 object-cover border border-gray-200"
                                                    onError={(e) => e.target.src = '/Elifit_Coach.png'}
                                                />
                                                <span className="font-semibold text-gray-900">{user.name || 'Sem nome'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {user.email}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wide border
                                                ${user.role === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                                    user.role === 'personal' ? 'bg-blue-50 text-[#034EA2] border-blue-200' :
                                                        'bg-gray-50 text-gray-600 border-gray-200'}`}>
                                                {user.role === 'admin' && <Shield size={12} />}
                                                {user.role === 'personal' && <Briefcase size={12} />}
                                                {user.role === 'user' && <User size={12} />}
                                                {user.role || 'user'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="relative inline-block">
                                                <select
                                                    disabled={updatingUserId === user.id}
                                                    value={user.role || 'user'}
                                                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                                    className="appearance-none bg-white border border-gray-200 text-gray-700 py-1.5 pl-3 pr-8 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#008ACF] cursor-pointer disabled:opacity-50 font-medium"
                                                >
                                                    <option value="user">Usuário</option>
                                                    <option value="personal">Personal</option>
                                                    <option value="admin">Admin</option>
                                                </select>
                                                {updatingUserId === user.id ? (
                                                    <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 animate-spin text-[#008ACF]" size={14} />
                                                ) : (
                                                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile View: Cards */}
                    <div className="md:hidden space-y-4">
                        {filteredUsers.map(user => (
                            <div key={user.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-4">
                                <div className="flex items-center gap-3">
                                    <img
                                        src={user.avatar_url || '/Elifit_Coach.png'}
                                        alt=""
                                        className="w-12 h-12 rounded-full bg-gray-100 object-cover border border-gray-100"
                                        onError={(e) => e.target.src = '/Elifit_Coach.png'}
                                    />
                                    <div className="flex flex-col min-w-0">
                                        <span className="font-bold text-gray-900 text-lg leading-tight truncate">{user.name || 'Sem nome'}</span>
                                        <span className="text-sm text-gray-500 break-all">{user.email}</span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between border-t border-gray-100 pt-3 mt-1">
                                    <span className="text-xs font-semibold text-gray-500 uppercase">Papel Atual</span>
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wide border
                                        ${user.role === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                            user.role === 'personal' ? 'bg-blue-50 text-[#034EA2] border-blue-200' :
                                                'bg-gray-50 text-gray-600 border-gray-200'}`}>
                                        {user.role === 'admin' && <Shield size={12} />}
                                        {user.role === 'personal' && <Briefcase size={12} />}
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

                    {filteredUsers.length === 0 && (
                        <div className="p-8 text-center text-gray-500">
                            Nenhum usuário encontrado.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AdminUsers;
