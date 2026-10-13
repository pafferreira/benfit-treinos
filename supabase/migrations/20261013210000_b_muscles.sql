-- Benfit v2, etapa 2B: músculos padronizados ligados aos exercícios.
-- Rodar inteiro no SQL Editor do Supabase. Pode rodar de novo sem duplicar nada.
--
-- 1) b_muscles: catálogo dos 15 músculos padrão, com cor fixa e vista do corpo.
--    Mesma lista de src/lib/muscles.js; mantenha as duas iguais.
-- 2) b_exercise_muscles: quais músculos cada exercício trabalha (principal/secundario).
-- 3) benfit_muscle_slugs(): converte os textos livres atuais ("Pernas / Glúteo",
--    "Ombros (Posterior)"...) em músculos padrão. Regras iguais às do app.
-- 4) Gatilho em b_exercises: ao criar ou editar um exercício, refaz os músculos
--    dele a partir de muscle_groups (ou muscle_group, nos exercícios antigos).
-- 5) Preenche b_exercise_muscles para todos os exercícios que já existem.
-- No fim, uma consulta mostra o resultado e os exercícios que ficaram sem músculo.

-- 1) Catálogo -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.b_muscles (
    slug TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    vista TEXT NOT NULL CHECK (vista IN ('frente', 'costas', 'ambas')),
    cor TEXT NOT NULL,
    regiao TEXT NOT NULL,
    ordem SMALLINT NOT NULL DEFAULT 0
);

INSERT INTO public.b_muscles (slug, nome, vista, cor, regiao, ordem) VALUES
    ('peitoral',     'Peitoral',            'frente', '#1E88E5', 'superior', 1),
    ('ombros',       'Ombros',              'ambas',  '#00ACC1', 'superior', 2),
    ('biceps',       'Bíceps',              'frente', '#3949AB', 'bracos',   3),
    ('triceps',      'Tríceps',             'costas', '#7E57C2', 'bracos',   4),
    ('antebracos',   'Antebraços',          'ambas',  '#8D6E63', 'bracos',   5),
    ('abdomen',      'Abdômen',             'frente', '#F9A825', 'core',     6),
    ('trapezio',     'Trapézio',            'costas', '#26A69A', 'superior', 7),
    ('dorsais',      'Costas (dorsais)',    'costas', '#1565C0', 'superior', 8),
    ('lombar',       'Lombar',              'costas', '#6D4C41', 'core',     9),
    ('gluteos',      'Glúteos',             'costas', '#8E24AA', 'pernas',  10),
    ('gluteo_medio', 'Glúteo médio',        'costas', '#CE93D8', 'pernas',  11),
    ('quadriceps',   'Quadríceps',          'frente', '#E53935', 'pernas',  12),
    ('posteriores',  'Posteriores de coxa', 'costas', '#43A047', 'pernas',  13),
    ('adutores',     'Adutores',            'frente', '#EC407A', 'pernas',  14),
    ('panturrilhas', 'Panturrilhas',        'ambas',  '#FB8C00', 'pernas',  15)
ON CONFLICT (slug) DO UPDATE SET
    nome = EXCLUDED.nome, vista = EXCLUDED.vista, cor = EXCLUDED.cor,
    regiao = EXCLUDED.regiao, ordem = EXCLUDED.ordem;

-- 2) Ligação exercício ↔ músculo --------------------------------------------
CREATE TABLE IF NOT EXISTS public.b_exercise_muscles (
    exercise_id UUID NOT NULL REFERENCES public.b_exercises(id) ON DELETE CASCADE,
    muscle_slug TEXT NOT NULL REFERENCES public.b_muscles(slug) ON DELETE CASCADE,
    papel TEXT NOT NULL CHECK (papel IN ('principal', 'secundario')),
    PRIMARY KEY (exercise_id, muscle_slug)
);

CREATE INDEX IF NOT EXISTS b_exercise_muscles_muscle_idx
    ON public.b_exercise_muscles (muscle_slug);

ALTER TABLE public.b_muscles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.b_exercise_muscles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Muscles_ReadAll" ON public.b_muscles;
CREATE POLICY "Muscles_ReadAll" ON public.b_muscles
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "ExerciseMuscles_ReadAll" ON public.b_exercise_muscles;
CREATE POLICY "ExerciseMuscles_ReadAll" ON public.b_exercise_muscles
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "ExerciseMuscles_AdminPersonalWrite" ON public.b_exercise_muscles;
CREATE POLICY "ExerciseMuscles_AdminPersonalWrite" ON public.b_exercise_muscles
    FOR ALL
    USING (EXISTS (SELECT 1 FROM public.b_users WHERE id = auth.uid() AND role IN ('admin', 'personal')))
    WITH CHECK (EXISTS (SELECT 1 FROM public.b_users WHERE id = auth.uid() AND role IN ('admin', 'personal')));

