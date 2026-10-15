-- Benfit v2, etapa 2D: área Dieta com pratos sugeridos pelo Coach.
-- Rodar inteiro no SQL Editor do Supabase, depois da migração da 2C
-- (20261014220000_b_media.sql). Pode rodar de novo sem duplicar nada.
--
-- 1) b_dishes: catálogo de pratos compartilhado (foto, ingredientes, preparo e macros).
-- 2) b_user_dishes: favoritos de cada usuário, com observações.
-- 3) A fila b_media passa a aceitar a foto dos pratos (só imagem).
-- 4) b_create_ai_dish: o Coach cadastra um prato novo.

-- 1) Catálogo de pratos ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.b_dishes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dish_key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    -- cafe | almoco | lanche | jantar | pre_treino | pos_treino
    meal_type TEXT NOT NULL DEFAULT 'almoco'
        CHECK (meal_type IN ('cafe', 'almoco', 'lanche', 'jantar', 'pre_treino', 'pos_treino')),
    -- [{"item": "Peito de frango", "quantidade": "150 g"}, ...]
    ingredients JSONB NOT NULL DEFAULT '[]'::jsonb,
    preparation TEXT[] NOT NULL DEFAULT '{}',
    servings SMALLINT NOT NULL DEFAULT 1,
    -- Macros por porção
    kcal INTEGER,
    protein_g NUMERIC(6, 1),
    carbs_g NUMERIC(6, 1),
    fat_g NUMERIC(6, 1),
    tags TEXT[] NOT NULL DEFAULT '{}',
    image_url TEXT,
    created_by_ai BOOLEAN NOT NULL DEFAULT false,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS b_dishes_meal_type_idx ON public.b_dishes (meal_type, name);
CREATE UNIQUE INDEX IF NOT EXISTS b_dishes_name_lower_idx ON public.b_dishes (lower(name));

ALTER TABLE public.b_dishes ENABLE ROW LEVEL SECURITY;

-- Todos leem o catálogo; só admin edita ou apaga. Prato novo entra pela função.
DROP POLICY IF EXISTS "Dishes_Read" ON public.b_dishes;
CREATE POLICY "Dishes_Read" ON public.b_dishes
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Dishes_AdminUpdate" ON public.b_dishes;
CREATE POLICY "Dishes_AdminUpdate" ON public.b_dishes
    FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Dishes_AdminDelete" ON public.b_dishes;
CREATE POLICY "Dishes_AdminDelete" ON public.b_dishes
    FOR DELETE TO authenticated USING (public.is_admin());

-- 2) Favoritos ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.b_user_dishes (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    dish_id UUID NOT NULL REFERENCES public.b_dishes(id) ON DELETE CASCADE,
    notes TEXT CHECK (char_length(notes) <= 500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, dish_id)
);

ALTER TABLE public.b_user_dishes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "UserDishes_Own" ON public.b_user_dishes;
CREATE POLICY "UserDishes_Own" ON public.b_user_dishes
    FOR ALL TO authenticated
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

GRANT SELECT, UPDATE, DELETE ON public.b_dishes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.b_user_dishes TO authenticated;

