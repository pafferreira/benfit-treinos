-- ============================================================
-- BENFIT TREINOS - DATA POPULATION SCRIPT
-- This script populates the database with initial data
-- Run this AFTER running the main schema script
-- ============================================================

-- ============================================================
-- POPULATE B_Exercises
-- Insert all exercises from the exercises.js file
-- ============================================================

-- PANTURRILHA
INSERT INTO B_Exercises (exercise_key, name, muscle_group, equipment, video_url, instructions, tags) VALUES
('panturrilha_em_pe_livre', 'Panturrilha em pé livre', 'Panturrilha', 'Peso do corpo / Halter', '', 
    ARRAY['Fique na ponta dos pés o máximo que conseguir.', 'Desça controlando o movimento.'], 
    ARRAY['panturrilha']),
('panturrilha_em_pe_maquina', 'Panturrilha em pé máquina', 'Panturrilha', 'Máquina', '', 
    ARRAY['Apoie os ombros no suporte.', 'Suba e desça os calcanhares com amplitude total.'], 
    ARRAY['panturrilha', 'maquina']),
('panturrilha_leg_press', 'Panturrilha no Leg Press', 'Panturrilha', 'Leg Press', '', 
    ARRAY['Apoie apenas a ponta dos pés na plataforma.', 'Empurre a plataforma usando os tornozelos.'], 
    ARRAY['panturrilha', 'maquina']),
('panturrilha_sentado', 'Panturrilha Sentado', 'Panturrilha', 'Máquina de Panturrilha Sentado', '', 
    ARRAY['Sente-se e ajuste o apoio sobre as coxas.', 'Eleve os calcanhares o máximo possível.'], 
    ARRAY['panturrilha', 'maquina']);

-- QUADRÍCEPS / PERNAS
INSERT INTO B_Exercises (exercise_key, name, muscle_group, equipment, video_url, instructions, tags) VALUES
('cadeira_extensora', 'Cadeira Extensora', 'Quadríceps', 'Máquina', '', 
    ARRAY['Ajuste o encosto e o rolo.', 'Estenda os joelhos completamente.', 'Controle a descida.'], 
    ARRAY['perna', 'quadriceps', 'maquina']),
('cadeira_extensora_unilateral', 'Cadeira Extensora Unilateral', 'Quadríceps', 'Máquina', '', 
    ARRAY['Execute o movimento com uma perna de cada vez.'], 
    ARRAY['perna', 'quadriceps', 'unilateral']),
('leg_press_45', 'Leg Press 45º', 'Pernas (Geral)', 'Leg Press', '', 
    ARRAY['Apoie os pés na plataforma na largura dos ombros.', 'Desça até formar 90 graus ou mais.', 'Empurre sem travar os joelhos.'], 
    ARRAY['perna', 'composto']),
('leg_press_horizontal_unilateral', 'Leg Press Horizontal Unilateral', 'Pernas (Geral)', 'Leg Press Horizontal', '', 
    ARRAY['Realize o movimento com uma perna de cada vez.'], 
    ARRAY['perna', 'unilateral']),
('agachamento_com_halter', 'Agachamento com Halter', 'Pernas (Geral)', 'Halter', '', 
    ARRAY['Segure um halter em cada mão ou um goblet.', 'Agache mantendo a coluna reta.'], 
    ARRAY['perna', 'agachamento']),
('agachamento_livre', 'Agachamento Livre', 'Pernas (Geral)', 'Barra', '', 
    ARRAY['Barra nas costas (trapézio).', 'Agache profundo mantendo a postura.'], 
    ARRAY['perna', 'agachamento', 'composto']),
('agachamento_smith', 'Agachamento no Smith', 'Pernas (Geral)', 'Smith Machine', '', 
    ARRAY['Posicione a barra no trapézio.', 'Destrave e agache.'], 
    ARRAY['perna', 'agachamento', 'maquina']),
('agachamento_bulgaro', 'Agachamento Búlgaro', 'Pernas / Glúteo', 'Banco e Halter', '', 
    ARRAY['Apoie o peito do pé de trás em um banco.', 'Agache com a perna da frente.'], 
    ARRAY['perna', 'unilateral', 'gluteo']),
