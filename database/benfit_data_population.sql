/*
 * BENFIT TREINOS - DATA POPULATION (EXERCISES & WORKOUT 01)
 * Data: 2026-02-05
 * 
 * Este script popula a biblioteca base de exercícios e configura o Treino 01.
 */

-- 1. POPULAR BIBLIOTECA DE EXERCÍCIOS (Base para o Treino 01)
INSERT INTO "public"."b_exercises" ("exercise_key", "name", "muscle_group", "equipment", "instructions", "tags")
VALUES
    ('cadeira_extensora', 'Cadeira Extensora', 'Quadríceps', 'Máquina', ARRAY['Ajuste o encosto', 'Mantenha as costas apoiadas', 'Extensão total dos joelhos'], ARRAY['isolado', 'maquina']),
    ('leg_press_45', 'Leg Press 45º', 'Quadríceps', 'Máquina', ARRAY['Pés na largura dos ombros', 'Desça controladamente', 'Não trave os joelhos no topo'], ARRAY['composto', 'pernas']),
    ('agachamento_smith', 'Agachamento no Smith', 'Quadríceps', 'Smith', ARRAY['Barra sobre os trapézios', 'Pés levemente à frente', 'Desça até 90 graus'], ARRAY['composto', 'pernas']),
    ('panturrilha_leg_press', 'Panturrilha no Leg Press', 'Panturrilha', 'Máquina', ARRAY['Apoie a ponta dos pés', 'Alongue o máximo', 'Contraia no topo'], ARRAY['isolado', 'panturrilha']),
    ('puxador_frente', 'Puxador Frente (Polia Alta)', 'Costas', 'Polia', ARRAY['Pegada aberta', 'Puxe a barra até o peito', 'Incline levemente o tronco'], ARRAY['composto', 'costas']),
    ('remada_baixa', 'Remada Baixa Sentada', 'Costas', 'Polia', ARRAY['Mantenha a coluna ereta', 'Puxe o triângulo em direção ao umbigo', 'Aproxime as escápulas'], ARRAY['composto', 'costas']),
    ('elevacao_lateral', 'Elevação Lateral', 'Ombros', 'Halter', ARRAY['Braços levemente flexionados', 'Suba até a linha dos ombros', 'Desça devagar'], ARRAY['isolado', 'ombros']),
    ('triceps_pulley', 'Tríceps Pulley (Corda)', 'Tríceps', 'Polia', ARRAY['Cotovelos colados ao corpo', 'Extensão total dos braços', 'Abra a corda no final'], ARRAY['isolado', 'triceps']),
    ('rosca_direta_halter', 'Rosca Direta com Halter', 'Bíceps', 'Halter', ARRAY['Palmas para frente', 'Suba o halter sem mover os cotovelos', 'Controle a descida'], ARRAY['isolado', 'biceps']),
    ('cadeira_flexora', 'Cadeira Flexora', 'Posterior', 'Máquina', ARRAY['Ajuste o rolo nos calcanhares', 'Flexione os joelhos ao máximo', 'Retorne devagar'], ARRAY['isolado', 'posterior']),
    ('elevacao_pelvica', 'Elevação Pélvica', 'Glúteo', 'Barra/Máquina', ARRAY['Costas apoiadas no banco', 'Pés firmes no chão', 'Suba o quadril contraindo o glúteo'], ARRAY['composto', 'gluteo']),
    ('stiff_barra', 'Stiff com Barra', 'Posterior', 'Barra', ARRAY['Pés na largura do quadril', 'Desça a barra rente às pernas', 'Mantenha a coluna neutra'], ARRAY['composto', 'posterior']),
    ('cadeira_abdutora', 'Cadeira Abdutora', 'Glúteo', 'Máquina', ARRAY['Ajuste o peso', 'Afaste as pernas com força', 'Retorne controladamente'], ARRAY['isolado', 'gluteo']),
    ('abdominal_supra', 'Abdominal Supra', 'Abdômen', 'Peso do Corpo', ARRAY['Mãos na nuca', 'Tire as escápulas do chão', 'Solte o ar na subida'], ARRAY['isolado', 'core'])
ON CONFLICT (exercise_key) DO NOTHING;

-- 2. CRIAR O TREINO 01 (Adaptação e Base)
INSERT INTO "public"."b_workouts" ("workout_key", "title", "description", "difficulty", "days_per_week", "is_public")
VALUES ('wk_01', 'Treino 01 - Adaptação e Base', 'Foco em técnica e adaptação neuromuscular para iniciantes.', 'Iniciante', 3, TRUE)
ON CONFLICT (workout_key) DO NOTHING;