-- 3) Fila de mídias: foto dos pratos ---------------------------------------------
CREATE OR REPLACE FUNCTION public.b_media_apply(p_media_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    m public.b_media;
BEGIN
    SELECT * INTO m FROM public.b_media WHERE id = p_media_id;
    IF m.id IS NULL THEN
        RETURN;
    END IF;
    IF m.entity_type = 'dish' THEN
        IF m.kind = 'image' THEN
            UPDATE public.b_dishes SET image_url = m.url, updated_at = now() WHERE id = m.entity_id;
        END IF;
        RETURN;
    END IF;
    IF m.kind = 'image' THEN
        UPDATE public.b_exercises SET image_url = m.url, updated_at = now() WHERE id = m.entity_id;
    ELSIF m.kind = 'video' THEN
        UPDATE public.b_exercises SET animation_url = m.url, updated_at = now() WHERE id = m.entity_id;
    ELSIF m.kind = 'poses' THEN
        UPDATE public.b_exercises SET animation_frames = m.frames, updated_at = now() WHERE id = m.entity_id;
    END IF;
END;
$$;

-- Mesmas regras da 2C, agora para exercícios e pratos: admin pede qualquer
-- mídia; os demais só a imagem do item que o Coach criou para eles, ainda sem
-- imagem nem outra em preparação, até 6 pedidos por dia. Prato só tem foto.
CREATE OR REPLACE FUNCTION public.b_media_check_access(p_entity_type TEXT, p_entity_id UUID, p_kind TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    item RECORD;
    recent INTEGER;
    label TEXT := CASE p_entity_type WHEN 'dish' THEN 'prato' ELSE 'exercício' END;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Sessão expirada' USING ERRCODE = '28000';
    END IF;
    IF p_entity_type = 'exercise' THEN
        SELECT id, created_by, created_by_ai, image_url INTO item
        FROM public.b_exercises WHERE id = p_entity_id;
    ELSIF p_entity_type = 'dish' THEN
        IF p_kind <> 'image' THEN
            RAISE EXCEPTION 'Prato só tem foto' USING ERRCODE = '22023';
        END IF;
        SELECT id, created_by, created_by_ai, image_url INTO item
        FROM public.b_dishes WHERE id = p_entity_id;
    ELSE
        RAISE EXCEPTION 'Tipo de mídia inválido' USING ERRCODE = '22023';
    END IF;
    IF item.id IS NULL THEN
        RAISE EXCEPTION '% não encontrado', initcap(label) USING ERRCODE = 'P0002';
    END IF;

    IF public.is_admin() THEN
        RETURN;
    END IF;

    PERFORM pg_advisory_xact_lock(2001, hashtext(auth.uid()::text));

    IF p_kind <> 'image' OR NOT item.created_by_ai OR item.created_by IS DISTINCT FROM auth.uid()
       OR COALESCE(item.image_url, '') <> '' THEN
        RAISE EXCEPTION 'Sem permissão para gerar esta mídia' USING ERRCODE = '42501';
    END IF;

    IF EXISTS (SELECT 1 FROM public.b_media
               WHERE entity_type = p_entity_type AND entity_id = p_entity_id
                 AND status IN ('gerando', 'pendente')) THEN
        RAISE EXCEPTION 'A imagem deste % já está em preparação', label USING ERRCODE = '55000';
    END IF;

    SELECT count(*) INTO recent FROM public.b_media
    WHERE created_by = auth.uid() AND created_at > now() - INTERVAL '1 day';
    IF recent >= 6 THEN
        RAISE EXCEPTION 'Limite diário de imagens atingido' USING ERRCODE = '54000';
    END IF;
END;
$$;

-- 4) Prato criado pelo Coach -------------------------------------------------------
-- Entra direto no catálogo, sem foto (o app gera a foto em seguida e ela passa
-- pela fila). Se já existe um prato com o mesmo nome, devolve o existente.
-- Limite de 3 pratos novos por dia para quem não é admin.
CREATE OR REPLACE FUNCTION public.b_create_ai_dish(p_data JSONB)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_name TEXT := btrim(regexp_replace(COALESCE(p_data->>'name', ''), '\s+', ' ', 'g'));
    v_meal TEXT := COALESCE(NULLIF(p_data->>'meal_type', ''), 'almoco');
    v_ingredients JSONB;
    v_preparation TEXT[];
    v_tags TEXT[];
    v_key TEXT;
    v_existing RECORD;
    v_id UUID;
    recent INTEGER;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Sessão expirada' USING ERRCODE = '28000';
    END IF;
    IF length(v_name) < 3 OR length(v_name) > 80 THEN
        RAISE EXCEPTION 'Nome do prato inválido' USING ERRCODE = '22023';
    END IF;
    IF v_meal NOT IN ('cafe', 'almoco', 'lanche', 'jantar', 'pre_treino', 'pos_treino') THEN
        v_meal := 'almoco';
    END IF;

    SELECT id, name INTO v_existing FROM public.b_dishes WHERE lower(name) = lower(v_name) LIMIT 1;
    IF v_existing.id IS NOT NULL THEN
        RETURN jsonb_build_object('id', v_existing.id, 'name', v_existing.name, 'existing', true);
    END IF;

    IF NOT public.is_admin() THEN
        PERFORM pg_advisory_xact_lock(2003, hashtext(auth.uid()::text));
        SELECT count(*) INTO recent FROM public.b_dishes
        WHERE created_by = auth.uid() AND created_by_ai AND created_at > now() - INTERVAL '1 day';
        IF recent >= 3 THEN
            RAISE EXCEPTION 'Limite diário de pratos novos atingido' USING ERRCODE = '54000';
        END IF;
    END IF;

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
               'item', left(btrim(e->>'item'), 80),
               'quantidade', left(btrim(COALESCE(e->>'quantidade', '')), 40)) ORDER BY pos), '[]'::jsonb)
    INTO v_ingredients
    FROM jsonb_array_elements(
        CASE WHEN jsonb_typeof(p_data->'ingredients') = 'array' THEN p_data->'ingredients' ELSE '[]'::jsonb END
    ) WITH ORDINALITY AS t(e, pos)
    WHERE jsonb_typeof(e) = 'object' AND btrim(COALESCE(e->>'item', '')) <> '' AND pos <= 15;
    IF jsonb_array_length(v_ingredients) = 0 THEN
        RAISE EXCEPTION 'Informe os ingredientes do prato' USING ERRCODE = '22023';
    END IF;

    SELECT array_agg(left(btrim(s), 300) ORDER BY pos) INTO v_preparation
    FROM jsonb_array_elements_text(
        CASE WHEN jsonb_typeof(p_data->'preparation') = 'array' THEN p_data->'preparation' ELSE '[]'::jsonb END
    ) WITH ORDINALITY AS t(s, pos)
    WHERE btrim(s) <> '' AND pos <= 8;

    SELECT array_agg(DISTINCT left(lower(btrim(s)), 30)) INTO v_tags
    FROM jsonb_array_elements_text(
        CASE WHEN jsonb_typeof(p_data->'tags') = 'array' THEN p_data->'tags' ELSE '[]'::jsonb END
    ) WITH ORDINALITY AS t(s, pos)
    WHERE btrim(s) <> '' AND pos <= 6;

    v_key := trim(both '_' FROM regexp_replace(
        lower(translate(v_name,
            'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
            'aaaaaeeeeiiiiooooouuuucaaaaaeeeeiiiiooooouuuuc')),
        '[^a-z0-9]+', '_', 'g'));
    IF EXISTS (SELECT 1 FROM public.b_dishes WHERE dish_key = v_key) THEN
        v_key := v_key || '_' || substr(md5(random()::text), 1, 5);
    END IF;

    -- Números fora da faixa viram nulo em vez de travar o cadastro.
    INSERT INTO public.b_dishes (dish_key, name, description, meal_type, ingredients, preparation, servings,
                                 kcal, protein_g, carbs_g, fat_g, tags, created_by_ai, created_by)
    VALUES (
        v_key, v_name,
        left(NULLIF(btrim(COALESCE(p_data->>'description', '')), ''), 400),
        v_meal, v_ingredients, COALESCE(v_preparation, '{}'),
        GREATEST(1, LEAST(COALESCE(NULLIF(p_data->>'servings', '')::NUMERIC, 1), 12))::SMALLINT,
        CASE WHEN (p_data->>'kcal') ~ '^\d+(\.\d+)?$' AND (p_data->>'kcal')::NUMERIC <= 3000
             THEN round((p_data->>'kcal')::NUMERIC)::INTEGER END,
        CASE WHEN (p_data->>'protein_g') ~ '^\d+(\.\d+)?$' AND (p_data->>'protein_g')::NUMERIC <= 300
             THEN (p_data->>'protein_g')::NUMERIC END,
        CASE WHEN (p_data->>'carbs_g') ~ '^\d+(\.\d+)?$' AND (p_data->>'carbs_g')::NUMERIC <= 500
             THEN (p_data->>'carbs_g')::NUMERIC END,
        CASE WHEN (p_data->>'fat_g') ~ '^\d+(\.\d+)?$' AND (p_data->>'fat_g')::NUMERIC <= 300
             THEN (p_data->>'fat_g')::NUMERIC END,
        COALESCE(v_tags, '{}') || ARRAY['ia'],
        true, auth.uid()
    )
    RETURNING id INTO v_id;

    RETURN jsonb_build_object('id', v_id, 'name', v_name, 'existing', false);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.b_create_ai_dish(JSONB) FROM PUBLIC;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        REVOKE EXECUTE ON FUNCTION public.b_create_ai_dish(JSONB) FROM anon;
        REVOKE ALL ON public.b_dishes FROM anon;
        REVOKE ALL ON public.b_user_dishes FROM anon;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        GRANT EXECUTE ON FUNCTION public.b_create_ai_dish(JSONB) TO authenticated;
        REVOKE EXECUTE ON FUNCTION public.b_media_apply(UUID) FROM authenticated;
        REVOKE EXECUTE ON FUNCTION public.b_media_check_access(TEXT, UUID, TEXT) FROM authenticated;
    END IF;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.b_media_apply(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.b_media_check_access(TEXT, UUID, TEXT) FROM PUBLIC;

-- Conferência: tabelas novas e função do Coach.
SELECT
    (SELECT count(*) FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name IN ('b_dishes', 'b_user_dishes')) AS tabelas_novas,
    (SELECT count(*) FROM pg_proc WHERE proname = 'b_create_ai_dish') AS funcao_prato,
    (SELECT count(*) FROM public.b_dishes) AS pratos_no_catalogo;
