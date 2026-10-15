import { useCallback, useEffect, useMemo, useState } from 'react';
import { MessageCircle, ChevronRight, Heart, Search, UtensilsCrossed } from 'lucide-react';
import { BowlPlateIcon } from '../components/icons/BenfitIcons';
import DishModal from '../components/DishModal';
import { Skeleton } from '../components/Skeleton';
import { useCoach, useCoachScreen } from '../context/coach';
import { useUserRole } from '../hooks/useSupabase';
import {
    MEAL_TYPES, DISHES_CHANGED_EVENT, listDishes, listFavorites, setFavorite, deleteDish, mealLabel,
} from '../services/dishes';
import './Dieta.css';

// Área de Dieta (v2, etapa 2D): catálogo de pratos compartilhado, sugeridos
// pelo Coach, com foto e macros, e os favoritos de cada usuário.
const QUESTIONS = [
    'Sugira um almoço rico em proteína',
    'O que comer antes do treino?',
    'O que comer depois do treino?',
    'Ideias de lanche saudável para a tarde',
];

const FILTERS = [
    { key: 'todos', label: 'Todos' },
    { key: 'favoritos', label: 'Favoritos' },
    ...MEAL_TYPES.map(m => ({ key: m.key, label: m.short })),
];

const toast = (message, type = 'success') => window.dispatchEvent(new CustomEvent('app-toast', { detail: { message, type } }));