('afundo_smith', 'Afundo no Smith', 'Pernas / Glúteo', 'Smith Machine', '', 
    ARRAY['Dê um passo à frente.', 'Desça o joelho de trás em direção ao chão.'], 
    ARRAY['perna', 'unilateral']),
('recuo_smith', 'Recuo no Smith', 'Pernas / Glúteo', 'Smith Machine', '', 
    ARRAY['Dê um passo para trás.', 'Desça o joelho de trás.'], 
    ARRAY['perna', 'unilateral']);

-- POSTERIOR / GLÚTEO
INSERT INTO B_Exercises (exercise_key, name, muscle_group, equipment, video_url, instructions, tags) VALUES
('mesa_flexora', 'Mesa Flexora', 'Posterior de Coxa', 'Máquina', '', 
    ARRAY['Deite-se de bruços.', 'Flexione os joelhos trazendo o rolo em direção ao glúteo.'], 
    ARRAY['posterior', 'maquina']),
('cadeira_flexora', 'Cadeira Flexora', 'Posterior de Coxa', 'Máquina', '', 
    ARRAY['Sente-se e ajuste o rolo.', 'Flexione os joelhos para baixo.'], 
    ARRAY['posterior', 'maquina']),
('flexora_vertical', 'Flexora Vertical', 'Posterior de Coxa', 'Máquina', '', 
    ARRAY['Em pé, flexione uma perna de cada vez.'], 
    ARRAY['posterior', 'unilateral']),
('stiff_barra', 'Stiff com Barra', 'Posterior / Glúteo', 'Barra', '', 
    ARRAY['Pés na largura do quadril.', 'Desça a barra mantendo as pernas semi-flexionadas e coluna reta.'], 
    ARRAY['posterior', 'gluteo']),
('stiff_halter', 'Stiff com Halter', 'Posterior / Glúteo', 'Halter', '', 
    ARRAY['Mesma execução da barra, mas com halteres.'], 
    ARRAY['posterior', 'gluteo']),
('rdl', 'RDL (Romanian Deadlift)', 'Posterior / Glúteo', 'Barra ou Halter', '', 
    ARRAY['Foco na dobradiça de quadril.', 'Joelhos levemente flexionados.'], 
    ARRAY['posterior', 'gluteo']),
('levantamento_terra_sumo', 'Levantamento Terra Sumô', 'Pernas / Glúteo / Costas', 'Barra', '', 
    ARRAY['Pés bem afastados.', 'Segure a barra no centro.', 'Suba estendendo o quadril.'], 
    ARRAY['força', 'composto']),
('good_morning', 'Good Morning', 'Posterior / Lombar', 'Barra', '', 
    ARRAY['Barra nas costas.', 'Incline o tronco à frente mantendo a coluna reta.'], 
    ARRAY['posterior']),
('elevacao_pelvica', 'Elevação Pélvica', 'Glúteo', 'Barra / Máquina', '', 
    ARRAY['Apoie as escápulas no banco.', 'Eleve o quadril contraindo o glúteo.'], 
    ARRAY['gluteo']),
('gluteo_cross', 'Glúteo no Cross (Polia)', 'Glúteo', 'Polia', '', 
    ARRAY['Prenda o puxador no tornozelo.', 'Chute para trás.'], 
    ARRAY['gluteo', 'unilateral']),
('extensao_quadril_banco_romano', 'Extensão de Quadril (Banco Romano)', 'Glúteo / Lombar', 'Banco Romano', '', 
    ARRAY['Apoie o quadril.', 'Desça o tronco e suba contraindo glúteos.'], 
    ARRAY['gluteo', 'lombar']);

-- ADUTORES / ABDUTORES
INSERT INTO B_Exercises (exercise_key, name, muscle_group, equipment, video_url, instructions, tags) VALUES
('cadeira_adutora', 'Cadeira Adutora', 'Adutores (Interno Coxa)', 'Máquina', '', 
    ARRAY['Feche as pernas contra a resistência.'], 
    ARRAY['adutor', 'maquina']),
('cadeira_abdutora', 'Cadeira Abdutora', 'Glúteo Médio (Lateral)', 'Máquina', '', 
    ARRAY['Abra as pernas contra a resistência.'], 
    ARRAY['abdutor', 'gluteo']),
('cadeira_abdutora_45', 'Cadeira Abdutora 45º', 'Glúteo', 'Máquina', '', 
    ARRAY['Tronco inclinado à frente ou ajuste da máquina.'], 
    ARRAY['abdutor', 'gluteo']),
