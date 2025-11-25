export const workouts = [
    {
        id: 'wk_01',
        title: 'Treino 01 - Adaptação e Base',
        description: 'Protocolo de 8 semanas focado em adaptação e construção de base. Ideal para iniciar ou retomar.',
        difficulty: 'Iniciante / Intermediário',
        estimated_duration: 60,
        days_per_week: 3,
        schedule: [
            {
                day_name: 'Dia 1 - Inferior (Foco Quadríceps)',
                exercises: [
                    { exercise_id: 'panturrilha_em_pe_livre', sets: 4, reps: '15-20', notes: 'Pico de contração' },
                    { exercise_id: 'cadeira_extensora', sets: 6, reps: '25-20-15-12-10-8', notes: 'Pico de contração. Aumente a carga a cada série.' },
                    { exercise_id: 'leg_press_45', sets: 5, reps: '20-15-12-10-8', notes: 'Com mini band se possível. Movimento concentrado.' },
                    { exercise_id: 'leg_press_horizontal_unilateral', sets: 4, reps: '10-15', notes: '' },
                    { exercise_id: 'agachamento_com_halter', sets: 4, reps: '8-12', notes: '' },
                    { exercise_id: 'cadeira_adutora', sets: 4, reps: '15', notes: '' },
                    { exercise_id: 'cadeira_abdutora', sets: 4, reps: '20-15-12-10', notes: '' }
                ]
            },
            {
                day_name: 'Dia 2 - Superiores Completo',
                exercises: [
                    { exercise_id: 'puxador_supinado', sets: 4, reps: '15-12-10-8', notes: '' },
                    { exercise_id: 'puxador_triangulo', sets: 4, reps: '15-12-10-8', notes: '' },
                    { exercise_id: 'remada_baixa_supinada', sets: 4, reps: '15-12-10-8', notes: '' },
                    { exercise_id: 'elevacao_lateral', sets: 4, reps: '15-12-10-8', notes: '' },
                    { exercise_id: 'desenvolvimento_halter', sets: 3, reps: '10+10', notes: 'Bi-set com Elevação Frontal (Anilha)' },
                    { exercise_id: 'triceps_pulley', sets: 3, reps: '10+10', notes: 'Bi-set com Rosca Direta' },
                    { exercise_id: 'triceps_frances', sets: 3, reps: '10+10', notes: 'Bi-set com Rosca Martelo' },
                    { exercise_id: 'abdominal_supra', sets: 4, reps: '25', notes: '' }
                ]
            },
            {
                day_name: 'Dia 3 - Inferior (Foco Posterior/Glúteo)',
                exercises: [
                    { exercise_id: 'panturrilha_leg_press', sets: 3, reps: '15', notes: '' },
                    { exercise_id: 'abducao_cross', sets: 4, reps: '10-15', notes: '' },
                    { exercise_id: 'cadeira_abdutora', sets: 5, reps: '10-12', notes: '' },
                    { exercise_id: 'gluteo_cross', sets: 3, reps: '15', notes: 'Tronco mais vertical' },
                    { exercise_id: 'elevacao_pelvica', sets: 4, reps: '12-10-8-6', notes: 'Com mini band' },
                    { exercise_id: 'mesa_flexora', sets: 4, reps: '15-12-10-8', notes: '' },
                    { exercise_id: 'cadeira_flexora', sets: 4, reps: '10+10', notes: 'Bi-set com Stiff Halter' },
                    { exercise_id: 'cadeira_extensora_unilateral', sets: 5, reps: '10', notes: 'Pico de contração' }
                ]
            }
        ]
    },
    {
        id: 'wk_02',
        title: 'Treino 02 - Evolução (12 Semanas)',
        description: 'Protocolo intermediário/avançado com técnicas de intensidade (Feeder sets, Working sets).',
        difficulty: 'Avançado',
        estimated_duration: 75,
        days_per_week: 7,
        schedule: [
            {
                day_name: 'Dia 1 - Glúteo e Posterior',
                exercises: [
                    { exercise_id: 'cadeira_abdutora_45', sets: 3, reps: '15', notes: '1x Aquecimento, 2x Reconhecimento' },
                    { exercise_id: 'cadeira_abdutora', sets: 3, reps: '10-12', notes: '1-2x Reconhecimento' },
                    { exercise_id: 'elevacao_pelvica', sets: 3, reps: '8-12', notes: 'Pico de contração. Última série Cluster Set (4 blocos de 4 reps).' },
                    { exercise_id: 'recuo_smith', sets: 3, reps: '8-10', notes: 'Step na perna da frente' },
                    { exercise_id: 'stiff_barra', sets: 3, reps: '8-12', notes: '' },
                    { exercise_id: 'cadeira_flexora', sets: 3, reps: '8-10', notes: 'Última série 12-15 reps' },
                    { exercise_id: 'mesa_flexora', sets: 3, reps: '8-10', notes: 'Última série 12-15 reps' }
                ]
            },
            {
                day_name: 'Dia 2 - Superiores (Foco Costas)',
                exercises: [
                    { exercise_id: 'remada_alta', sets: 3, reps: '10-12', notes: 'Máquina articulada' },
                    { exercise_id: 'remada_articulada', sets: 3, reps: '8-12', notes: 'Pegada neutra unilateral' },
                    { exercise_id: 'puxador_frente', sets: 3, reps: '8-12', notes: 'Supinado' },
                    { exercise_id: 'fly_inverso', sets: 3, reps: '10-15', notes: '' },
                    { exercise_id: 'elevacao_lateral_cross', sets: 3, reps: '10-12', notes: 'Unilateral' },
                    { exercise_id: 'rosca_direta_cross', sets: 3, reps: '10-12', notes: '' },
                    { exercise_id: 'triceps_corda', sets: 3, reps: '10-12', notes: '' }
                ]
            },
            {
                day_name: 'Dia 3 - Quadríceps',
                exercises: [
                    { exercise_id: 'cadeira_abdutora', sets: 3, reps: '10-15', notes: '' },
                    { exercise_id: 'cadeira_adutora', sets: 3, reps: '10-15', notes: '' },
                    { exercise_id: 'cadeira_extensora', sets: 4, reps: '10-12', notes: '' },
                    { exercise_id: 'agachamento_smith', sets: 3, reps: '8-12', notes: '' },
                    { exercise_id: 'leg_press_45', sets: 3, reps: '8-12', notes: 'Cadência 4-0-4 (4s descida, 4s subida)' },
                    { exercise_id: 'flexora_vertical', sets: 3, reps: '8-10', notes: '' }
                ]
            },
            {
                day_name: 'Dia 4 - Panturrilha e Abdômen',
                exercises: [
                    { exercise_id: 'panturrilha_sentado', sets: 4, reps: '10-15', notes: 'Pico de contração' },
                    { exercise_id: 'panturrilha_em_pe_maquina', sets: 4, reps: '8-10', notes: 'Pico de contração' },
                    { exercise_id: 'abdominal_infra', sets: 4, reps: 'Falha', notes: 'Declinado' },
                    { exercise_id: 'abdominal_supra_corda', sets: 4, reps: '10-12', notes: '' },
                    { exercise_id: 'abdominal_supra', sets: 3, reps: '25', notes: 'Solo' }
                ]
            },
            {
                day_name: 'Dia 5 - Superiores (Foco Costas/Ombro)',
                exercises: [
                    { exercise_id: 'puxador_frente', sets: 3, reps: '10-12', notes: 'Articulado' },
                    { exercise_id: 'remada_articulada', sets: 3, reps: '8-12', notes: 'Pronada' },
                    { exercise_id: 'remada_unilateral_halter', sets: 3, reps: '8-12', notes: '' },
                    { exercise_id: 'supino_vertical_maquina', sets: 2, reps: '10-12', notes: '' },
                    { exercise_id: 'elevacao_lateral', sets: 3, reps: '10-12', notes: '' },
                    { exercise_id: 'desenvolvimento_articulado', sets: 3, reps: '10+10', notes: 'Bi-set com Elevação Frontal' },
                    { exercise_id: 'triceps_paralela_maquina', sets: 3, reps: '10-12', notes: '' },
                    { exercise_id: 'rosca_alternada', sets: 3, reps: '10-12', notes: '' }
                ]
            },
            {
                day_name: 'Dia 6 - Glúteo e Posterior (Foco Força)',
                exercises: [
                    { exercise_id: 'cadeira_abdutora_45', sets: 3, reps: '15', notes: '' },
                    { exercise_id: 'abducao_cross', sets: 3, reps: '15', notes: 'Perna por trás' },
                    { exercise_id: 'gluteo_cross', sets: 3, reps: '15', notes: 'Cruzado' },
                    { exercise_id: 'elevacao_pelvica', sets: 3, reps: '8-10', notes: 'Última série 12-15' },
                    { exercise_id: 'levantamento_terra_sumo', sets: 3, reps: '8-10', notes: '' },
                    { exercise_id: 'good_morning', sets: 3, reps: '10-12', notes: 'Barra ou Smith' }
                ]
            },
            {
                day_name: 'Dia 7 - Panturrilha e Abdômen',
                exercises: [
                    { exercise_id: 'panturrilha_sentado', sets: 4, reps: '10-15', notes: '' },
                    { exercise_id: 'panturrilha_em_pe_maquina', sets: 4, reps: '8-10', notes: '' },
                    { exercise_id: 'abdominal_infra', sets: 4, reps: 'Falha', notes: '' },
                    { exercise_id: 'abdominal_supra_corda', sets: 4, reps: '10-12', notes: '' },
                    { exercise_id: 'abdominal_supra', sets: 3, reps: '25', notes: '' }
                ]
            }
        ]
    },
    {
        id: 'wk_03',
        title: 'Treino 03 - Consolidação (8-12 Semanas)',
        description: 'Fase de consolidação com alto volume e técnicas avançadas (Drop-set, Cluster).',
        difficulty: 'Avançado',
        estimated_duration: 75,
        days_per_week: 7,
        schedule: [
            {
                day_name: 'Dia 1 - Glúteo e Posterior',
                exercises: [
                    { exercise_id: 'panturrilha_em_pe_maquina', sets: 3, reps: '12-15', notes: '' },
                    { exercise_id: 'cadeira_abdutora_45', sets: 4, reps: '10-15', notes: '' },
                    { exercise_id: 'elevacao_pelvica', sets: 4, reps: '15-12-10-8', notes: '2seg pico de contração' },
                    { exercise_id: 'afundo_smith', sets: 3, reps: '8-12', notes: 'Step perna da frente' },
                    { exercise_id: 'rdl', sets: 3, reps: '8-12', notes: '' },
                    { exercise_id: 'gluteo_cross', sets: 3, reps: '12-15', notes: 'Perna flexionada' }
                ]
            },
            {
                day_name: 'Dia 2 - Superiores',
                exercises: [
                    { exercise_id: 'puxador_frente', sets: 4, reps: '8-12', notes: 'Barra romana' },
                    { exercise_id: 'remada_articulada', sets: 3, reps: '8-12', notes: 'Neutra unilateral' },
                    { exercise_id: 'remada_baixa_pronada', sets: 3, reps: '8-12', notes: '' },
                    { exercise_id: 'elevacao_lateral', sets: 3, reps: '10-12', notes: '' },
                    { exercise_id: 'elevacao_frontal', sets: 3, reps: '8-10', notes: 'Corda no cross' },
                    { exercise_id: 'triceps_frances', sets: 3, reps: '10+10', notes: 'Cross + Rosca W' }
                ]
            },
            {
                day_name: 'Dia 3 - Quadríceps',
                exercises: [
                    { exercise_id: 'mesa_flexora', sets: 3, reps: '8-12', notes: '' },
                    { exercise_id: 'cadeira_extensora', sets: 5, reps: '15-12-10-8-6', notes: '' },
                    { exercise_id: 'agachamento_livre', sets: 3, reps: '8-10', notes: '' },
                    { exercise_id: 'leg_press_45', sets: 4, reps: '8-10', notes: 'Última série Cluster Set (4x4, 15s pausa)' },
                    { exercise_id: 'abducao_cross', sets: 3, reps: '12-15', notes: 'Perna por trás' },
                    { exercise_id: 'extensao_quadril_banco_romano', sets: 3, reps: '10-15', notes: 'Pés abduzidos' }
                ]
            },
            {
                day_name: 'Dia 4 - Panturrilha e Abdômen',
                exercises: [
                    { exercise_id: 'abdominal_infra', sets: 4, reps: 'Falha', notes: 'Declinado' },
                    { exercise_id: 'abdominal_supra_corda', sets: 4, reps: '10-15', notes: '' },
                    { exercise_id: 'panturrilha_em_pe_maquina', sets: 4, reps: '10-15', notes: '' },
                    { exercise_id: 'panturrilha_sentado', sets: 4, reps: '8-10', notes: '' }
                ]
            },
            {
                day_name: 'Dia 5 - Superiores',
                exercises: [
                    { exercise_id: 'puxador_frente', sets: 3, reps: '8-12', notes: 'Articulada' },
                    { exercise_id: 'puxador_triangulo', sets: 3, reps: '8-12', notes: '' },
                    { exercise_id: 'fly_inverso', sets: 3, reps: '10-12', notes: 'Sentado' },
                    { exercise_id: 'desenvolvimento_halter', sets: 3, reps: '8-12', notes: '' },
                    { exercise_id: 'elevacao_frontal', sets: 3, reps: '8-10', notes: 'Barra supinada banco inclinado' },
                    { exercise_id: 'elevacao_lateral_cross', sets: 3, reps: '10', notes: 'Unilateral' },
                    { exercise_id: 'triceps_testa', sets: 3, reps: '10+10', notes: 'Cross + Rosca Martelo' }
                ]
            },
            {
                day_name: 'Dia 6 - Glúteo e Posterior',
                exercises: [
                    { exercise_id: 'elevacao_pelvica', sets: 3, reps: '8-12', notes: '2seg pico de contração' },
                    { exercise_id: 'agachamento_bulgaro', sets: 3, reps: '8-12', notes: '' },
                    { exercise_id: 'cadeira_abdutora_45', sets: 3, reps: '12+12+12', notes: '45º + 90º + Inclinado (Drop mecânico)' },
                    { exercise_id: 'stiff_barra', sets: 3, reps: '8-12', notes: '' },
                    { exercise_id: 'cadeira_flexora', sets: 3, reps: '8-12', notes: '1seg pico de contração' },
                    { exercise_id: 'mesa_flexora', sets: 3, reps: '8-12', notes: 'Drop set na 3ª série' }
                ]
            },
            {
                day_name: 'Dia 7 - Panturrilha e Abdômen',
                exercises: [
                    { exercise_id: 'abdominal_infra', sets: 4, reps: 'Falha', notes: '' },
                    { exercise_id: 'abdominal_supra_corda', sets: 4, reps: '10-15', notes: '' },
                    { exercise_id: 'panturrilha_em_pe_maquina', sets: 4, reps: '10-15', notes: '' },
                    { exercise_id: 'panturrilha_sentado', sets: 4, reps: '8-10', notes: '' }
                ]
            }
        ]
    }
];
