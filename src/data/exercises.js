export const exercises = [
    // --- PANTURRILHA ---
    {
        id: 'panturrilha_em_pe_livre',
        name: 'Panturrilha em pé livre',
        muscle_group: 'Panturrilha',
        equipment: 'Peso do corpo / Halter',
        video_url: '',
        instructions: ['Fique na ponta dos pés o máximo que conseguir.', 'Desça controlando o movimento.'],
        tags: ['panturrilha']
    },
    {
        id: 'panturrilha_em_pe_maquina',
        name: 'Panturrilha em pé máquina',
        muscle_group: 'Panturrilha',
        equipment: 'Máquina',
        video_url: '',
        instructions: ['Apoie os ombros no suporte.', 'Suba e desça os calcanhares com amplitude total.'],
        tags: ['panturrilha', 'maquina']
    },
    {
        id: 'panturrilha_leg_press',
        name: 'Panturrilha no Leg Press',
        muscle_group: 'Panturrilha',
        equipment: 'Leg Press',
        video_url: '',
        instructions: ['Apoie apenas a ponta dos pés na plataforma.', 'Empurre a plataforma usando os tornozelos.'],
        tags: ['panturrilha', 'maquina']
    },
    {
        id: 'panturrilha_sentado',
        name: 'Panturrilha Sentado',
        muscle_group: 'Panturrilha',
        equipment: 'Máquina de Panturrilha Sentado',
        video_url: '',
        instructions: ['Sente-se e ajuste o apoio sobre as coxas.', 'Eleve os calcanhares o máximo possível.'],
        tags: ['panturrilha', 'maquina']
    },

    // --- QUADRÍCEPS / PERNAS ---
    {
        id: 'cadeira_extensora',
        name: 'Cadeira Extensora',
        muscle_group: 'Quadríceps',
        equipment: 'Máquina',
        video_url: '',
        instructions: ['Ajuste o encosto e o rolo.', 'Estenda os joelhos completamente.', 'Controle a descida.'],
        tags: ['perna', 'quadriceps', 'maquina']
    },
    {
        id: 'cadeira_extensora_unilateral',
        name: 'Cadeira Extensora Unilateral',
        muscle_group: 'Quadríceps',
        equipment: 'Máquina',
        video_url: '',
        instructions: ['Execute o movimento com uma perna de cada vez.'],
        tags: ['perna', 'quadriceps', 'unilateral']
    },
    {
        id: 'leg_press_45',
        name: 'Leg Press 45º',
        muscle_group: 'Pernas (Geral)',
        equipment: 'Leg Press',
        video_url: '',
        instructions: ['Apoie os pés na plataforma na largura dos ombros.', 'Desça até formar 90 graus ou mais.', 'Empurre sem travar os joelhos.'],
        tags: ['perna', 'composto']
    },
    {
        id: 'leg_press_horizontal_unilateral',
        name: 'Leg Press Horizontal Unilateral',
        muscle_group: 'Pernas (Geral)',
        equipment: 'Leg Press Horizontal',
        video_url: '',
        instructions: ['Realize o movimento com uma perna de cada vez.'],
        tags: ['perna', 'unilateral']
    },
    {
        id: 'agachamento_com_halter',
        name: 'Agachamento com Halter',
        muscle_group: 'Pernas (Geral)',
        equipment: 'Halter',
        video_url: '',
        instructions: ['Segure um halter em cada mão ou um goblet.', 'Agache mantendo a coluna reta.'],
        tags: ['perna', 'agachamento']
    },
    {
        id: 'agachamento_livre',
        name: 'Agachamento Livre',
        muscle_group: 'Pernas (Geral)',
        equipment: 'Barra',
        video_url: '',
        instructions: ['Barra nas costas (trapézio).', 'Agache profundo mantendo a postura.'],
        tags: ['perna', 'agachamento', 'composto']
    },
    {
        id: 'agachamento_smith',
        name: 'Agachamento no Smith',
        muscle_group: 'Pernas (Geral)',
        equipment: 'Smith Machine',
        video_url: '',
        instructions: ['Posicione a barra no trapézio.', 'Destrave e agache.'],
        tags: ['perna', 'agachamento', 'maquina']
    },
    {
        id: 'agachamento_bulgaro',
        name: 'Agachamento Búlgaro',
        muscle_group: 'Pernas / Glúteo',
        equipment: 'Banco e Halter',
        video_url: '',
        instructions: ['Apoie o peito do pé de trás em um banco.', 'Agache com a perna da frente.'],
        tags: ['perna', 'unilateral', 'gluteo']
    },
    {
        id: 'afundo_smith',
        name: 'Afundo no Smith',
        muscle_group: 'Pernas / Glúteo',
        equipment: 'Smith Machine',
        video_url: '',
        instructions: ['Dê um passo à frente.', 'Desça o joelho de trás em direção ao chão.'],
        tags: ['perna', 'unilateral']
    },
    {
        id: 'recuo_smith',
        name: 'Recuo no Smith',
        muscle_group: 'Pernas / Glúteo',
        equipment: 'Smith Machine',
        video_url: '',
        instructions: ['Dê um passo para trás.', 'Desça o joelho de trás.'],
        tags: ['perna', 'unilateral']
    },

    // --- POSTERIOR / GLÚTEO ---
    {
        id: 'mesa_flexora',
        name: 'Mesa Flexora',
        muscle_group: 'Posterior de Coxa',
        equipment: 'Máquina',
        video_url: '',
        instructions: ['Deite-se de bruços.', 'Flexione os joelhos trazendo o rolo em direção ao glúteo.'],
        tags: ['posterior', 'maquina']
    },
    {
        id: 'cadeira_flexora',
        name: 'Cadeira Flexora',
        muscle_group: 'Posterior de Coxa',
        equipment: 'Máquina',
        video_url: '',
        instructions: ['Sente-se e ajuste o rolo.', 'Flexione os joelhos para baixo.'],
        tags: ['posterior', 'maquina']
    },
    {
        id: 'flexora_vertical',
        name: 'Flexora Vertical',
        muscle_group: 'Posterior de Coxa',
        equipment: 'Máquina',
        video_url: '',
        instructions: ['Em pé, flexione uma perna de cada vez.'],
        tags: ['posterior', 'unilateral']
    },
    {
        id: 'stiff_barra',
        name: 'Stiff com Barra',
        muscle_group: 'Posterior / Glúteo',
        equipment: 'Barra',
        video_url: '',
        instructions: ['Pés na largura do quadril.', 'Desça a barra mantendo as pernas semi-flexionadas e coluna reta.'],
        tags: ['posterior', 'gluteo']
    },
    {
        id: 'stiff_halter',
        name: 'Stiff com Halter',
        muscle_group: 'Posterior / Glúteo',
        equipment: 'Halter',
        video_url: '',
        instructions: ['Mesma execução da barra, mas com halteres.'],
        tags: ['posterior', 'gluteo']
    },
    {
        id: 'rdl',
        name: 'RDL (Romanian Deadlift)',
        muscle_group: 'Posterior / Glúteo',
        equipment: 'Barra ou Halter',
        video_url: '',
        instructions: ['Foco na dobradiça de quadril.', 'Joelhos levemente flexionados.'],
        tags: ['posterior', 'gluteo']
    },
    {
        id: 'levantamento_terra_sumo',
        name: 'Levantamento Terra Sumô',
        muscle_group: 'Pernas / Glúteo / Costas',
        equipment: 'Barra',
        video_url: '',
        instructions: ['Pés bem afastados.', 'Segure a barra no centro.', 'Suba estendendo o quadril.'],
        tags: ['força', 'composto']
    },
    {
        id: 'good_morning',
        name: 'Good Morning',
        muscle_group: 'Posterior / Lombar',
        equipment: 'Barra',
        video_url: '',
        instructions: ['Barra nas costas.', 'Incline o tronco à frente mantendo a coluna reta.'],
        tags: ['posterior']
    },
    {
        id: 'elevacao_pelvica',
        name: 'Elevação Pélvica',
        muscle_group: 'Glúteo',
        equipment: 'Barra / Máquina',
        video_url: '',
        instructions: ['Apoie as escápulas no banco.', 'Eleve o quadril contraindo o glúteo.'],
        tags: ['gluteo']
    },
    {
        id: 'gluteo_cross',
        name: 'Glúteo no Cross (Polia)',
        muscle_group: 'Glúteo',
        equipment: 'Polia',
        video_url: '',
        instructions: ['Prenda o puxador no tornozelo.', 'Chute para trás.'],
        tags: ['gluteo', 'unilateral']
    },
    {
        id: 'extensao_quadril_banco_romano',
        name: 'Extensão de Quadril (Banco Romano)',
        muscle_group: 'Glúteo / Lombar',
        equipment: 'Banco Romano',
        video_url: '',
        instructions: ['Apoie o quadril.', 'Desça o tronco e suba contraindo glúteos.'],
        tags: ['gluteo', 'lombar']
    },

    // --- ADUTORES / ABDUTORES ---
    {
        id: 'cadeira_adutora',
        name: 'Cadeira Adutora',
        muscle_group: 'Adutores (Interno Coxa)',
        equipment: 'Máquina',
        video_url: '',
        instructions: ['Feche as pernas contra a resistência.'],
        tags: ['adutor', 'maquina']
    },
    {
        id: 'cadeira_abdutora',
        name: 'Cadeira Abdutora',
        muscle_group: 'Glúteo Médio (Lateral)',
        equipment: 'Máquina',
        video_url: '',
        instructions: ['Abra as pernas contra a resistência.'],
        tags: ['abdutor', 'gluteo']
    },
    {
        id: 'cadeira_abdutora_45',
        name: 'Cadeira Abdutora 45º',
        muscle_group: 'Glúteo',
        equipment: 'Máquina',
        video_url: '',
        instructions: ['Tronco inclinado à frente ou ajuste da máquina.'],
        tags: ['abdutor', 'gluteo']
    },
    {
        id: 'abducao_cross',
        name: 'Abdução no Cross',
        muscle_group: 'Glúteo',
        equipment: 'Polia',
        video_url: '',
        instructions: ['Polia baixa.', 'Abra a perna lateralmente.'],
        tags: ['abdutor', 'unilateral']
    },

    // --- COSTAS ---
    {
        id: 'puxador_supinado',
        name: 'Puxador Supinado',
        muscle_group: 'Costas',
        equipment: 'Polia Alta',
        video_url: '',
        instructions: ['Palmas viradas para você.', 'Puxe a barra até o peito.'],
        tags: ['costas', 'maquina']
    },
    {
        id: 'puxador_frente',
        name: 'Puxador Frente (Pronado)',
        muscle_group: 'Costas',
        equipment: 'Polia Alta',
        video_url: '',
        instructions: ['Pegada aberta.', 'Puxe a barra até o peito.'],
        tags: ['costas', 'maquina']
    },
    {
        id: 'puxador_triangulo',
        name: 'Puxador Triângulo',
        muscle_group: 'Costas',
        equipment: 'Polia Alta',
        video_url: '',
        instructions: ['Use o triângulo.', 'Puxe até o peito.'],
        tags: ['costas', 'maquina']
    },
    {
        id: 'remada_baixa_supinada',
        name: 'Remada Baixa Supinada',
        muscle_group: 'Costas',
        equipment: 'Polia Baixa',
        video_url: '',
        instructions: ['Sente-se.', 'Puxe a barra em direção ao abdômen.'],
        tags: ['costas', 'maquina']
    },
    {
        id: 'remada_baixa_pronada',
        name: 'Remada Baixa Pronada',
        muscle_group: 'Costas',
        equipment: 'Polia Baixa',
        video_url: '',
        instructions: ['Pegada pronada.', 'Puxe em direção ao abdômen.'],
        tags: ['costas']
    },
    {
        id: 'remada_articulada',
        name: 'Remada Articulada',
        muscle_group: 'Costas',
        equipment: 'Máquina Articulada',
        video_url: '',
        instructions: ['Apoie o peito.', 'Puxe as alavancas.'],
        tags: ['costas', 'maquina']
    },
    {
        id: 'remada_unilateral_halter',
        name: 'Remada Unilateral (Serrote)',
        muscle_group: 'Costas',
        equipment: 'Halter',
        video_url: '',
        instructions: ['Apoie uma mão e joelho no banco.', 'Puxe o halter com a outra mão.'],
        tags: ['costas', 'unilateral']
    },

    // --- PEITO ---
    {
        id: 'supino_vertical_maquina',
        name: 'Supino Vertical Máquina',
        muscle_group: 'Peito',
        equipment: 'Máquina',
        video_url: '',
        instructions: ['Empurre as alavancas para frente.'],
        tags: ['peito', 'maquina']
    },
    {
        id: 'flexao_bracos',
        name: 'Flexão de Braços',
        muscle_group: 'Peito',
        equipment: 'Peso do corpo',
        video_url: '',
        instructions: ['Corpo reto.', 'Desça o peito até o chão.'],
        tags: ['peito', 'calistenia']
    },

    // --- OMBROS ---
    {
        id: 'elevacao_lateral',
        name: 'Elevação Lateral',
        muscle_group: 'Ombros',
        equipment: 'Halter',
        video_url: '',
        instructions: ['Eleve os braços lateralmente até a altura dos ombros.'],
        tags: ['ombro']
    },
    {
        id: 'elevacao_lateral_cross',
        name: 'Elevação Lateral no Cross',
        muscle_group: 'Ombros',
        equipment: 'Polia',
        video_url: '',
        instructions: ['Polia baixa.', 'Eleve o braço lateralmente.'],
        tags: ['ombro', 'unilateral']
    },
    {
        id: 'elevacao_frontal',
        name: 'Elevação Frontal',
        muscle_group: 'Ombros',
        equipment: 'Halter / Anilha / Corda',
        video_url: '',
        instructions: ['Eleve o peso à frente do corpo.'],
        tags: ['ombro']
    },
    {
        id: 'desenvolvimento_halter',
        name: 'Desenvolvimento com Halter',
        muscle_group: 'Ombros',
        equipment: 'Halter',
        video_url: '',
        instructions: ['Empurre os halteres para cima da cabeça.'],
        tags: ['ombro']
    },
    {
        id: 'desenvolvimento_articulado',
        name: 'Desenvolvimento Articulado',
        muscle_group: 'Ombros',
        equipment: 'Máquina',
        video_url: '',
        instructions: ['Empurre a máquina para cima.'],
        tags: ['ombro', 'maquina']
    },
    {
        id: 'fly_inverso',
        name: 'Fly Inverso (Crucifixo Inverso)',
        muscle_group: 'Ombros (Posterior)',
        equipment: 'Máquina ou Halter',
        video_url: '',
        instructions: ['Abra os braços para trás, focando no posterior de ombro.'],
        tags: ['ombro', 'posterior']
    },
    {
        id: 'remada_alta',
        name: 'Remada Alta',
        muscle_group: 'Ombros / Trapézio',
        equipment: 'Polia ou Barra',
        video_url: '',
        instructions: ['Puxe a barra em direção ao queixo, cotovelos altos.'],
        tags: ['ombro', 'trapezio']
    },

    // --- TRÍCEPS ---
    {
        id: 'triceps_pulley',
        name: 'Tríceps Pulley',
        muscle_group: 'Tríceps',
        equipment: 'Polia Alta',
        video_url: '',
        instructions: ['Empurre a barra para baixo.'],
        tags: ['triceps']
    },
    {
        id: 'triceps_corda',
        name: 'Tríceps Corda',
        muscle_group: 'Tríceps',
        equipment: 'Polia Alta',
        video_url: '',
        instructions: ['Empurre a corda para baixo, abrindo no final.'],
        tags: ['triceps']
    },
    {
        id: 'triceps_frances',
        name: 'Tríceps Francês',
        muscle_group: 'Tríceps',
        equipment: 'Halter ou Polia',
        video_url: '',
        instructions: ['Peso atrás da cabeça.', 'Estenda o cotovelo para cima.'],
        tags: ['triceps']
    },
    {
        id: 'triceps_testa',
        name: 'Tríceps Testa',
        muscle_group: 'Tríceps',
        equipment: 'Barra ou Halter',
        video_url: '',
        instructions: ['Deitado.', 'Desça o peso na direção da testa.'],
        tags: ['triceps']
    },
    {
        id: 'triceps_paralela_maquina',
        name: 'Tríceps Máquina (Paralela)',
        muscle_group: 'Tríceps',
        equipment: 'Máquina',
        video_url: '',
        instructions: ['Empurre as alavancas para baixo.'],
        tags: ['triceps', 'maquina']
    },

    // --- BÍCEPS ---
    {
        id: 'rosca_direta',
        name: 'Rosca Direta',
        muscle_group: 'Bíceps',
        equipment: 'Barra ou Halter',
        video_url: '',
        instructions: ['Flexione os cotovelos trazendo o peso ao peito.'],
        tags: ['biceps']
    },
    {
        id: 'rosca_martelo',
        name: 'Rosca Martelo',
        muscle_group: 'Bíceps',
        equipment: 'Halter',
        video_url: '',
        instructions: ['Pegada neutra (palmas para dentro).'],
        tags: ['biceps']
    },
    {
        id: 'rosca_alternada',
        name: 'Rosca Alternada',
        muscle_group: 'Bíceps',
        equipment: 'Halter',
        video_url: '',
        instructions: ['Um braço de cada vez.'],
        tags: ['biceps']
    },
    {
        id: 'rosca_direta_cross',
        name: 'Rosca Direta no Cross',
        muscle_group: 'Bíceps',
        equipment: 'Polia Baixa',
        video_url: '',
        instructions: ['Use a barra na polia.'],
        tags: ['biceps']
    },

    // --- ABDÔMEN ---
    {
        id: 'abdominal_supra',
        name: 'Abdominal Supra',
        muscle_group: 'Abdômen',
        equipment: 'Solo',
        video_url: '',
        instructions: ['Deitado, eleve o tronco.'],
        tags: ['abdomen']
    },
    {
        id: 'abdominal_infra',
        name: 'Abdominal Infra',
        muscle_group: 'Abdômen',
        equipment: 'Solo ou Banco',
        video_url: '',
        instructions: ['Eleve as pernas.'],
        tags: ['abdomen']
    },
    {
        id: 'abdominal_supra_corda',
        name: 'Abdominal Supra na Corda (Cross)',
        muscle_group: 'Abdômen',
        equipment: 'Polia Alta',
        video_url: '',
        instructions: ['Ajoelhado.', 'Puxe a corda contraindo o abdômen.'],
        tags: ['abdomen']
    }
];