('abducao_cross', 'Abdução no Cross', 'Glúteo', 'Polia', '', 
    ARRAY['Polia baixa.', 'Abra a perna lateralmente.'], 
    ARRAY['abdutor', 'unilateral']);

-- COSTAS
INSERT INTO B_Exercises (exercise_key, name, muscle_group, equipment, video_url, instructions, tags) VALUES
('puxador_supinado', 'Puxador Supinado', 'Costas', 'Polia Alta', '', 
    ARRAY['Palmas viradas para você.', 'Puxe a barra até o peito.'], 
    ARRAY['costas', 'maquina']),
('puxador_frente', 'Puxador Frente (Pronado)', 'Costas', 'Polia Alta', '', 
    ARRAY['Pegada aberta.', 'Puxe a barra até o peito.'], 
    ARRAY['costas', 'maquina']),
('puxador_triangulo', 'Puxador Triângulo', 'Costas', 'Polia Alta', '', 
    ARRAY['Use o triângulo.', 'Puxe até o peito.'], 
    ARRAY['costas', 'maquina']),
('remada_baixa_supinada', 'Remada Baixa Supinada', 'Costas', 'Polia Baixa', '', 
    ARRAY['Sente-se.', 'Puxe a barra em direção ao abdômen.'], 
    ARRAY['costas', 'maquina']),
('remada_baixa_pronada', 'Remada Baixa Pronada', 'Costas', 'Polia Baixa', '', 
    ARRAY['Pegada pronada.', 'Puxe em direção ao abdômen.'], 
    ARRAY['costas']),
('remada_articulada', 'Remada Articulada', 'Costas', 'Máquina Articulada', '', 
    ARRAY['Apoie o peito.', 'Puxe as alavancas.'], 
    ARRAY['costas', 'maquina']),
('remada_unilateral_halter', 'Remada Unilateral (Serrote)', 'Costas', 'Halter', '', 
    ARRAY['Apoie uma mão e joelho no banco.', 'Puxe o halter com a outra mão.'], 
    ARRAY['costas', 'unilateral']);

-- PEITO
INSERT INTO B_Exercises (exercise_key, name, muscle_group, equipment, video_url, instructions, tags) VALUES
('supino_vertical_maquina', 'Supino Vertical Máquina', 'Peito', 'Máquina', '', 
    ARRAY['Empurre as alavancas para frente.'], 
    ARRAY['peito', 'maquina']),
('flexao_bracos', 'Flexão de Braços', 'Peito', 'Peso do corpo', '', 
    ARRAY['Corpo reto.', 'Desça o peito até o chão.'], 
    ARRAY['peito', 'calistenia']);

-- OMBROS
INSERT INTO B_Exercises (exercise_key, name, muscle_group, equipment, video_url, instructions, tags) VALUES
('elevacao_lateral', 'Elevação Lateral', 'Ombros', 'Halter', '', 
    ARRAY['Eleve os braços lateralmente até a altura dos ombros.'], 
    ARRAY['ombro']),
('elevacao_lateral_cross', 'Elevação Lateral no Cross', 'Ombros', 'Polia', '', 
    ARRAY['Polia baixa.', 'Eleve o braço lateralmente.'], 
    ARRAY['ombro', 'unilateral']),
('elevacao_frontal', 'Elevação Frontal', 'Ombros', 'Halter / Anilha / Corda', '', 
    ARRAY['Eleve o peso à frente do corpo.'], 
    ARRAY['ombro']),
('desenvolvimento_halter', 'Desenvolvimento com Halter', 'Ombros', 'Halter', '', 
    ARRAY['Empurre os halteres para cima da cabeça.'], 
    ARRAY['ombro']),
('desenvolvimento_articulado', 'Desenvolvimento Articulado', 'Ombros', 'Máquina', '', 
    ARRAY['Empurre a máquina para cima.'], 
    ARRAY['ombro', 'maquina']),
('fly_inverso', 'Fly Inverso (Crucifixo Inverso)', 'Ombros (Posterior)', 'Máquina ou Halter', '', 
    ARRAY['Abra os braços para trás, focando no posterior de ombro.'], 
    ARRAY['ombro', 'posterior']),
