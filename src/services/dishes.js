// Catálogo de pratos da Dieta (v2, etapa 2D) e favoritos de cada usuário.
import { supabase } from '../lib/supabase';

export const MEAL_TYPES = [
    { key: 'cafe', label: 'Café da manhã', short: 'Café' },
    { key: 'almoco', label: 'Almoço', short: 'Almoço' },
    { key: 'lanche', label: 'Lanche', short: 'Lanche' },
    { key: 'jantar', label: 'Jantar', short: 'Jantar' },
    { key: 'pre_treino', label: 'Pré-treino', short: 'Pré-treino' },
    { key: 'pos_treino', label: 'Pós-treino', short: 'Pós-treino' },
];

export const mealLabel = (key) => MEAL_TYPES.find(m => m.key === key)?.label || key;

export const DISHES_CHANGED_EVENT = 'benfit-dishes-changed';

export const listDishes = async () => {
    const { data, error } = await supabase
        .from('b_dishes')
        .select('*')
        .order('name');
    if (error) throw error;
    return data || [];
};

// Favoritos do usuário logado (a RLS já limita às linhas dele).
export const listFavorites = async () => {
    const { data, error } = await supabase.from('b_user_dishes').select('dish_id, notes');
    if (error) throw error;
    return Object.fromEntries((data || []).map(row => [row.dish_id, row.notes || '']));
};

export const setFavorite = async (dishId, on) => {
    if (on) {
        const { error } = await supabase.from('b_user_dishes').upsert({ dish_id: dishId }, { onConflict: 'user_id,dish_id', ignoreDuplicates: true });
        if (error) throw error;
        return;
    }
    const { error } = await supabase.from('b_user_dishes').delete().eq('dish_id', dishId);
    if (error) throw error;
};

export const saveFavoriteNotes = async (dishId, notes) => {
    const { error } = await supabase
        .from('b_user_dishes')
        .update({ notes: notes.trim().slice(0, 500) || null })
        .eq('dish_id', dishId);
    if (error) throw error;
};

export const deleteDish = async (dishId) => {
    const { error } = await supabase.from('b_dishes').delete().eq('id', dishId);
    if (error) throw error;
};
