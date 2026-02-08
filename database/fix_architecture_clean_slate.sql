-- ==============================================================================
-- CLEAN ARCHITECTURE & DATA NORMATIZATION
-- Objetivo: Corrigir definitivamente a arquitetura de Usuários e Perfis.
-- Padrão Supabase: auth.users (Login/Credenciais) <-> public.b_users (Perfil/Dados)
-- ==============================================================================

-- 1. IDENTIFICAR E CONSOLIDADAR DADOS (MIGRAÇÃO INTELIGENTE)
--    Muitos registros em b_users foram criados pelo sistema antigo (Fake Auth) 
--    e possuem IDs aleatórios que NÃO batem com o auth.users.
--    Vamos mover os dados (Treinos, Metas) desses "Fantasmas" para o User Real.

DO $$
DECLARE
    real_user RECORD;
    ghost_user RECORD;
BEGIN
    -- Para cada usuário REAL no sistema de Auth
    FOR real_user IN SELECT * FROM auth.users LOOP
        
        -- Procurar se existe um usuário "Fantasma" em b_users com o MESMO EMAIL
        -- mas com ID DIFERENTE (criado pelo sistema antigo).
        FOR ghost_user IN 
            SELECT * FROM public.b_users 
            WHERE email = real_user.email 
            AND id != real_user.id 
        LOOP
            RAISE NOTICE 'Migrando dados de Fantasma (%) para Real (%) - Email: %', ghost_user.id, real_user.id, real_user.email;

            -- A. MIGRAR DADOS FILHOS
            -- Move tudo que pertencia ao Fantasma para o Real
            UPDATE public.b_user_goals SET user_id = real_user.id WHERE user_id = ghost_user.id;
            UPDATE public.b_workouts SET creator_id = real_user.id WHERE creator_id = ghost_user.id;
            UPDATE public.b_workout_sessions SET user_id = real_user.id WHERE user_id = ghost_user.id;
            UPDATE public.b_ai_chat_history SET user_id = real_user.id WHERE user_id = ghost_user.id;

            -- B. DELETAR O FANTASMA
            -- Agora que ele não tem mais dados, podemos remover o perfil duplicado/incorreto.
            DELETE FROM public.b_users WHERE id = ghost_user.id;
        END LOOP;

        -- C. GARANTIR QUE O PERFIL REAL EXISTA
        -- Se o usuário real não tem perfil em b_users (porque o fantasma ocupava o email), criamos agora.
        INSERT INTO public.b_users (id, email, name, role, avatar_url)
        VALUES (
            real_user.id,
            real_user.email,
            COALESCE(real_user.raw_user_meta_data->>'name', 'Usuário'),
            'user',
            COALESCE(real_user.raw_user_meta_data->>'avatar_url', '')
        )
        ON CONFLICT (id) DO NOTHING;
        
    END LOOP;
END $$;


-- 2. ENFORÇAR INTEGRIDADE REFERENCIAL (HARDENING)
--    Agora que limpamos os dados, vamos travar a tabela para impedir que isso aconteça de novo.
--    O ID de b_users DEVE ser obrigatoriamente um ID válido de auth.users.

-- Remover constraint antiga se existir (para evitar erros)
ALTER TABLE public.b_users DROP CONSTRAINT IF EXISTS b_users_id_fkey;

-- Adicionar Constraint Estrita: Só pode existir b_user se existir auth.user
ALTER TABLE public.b_users
    ADD CONSTRAINT b_users_id_fkey
    FOREIGN KEY (id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE; -- Se apagar o Login, apaga o Perfil automaticamente.


-- 3. REVISÃO DO TRIGGER DE CRIAÇÃO (SIMPLES E DIRETO)
--    Não precisamos mais de lógica de migração complexa no trigger, pois já limpamos a base.
--    O trigger deve apenas criar o perfil.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
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

-- Reaplicar Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 4. POLÍTICAS DE SEGURANÇA (CONFIRMAÇÃO FINAL)
--    Garantir que as regras de acesso estejam perfeitas.

ALTER TABLE public.b_users ENABLE ROW LEVEL SECURITY;

-- Leitura Pública
DROP POLICY IF EXISTS "public_read_users" ON public.b_users;
CREATE POLICY "public_read_users" ON public.b_users FOR SELECT USING (true);

-- Edição pelo Dono
DROP POLICY IF EXISTS "users_can_update_own_profile" ON public.b_users;
CREATE POLICY "users_can_update_own_profile" ON public.b_users
    FOR UPDATE TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Inserção pelo Dono (para Trigger ou Cadastro direto)
DROP POLICY IF EXISTS "users_can_insert_own_profile" ON public.b_users;
CREATE POLICY "users_can_insert_own_profile" ON public.b_users
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = id);