const normalize = (text) => String(text || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const DishCard = ({ dish, favorite, onOpen, onToggleFavorite }) => (
    <article className="dish-card">
        <button type="button" className="dish-card-open" onClick={() => onOpen(dish)}>
            {dish.image_url ? (
                <img src={dish.image_url} alt="" loading="lazy" className="dish-card-photo" />
            ) : (
                <div className="dish-card-photo dish-card-photo-empty"><UtensilsCrossed size={22} /></div>
            )}
            <div className="dish-card-body">
                <span className="dish-card-meal">{mealLabel(dish.meal_type)}</span>
                <h3 className="dish-card-name">{dish.name}</h3>
                <p className="dish-card-macros">
                    {dish.kcal != null && <span>{dish.kcal} kcal</span>}
                    {dish.protein_g != null && <span>{Number(dish.protein_g).toLocaleString('pt-BR')} g prot.</span>}
                </p>
            </div>
        </button>
        <button
            type="button"
            className={`dish-card-fav ${favorite ? 'is-on' : ''}`}
            onClick={() => onToggleFavorite(dish, !favorite)}
            aria-label={favorite ? `Tirar ${dish.name} dos favoritos` : `Favoritar ${dish.name}`}
            aria-pressed={favorite}
        >
            <Heart size={16} fill={favorite ? 'currentColor' : 'none'} />
        </button>
    </article>
);

const Dieta = () => {
    const { openCoach } = useCoach();
    const { isRealAdmin } = useUserRole();
    const [dishes, setDishes] = useState([]);
    const [favorites, setFavorites] = useState({});
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('todos');
    const [query, setQuery] = useState('');
    const [openId, setOpenId] = useState(null);

    useCoachScreen({
        label: 'Dieta',
        details: 'O aluno está na área de Dieta, com o catálogo de pratos. Para sugerir um prato, procure antes no catálogo com buscar_pratos.',
        suggestions: QUESTIONS.slice(0, 3),
    });

    const load = useCallback(async () => {
        try {
            const [list, favs] = await Promise.all([listDishes(), listFavorites()]);
            setDishes(list);
            setFavorites(favs);
        } catch (err) {
            toast(`Não foi possível carregar os pratos: ${err.message}`, 'error');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    // O Coach cadastra pratos pelo chat: recarrega quando ele avisar.
    useEffect(() => {
        window.addEventListener(DISHES_CHANGED_EVENT, load);
        return () => window.removeEventListener(DISHES_CHANGED_EVENT, load);
    }, [load]);

    const visible = useMemo(() => {
        const terms = normalize(query).split(/\s+/).filter(Boolean);
        return dishes.filter(dish => {
            if (filter === 'favoritos' && !(dish.id in favorites)) return false;
            if (filter !== 'todos' && filter !== 'favoritos' && dish.meal_type !== filter) return false;
            if (terms.length === 0) return true;
            const text = normalize([dish.name, dish.description, ...(dish.ingredients || []).map(i => i.item)].join(' '));
            return terms.every(term => text.includes(term));
        });
    }, [dishes, favorites, filter, query]);

    const toggleFavorite = async (dish, on, notes) => {
        const previous = favorites;
        setFavorites(prev => {
            const next = { ...prev };
            if (on) next[dish.id] = notes ?? prev[dish.id] ?? '';
            else delete next[dish.id];
            return next;
        });
        if (notes !== undefined) return; // só atualizou a observação, já salva no modal
        try {
            await setFavorite(dish.id, on);
        } catch (err) {
            setFavorites(previous);
            toast(err.message, 'error');
        }
    };

    const removeDish = async (dish) => {
        if (!window.confirm(`Apagar "${dish.name}" do catálogo? Some também dos favoritos de todos.`)) return;
        try {
            await deleteDish(dish.id);
            setOpenId(null);
            setDishes(prev => prev.filter(d => d.id !== dish.id));
            toast('Prato apagado do catálogo.');
        } catch (err) {
            toast(err.message, 'error');
        }
    };

    const openDish = dishes.find(d => d.id === openId) || null;
    const favoriteCount = Object.keys(favorites).length;

    return (
        <div className="dieta-page">
            <section className="dieta-hero">
                <div className="dieta-hero-icon"><BowlPlateIcon size={26} /></div>
                <div>
                    <h2 className="dieta-hero-title">Pratos com foto e macros</h2>
                    <p className="dieta-hero-text">
                        Peça um prato ao Benfit: ele procura no catálogo e, se não achar, monta um novo com ingredientes e macros.
                    </p>
                    <button type="button" className="dieta-hero-btn" onClick={() => openCoach(QUESTIONS[0])}>
                        <MessageCircle size={15} /> Pedir um prato ao Benfit
                    </button>
                </div>
            </section>

            <section className="dieta-catalog">
                <label className="dieta-search">
                    <Search size={16} />
                    <input
                        type="search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Buscar prato ou ingrediente"
                    />
                </label>
                <div className="dieta-filters" role="tablist" aria-label="Filtrar pratos">
                    {FILTERS.map(f => (
                        <button
                            key={f.key}
                            type="button"
                            role="tab"
                            aria-selected={filter === f.key}
                            className={filter === f.key ? 'is-active' : ''}
                            onClick={() => setFilter(f.key)}
                        >
                            {f.key === 'favoritos' && <Heart size={13} />}
                            {f.label}
                            {f.key === 'favoritos' && favoriteCount > 0 && <span className="dieta-filter-count">{favoriteCount}</span>}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="dieta-grid" aria-busy="true" aria-label="Carregando pratos">
                        {[0, 1, 2, 3].map(i => (
                            <div key={i} className="dish-card dish-card-skeleton">
                                <Skeleton className="dish-card-photo" />
                                <div className="dish-card-body">
                                    <Skeleton className="h-3 w-1/3" />
                                    <Skeleton className="h-4 w-4/5" />
                                    <Skeleton className="h-3 w-1/2" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : visible.length === 0 ? (
                    <div className="dieta-empty">
                        {dishes.length === 0
                            ? 'O catálogo ainda está vazio. Peça o primeiro prato ao Benfit.'
                            : filter === 'favoritos' && !query
                                ? 'Toque no coração de um prato para guardar aqui.'
                                : 'Nenhum prato encontrado. Peça ao Benfit uma sugestão.'}
                    </div>
                ) : (
                    <div className="dieta-grid">
                        {visible.map(dish => (
                            <DishCard
                                key={dish.id}
                                dish={dish}
                                favorite={dish.id in favorites}
                                onOpen={(d) => setOpenId(d.id)}
                                onToggleFavorite={toggleFavorite}
                            />
                        ))}
                    </div>
                )}
            </section>

            <section className="dieta-questions">
                <h3 className="dieta-section-title">
                    <MessageCircle size={16} />
                    Pergunte ao Benfit
                </h3>
                {QUESTIONS.slice(1).map(q => (
                    <button key={q} type="button" className="dieta-question" onClick={() => openCoach(q)}>
                        <span>{q}</span>
                        <ChevronRight size={16} />
                    </button>
                ))}
            </section>

            <p className="dieta-note">
                Macros são estimativas. Dietas restritivas ou condições de saúde pedem acompanhamento de nutricionista.
            </p>

            <DishModal
                dish={openDish}
                isOpen={Boolean(openDish)}
                onClose={() => setOpenId(null)}
                favorite={Boolean(openDish && openDish.id in favorites)}
                notes={openDish ? favorites[openDish.id] : ''}
                onToggleFavorite={toggleFavorite}
                isAdmin={isRealAdmin}
                onDelete={removeDish}
            />
        </div>
    );
};

export default Dieta;
