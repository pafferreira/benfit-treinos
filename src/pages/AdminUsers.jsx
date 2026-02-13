import { useState, useEffect } from 'react';
import { supabase, supabaseHelpers } from '../lib/supabase';
import { useUserRole } from '../hooks/useSupabase';
import { Search, Loader2, User, Shield, Briefcase, ChevronDown } from 'lucide-react';

const AdminUsers = () => {
    const { isAdmin, loading: roleLoading } = useUserRole();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [updatingUserId, setUpdatingUserId] = useState(null);

    useEffect(() => {
        if (isAdmin) {
            fetchUsers();
        }
    }, [isAdmin]);

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
            // alert('Papel do usuário atualizado com sucesso!'); 
        } catch (err) {
            console.error('Error updating role:', err);
            alert('Erro ao atualizar papel do usuário: ' + err.message);
        } finally {
            setUpdatingUserId(null);
        }
    };

    const filteredUsers = users.filter(user =>
    (user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (roleLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-blue-500" /></div>;
    if (!isAdmin) return <div className="p-8 text-center text-red-500 font-bold">Acesso Negado. Esta área é restrita para Administradores.</div>;

    return (
        <div className="p-6 pb-24 max-w-7xl mx-auto">
            <h1 className="text-2xl font-bold mb-2">Gerenciar Usuários</h1>
            <p className="text-gray-500 mb-6">Administração de permissões e acessos.</p>

            <div className="mb-6 relative">
                <input
                    type="text"
                    placeholder="Buscar por nome ou email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            </div>

            {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="animate-spin text-blue-500 w-8 h-8" /></div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Usuário</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Papel Atual</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredUsers.map(user => (
                                    <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <img
                                                    src={user.avatar_url || '/Elifit_Coach.png'}
                                                    alt=""
                                                    className="w-8 h-8 rounded-full bg-gray-100 object-cover"
                                                    onError={(e) => e.target.src = '/Elifit_Coach.png'}
                                                />
                                                <span className="font-medium text-gray-900">{user.name || 'Sem nome'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {user.email}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wide
                                                ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                                                    user.role === 'personal' ? 'bg-blue-100 text-blue-700' :
                                                        'bg-gray-100 text-gray-600'}`}>
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
                                                    className="appearance-none bg-white border border-gray-200 text-gray-700 py-1.5 pl-3 pr-8 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
                                                >
                                                    <option value="user">Usuário</option>
                                                    <option value="personal">Personal</option>
                                                    <option value="admin">Admin</option>
                                                </select>
                                                {updatingUserId === user.id ? (
                                                    <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 animate-spin text-blue-500" size={14} />
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
