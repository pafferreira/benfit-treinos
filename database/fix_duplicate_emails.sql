-- ==============================================================================
-- FIX DUPLICATE EMAILS (CONSTRAINT VIOLATION)
-- Motivo: Erro "duplicate key value violates unique constraint" ao editar perfil.
-- Causa: Existe um usuário "Fantasma/Legado" na tabela b_users ocupando o seu email,
--        mas com um ID diferente do seu login atual.
-- Solução: Encontrar esses duplicados e renomear o email do antigo para liberar o seu.
-- ==============================================================================

DO $$
DECLARE
    r RECORD;
BEGIN
    -- Loop para encontrar emails duplicados ou conflitantes
    -- (Onde existe um registro em b_users que NÃO bate com o ID do auth.users mas tem o mesmo email)
    FOR r IN 
        SELECT b.id AS legacy_id, b.email, a.id AS auth_id
        FROM public.b_users b
        JOIN auth.users a ON b.email = a.email
        WHERE b.id != a.id -- O ID do perfil é diferente do ID do login
    LOOP
        -- 1. Renomear o email do usuário legado conflitante
        UPDATE public.b_users
        SET email = 'duplicated_' || r.legacy_id || '_' || r.email
        WHERE id = r.legacy_id;
        
        -- 2. Migrar os dados dele para o usuário correto (o do Auth)
        --    (Caso o trigger não tenha pego tudo anteriormente)
        UPDATE public.b_user_goals SET user_id = r.auth_id WHERE user_id = r.legacy_id;
        UPDATE public.b_workouts SET creator_id = r.auth_id WHERE creator_id = r.legacy_id;
        UPDATE public.b_workout_sessions SET user_id = r.auth_id WHERE user_id = r.legacy_id;
        UPDATE public.b_ai_chat_history SET user_id = r.auth_id WHERE user_id = r.legacy_id;

        -- 3. Inserir/Atualizar o registro correto em b_users para garantir que ele exista
        INSERT INTO public.b_users (id, email, name, role)
        SELECT 
            id, 
            email, 
            COALESCE(raw_user_meta_data->>'name', 'Usuário'),
            'user'
        FROM auth.users
        WHERE id = r.auth_id
        ON CONFLICT (id) DO UPDATE 
        SET email = EXCLUDED.email; -- Garante o email certo

        RAISE NOTICE 'Corrigido conflito para email: %. Antigo ID: %, Novo ID: %', r.email, r.legacy_id, r.auth_id;
    END LOOP;
END $$;