-- 3. CONFIGURAR OS DIAS DO TREINO 01
-- Limpamos dias anteriores se existirem para evitar duplicidade ao rodar o script novamente
DELETE FROM "public"."b_workout_days" WHERE workout_id = (SELECT id FROM "public"."b_workouts" WHERE workout_key = 'wk_01');

INSERT INTO "public"."b_workout_days" ("workout_id", "day_number", "day_name")
VALUES 
    ((SELECT id FROM "public"."b_workouts" WHERE workout_key = 'wk_01'), 1, 'Dia 1 - Inferior (Foco Quadríceps)'),
    ((SELECT id FROM "public"."b_workouts" WHERE workout_key = 'wk_01'), 2, 'Dia 2 - Superiores Completo'),
    ((SELECT id FROM "public"."b_workouts" WHERE workout_key = 'wk_01'), 3, 'Dia 3 - Inferior (Foco Posterior/Glúteo)');

-- 4. ADICIONAR EXERCÍCIOS AOS DIAS (Prescrição)

-- DIA 1: Inferior (Quadríceps)
INSERT INTO "public"."b_workout_exercises" ("workout_day_id", "exercise_id", "order_index", "sets", "reps", "rest_seconds", "notes")
SELECT 
    (SELECT id FROM "public"."b_workout_days" WHERE workout_id = (SELECT id FROM "public"."b_workouts" WHERE workout_key = 'wk_01') AND day_number = 1),
    id, order_idx, 3, '12-15', 60, note
FROM (
    VALUES 
        ('cadeira_extensora', 1, 'Aquecimento leve na primeira série'),
        ('leg_press_45', 2, 'Foco na amplitude'),
        ('agachamento_smith', 3, 'Mantenha o tronco firme'),
        ('panturrilha_leg_press', 4, 'Pausa de 2s no topo'),
        ('abdominal_supra', 5, 'Até a falha técnica')
) AS data(ex_key, order_idx, note)
JOIN "public"."b_exercises" e ON e.exercise_key = data.ex_key;

-- DIA 2: Superiores
INSERT INTO "public"."b_workout_exercises" ("workout_day_id", "exercise_id", "order_index", "sets", "reps", "rest_seconds", "notes")
SELECT 
    (SELECT id FROM "public"."b_workout_days" WHERE workout_id = (SELECT id FROM "public"."b_workouts" WHERE workout_key = 'wk_01') AND day_number = 2),
    id, order_idx, 3, '10-12', 60, note
FROM (
    VALUES 
        ('puxador_frente', 1, 'Não balance o corpo'),
        ('remada_baixa', 2, 'Sinta as costas fecharem'),
        ('elevacao_lateral', 3, 'Carga moderada'),
        ('triceps_pulley', 4, 'Extensão máxima'),
        ('rosca_direta_halter', 5, 'Sem roubar com o corpo')
) AS data(ex_key, order_idx, note)
JOIN "public"."b_exercises" e ON e.exercise_key = data.ex_key;

-- DIA 3: Inferior (Posterior/Glúteo)
INSERT INTO "public"."b_workout_exercises" ("workout_day_id", "exercise_id", "order_index", "sets", "reps", "rest_seconds", "notes")
SELECT 
    (SELECT id FROM "public"."b_workout_days" WHERE workout_id = (SELECT id FROM "public"."b_workouts" WHERE workout_key = 'wk_01') AND day_number = 3),
    id, order_idx, 3, '12-15', 60, note
FROM (
    VALUES 
        ('cadeira_flexora', 1, 'Movimento controlado'),
        ('elevacao_pelvica', 2, 'Contraia bem o glúteo no topo'),
        ('stiff_barra', 3, 'Mantenha a barra colada na perna'),
        ('cadeira_abdutora', 4, 'Tronco levemente à frente'),
        ('abdominal_supra', 5, '3 séries de 20 reps')
) AS data(ex_key, order_idx, note)
JOIN "public"."b_exercises" e ON e.exercise_key = data.ex_key;

-- VERIFICAÇÃO FINAL
DO $$
BEGIN
    RAISE NOTICE 'População concluída com sucesso!';
    RAISE NOTICE 'Exercícios: %', (SELECT COUNT(*) FROM b_exercises);
    RAISE NOTICE 'Treinos: %', (SELECT COUNT(*) FROM b_workouts);
END $$;