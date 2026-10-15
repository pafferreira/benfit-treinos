// Ferramentas do Benfit Coach (v2, etapa 2C). Só o Claude usa ferramentas;
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

// Executa uma ferramenta pedida pelo Claude com o cliente do usuário (RLS).
export const createToolRunner = (supabase) => async (name, input) => {
    if (name === 'buscar_pratos') return searchDishes(supabase, input || {});
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
};
