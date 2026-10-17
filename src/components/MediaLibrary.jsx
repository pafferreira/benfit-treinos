import { useMemo, useState } from 'react';
import { Search, Trash2, X, Loader2, Image as ImageIcon, Footprints, Film } from 'lucide-react';
import { supabaseHelpers } from '../lib/supabase';
import { useAvatars } from '../hooks/useSupabase';
import ImageFormModal from './ImageFormModal';
import { MEAL_TYPES } from '../services/dishes';
import ConfirmationModal from './ConfirmationModal';
import ExerciseAnimation from './ExerciseAnimation';
import './MediaLibrary.css';

// Biblioteca da tela Mídias Benfit (antiga "Gerenciar Avatares"): todas as
// imagens do app em b_avatars. As imagens aprovadas da IA entram aqui sozinhas.
const toast = (message, type = 'success') => window.dispatchEvent(new CustomEvent('app-toast', { detail: { message, type } }));

const CATEGORY_LABELS = { exercicio: 'Exercícios', prato: 'Pratos', Avatar: 'Avatares' };
const categoryLabel = (cat) => CATEGORY_LABELS[cat] || cat;
// gender guarda o gênero (exercício e avatar) ou a refeição (prato).
const GENDER_LABELS = { male: 'Masculino', female: 'Feminino', neutral: 'Outro', ...Object.fromEntries(MEAL_TYPES.map(m => [m.key, m.label])) };

// Tipos de mídia da Biblioteca: as imagens (b_avatars) e as animações já no ar
// dos exercícios (duas poses em animation_frames, vídeo em animation_url).
const MEDIA_KINDS = [
    { key: 'imagem', label: 'Imagens', icon: ImageIcon },
    { key: 'poses', label: '2 poses', icon: Footprints },
    { key: 'video', label: 'Vídeos', icon: Film },
];
const hasPoses = (ex) => Array.isArray(ex.animation_frames) && ex.animation_frames.filter(Boolean).length >= 2;

const MediaLibrary = ({ exercises = [], dishes = [] }) => {
    const { avatars, loading, reload } = useAvatars();
    const [kind, setKind] = useState('imagem');
    const [term, setTerm] = useState('');
    const [category, setCategory] = useState('Todas');
    const [gender, setGender] = useState('Todos');
    const [showActive, setShowActive] = useState(true);
    const [editing, setEditing] = useState(null); // imagem aberta para editar
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
        // Exercícios e Pratos aparecem sempre, mesmo vazios, para dar para filtrar.
        ['exercicio', 'prato'].forEach(cat => { counts[cat] ??= 0; });
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

    const animated = useMemo(() => {
        const q = term.trim().toLowerCase();
        return exercises.filter(ex => (kind === 'poses' ? hasPoses(ex) : kind === 'video' ? Boolean(ex.animation_url) : false))
            .filter(ex => !q || [ex.name, ex.muscle_group, ...(ex.muscle_groups || [])].some(v => v && String(v).toLowerCase().includes(q)));
    }, [exercises, kind, term]);
    const kindCounts = useMemo(() => ({
        imagem: avatars.filter(a => a.is_active === showActive).length,
        poses: exercises.filter(hasPoses).length,
        video: exercises.filter(ex => ex.animation_url).length,
    }), [avatars, exercises, showActive]);

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
            <div className="am-kind-tabs ml-kinds" role="tablist" aria-label="Tipo de mídia">
                {MEDIA_KINDS.map(k => {
                    const KindIcon = k.icon;
                    return (
                        <button key={k.key} type="button" role="tab" aria-selected={kind === k.key}
                            className={kind === k.key ? 'is-active' : ''} onClick={() => setKind(k.key)}>
                            <KindIcon size={15} /> {k.label} <span className="ml-count">{kindCounts[k.key]}</span>
                        </button>
                    );
                })}
            </div>
            {kind !== 'imagem' ? (
                <>
                    <label className="ml-search ml-search-solo">
                        <Search size={16} />
                        <input type="search" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Buscar exercício ou músculo" />
                        {term && <button type="button" onClick={() => setTerm('')} aria-label="Limpar busca"><X size={14} /></button>}
                    </label>
                    {animated.length === 0 ? (
                        <div className="am-empty">
                            {kind === 'poses' ? 'Nenhum exercício com duas poses no ar.' : 'Nenhum exercício com vídeo no ar.'} Gere na aba Gerar.
                        </div>
                    ) : (
                        <div className="ml-anim-grid">
                            {animated.map(ex => (
                                <article key={ex.id} className="ml-anim-card">
                                    <ExerciseAnimation
                                        videoUrl={kind === 'video' ? ex.animation_url : null}
                                        frames={kind === 'poses' ? ex.animation_frames : null}
                                        poster={ex.image_url}
                                        alt={ex.name}
                                    />
                                    <span className="ml-card-name">{ex.name}</span>
                                </article>
                            ))}
                        </div>
                    )}
                </>
            ) : <>
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
                    <select id="ml-gender" value={gender} onChange={(e) => setGender(e.target.value)} aria-label="Tipo">
                        <option value="Todos">Todos os tipos</option>
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
                    <p className="am-hint">Imagem nova: aba Gerar, botão "+ Novo".</p>
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

            </>}

            <ImageFormModal
                isOpen={Boolean(editing)}
                onClose={() => setEditing(null)}
                image={editing}
                exercises={exercises}
                dishes={dishes}
                onSaved={reload}
            />
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
