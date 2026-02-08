-- ==============================================================================
-- CORREÇÃO CRÍTICA DO TRIGGER DE AUTH
-- Objetivo: Corrigir o erro "Database error saving new user" ao tentar cadastrar.
-- Causa: O trigger simplificado tentava inserir um email que já existia na tabela b_users (conflito).
-- Solução: Restaurar a lógica de MIGRAÇÃO INTELIGENTE para vincular dados antigos à nova conta.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    legacy_user_id UUID;
BEGIN
    -- 1. Verificar se já existe um usuário "legado" com este mesmo email
    --    (Criado pelo sistema antigo de login sem senha real)
    SELECT id INTO legacy_user_id 
    FROM public.b_users 
    WHERE email = new.email 
    LIMIT 1;

    IF legacy_user_id IS NOT NULL THEN
        -- USUÁRIO LEGADO ENCONTRADO! Vamos migrar os dados para a nova conta segura.
        -- Precisamos atualizar as chaves estrangeiras nas tabelas filhas para apontar para o novo ID (new.id)
        
        -- Migrar Metas
        UPDATE public.b_user_goals 
        SET user_id = new.id 
        WHERE user_id = legacy_user_id;

        -- Migrar Treinos (Criador)
        UPDATE public.b_workouts 
        SET creator_id = new.id 
        WHERE creator_id = legacy_user_id;

        -- Migrar Sessões de Treino
        UPDATE public.b_workout_sessions 
        SET user_id = new.id 
        WHERE user_id = legacy_user_id;

        -- Migrar Logs de Sessão 
        -- (Nota: Logs geralmente não têm user_id direto, dependem da sessão, mas se tiverem, migraria aqui)
        
        -- Migrar Histórico de Chat
        UPDATE public.b_ai_chat_history 
        SET user_id = new.id 
        WHERE user_id = legacy_user_id;

        -- 2. Deletar o registro de usuário legado antigo
        --    Agora que os dados filhos foram movidos, podemos remover o pai antigo sem violar FKs.
        DELETE FROM public.b_users 
        WHERE id = legacy_user_id;
        
    END IF;

    -- 3. Inserir o NOVO usuário na tabela b_users (Agora seguro e vinculado ao Auth)
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
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        avatar_url = EXCLUDED.avatar_url;

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-associar a Trigger (para garantir)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
