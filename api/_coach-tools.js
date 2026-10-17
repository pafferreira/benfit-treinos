// Ferramentas do Benfit (v2, etapas 2C e 2D). Só o Claude usa ferramentas;
// OpenAI e Gemini continuam como reserva só de texto.

// Mesmos nomes de b_muscles (src/lib/muscles.js), mais Cardio e Corpo Todo.
export const MUSCLE_NAMES = [
    'Peitoral', 'Ombros', 'Bíceps', 'Tríceps', 'Antebraços', 'Abdômen', 'Trapézio',
    'Costas (dorsais)', 'Lombar', 'Glúteos', 'Glúteo médio', 'Quadríceps',
    'Posteriores de coxa', 'Adutores', 'Panturrilhas', 'Cardio', 'Corpo Todo',
];

// Tipos de refeição de b_dishes (etapa 2D).
export const MEAL_TYPES = ['cafe', 'almoco', 'lanche', 'jantar', 'pre_treino', 'pos_treino'];

export const COACH_TOOLS = [
    {
        name: 'propor_exercicio_novo',
        description: 'Cadastra no catálogo Benfit um exercício que ainda não existe nele. '
            + 'Use só quando a pessoa pedir ou aceitar um exercício que não está no catálogo do contexto; '
            + 'se houver um equivalente no catálogo, sugira o existente em vez de criar. '
            + 'O exercício entra na hora, sem imagem; o app gera a imagem em seguida.',
        input_schema: {
            type: 'object',
            properties: {
                name: {
                    type: 'string',
                    description: 'Nome em português, como nos outros exercícios do catálogo (ex.: "Ponte de Glúteo Unilateral").',
                },
                equipment: {
                    type: 'string',
                    description: 'Equipamento principal (ex.: Halter, Polia, Máquina, Peso do corpo, Solo).',
                },
                muscle_groups: {
                    type: 'array',
                    items: { type: 'string', enum: MUSCLE_NAMES },
                    minItems: 1,
                    maxItems: 4,
                    description: 'Músculos trabalhados; o primeiro é o principal.',
                },
                instructions: {
                    type: 'array',
                    items: { type: 'string' },
                    minItems: 3,
                    maxItems: 6,
                    description: 'Passos curtos de execução, em português.',
                },
            },
            required: ['name', 'equipment', 'muscle_groups', 'instructions'],
        },
    },
    {
        name: 'buscar_pratos',
        description: 'Procura pratos no catálogo de Dieta do Benfit pelo nome ou ingrediente. '
            + 'Use antes de sugerir_prato, para recomendar um prato que já existe em vez de criar outro parecido.',
        input_schema: {
            type: 'object',
            properties: {
                busca: { type: 'string', description: 'Palavras do prato ou ingrediente (ex.: "frango batata-doce").' },
                meal_type: { type: 'string', enum: MEAL_TYPES, description: 'Filtra por refeição, se fizer sentido.' },
            },
            required: ['busca'],
        },
    },
    {
        name: 'sugerir_prato',
        description: 'Cadastra no catálogo de Dieta um prato completo que ainda não existe nele, com ingredientes, preparo e macros por porção. '
            + 'Use quando a pessoa pedir ou aceitar uma sugestão de prato e buscar_pratos não trouxer um equivalente. '
            + 'Os macros são estimativas: calcule pelos ingredientes e quantidades. O app gera a foto do prato em seguida.',
        input_schema: {
            type: 'object',
            properties: {
                name: { type: 'string', description: 'Nome curto em português (ex.: "Frango Grelhado com Batata-Doce").' },
                description: { type: 'string', description: 'Uma frase sobre o prato e quando ele ajuda.' },
                meal_type: { type: 'string', enum: MEAL_TYPES },
                ingredients: {
                    type: 'array',
                    minItems: 2,
                    maxItems: 15,
                    items: {
                        type: 'object',
                        properties: {
                            item: { type: 'string', description: 'Ingrediente comum no Brasil.' },
                            quantidade: { type: 'string', description: 'Ex.: "150 g", "2 colheres de sopa", "1 unidade".' },
                        },
                        required: ['item', 'quantidade'],
                    },
                },
                preparation: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 8, description: 'Passos curtos de preparo.' },
                servings: { type: 'integer', minimum: 1, maximum: 12 },
                kcal: { type: 'number', description: 'Calorias por porção.' },
                protein_g: { type: 'number', description: 'Proteína por porção, em gramas.' },
                carbs_g: { type: 'number', description: 'Carboidrato por porção, em gramas.' },
                fat_g: { type: 'number', description: 'Gordura por porção, em gramas.' },
                tags: { type: 'array', items: { type: 'string' }, maxItems: 5, description: 'Ex.: vegetariano, sem lactose, rápido.' },
            },
            required: ['name', 'meal_type', 'ingredients', 'preparation', 'kcal', 'protein_g', 'carbs_g', 'fat_g'],
        },
    },
    {
        name: 'gerar_midia',
        description: 'Pede ao gerador de mídias da IA imagem, poses (início e fim do movimento, alternando) '
            + 'ou vídeo curto em loop de um exercício ou prato que já está no catálogo. '
            + 'As mídias entram na fila de aprovação da tela Mídias Benfit e só aparecem no app depois de aprovadas. '
            + 'Prato só tem foto. Poses e vídeo partem da imagem já publicada do exercício. '
            + 'A ferramenta confere a permissão de quem pediu e diz o que foi enviado.',
        input_schema: {
            type: 'object',
            properties: {
                tipo_item: { type: 'string', enum: ['exercicio', 'prato'] },
                nome: { type: 'string', description: 'Nome do exercício ou prato como está no catálogo.' },
                midias: {
                    type: 'array',
                    items: { type: 'string', enum: ['imagem', 'poses', 'video'] },
                    minItems: 1,
                    maxItems: 3,
                },
            },
            required: ['tipo_item', 'nome', 'midias'],
        },
    },
];