('remada_alta', 'Remada Alta', 'Ombros / Trapézio', 'Polia ou Barra', '', 
    ARRAY['Puxe a barra em direção ao queixo, cotovelos altos.'], 
    ARRAY['ombro', 'trapezio']);

-- TRÍCEPS
INSERT INTO B_Exercises (exercise_key, name, muscle_group, equipment, video_url, instructions, tags) VALUES
('triceps_pulley', 'Tríceps Pulley', 'Tríceps', 'Polia Alta', '', 
    ARRAY['Empurre a barra para baixo.'], 
    ARRAY['triceps']),
('triceps_corda', 'Tríceps Corda', 'Tríceps', 'Polia Alta', '', 
    ARRAY['Empurre a corda para baixo, abrindo no final.'], 
    ARRAY['triceps']),
('triceps_frances', 'Tríceps Francês', 'Tríceps', 'Halter ou Polia', '', 
    ARRAY['Peso atrás da cabeça.', 'Estenda o cotovelo para cima.'], 
    ARRAY['triceps']),
('triceps_testa', 'Tríceps Testa', 'Tríceps', 'Barra ou Halter', '', 
    ARRAY['Deitado.', 'Desça o peso na direção da testa.'], 
    ARRAY['triceps']),
('triceps_paralela_maquina', 'Tríceps Máquina (Paralela)', 'Tríceps', 'Máquina', '', 
    ARRAY['Empurre as alavancas para baixo.'], 
    ARRAY['triceps', 'maquina']);

-- BÍCEPS
INSERT INTO B_Exercises (exercise_key, name, muscle_group, equipment, video_url, instructions, tags) VALUES
('rosca_direta', 'Rosca Direta', 'Bíceps', 'Barra ou Halter', '', 
    ARRAY['Flexione os cotovelos trazendo o peso ao peito.'], 
    ARRAY['biceps']),
('rosca_martelo', 'Rosca Martelo', 'Bíceps', 'Halter', '', 
    ARRAY['Pegada neutra (palmas para dentro).'], 
    ARRAY['biceps']),
('rosca_alternada', 'Rosca Alternada', 'Bíceps', 'Halter', '', 
    ARRAY['Um braço de cada vez.'], 
    ARRAY['biceps']),
('rosca_direta_cross', 'Rosca Direta no Cross', 'Bíceps', 'Polia Baixa', '', 
    ARRAY['Use a barra na polia.'], 
    ARRAY['biceps']);

-- ABDÔMEN
INSERT INTO B_Exercises (exercise_key, name, muscle_group, equipment, video_url, instructions, tags) VALUES
('abdominal_supra', 'Abdominal Supra', 'Abdômen', 'Solo', '', 
    ARRAY['Deitado, eleve o tronco.'], 
    ARRAY['abdomen']),
('abdominal_infra', 'Abdominal Infra', 'Abdômen', 'Solo ou Banco', '', 
    ARRAY['Eleve as pernas.'], 
    ARRAY['abdomen']),
('abdominal_supra_corda', 'Abdominal Supra na Corda (Cross)', 'Abdômen', 'Polia Alta', '', 
    ARRAY['Ajoelhado.', 'Puxe a corda contraindo o abdômen.'], 
    ARRAY['abdomen']);

-- ============================================================
-- Note: The workout population is more complex due to the
-- nested structure. You'll need to:
-- 1. Insert into B_Workouts
-- 2. Get the workout_id
-- 3. Insert into B_Workout_Days
-- 4. Get the workout_day_id
-- 5. Insert into B_Workout_Exercises with exercise_id lookups
--
-- This is best done programmatically through your application
-- or through a separate migration script with proper UUID handling.
-- ============================================================

