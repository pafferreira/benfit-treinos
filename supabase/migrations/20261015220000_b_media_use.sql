-- Benfit v2, etapa 2D: o admin decide se a mídia aprovada vai para o item.
-- "Aprovar e usar" publica no exercício ou prato; "Aprovar sem usar" só guarda
-- (imagem entra na Biblioteca). Depois, no Histórico, "Usar" publica qualquer
-- mídia aprovada. Rodar inteiro no SQL Editor do Supabase; pode rodar de novo.

-- 1) Guardar imagem aprovada na Biblioteca (b_avatars), sem publicar no item --
CREATE OR REPLACE FUNCTION public.b_media_to_library(p_media_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    m public.b_media;
    v_name TEXT;
BEGIN
    SELECT * INTO m FROM public.b_media WHERE id = p_media_id;
    IF m.id IS NULL OR m.kind <> 'image' OR m.url IS NULL THEN
        RETURN;
    END IF;
    IF EXISTS (SELECT 1 FROM public.b_avatars WHERE public_url = m.url) THEN
        RETURN;
    END IF;
    IF m.entity_type = 'dish' THEN
        SELECT name INTO v_name FROM public.b_dishes WHERE id = m.entity_id;
    ELSE
        SELECT name INTO v_name FROM public.b_exercises WHERE id = m.entity_id;
    END IF;
    INSERT INTO public.b_avatars (storage_path, public_url, name, category, tags, gender, is_active)
    VALUES (
        COALESCE(m.storage_paths[1], m.url),
        m.url,
        COALESCE(v_name, 'Mídia da IA'),
        CASE WHEN m.entity_type = 'dish' THEN 'prato' ELSE 'exercicio' END,
        ARRAY['ia'],
        'neutral',
        true
    );
END;
$$;

-- 2) Publicar no item (e guardar na Biblioteca) -------------------------------
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
    ELSIF m.kind = 'image' THEN
        UPDATE public.b_exercises SET image_url = m.url, updated_at = now() WHERE id = m.entity_id;
    ELSIF m.kind = 'video' THEN
        UPDATE public.b_exercises SET animation_url = m.url, updated_at = now() WHERE id = m.entity_id;
    ELSIF m.kind = 'poses' THEN
        UPDATE public.b_exercises SET animation_frames = m.frames, updated_at = now() WHERE id = m.entity_id;
    END IF;

    PERFORM public.b_media_to_library(m.id);
END;
$$;

-- 3) Aprovar (usando ou não no item) ou rejeitar -----------------------------
DROP FUNCTION IF EXISTS public.b_media_review(UUID, TEXT);
CREATE OR REPLACE FUNCTION public.b_media_review(p_media_id UUID, p_decision TEXT, p_use BOOLEAN DEFAULT true)
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
        IF p_use THEN
            PERFORM public.b_media_apply(m.id);
        ELSE
            PERFORM public.b_media_to_library(m.id);
        END IF;
    END IF;
    RETURN m;
END;
$$;

-- 4) Usar no item uma mídia já aprovada (Histórico) --------------------------
CREATE OR REPLACE FUNCTION public.b_media_use(p_media_id UUID)
RETURNS public.b_media
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    m public.b_media;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Só administradores publicam mídias' USING ERRCODE = '42501';
    END IF;
    SELECT * INTO m FROM public.b_media WHERE id = p_media_id;
    IF m.id IS NULL OR m.status <> 'aprovada' THEN
        RAISE EXCEPTION 'Só mídias aprovadas podem ser usadas' USING ERRCODE = 'P0002';
    END IF;
    PERFORM public.b_media_apply(m.id);
    RETURN m;
END;
$$;

-- Permissões: as internas ficam fora da API; review e use só para logados (checam admin).
REVOKE EXECUTE ON FUNCTION public.b_media_to_library(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.b_media_apply(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.b_media_review(UUID, TEXT, BOOLEAN) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.b_media_use(UUID) FROM PUBLIC;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        REVOKE EXECUTE ON FUNCTION public.b_media_to_library(UUID) FROM anon;
        REVOKE EXECUTE ON FUNCTION public.b_media_apply(UUID) FROM anon;
        REVOKE EXECUTE ON FUNCTION public.b_media_review(UUID, TEXT, BOOLEAN) FROM anon;
        REVOKE EXECUTE ON FUNCTION public.b_media_use(UUID) FROM anon;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        REVOKE EXECUTE ON FUNCTION public.b_media_to_library(UUID) FROM authenticated;
        REVOKE EXECUTE ON FUNCTION public.b_media_apply(UUID) FROM authenticated;
        GRANT EXECUTE ON FUNCTION public.b_media_review(UUID, TEXT, BOOLEAN) TO authenticated;
        GRANT EXECUTE ON FUNCTION public.b_media_use(UUID) TO authenticated;
    END IF;
END;
$$;

-- Avisa a API do Supabase das funções novas.
NOTIFY pgrst, 'reload schema';

-- Conferência: deve listar b_media_review (3 parâmetros), b_media_use e b_media_to_library.
SELECT p.proname AS funcao, pg_get_function_identity_arguments(p.oid) AS parametros
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname IN ('b_media_review', 'b_media_use', 'b_media_to_library')
ORDER BY 1;