const MEAL_LABELS = {
    cafe: 'café da manhã', almoco: 'almoço', lanche: 'lanche', jantar: 'jantar',
    pre_treino: 'pré-treino', pos_treino: 'pós-treino',
};

// Palavras de 3+ letras, sem caracteres que quebram o filtro do PostgREST.
// Palavras comuns que não ajudam a achar um prato.
const STOP_WORDS = new Set(['com', 'sem', 'para', 'que', 'uma', 'dos', 'das', 'nos', 'nas', 'pelo', 'pela', 'prato', 'pratos', 'receita', 'algo']);

export const searchTerms = (text) => String(text || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/\s+/)
    .filter(word => word.length >= 3 && !STOP_WORDS.has(word))
    .slice(0, 5);

const describeDish = (dish) => {
    const macros = [
        dish.kcal != null ? `${dish.kcal} kcal` : null,
        dish.protein_g != null ? `${Number(dish.protein_g)} g de proteína` : null,
    ].filter(Boolean).join(', ');
    return `- ${dish.name} (${MEAL_LABELS[dish.meal_type] || dish.meal_type}${macros ? `; ${macros}` : ''})`;
};

// Normaliza para comparar sem acento e sem caixa.
const normalizeText = (text) => String(text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// Texto pesquisável do prato: nome, descrição, ingredientes e tags.
export const dishSearchText = (dish) => normalizeText([
    dish.name,
    dish.description,
    ...(Array.isArray(dish.ingredients) ? dish.ingredients.map(i => i?.item) : []),
    ...(dish.tags || []),
].join(' '));

// O catálogo é pequeno: traz os pratos (da refeição pedida, se houver) e
// filtra aqui, para achar também pelo ingrediente e ignorar acentos.
async function searchDishes(supabase, { busca, meal_type: mealType }) {
    const terms = searchTerms(normalizeText(busca));
    let query = supabase
        .from('b_dishes')
        .select('id, name, description, meal_type, kcal, protein_g, ingredients, tags')
        .order('name')
        .limit(500);
    if (MEAL_TYPES.includes(mealType)) query = query.eq('meal_type', mealType);
    const { data, error } = await query;
    if (error) {
        console.warn('[api/chat] Busca de pratos falhou:', error.message);
        return { content: `Não foi possível buscar no catálogo: ${error.message}`, isError: true };
    }
    const ranked = (data || [])
        .map(dish => {
            const text = dishSearchText(dish);
            return { dish, hits: terms.filter(term => text.includes(term)).length };
        })
        .filter(({ hits }) => terms.length === 0 || hits > 0)
        .sort((a, b) => b.hits - a.hits)
        .slice(0, 8)
        .map(({ dish }) => dish);
    if (ranked.length === 0) {
        return { content: 'Nenhum prato parecido no catálogo de Dieta.' };
    }
    return { content: `Pratos já no catálogo de Dieta:\n${ranked.map(describeDish).join('\n')}` };
}

const MEDIA_KINDS = { imagem: 'image', poses: 'poses', video: 'video' };
const MEDIA_LABELS = { image: 'imagem', poses: 'poses', video: 'vídeo' };

// Acha o exercício ou prato pelo nome: igual (sem caixa) primeiro, depois parecido.
async function findCatalogItem(supabase, table, name) {
    const term = String(name || '').trim().slice(0, 120);
    if (!term) return { items: [] };
    const columns = 'id, name, image_url, created_by_ai, created_by';
    const exact = await supabase.from(table).select(columns).ilike('name', term.replace(/[%_]/g, '')).limit(2);
    if (exact.error) return { error: exact.error };
    if (exact.data?.length) return { items: exact.data };
    const like = await supabase.from(table).select(columns).ilike('name', `%${term.replace(/[%_]/g, '')}%`).order('name').limit(5);
    if (like.error) return { error: like.error };
    return { items: like.data || [] };
}

// Decide quais mídias seguem para o gerador, com as mesmas regras de /api/media.
export const planMediaRequest = ({ item, isDish, isAdmin, userId, kinds }) => {
    const accepted = [];
    const refused = [];
    for (const kind of kinds) {
        if (isDish && kind !== 'image') {
            refused.push(`${MEDIA_LABELS[kind]}: prato só tem foto`);
        } else if (!isAdmin && kind !== 'image') {
            refused.push(`${MEDIA_LABELS[kind]}: só um admin pode pedir`);
        } else if (!isAdmin && !(item.created_by_ai && item.created_by === userId && !item.image_url)) {
            refused.push(`${MEDIA_LABELS[kind]}: só dá para pedir a imagem de um item que você criou e que ainda está sem imagem`);
        } else if (kind !== 'image' && !item.image_url) {
            refused.push(`${MEDIA_LABELS[kind]}: o exercício precisa ter a imagem aprovada antes`);
        } else {
            accepted.push(kind);
        }
    }
    return { accepted, refused };
};

async function requestMediaTool(supabase, user, input, autoImages = new Set()) {
    const isDish = input?.tipo_item === 'prato';
    const kinds = [...new Set((input?.midias || []).map(m => MEDIA_KINDS[m]).filter(Boolean))];
    if (kinds.length === 0) return { content: 'Diga quais mídias gerar: imagem, poses ou vídeo.', isError: true };
    const found = await findCatalogItem(supabase, isDish ? 'b_dishes' : 'b_exercises', input?.nome);
    if (found.error) return { content: `Não foi possível procurar no catálogo: ${found.error.message}`, isError: true };
    const label = isDish ? 'prato' : 'exercício';
    if (found.items.length === 0) return { content: `Nenhum ${label} com esse nome no catálogo.` };
    if (found.items.length > 1) {
        return { content: `Achei mais de um ${label}: ${found.items.map(i => `"${i.name}"`).join(', ')}. Pergunte qual deles.` };
    }
    const item = found.items[0];
    const { data: isAdmin } = await supabase.rpc('is_admin');
    const planned = planMediaRequest({ item, isDish, isAdmin: Boolean(isAdmin), userId: user?.id, kinds });
    const refused = planned.refused;
    // Item criado nesta mesma resposta: o app já gera a foto sozinho, não pede de novo.
    const accepted = planned.accepted.filter(kind => {
        if (kind === 'image' && autoImages.has(`${isDish ? 'dish' : 'exercise'}:${item.id}`)) {
            refused.push(`${MEDIA_LABELS.image}: já está sendo gerada porque o item acabou de ser criado`);
            return false;
        }
        return true;
    });
    const notes = refused.length ? ` Não enviado: ${refused.join('; ')}.` : '';
    if (accepted.length === 0) return { content: `Nada foi enviado para "${item.name}".${notes}` };
    return {
        content: `Pedido enviado para "${item.name}": ${accepted.map(k => MEDIA_LABELS[k]).join(', ')}. `
            + 'O app gera agora e as mídias entram em Mídias Benfit para aprovação; o vídeo leva alguns minutos.' + notes,
        action: { type: 'media_requested', entityType: isDish ? 'dish' : 'exercise', entityId: item.id, name: item.name, kinds: accepted },
    };
}

// Executa uma ferramenta pedida pelo Claude com o cliente do usuário (RLS).
// Guarda os itens criados na resposta, cuja imagem o app gera sozinho (evita foto repetida).
export const createToolRunner = (supabase, user = null) => {
    const autoImages = new Set();
    return async (name, input) => {
        const result = await runTool(supabase, user, name, input, autoImages);
        const action = result?.action;
        if (action?.type === 'dish_created' && !action.existing) autoImages.add(`dish:${action.dishId}`);
        if (action?.type === 'exercise_created' && !action.existing) autoImages.add(`exercise:${action.exerciseId}`);
        return result;
    };
};

async function runTool(supabase, user, name, input, autoImages) {
    if (name === 'buscar_pratos') return searchDishes(supabase, input || {});
    if (name === 'gerar_midia') return requestMediaTool(supabase, user, input || {}, autoImages);
    if (name === 'sugerir_prato') {
        const { data, error } = await supabase.rpc('b_create_ai_dish', { p_data: input });
        if (error) {
            console.warn('[api/chat] Prato não criado:', error.message);
            return { content: `Não foi possível cadastrar o prato: ${error.message}`, isError: true };
        }
        const action = { type: 'dish_created', dishId: data.id, name: data.name, existing: Boolean(data.existing) };
        if (data.existing) {
            return { content: `Já existe no catálogo um prato com esse nome: "${data.name}". Nada foi criado.`, action };
        }
        return {
            content: `Prato "${data.name}" cadastrado no catálogo de Dieta. A foto será gerada agora pelo app`
                + ' e aparece depois de aprovada.',
            action,
        };
    }
    if (name !== 'propor_exercicio_novo') {
        return { content: `Ferramenta desconhecida: ${name}`, isError: true };
    }
    const { data, error } = await supabase.rpc('b_create_ai_exercise', { p_data: input });
    if (error) {
        console.warn('[api/chat] Exercício não criado:', error.message);
        return { content: `Não foi possível cadastrar: ${error.message}`, isError: true };
    }
    if (data.existing) {
        return {
            content: `Já existe no catálogo um exercício com esse nome: "${data.name}". Nada foi criado.`,
            action: { type: 'exercise_created', exerciseId: data.id, name: data.name, existing: true },
        };
    }
    return {
        content: `Exercício "${data.name}" cadastrado no catálogo. A imagem será gerada agora pelo app`
            + ' e aparece no exercício depois de aprovada; até lá ele mostra a imagem padrão.',
        action: { type: 'exercise_created', exerciseId: data.id, name: data.name, existing: false },
    };
}