-- Example for one workout (you'll need to repeat for all):
-- First, insert the workout
DO $$
DECLARE
    v_workout_id UUID;
    v_day1_id UUID;
    v_day2_id UUID;
    v_day3_id UUID;
BEGIN
    -- Insert Workout 01
    INSERT INTO B_Workouts (workout_key, title, description, difficulty, estimated_duration, days_per_week, is_public)
    VALUES ('wk_01', 'Treino 01 - Adaptação e Base', 
            'Protocolo de 8 semanas focado em adaptação e construção de base. Ideal para iniciar ou retomar.',
            'Iniciante / Intermediário', 60, 3, true)
    RETURNING id INTO v_workout_id;

    -- Insert Day 1
    INSERT INTO B_Workout_Days (workout_id, day_number, day_name)
    VALUES (v_workout_id, 1, 'Dia 1 - Inferior (Foco Quadríceps)')
    RETURNING id INTO v_day1_id;

    -- Insert exercises for Day 1
    INSERT INTO B_Workout_Exercises (workout_day_id, exercise_id, order_index, sets, reps, notes)
    SELECT v_day1_id, id, 1, 4, '15-20', 'Pico de contração'
    FROM B_Exercises WHERE exercise_key = 'panturrilha_em_pe_livre';

    INSERT INTO B_Workout_Exercises (workout_day_id, exercise_id, order_index, sets, reps, notes)
    SELECT v_day1_id, id, 2, 6, '25-20-15-12-10-8', 'Pico de contração. Aumente a carga a cada série.'
    FROM B_Exercises WHERE exercise_key = 'cadeira_extensora';

    INSERT INTO B_Workout_Exercises (workout_day_id, exercise_id, order_index, sets, reps, notes)
    SELECT v_day1_id, id, 3, 5, '20-15-12-10-8', 'Com mini band se possível. Movimento concentrado.'
    FROM B_Exercises WHERE exercise_key = 'leg_press_45';

    INSERT INTO B_Workout_Exercises (workout_day_id, exercise_id, order_index, sets, reps, notes)
    SELECT v_day1_id, id, 4, 4, '10-15', ''
    FROM B_Exercises WHERE exercise_key = 'leg_press_horizontal_unilateral';

    INSERT INTO B_Workout_Exercises (workout_day_id, exercise_id, order_index, sets, reps, notes)
    SELECT v_day1_id, id, 5, 4, '8-12', ''
    FROM B_Exercises WHERE exercise_key = 'agachamento_com_halter';

    INSERT INTO B_Workout_Exercises (workout_day_id, exercise_id, order_index, sets, reps, notes)
    SELECT v_day1_id, id, 6, 4, '15', ''
    FROM B_Exercises WHERE exercise_key = 'cadeira_adutora';

    INSERT INTO B_Workout_Exercises (workout_day_id, exercise_id, order_index, sets, reps, notes)
    SELECT v_day1_id, id, 7, 4, '20-15-12-10', ''
    FROM B_Exercises WHERE exercise_key = 'cadeira_abdutora';

    -- Insert Day 2
    INSERT INTO B_Workout_Days (workout_id, day_number, day_name)
    VALUES (v_workout_id, 2, 'Dia 2 - Superiores Completo')
    RETURNING id INTO v_day2_id;

    -- Insert exercises for Day 2
    INSERT INTO B_Workout_Exercises (workout_day_id, exercise_id, order_index, sets, reps, notes)
    SELECT v_day2_id, id, 1, 4, '15-12-10-8', ''
    FROM B_Exercises WHERE exercise_key = 'puxador_supinado';

    INSERT INTO B_Workout_Exercises (workout_day_id, exercise_id, order_index, sets, reps, notes)
    SELECT v_day2_id, id, 2, 4, '15-12-10-8', ''
    FROM B_Exercises WHERE exercise_key = 'puxador_triangulo';

    INSERT INTO B_Workout_Exercises (workout_day_id, exercise_id, order_index, sets, reps, notes)
    SELECT v_day2_id, id, 3, 4, '15-12-10-8', ''
    FROM B_Exercises WHERE exercise_key = 'remada_baixa_supinada';

    INSERT INTO B_Workout_Exercises (workout_day_id, exercise_id, order_index, sets, reps, notes)
    SELECT v_day2_id, id, 4, 4, '15-12-10-8', ''
    FROM B_Exercises WHERE exercise_key = 'elevacao_lateral';

    INSERT INTO B_Workout_Exercises (workout_day_id, exercise_id, order_index, sets, reps, notes)
    SELECT v_day2_id, id, 5, 3, '10+10', 'Bi-set com Elevação Frontal (Anilha)'
    FROM B_Exercises WHERE exercise_key = 'desenvolvimento_halter';

    INSERT INTO B_Workout_Exercises (workout_day_id, exercise_id, order_index, sets, reps, notes)
    SELECT v_day2_id, id, 6, 3, '10+10', 'Bi-set com Rosca Direta'
    FROM B_Exercises WHERE exercise_key = 'triceps_pulley';

    INSERT INTO B_Workout_Exercises (workout_day_id, exercise_id, order_index, sets, reps, notes)
    SELECT v_day2_id, id, 7, 3, '10+10', 'Bi-set com Rosca Martelo'
    FROM B_Exercises WHERE exercise_key = 'triceps_frances';

    INSERT INTO B_Workout_Exercises (workout_day_id, exercise_id, order_index, sets, reps, notes)
    SELECT v_day2_id, id, 8, 4, '25', ''
    FROM B_Exercises WHERE exercise_key = 'abdominal_supra';

    -- Insert Day 3
    INSERT INTO B_Workout_Days (workout_id, day_number, day_name)
    VALUES (v_workout_id, 3, 'Dia 3 - Inferior (Foco Posterior/Glúteo)')
    RETURNING id INTO v_day3_id;

    -- Insert exercises for Day 3
    INSERT INTO B_Workout_Exercises (workout_day_id, exercise_id, order_index, sets, reps, notes)
    SELECT v_day3_id, id, 1, 3, '15', ''
    FROM B_Exercises WHERE exercise_key = 'panturrilha_leg_press';

    INSERT INTO B_Workout_Exercises (workout_day_id, exercise_id, order_index, sets, reps, notes)
    SELECT v_day3_id, id, 2, 4, '10-15', ''
    FROM B_Exercises WHERE exercise_key = 'abducao_cross';

    INSERT INTO B_Workout_Exercises (workout_day_id, exercise_id, order_index, sets, reps, notes)
    SELECT v_day3_id, id, 3, 5, '10-12', ''
    FROM B_Exercises WHERE exercise_key = 'cadeira_abdutora';

    INSERT INTO B_Workout_Exercises (workout_day_id, exercise_id, order_index, sets, reps, notes)
    SELECT v_day3_id, id, 4, 3, '15', 'Tronco mais vertical'
    FROM B_Exercises WHERE exercise_key = 'gluteo_cross';

    INSERT INTO B_Workout_Exercises (workout_day_id, exercise_id, order_index, sets, reps, notes)
    SELECT v_day3_id, id, 5, 4, '12-10-8-6', 'Com mini band'
    FROM B_Exercises WHERE exercise_key = 'elevacao_pelvica';

    INSERT INTO B_Workout_Exercises (workout_day_id, exercise_id, order_index, sets, reps, notes)
    SELECT v_day3_id, id, 6, 4, '15-12-10-8', ''
    FROM B_Exercises WHERE exercise_key = 'mesa_flexora';

    INSERT INTO B_Workout_Exercises (workout_day_id, exercise_id, order_index, sets, reps, notes)
    SELECT v_day3_id, id, 7, 4, '10+10', 'Bi-set com Stiff Halter'
    FROM B_Exercises WHERE exercise_key = 'cadeira_flexora';

    INSERT INTO B_Workout_Exercises (workout_day_id, exercise_id, order_index, sets, reps, notes)
    SELECT v_day3_id, id, 8, 5, '10', 'Pico de contração'
    FROM B_Exercises WHERE exercise_key = 'cadeira_extensora_unilateral';

END $$;

-- ============================================================
-- VERIFICATION QUERIES
-- Run these to verify the data was inserted correctly
-- ============================================================

-- Check exercises count
SELECT COUNT(*) as total_exercises FROM B_Exercises;

-- Check exercises by muscle group
SELECT muscle_group, COUNT(*) as count
FROM B_Exercises
GROUP BY muscle_group
ORDER BY count DESC;

-- Check workouts
SELECT * FROM B_Workouts;

-- Check workout days
SELECT w.title, wd.day_name
FROM B_Workout_Days wd
JOIN B_Workouts w ON wd.workout_id = w.id
ORDER BY w.title, wd.day_number;

-- Check workout exercises
SELECT w.title, wd.day_name, e.name, we.sets, we.reps, we.notes
FROM B_Workout_Exercises we
JOIN B_Workout_Days wd ON we.workout_day_id = wd.id
JOIN B_Workouts w ON wd.workout_id = w.id
JOIN B_Exercises e ON we.exercise_id = e.id
ORDER BY w.title, wd.day_number, we.order_index;

-- ============================================================
-- END OF POPULATION SCRIPT
-- ============================================================
