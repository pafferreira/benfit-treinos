// Ferramentas do Benfit Coach (v2, etapa 2C). Só o Claude usa ferramentas;
// OpenAI e Gemini continuam como reserva só de texto.

// Mesmos nomes de b_muscles (src/lib/muscles.js), mais Cardio e Corpo Todo.
export const MUSCLE_NAMES = [
    'Peitoral', 'Ombros', 'Bíceps', 'Tríceps', 'Antebraços', 'Abdômen', 'Trapézio',
    'Costas (dorsais)', 'Lombar', 'Glúteos', 'Glúteo médio', 'Quadríceps',
    'Posteriores de coxa', 'Adutores', 'Panturrilhas', 'Cardio', 'Corpo Todo',
];

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
];

// Executa uma ferramenta pedida pelo Claude com o cliente do usuário (RLS).
export const createToolRunner = (supabase) => async (name, input) => {
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
