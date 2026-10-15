import { useEffect, useState } from 'react';
import { Heart, Loader2, Sparkles, Trash2, UtensilsCrossed } from 'lucide-react';
import Modal from './Modal';
import { supabase } from '../lib/supabase';
import { requestMedia } from '../services/media';
import { mealLabel, saveFavoriteNotes } from '../services/dishes';
import './DishModal.css';

const toast = (message, type = 'success') => window.dispatchEvent(new CustomEvent('app-toast', { detail: { message, type } }));

const formatNumber = (value) => (value == null ? '–' : Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 1 }));

// Detalhe do prato (v2, etapa 2D): foto, macros por porção, ingredientes,
// preparo, favorito com observação e, para admin, apagar do catálogo.
const DishModal = ({ dish, isOpen, onClose, favorite, notes, onToggleFavorite, isAdmin, onDelete }) => {
    const [draftNotes, setDraftNotes] = useState(notes || '');
    const [savingNotes, setSavingNotes] = useState(false);
    const [userId, setUserId] = useState(null);
    const [generating, setGenerating] = useState(false);

    useEffect(() => { setDraftNotes(notes || ''); }, [notes, dish?.id]);

    const photoPending = Boolean(dish && !dish.image_url);
    useEffect(() => {
        if (!photoPending) return undefined;
        let active = true;
        supabase.auth.getSession().then(({ data }) => {
            if (active) setUserId(data?.session?.user?.id || null);
        });
        return () => { active = false; };
    }, [photoPending]);

    if (!dish) return null;

    const canRetryPhoto = photoPending && dish.created_by_ai && userId && userId === dish.created_by;
    const ingredients = Array.isArray(dish.ingredients) ? dish.ingredients : [];
    const preparation = dish.preparation || [];
    const tags = (dish.tags || []).filter(tag => tag !== 'ia');
    const notesChanged = (draftNotes || '') !== (notes || '');

    const retryPhoto = async () => {
        setGenerating(true);
        try {
            const media = await requestMedia('image', { entityType: 'dish', entityId: dish.id });
            toast(media?.status === 'aprovada' ? 'Foto pronta.' : 'Foto gerada. Ela aparece depois da aprovação.');
        } catch (err) {
            toast(err.message, 'error');
        } finally {
            setGenerating(false);
        }
    };

    const saveNotes = async () => {
        setSavingNotes(true);
        try {
            await saveFavoriteNotes(dish.id, draftNotes);
            toast('Observação salva.');
            onToggleFavorite?.(dish, true, draftNotes.trim());
        } catch (err) {
            toast(err.message, 'error');
        } finally {
            setSavingNotes(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={dish.name} size="large">
            <div className="dish-modal">
                {dish.image_url ? (
                    <img className="dish-modal-photo" src={dish.image_url} alt={`Foto de ${dish.name}`} />
                ) : (
                    <div className="dish-modal-photo dish-modal-photo-empty">
                        <UtensilsCrossed size={28} />
                        <span>{dish.created_by_ai ? 'Foto em preparação pelo Benfit' : 'Sem foto'}</span>
                        {canRetryPhoto && (
                            <button type="button" className="dish-btn" onClick={retryPhoto} disabled={generating}>
                                {generating ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                                Gerar foto com a IA
                            </button>
                        )}
                    </div>
                )}

                <div className="dish-modal-head">
                    <div className="dish-modal-chips">
                        <span className="dish-chip dish-chip-meal">{mealLabel(dish.meal_type)}</span>
                        {dish.servings > 1 && <span className="dish-chip">{dish.servings} porções</span>}
                        {tags.map(tag => <span key={tag} className="dish-chip">{tag}</span>)}
                    </div>
                    <button
                        type="button"
                        className={`dish-fav-btn ${favorite ? 'is-on' : ''}`}
                        onClick={() => onToggleFavorite?.(dish, !favorite)}
                        aria-pressed={favorite}
                    >
                        <Heart size={16} fill={favorite ? 'currentColor' : 'none'} />
                        {favorite ? 'Favorito' : 'Favoritar'}
                    </button>
                </div>

                {dish.description && <p className="dish-modal-desc">{dish.description}</p>}

                <div className="dish-macros" aria-label="Macros por porção">
                    <div><strong>{formatNumber(dish.kcal)}</strong><span>kcal</span></div>
                    <div><strong>{formatNumber(dish.protein_g)} g</strong><span>Proteína</span></div>
                    <div><strong>{formatNumber(dish.carbs_g)} g</strong><span>Carbo</span></div>
                    <div><strong>{formatNumber(dish.fat_g)} g</strong><span>Gordura</span></div>
                </div>
                <p className="dish-modal-hint">Valores estimados por porção.</p>

                {ingredients.length > 0 && (
                    <section>
                        <h3 className="dish-modal-title">Ingredientes</h3>
                        <ul className="dish-ingredients">
                            {ingredients.map((ing, i) => (
                                <li key={`${ing.item}-${i}`}>
                                    <span>{ing.item}</span>
                                    {ing.quantidade && <span className="dish-qty">{ing.quantidade}</span>}
                                </li>
                            ))}
                        </ul>
                    </section>
                )}

                {preparation.length > 0 && (
                    <section>
                        <h3 className="dish-modal-title">Modo de preparo</h3>
                        <ol className="dish-steps">
                            {preparation.map((step, i) => <li key={i}>{step}</li>)}
                        </ol>
                    </section>
                )}

                {favorite && (
                    <section className="dish-notes">
                        <label htmlFor="dish-notes" className="dish-modal-title">Minha observação</label>
                        <textarea
                            id="dish-notes"
                            rows={2}
                            maxLength={500}
                            value={draftNotes}
                            onChange={(e) => setDraftNotes(e.target.value)}
                            placeholder="Ex.: troco o arroz por quinoa"
                        />
                        {notesChanged && (
                            <button type="button" className="dish-btn dish-btn-primary" onClick={saveNotes} disabled={savingNotes}>
                                {savingNotes && <Loader2 size={15} className="animate-spin" />} Salvar observação
                            </button>
                        )}
                    </section>
                )}

                <p className="dish-modal-hint">Dietas restritivas ou condições de saúde pedem acompanhamento de nutricionista.</p>

                {isAdmin && (
                    <button type="button" className="dish-btn dish-btn-danger" onClick={() => onDelete?.(dish)}>
                        <Trash2 size={15} /> Apagar do catálogo
                    </button>
                )}
            </div>
        </Modal>
    );
};

export default DishModal;
