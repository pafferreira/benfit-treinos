-- Benfit v2, etapa 2D: excluir mídia rejeitada, que falhou ou aprovada fora de uso.
-- Apaga o registro da fila (e a imagem da Biblioteca) e devolve os caminhos dos
-- arquivos para o app apagar do Storage. Recusa se a mídia estiver publicada.
-- Rodar inteiro no SQL Editor do Supabase; pode rodar de novo.

CREATE OR REPLACE FUNCTION public.b_media_delete(p_media_id UUID)
RETURNS TEXT[]
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    m public.b_media;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Só administradores excluem mídias' USING ERRCODE = '42501';
    END IF;
    SELECT * INTO m FROM public.b_media WHERE id = p_media_id;
    IF m.id IS NULL THEN
        RAISE EXCEPTION 'Mídia não encontrada' USING ERRCODE = 'P0002';
    END IF;
    IF m.status NOT IN ('rejeitada', 'aprovada', 'falhou') THEN
        RAISE EXCEPTION 'Só dá para excluir mídia rejeitada, aprovada ou que falhou' USING ERRCODE = '55000';
    END IF;
    IF (m.url IS NOT NULL AND (
            EXISTS (SELECT 1 FROM public.b_exercises WHERE image_url = m.url OR animation_url = m.url)
            OR EXISTS (SELECT 1 FROM public.b_dishes WHERE image_url = m.url)))
       OR (m.frames IS NOT NULL AND cardinality(m.frames) > 0
           AND EXISTS (SELECT 1 FROM public.b_exercises WHERE animation_frames && m.frames)) THEN
        RAISE EXCEPTION 'Esta mídia está em uso. Publique outra antes de excluir.' USING ERRCODE = '55000';
    END IF;

    IF m.url IS NOT NULL THEN
        DELETE FROM public.b_avatars WHERE public_url = m.url;
    END IF;
    DELETE FROM public.b_media WHERE id = m.id;
    RETURN COALESCE(m.storage_paths, ARRAY[]::TEXT[]);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.b_media_delete(UUID) FROM PUBLIC;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        REVOKE EXECUTE ON FUNCTION public.b_media_delete(UUID) FROM anon;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        GRANT EXECUTE ON FUNCTION public.b_media_delete(UUID) TO authenticated;
    END IF;
END;
$$;

NOTIFY pgrst, 'reload schema';

-- Conferência: deve mostrar b_media_delete.
SELECT p.proname AS funcao, pg_get_function_identity_arguments(p.oid) AS parametros
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'b_media_delete';
