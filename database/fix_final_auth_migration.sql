-- ==============================================================================
-- FIX FINAL PARA MIGRAÇÃO DE USUÁRIO (V3)
-- Estratégia: "Renomear e Substituir"
-- 1. Se encontrar usuário legado, renomeia o email dele para liberar a constraint UNIQUE.
-- 2. Move os dados para o novo ID.
-- 3. Tenta deletar o legado. Se falhar por FK oculta, o usuário antigo fica lá (renomeado) e não bloqueia o novo.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    legacy_user_id UUID;
    legacy_email TEXT;
BEGIN
    -- 1. Buscar usuário legado pelo email
    SELECT id, email INTO legacy_user_id, legacy_email
    FROM public.b_users 
    WHERE email = new.email 
    LIMIT 1;

    IF legacy_user_id IS NOT NULL THEN
        -- RENAME: Mudar o email do antigo para evitar conflito de Unique Key imediato
        -- Isso garante que o INSERT do novo usuário (passo 4) não falhe por email duplicado
        UPDATE public.b_users 
        SET email = 'migrated_' || legacy_user_id || '_' || legacy_email
        WHERE id = legacy_user_id;

        -- MOVE DATA: Re-apontar todos os filhos conhecidos para o novo ID (new.id)
        
        -- Metas
        UPDATE public.b_user_goals SET user_id = new.id WHERE user_id = legacy_user_id;
        
        -- Treinos (Owner)
        UPDATE public.b_workouts SET creator_id = new.id WHERE creator_id = legacy_user_id;
        
        -- Sessões
        UPDATE public.b_workout_sessions SET user_id = new.id WHERE user_id = legacy_user_id;
        
        -- Chat History
        UPDATE public.b_ai_chat_history SET user_id = new.id WHERE user_id = legacy_user_id;

        -- DELETE: Tentar remover o usuário antigo
        -- Se houver outra tabela linkada que esquecemos, isso pode falhar.
        -- Vamos engolir o erro de delete se acontecer, para não bloquear o cadastro.
        BEGIN
            DELETE FROM public.b_users WHERE id = legacy_user_id;
        EXCEPTION WHEN OTHERS THEN
            -- Se falhar o delete, apenas ignoramos. O usuário antigo já está com email renomeado ('migrated_...')
            -- e não vai atrapalhar o login do novo usuário.
            RAISE WARNING 'Não foi possível deletar usuário legado %: %', legacy_user_id, SQLERRM;
        END;
    END IF;

    -- 4. Inserir/Atualizar o NOVO usuário em b_users
    INSERT INTO public.b_users (id, email, name, avatar_url, role)
    VALUES (
        new.id, 
        new.email, 
        COALESCE(new.raw_user_meta_data->>'name', 'Usuário'),
        COALESCE(new.raw_user_meta_data->>'avatar_url', ''),
        'user'
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        email = EXCLUDED.email, -- Garante que o email esteja correto
        name = COALESCE(EXCLUDED.name, public.b_users.name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, public.b_users.avatar_url),
        updated_at = now();

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 
-- SECURITY DEFINER é crucial para ter permissão de alterar tabelas públicas sendo chamado pelo Auth

-- Recriar Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Garantir Permissões
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.b_users TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.b_user_goals TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.b_workouts TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.b_workout_sessions TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.b_ai_chat_history TO postgres, anon, authenticated, service_role;
