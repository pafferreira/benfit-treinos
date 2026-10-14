-- Benfit v2, etapa 2C: mídias geradas pela IA, exercícios criados pelo Coach
-- e piloto de animação de 5 segundos.
-- Rodar inteiro no SQL Editor do Supabase. Pode rodar de novo sem duplicar nada.
--
-- 1) b_exercises ganha animation_url (vídeo em loop), animation_frames (duas
--    poses alternando), created_by_ai e created_by.
-- 2) b_app_settings: chave "media_approval". Ligada, toda mídia da IA espera a
--    aprovação de um admin; desligada, entra no ar na hora. O admin troca a
--    chave na tela "Aprovar mídias".
-- 3) b_media: fila única de mídias (exercícios agora, pratos na etapa 2D).
-- 4) Funções: reservar e concluir a geração, enviar vídeo para a fila,
--    aprovar/rejeitar e
--    criar exercício pelo Coach. A tabela só muda por elas.

-- 1) Colunas novas em b_exercises --------------------------------------------
ALTER TABLE public.b_exercises
    ADD COLUMN IF NOT EXISTS animation_url TEXT,
    ADD COLUMN IF NOT EXISTS animation_frames TEXT[],
    ADD COLUMN IF NOT EXISTS created_by_ai BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2) Configurações do app -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.b_app_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

INSERT INTO public.b_app_settings (key, value)
VALUES ('media_approval', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.b_app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "AppSettings_ReadAll" ON public.b_app_settings;
CREATE POLICY "AppSettings_ReadAll" ON public.b_app_settings
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "AppSettings_AdminWrite" ON public.b_app_settings;
CREATE POLICY "AppSettings_AdminWrite" ON public.b_app_settings
    FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 3) Fila de mídias -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.b_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL CHECK (entity_type IN ('exercise', 'dish')),
    entity_id UUID NOT NULL,
    -- image: imagem oficial; video: animação em loop; poses: início e fim alternando
    kind TEXT NOT NULL CHECK (kind IN ('image', 'video', 'poses')),
    url TEXT,
    frames TEXT[],
    storage_paths TEXT[] NOT NULL DEFAULT '{}',
    prompt TEXT,
    -- Vídeo demora alguns minutos: job guarda a operação do Veo até concluir.
    job TEXT,
    status TEXT NOT NULL DEFAULT 'pendente'
        CHECK (status IN ('gerando', 'pendente', 'aprovada', 'rejeitada', 'falhou')),
    error TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS b_media_status_idx ON public.b_media (status, created_at DESC);
CREATE INDEX IF NOT EXISTS b_media_entity_idx ON public.b_media (entity_type, entity_id);

ALTER TABLE public.b_media ENABLE ROW LEVEL SECURITY;

-- Leitura: admin vê tudo; cada um vê o que pediu; aprovadas são públicas.
-- Escrita só pelas funções abaixo (SECURITY DEFINER).
DROP POLICY IF EXISTS "Media_Read" ON public.b_media;
CREATE POLICY "Media_Read" ON public.b_media
    FOR SELECT TO authenticated
    USING (status = 'aprovada' OR created_by = auth.uid() OR public.is_admin());

