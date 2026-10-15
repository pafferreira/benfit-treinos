import { useMemo, useState } from 'react';
import { Plus, Search, Trash2, X, Loader2 } from 'lucide-react';
import { supabaseHelpers } from '../lib/supabase';
import { useAvatars } from '../hooks/useSupabase';
import AvatarModal from './AvatarModal';
import ConfirmationModal from './ConfirmationModal';
import './MediaLibrary.css';

// Biblioteca da tela Mídias Benfit (antiga "Gerenciar Avatares"): todas as
// imagens do app em b_avatars. As imagens aprovadas da IA entram aqui sozinhas.
const toast = (message, type = 'success') => window.dispatchEvent(new CustomEvent('app-toast', { detail: { message, type } }));

const CATEGORY_LABELS = { exercicio: 'Exercícios', prato: 'Pratos', Avatar: 'Avatares' };
const categoryLabel = (cat) => CATEGORY_LABELS[cat] || cat;
const GENDER_LABELS = { male: 'Masculino', female: 'Feminino', neutral: 'Neutro' };

const MediaLibrary = ({ exercises = [], dishes = [] }) => {
    const { avatars, loading, reload } = useAvatars();
    const [term, setTerm] = useState('');
    const [category, setCategory] = useState('Todas');
    const [gender, setGender] = useState('Todos');
    const [showActive, setShowActive] = useState(true);
    const [editing, setEditing] = useState(null); // null = fechado, {} = nova, avatar = edição
    const [saving, setSaving] = useState(false);
    const [toDelete, setToDelete] = useState(null);

    // Em qual exercício ou prato cada imagem está publicada.
    const usage = useMemo(() => {
        const map = new Map();
        const add = (url, label) => {
            if (!url) return;
            map.set(url, [...(map.get(url) || []), label]);
        };
        exercises.forEach(ex => add(ex.image_url, ex.name));
        dishes.forEach(d => add(d.image_url, d.name));
        return map;
    }, [exercises, dishes]);

    const categories = useMemo(() => {
        const counts = avatars.reduce((acc, a) => {
            if (a.category && a.is_active === showActive) acc[a.category] = (acc[a.category] || 0) + 1;
            return acc;
        }, {});
        return Object.entries(counts).sort((a, b) => b[1] - a[1]);
    }, [avatars, showActive]);
    const genders = useMemo(() => [...new Set(avatars.map(a => a.gender).filter(Boolean))], [avatars]);

    const visible = useMemo(() => {
        const q = term.trim().toLowerCase();
        return avatars.filter(a => {
            if (a.is_active !== showActive) return false;
            if (category !== 'Todas' && a.category !== category) return false;
            if (gender !== 'Todos' && a.gender !== gender) return false;
            if (!q) return true;
            return [a.name, a.category, a.gender, a.storage_path, ...(a.tags || []), ...(usage.get(a.public_url) || [])]
                .some(v => v && String(v).toLowerCase().includes(q));
        });
    }, [avatars, showActive, category, gender, term, usage]);

    const save = async (data) => {
        setSaving(true);
        try {
            if (editing?.id) await supabaseHelpers.updateAvatar(editing.id, data);
            else await supabaseHelpers.createAvatar(data);
            setEditing(null);
            reload();
            window.dispatchEvent(new Event('avatars-updated'));
            toast(editing?.id ? 'Imagem atualizada.' : 'Imagem adicionada à Biblioteca.');
        } catch (err) {
            toast(`Não foi possível salvar: ${err.message}`, 'error');
        } finally {
            setSaving(false);
        }
    };

    const remove = async () => {
        const target = toDelete;
        setToDelete(null);
        try {
            await supabaseHelpers.deleteAvatar(target.id);
            reload();
            window.dispatchEvent(new Event('avatars-updated'));
            toast('Imagem removida da Biblioteca.');
        } catch (err) {
            toast(`Não foi possível remover: ${err.message}`, 'error');
        }
    };

    return (
        <div className="ml-root">
            <div className="ml-toolbar">
                <label className="ml-search">
                    <Search size={16} />
                    <input
                        id="ml-search"
                        type="search"
                        value={term}
                        onChange={(e) => setTerm(e.target.value)}
                        placeholder="Buscar por nome, tag ou exercício"
                    />
                    {term && (
                        <button type="button" onClick={() => setTerm('')} aria-label="Limpar busca"><X size={14} /></button>
                    )}
                </label>
                <div className="ml-filters" role="tablist" aria-label="Categoria">
                    <button type="button" role="tab" aria-selected={category === 'Todas'} className={category === 'Todas' ? 'is-active' : ''} onClick={() => setCategory('Todas')}>
                        Todas
                    </button>
                    {categories.map(([cat, count]) => (
                        <button key={cat} type="button" role="tab" aria-selected={category === cat} className={category === cat ? 'is-active' : ''} onClick={() => setCategory(cat)}>
                            {categoryLabel(cat)} <span className="ml-count">{count}</span>
                        </button>
                    ))}
                </div>
                <div className="ml-row">
                    <select id="ml-gender" value={gender} onChange={(e) => setGender(e.target.value)} aria-label="Gênero">
                        <option value="Todos">Todos os gêneros</option>
                        {genders.map(g => <option key={g} value={g}>{GENDER_LABELS[g] || g}</option>)}
                    </select>
                    <button
                        type="button"
                        role="switch"
                        aria-checked={showActive}
                        className={`ml-active ${showActive ? 'is-on' : ''}`}
                        onClick={() => setShowActive(v => !v)}
                    >
                        <span className="ml-active-dot" />
                        {showActive ? 'Ativas' : 'Inativas'}
                    </button>
                </div>
                <div className="ml-row ml-row-end">
                    <p className="ml-total">{visible.length} {visible.length === 1 ? 'imagem' : 'imagens'}</p>
                    <button type="button" className="am-btn am-btn-primary" onClick={() => setEditing({})}>
                        <Plus size={16} /> Adicionar imagem
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="am-empty"><Loader2 size={18} className="animate-spin" /> Carregando a Biblioteca…</div>
            ) : visible.length === 0 ? (
                <div className="am-empty">Nenhuma imagem com esses filtros.</div>
            ) : (
                <div className="ml-grid">
                    {visible.map(a => {
                        const usedBy = usage.get(a.public_url) || [];
                        const fromAi = (a.tags || []).includes('ia');
                        return (
                            <article key={a.id} className={`ml-card ${a.is_active ? '' : 'is-inactive'}`}>
                                <button type="button" className="ml-card-open" onClick={() => setEditing(a)} aria-label={`Editar ${a.name}`}>
                                    <img src={a.public_url} alt="" loading="lazy" />
                                    <span className="ml-card-body">
                                        <span className="ml-card-name">{a.name || 'Sem nome'}</span>
                                        <span className="ml-card-chips">
                                            <span className="am-chip ml-chip">{categoryLabel(a.category)}</span>
                                            {fromAi && <span className="am-chip am-chip-ai">IA</span>}
                                            {!a.is_active && <span className="am-chip ml-chip-off">Inativa</span>}
                                        </span>
                                        {usedBy.length > 0 && (
                                            <span className="ml-used" title={usedBy.join(', ')}>Em uso: {usedBy.join(', ')}</span>
                                        )}
                                    </span>
                                </button>
                                <button type="button" className="ml-card-delete" onClick={() => setToDelete(a)} aria-label={`Remover ${a.name}`}>
                                    <Trash2 size={14} />
                                </button>
                            </article>
                        );
                    })}
                </div>
            )}

            {editing && (
                <AvatarModal
                    isOpen
                    onClose={() => setEditing(null)}
                    onSave={save}
                    avatar={editing.id ? editing : null}
                    isLoading={saving}
                />
            )}
            <ConfirmationModal
                isOpen={Boolean(toDelete)}
                onClose={() => setToDelete(null)}
                onConfirm={remove}
                title="Remover imagem"
                message={toDelete && usage.get(toDelete.public_url)
                    ? `"${toDelete.name}" está em uso em ${usage.get(toDelete.public_url).join(', ')}. Remover tira a imagem só da Biblioteca; o item continua com ela.`
                    : `Remover "${toDelete?.name || ''}" da Biblioteca?`}
                confirmText="Remover"
            />
        </div>
    );
};

export default MediaLibrary;
