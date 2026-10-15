-- Benfit v2, etapa 2D revisada: tela "Mídias Benfit".
-- A Biblioteca (tabela b_avatars, a antiga "Gerenciar Avatares") passa a
-- receber automaticamente toda imagem aprovada de exercício ou prato, para ela
-- aparecer na Galeria Benfit. Rodar inteiro no SQL Editor do Supabase.
-- Pode rodar de novo sem duplicar nada.

-- 1) Aprovar uma mídia também registra a imagem na Biblioteca ----------------
CREATE OR REPLACE FUNCTION public.b_media_apply(p_media_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    m public.b_media;
    v_name TEXT;
BEGIN
    SELECT * INTO m FROM public.b_media WHERE id = p_media_id;
    IF m.id IS NULL THEN
        RETURN;
    END IF;

    IF m.entity_type = 'dish' THEN
        IF m.kind = 'image' THEN
            UPDATE public.b_dishes SET image_url = m.url, updated_at = now() WHERE id = m.entity_id
            RETURNING name INTO v_name;
        END IF;
    ELSIF m.kind = 'image' THEN
        UPDATE public.b_exercises SET image_url = m.url, updated_at = now() WHERE id = m.entity_id
        RETURNING name INTO v_name;
    ELSIF m.kind = 'video' THEN
        UPDATE public.b_exercises SET animation_url = m.url, updated_at = now() WHERE id = m.entity_id;
    ELSIF m.kind = 'poses' THEN
        UPDATE public.b_exercises SET animation_frames = m.frames, updated_at = now() WHERE id = m.entity_id;
    END IF;

    -- Só imagens entram na Biblioteca (vídeo e poses ficam no exercício).
    IF m.kind = 'image' AND m.url IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM public.b_avatars WHERE public_url = m.url) THEN
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
    END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.b_media_apply(UUID) FROM PUBLIC;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        REVOKE EXECUTE ON FUNCTION public.b_media_apply(UUID) FROM authenticated;
    END IF;
END;
$$;

-- 2) Imagens já aprovadas antes desta query também entram na Biblioteca ------
INSERT INTO public.b_avatars (storage_path, public_url, name, category, tags, gender, is_active)
SELECT DISTINCT ON (m.url)
    COALESCE(m.storage_paths[1], m.url),
    m.url,
    COALESCE(e.name, d.name, 'Mídia da IA'),
    CASE WHEN m.entity_type = 'dish' THEN 'prato' ELSE 'exercicio' END,
    ARRAY['ia'],
    'neutral',
    true
FROM public.b_media m
LEFT JOIN public.b_exercises e ON m.entity_type = 'exercise' AND e.id = m.entity_id
LEFT JOIN public.b_dishes d ON m.entity_type = 'dish' AND d.id = m.entity_id
WHERE m.kind = 'image' AND m.status = 'aprovada' AND m.url IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.b_avatars a WHERE a.public_url = m.url)
ORDER BY m.url, m.created_at DESC;

-- Conferência: imagens da IA que já estão na Biblioteca.
SELECT
    (SELECT count(*) FROM public.b_avatars WHERE 'ia' = ANY(tags)) AS imagens_ia_na_biblioteca,
    (SELECT count(*) FROM public.b_avatars) AS total_na_biblioteca;