-- 4) Funções ----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.b_media_approval_on()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(
        (SELECT (value #>> '{}')::BOOLEAN FROM public.b_app_settings WHERE key = 'media_approval'),
        true
    );
$$;

-- Publica a mídia aprovada no exercício. Uso interno.
CREATE OR REPLACE FUNCTION public.b_media_apply(p_media_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    m public.b_media;
BEGIN
    SELECT * INTO m FROM public.b_media WHERE id = p_media_id;
    IF m.id IS NULL OR m.entity_type <> 'exercise' THEN
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

-- Quem pode pedir mídia: admin para qualquer exercício; os demais só a
-- imagem do exercício que o Coach criou para eles, que ainda não tem imagem
-- nem outra em preparação, com limite de 6 pedidos por dia. A trava por
-- usuário faz pedidos simultâneos esperarem a vez, então o limite vale mesmo
-- com chamadas em paralelo.
CREATE OR REPLACE FUNCTION public.b_media_check_access(p_entity_type TEXT, p_entity_id UUID, p_kind TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    ex RECORD;
    recent INTEGER;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Sessão expirada' USING ERRCODE = '28000';
    END IF;
    IF p_entity_type <> 'exercise' THEN
        RAISE EXCEPTION 'Mídia de % ainda não disponível', p_entity_type USING ERRCODE = '22023';
    END IF;

    SELECT id, created_by, created_by_ai, image_url INTO ex
    FROM public.b_exercises WHERE id = p_entity_id;
    IF ex.id IS NULL THEN
        RAISE EXCEPTION 'Exercício não encontrado' USING ERRCODE = 'P0002';
    END IF;

    IF public.is_admin() THEN
        RETURN;
    END IF;

    PERFORM pg_advisory_xact_lock(2001, hashtext(auth.uid()::text));

    IF p_kind <> 'image' OR NOT ex.created_by_ai OR ex.created_by IS DISTINCT FROM auth.uid()
       OR COALESCE(ex.image_url, '') <> '' THEN
        RAISE EXCEPTION 'Sem permissão para gerar esta mídia' USING ERRCODE = '42501';
    END IF;

    IF EXISTS (SELECT 1 FROM public.b_media
               WHERE entity_type = p_entity_type AND entity_id = p_entity_id
                 AND status IN ('gerando', 'pendente')) THEN
        RAISE EXCEPTION 'A imagem deste exercício já está em preparação' USING ERRCODE = '55000';
    END IF;

    SELECT count(*) INTO recent FROM public.b_media
    WHERE created_by = auth.uid() AND created_at > now() - INTERVAL '1 day';
    IF recent >= 6 THEN
        RAISE EXCEPTION 'Limite diário de imagens atingido' USING ERRCODE = '54000';
    END IF;
END;
$$;

-- Só aceita arquivos do bucket público do app.
CREATE OR REPLACE FUNCTION public.b_media_valid_url(p_url TEXT)
RETURNS BOOLEAN
LANGUAGE sql IMMUTABLE
AS $$
    SELECT p_url IS NULL OR p_url LIKE 'https://%/storage/v1/object/public/benfit-assets/%';
$$;

-- Coloca uma mídia na fila. Com job (vídeo em geração) fica "gerando"; senão
-- fica "pendente" ou, com a aprovação desligada, já entra no ar.
CREATE OR REPLACE FUNCTION public.b_media_submit(
    p_entity_type TEXT,
    p_entity_id UUID,
    p_kind TEXT,
    p_url TEXT,
    p_frames TEXT[],
    p_storage_paths TEXT[],
    p_prompt TEXT,
    p_job TEXT DEFAULT NULL
)
RETURNS public.b_media
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    m public.b_media;
    new_status TEXT;
BEGIN
    PERFORM public.b_media_check_access(p_entity_type, p_entity_id, p_kind);

    IF NOT public.b_media_valid_url(p_url)
       OR EXISTS (SELECT 1 FROM unnest(COALESCE(p_frames, '{}')) f WHERE NOT public.b_media_valid_url(f)) THEN
        RAISE EXCEPTION 'Arquivo fora do armazenamento do app' USING ERRCODE = '22023';
    END IF;
    IF p_job IS NULL AND p_url IS NULL AND COALESCE(array_length(p_frames, 1), 0) = 0 THEN
        RAISE EXCEPTION 'Mídia sem arquivo' USING ERRCODE = '22023';
    END IF;

    new_status := CASE
        WHEN p_job IS NOT NULL THEN 'gerando'
        WHEN public.b_media_approval_on() THEN 'pendente'
        ELSE 'aprovada'
    END;

    INSERT INTO public.b_media (entity_type, entity_id, kind, url, frames, storage_paths, prompt, job, status, created_by,
                                reviewed_at)
    VALUES (p_entity_type, p_entity_id, p_kind, p_url, p_frames, COALESCE(p_storage_paths, '{}'),
            left(p_prompt, 4000), p_job, new_status, auth.uid(),
            CASE WHEN new_status = 'aprovada' THEN now() END)
    RETURNING * INTO m;

    IF new_status = 'aprovada' THEN
        PERFORM public.b_media_apply(m.id);
    END IF;
    RETURN m;
END;
$$;

-- Reserva a vaga antes de chamar a IA (imagem e duas poses): a linha nasce
-- "gerando" e conta no limite diário, então a cobrança da IA só acontece
-- depois que o pedido passou pelas permissões e pelo limite. Reservas de mais
-- de 10 minutos que nunca concluíram viram "falhou".
CREATE OR REPLACE FUNCTION public.b_media_reserve(
    p_entity_type TEXT,
    p_entity_id UUID,
    p_kind TEXT,
    p_prompt TEXT
)
RETURNS public.b_media
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    m public.b_media;
BEGIN
    IF auth.uid() IS NOT NULL THEN
        UPDATE public.b_media SET status = 'falhou', error = 'Geração interrompida'
        WHERE created_by = auth.uid() AND status = 'gerando' AND job IS NULL
          AND created_at < now() - INTERVAL '10 minutes';
    END IF;

    PERFORM public.b_media_check_access(p_entity_type, p_entity_id, p_kind);

    INSERT INTO public.b_media (entity_type, entity_id, kind, prompt, status, created_by)
    VALUES (p_entity_type, p_entity_id, p_kind, left(p_prompt, 4000), 'gerando', auth.uid())
    RETURNING * INTO m;
    RETURN m;
END;
$$;

-- Conclui uma mídia "gerando" (reserva de imagem/poses ou vídeo do Veo): com
-- arquivo vai para a fila (ou no ar), com erro fica "falhou".
DROP FUNCTION IF EXISTS public.b_media_finish_job(UUID, TEXT, TEXT[], TEXT);
CREATE OR REPLACE FUNCTION public.b_media_finish_job(
    p_media_id UUID,
    p_url TEXT,
    p_frames TEXT[],
    p_storage_paths TEXT[],
    p_error TEXT DEFAULT NULL
)
RETURNS public.b_media
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    m public.b_media;
BEGIN
    SELECT * INTO m FROM public.b_media WHERE id = p_media_id;
    IF m.id IS NULL OR NOT (public.is_admin() OR m.created_by = auth.uid()) THEN
        RAISE EXCEPTION 'Mídia não encontrada' USING ERRCODE = 'P0002';
    END IF;
    IF m.status <> 'gerando' THEN
        RETURN m;
    END IF;
    IF NOT public.b_media_valid_url(p_url)
       OR EXISTS (SELECT 1 FROM unnest(COALESCE(p_frames, '{}')) f WHERE NOT public.b_media_valid_url(f)) THEN
        RAISE EXCEPTION 'Arquivo fora do armazenamento do app' USING ERRCODE = '22023';
    END IF;

    IF p_url IS NULL AND COALESCE(array_length(p_frames, 1), 0) < 2 THEN
        UPDATE public.b_media SET status = 'falhou', error = left(COALESCE(p_error, 'Falha na geração'), 500)
        WHERE id = p_media_id RETURNING * INTO m;
        RETURN m;
    END IF;

    UPDATE public.b_media
    SET url = p_url,
        frames = p_frames,
        storage_paths = storage_paths || COALESCE(p_storage_paths, '{}'),
        status = CASE WHEN public.b_media_approval_on() THEN 'pendente' ELSE 'aprovada' END,
        reviewed_at = CASE WHEN public.b_media_approval_on() THEN NULL ELSE now() END
    WHERE id = p_media_id
    RETURNING * INTO m;

    IF m.status = 'aprovada' THEN
        PERFORM public.b_media_apply(m.id);
    END IF;
    RETURN m;
END;
$$;

-- Aprovar ou rejeitar (só admin). Aprovar publica no exercício; a mídia
-- anterior continua no ar até este momento.
CREATE OR REPLACE FUNCTION public.b_media_review(p_media_id UUID, p_decision TEXT)
RETURNS public.b_media
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    m public.b_media;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Só administradores aprovam mídias' USING ERRCODE = '42501';
    END IF;
    IF p_decision NOT IN ('aprovada', 'rejeitada') THEN
        RAISE EXCEPTION 'Decisão inválida' USING ERRCODE = '22023';
    END IF;

    UPDATE public.b_media
    SET status = p_decision, reviewed_by = auth.uid(), reviewed_at = now()
    WHERE id = p_media_id AND status IN ('pendente', 'aprovada', 'rejeitada')
    RETURNING * INTO m;
    IF m.id IS NULL THEN
        RAISE EXCEPTION 'Mídia não encontrada ou ainda em geração' USING ERRCODE = 'P0002';
    END IF;

    IF p_decision = 'aprovada' THEN
        PERFORM public.b_media_apply(m.id);
    END IF;
    RETURN m;
END;
$$;

-- Exercício criado pelo Coach. Entra direto na base, sem imagem (o app mostra a
-- silhueta padrão até a imagem ser aprovada). Se já existe um exercício com o
-- mesmo nome, devolve o existente. Limite de 3 por dia para quem não é admin.
CREATE OR REPLACE FUNCTION public.b_create_ai_exercise(p_data JSONB)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_name TEXT := btrim(regexp_replace(COALESCE(p_data->>'name', ''), '\s+', ' ', 'g'));
    v_equipment TEXT := left(btrim(COALESCE(NULLIF(p_data->>'equipment', ''), 'Peso do corpo')), 60);
    v_groups TEXT[];
    v_instructions TEXT[];
    v_key TEXT;
    v_existing RECORD;
    v_id UUID;
    recent INTEGER;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Sessão expirada' USING ERRCODE = '28000';
    END IF;
    IF length(v_name) < 3 OR length(v_name) > 80 THEN
        RAISE EXCEPTION 'Nome do exercício inválido' USING ERRCODE = '22023';
    END IF;

    SELECT id, name INTO v_existing FROM public.b_exercises
    WHERE lower(name) = lower(v_name) LIMIT 1;
    IF v_existing.id IS NOT NULL THEN
        RETURN jsonb_build_object('id', v_existing.id, 'name', v_existing.name, 'existing', true);
    END IF;

    IF NOT public.is_admin() THEN
        -- Pedidos simultâneos do mesmo usuário esperam a vez: o limite vale em paralelo.
        PERFORM pg_advisory_xact_lock(2002, hashtext(auth.uid()::text));
        SELECT count(*) INTO recent FROM public.b_exercises
        WHERE created_by = auth.uid() AND created_by_ai AND created_at > now() - INTERVAL '1 day';
        IF recent >= 3 THEN
            RAISE EXCEPTION 'Limite diário de exercícios novos atingido' USING ERRCODE = '54000';
        END IF;
    END IF;

    -- Só nomes de músculo padrão (b_muscles), mais Cardio e Corpo Todo; o
    -- primeiro é o principal.
    SELECT array_agg(g ORDER BY pos) INTO v_groups
    FROM (
        SELECT DISTINCT ON (g) g, pos
        FROM jsonb_array_elements_text(COALESCE(p_data->'muscle_groups', '[]'::jsonb)) WITH ORDINALITY AS t(g, pos)
        WHERE g IN (SELECT nome FROM public.b_muscles) OR g IN ('Cardio', 'Corpo Todo')
        ORDER BY g, pos
    ) s;
    IF COALESCE(array_length(v_groups, 1), 0) = 0 THEN
        RAISE EXCEPTION 'Informe ao menos um músculo da lista padrão' USING ERRCODE = '22023';
    END IF;

    SELECT array_agg(left(btrim(i), 300) ORDER BY pos) INTO v_instructions
    FROM jsonb_array_elements_text(COALESCE(p_data->'instructions', '[]'::jsonb)) WITH ORDINALITY AS t(i, pos)
    WHERE btrim(i) <> '' AND pos <= 8;

    v_key := trim(both '_' FROM regexp_replace(
        lower(translate(v_name,
            'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
            'aaaaaeeeeiiiiooooouuuucaaaaaeeeeiiiiooooouuuuc')),
        '[^a-z0-9]+', '_', 'g'));
    IF EXISTS (SELECT 1 FROM public.b_exercises WHERE exercise_key = v_key) THEN
        v_key := v_key || '_' || substr(md5(random()::text), 1, 5);
    END IF;

    INSERT INTO public.b_exercises (exercise_key, name, muscle_group, muscle_groups, equipment,
                                    instructions, tags, created_by_ai, created_by)
    VALUES (v_key, v_name, v_groups[1], v_groups, v_equipment,
            COALESCE(v_instructions, '{}'), ARRAY['IA'], true, auth.uid())
    RETURNING id INTO v_id;

    RETURN jsonb_build_object('id', v_id, 'name', v_name, 'existing', false);
END;
$$;

-- Permissões: as funções internas não ficam expostas na API.
REVOKE EXECUTE ON FUNCTION public.b_media_apply(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.b_media_check_access(TEXT, UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.b_media_submit(TEXT, UUID, TEXT, TEXT, TEXT[], TEXT[], TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.b_media_reserve(TEXT, UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.b_media_finish_job(UUID, TEXT, TEXT[], TEXT[], TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.b_media_review(UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.b_create_ai_exercise(JSONB) FROM PUBLIC;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        REVOKE EXECUTE ON FUNCTION public.b_media_apply(UUID) FROM anon;
        REVOKE EXECUTE ON FUNCTION public.b_media_check_access(TEXT, UUID, TEXT) FROM anon;
        REVOKE EXECUTE ON FUNCTION public.b_media_submit(TEXT, UUID, TEXT, TEXT, TEXT[], TEXT[], TEXT, TEXT) FROM anon;
        REVOKE EXECUTE ON FUNCTION public.b_media_reserve(TEXT, UUID, TEXT, TEXT) FROM anon;
        REVOKE EXECUTE ON FUNCTION public.b_media_finish_job(UUID, TEXT, TEXT[], TEXT[], TEXT) FROM anon;
        REVOKE EXECUTE ON FUNCTION public.b_media_review(UUID, TEXT) FROM anon;
        REVOKE EXECUTE ON FUNCTION public.b_create_ai_exercise(JSONB) FROM anon;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        REVOKE EXECUTE ON FUNCTION public.b_media_apply(UUID) FROM authenticated;
        REVOKE EXECUTE ON FUNCTION public.b_media_check_access(TEXT, UUID, TEXT) FROM authenticated;
        GRANT EXECUTE ON FUNCTION public.b_media_submit(TEXT, UUID, TEXT, TEXT, TEXT[], TEXT[], TEXT, TEXT) TO authenticated;
        GRANT EXECUTE ON FUNCTION public.b_media_reserve(TEXT, UUID, TEXT, TEXT) TO authenticated;
        GRANT EXECUTE ON FUNCTION public.b_media_finish_job(UUID, TEXT, TEXT[], TEXT[], TEXT) TO authenticated;
        GRANT EXECUTE ON FUNCTION public.b_media_review(UUID, TEXT) TO authenticated;
        GRANT EXECUTE ON FUNCTION public.b_create_ai_exercise(JSONB) TO authenticated;
        GRANT EXECUTE ON FUNCTION public.b_media_approval_on() TO authenticated;
    END IF;
END;
$$;

-- Conferência: colunas novas, chave de aprovação e fila (vazia na primeira vez).
SELECT
    (SELECT count(*) FROM information_schema.columns
     WHERE table_name = 'b_exercises'
       AND column_name IN ('animation_url', 'animation_frames', 'created_by_ai', 'created_by')) AS colunas_novas,
    (SELECT value FROM public.b_app_settings WHERE key = 'media_approval') AS aprovacao_ligada,
    (SELECT count(*) FROM public.b_media) AS midias_na_fila;