-- 3) Texto livre → músculos padrão -------------------------------------------
CREATE OR REPLACE FUNCTION public.benfit_muscle_slugs(term TEXT)
RETURNS TEXT[]
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT CASE
        WHEN t LIKE '%ombro%' THEN ARRAY['ombros']
        WHEN t LIKE '%peit%' THEN ARRAY['peitoral']
        WHEN t LIKE '%trapez%' THEN ARRAY['trapezio']
        WHEN t LIKE '%costas%' OR t LIKE '%dorsa%' THEN ARRAY['dorsais']
        WHEN t LIKE '%bicep%' THEN ARRAY['biceps']
        WHEN t LIKE '%tricep%' THEN ARRAY['triceps']
        WHEN t LIKE '%antebra%' THEN ARRAY['antebracos']
        WHEN t LIKE '%abdom%' OR t LIKE '%core%' OR t LIKE '%obliq%' THEN ARRAY['abdomen']
        WHEN t LIKE '%lombar%' THEN ARRAY['lombar']
        WHEN t LIKE '%gluteo medio%' OR t LIKE '%abdutor%' THEN ARRAY['gluteo_medio']
        WHEN t LIKE '%glute%' THEN ARRAY['gluteos']
        WHEN t LIKE '%quadri%' THEN ARRAY['quadriceps']
        WHEN t LIKE '%posterior%' OR t LIKE '%isquio%' THEN ARRAY['posteriores']
        WHEN t LIKE '%adut%' THEN ARRAY['adutores']
        WHEN t LIKE '%panturr%' THEN ARRAY['panturrilhas']
        WHEN t LIKE '%perna%' THEN ARRAY['quadriceps', 'gluteos', 'posteriores']
        WHEN t LIKE '%corpo%' THEN ARRAY['quadriceps', 'peitoral', 'dorsais', 'abdomen']
        ELSE ARRAY[]::TEXT[]
    END
    FROM (SELECT translate(lower(trim(coalesce(term, ''))), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc') AS t) s;
$$;

-- Refaz os músculos de um exercício a partir da lista de grupos.
-- O primeiro músculo encontrado é o principal; os outros são secundários.
CREATE OR REPLACE FUNCTION public.benfit_sync_exercise_muscles(p_exercise_id UUID, p_groups TEXT[])
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    term TEXT;
    part TEXT;
    slug TEXT;
    pos INT := 0;
BEGIN
    DELETE FROM public.b_exercise_muscles WHERE exercise_id = p_exercise_id;
    FOREACH term IN ARRAY coalesce(p_groups, ARRAY[]::TEXT[]) LOOP
        FOREACH part IN ARRAY regexp_split_to_array(term, '[/,;]') LOOP
            FOREACH slug IN ARRAY public.benfit_muscle_slugs(part) LOOP
                INSERT INTO public.b_exercise_muscles (exercise_id, muscle_slug, papel)
                VALUES (p_exercise_id, slug, CASE WHEN pos = 0 THEN 'principal' ELSE 'secundario' END)
                ON CONFLICT (exercise_id, muscle_slug) DO NOTHING;
                IF FOUND THEN pos := pos + 1; END IF;
            END LOOP;
        END LOOP;
    END LOOP;
END;
$$;

-- Grupos do exercício: muscle_groups (lista) quando existir; senão muscle_group.
-- Lido via jsonb para funcionar mesmo se a coluna muscle_groups não existir.
CREATE OR REPLACE FUNCTION public.benfit_exercise_groups(row_data JSONB)
RETURNS TEXT[]
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT CASE
        WHEN jsonb_typeof(row_data -> 'muscle_groups') = 'array'
             AND jsonb_array_length(row_data -> 'muscle_groups') > 0
            THEN ARRAY(SELECT jsonb_array_elements_text(row_data -> 'muscle_groups'))
        WHEN coalesce(row_data ->> 'muscle_group', '') <> ''
            THEN ARRAY[row_data ->> 'muscle_group']
        ELSE ARRAY[]::TEXT[]
    END;
$$;

-- 4) Gatilho -------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.benfit_exercise_muscles_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'UPDATE'
       AND public.benfit_exercise_groups(to_jsonb(NEW)) IS NOT DISTINCT FROM public.benfit_exercise_groups(to_jsonb(OLD)) THEN
        RETURN NEW;
    END IF;
    PERFORM public.benfit_sync_exercise_muscles(NEW.id, public.benfit_exercise_groups(to_jsonb(NEW)));
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS b_exercises_sync_muscles ON public.b_exercises;
CREATE TRIGGER b_exercises_sync_muscles
    AFTER INSERT OR UPDATE ON public.b_exercises
    FOR EACH ROW EXECUTE FUNCTION public.benfit_exercise_muscles_trigger();

-- 5) Preenche os exercícios existentes ----------------------------------------
SELECT public.benfit_sync_exercise_muscles(e.id, public.benfit_exercise_groups(to_jsonb(e)))
FROM public.b_exercises e;

-- Resultado: cada texto atual e os músculos que ele virou (★ = principal).
-- Linhas com "músculos" vazio são exercícios que ficaram sem músculo (ex.: Cardio).
SELECT
    array_to_string(public.benfit_exercise_groups(to_jsonb(e)), ' + ') AS grupos_atuais,
    count(DISTINCT e.id) AS exercicios,
    coalesce((
        SELECT string_agg(CASE WHEN em.papel = 'principal' THEN '★ ' ELSE '' END || m.nome, ', ' ORDER BY em.papel, m.ordem)
        FROM public.b_exercise_muscles em
        JOIN public.b_muscles m ON m.slug = em.muscle_slug
        WHERE em.exercise_id = min(e.id::text)::uuid
    ), '') AS musculos
FROM public.b_exercises e
GROUP BY 1
ORDER BY 2 DESC, 1;
