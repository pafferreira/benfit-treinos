-- ==============================================================================
-- FIX RLS: RECRIAÇÃO DE POLÍTICAS EXPLÍCITAS E ROBUSTAS
-- Motivo: Erro "new row violates RLS" em UPDATE.
-- Solução: Separar as políticas por operação (SELECT, UPDATE, INSERT) para evitar
--          conflitos de "ALL" e garantir o comportamento correto do WITH CHECK.
-- ==============================================================================

-- 1. Habilitar RLS (Garanta que está ativo)
ALTER TABLE public.b_users ENABLE ROW LEVEL SECURITY;

-- 2. Limpar políticas antigas que podem estar conflitando
DROP POLICY IF EXISTS "Users can manage own profile" ON public.b_users;
DROP POLICY IF EXISTS "Public Read All Users" ON public.b_users;
DROP POLICY IF EXISTS "Public Read Users" ON public.b_users;
DROP POLICY IF EXISTS "Users can view own profile" ON public.b_users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.b_users;
DROP POLICY IF EXISTS "users_can_update_own_profile" ON public.b_users; -- Limpeza preventiva
DROP POLICY IF EXISTS "users_can_insert_own_profile" ON public.b_users; -- Limpeza preventiva
DROP POLICY IF EXISTS "public_read_users" ON public.b_users; -- Limpeza preventiva


-- 3. CRIAR POLÍTICAS NOVAS (Explícitas e Seguras)

-- A. LEITURA PÚBLICA (SELECT)
-- Permite que qualquer um (anon ou authenticated) leia dados básicos (nome, avatar, coach).
-- Necessário para listagens de ranking, ver perfil do coach, etc.
CREATE POLICY "public_read_users" ON public.b_users
    FOR SELECT
    USING (true);


-- B. ATUALIZAÇÃO PELO DONO (UPDATE)
-- Permite que o usuário autenticado atualize APENAS o seu próprio registro.
-- O USING garante que ele só "encontre" a linha dele.
-- O WITH CHECK garante que ele não tente mudar o ID para outro usuário (roubo de identidade).
CREATE POLICY "users_can_update_own_profile" ON public.b_users
    FOR UPDATE
    TO authenticated
    USING ((select auth.uid()) = id)
    WITH CHECK ((select auth.uid()) = id);


-- C. INSERÇÃO PELO DONO (INSERT)
-- Permite que o usuário insira seu próprio perfil (geralmente no primeiro login/cadastro).
-- O WITH CHECK garante que ele só crie um perfil com o SEU PRÓPRIO ID de autenticação.
CREATE POLICY "users_can_insert_own_profile" ON public.b_users
    FOR INSERT
    TO authenticated
    WITH CHECK ((select auth.uid()) = id);


-- 4. Garantir permissões de nível de tabela (Grants)
GRANT ALL ON TABLE public.b_users TO authenticated;
GRANT SELECT ON TABLE public.b_users TO anon; -- Anon só pode ler (via policy SELECT)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon;
