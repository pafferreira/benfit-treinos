-- ==============================================================================
-- FIX RLS: PERMISSÕES PARA UPDATE/UPSERT DE AVATAR
-- O erro "new row violates row-level security policy" indica que a política de INSERT ou UPDATE está falhando.
-- Vamos recriar as políticas de b_users de forma explícita e robusta.
-- ==============================================================================

-- 1. Resetar políticas de b_users
ALTER TABLE b_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read Users" ON b_users;
DROP POLICY IF EXISTS "Users can update own profile" ON b_users;
DROP POLICY IF EXISTS "Users can insert own profile" ON b_users;
DROP POLICY IF EXISTS "Users can all own profile" ON b_users; -- Limpeza extra

-- 2. Criar Política "Faz-Tudo" para o Dono (INSERT, UPDATE, DELETE, SELECT)
-- Simplifica a verificação: Se o ID bate com o auth.uid(), permite tudo.
CREATE POLICY "Users can manage own profile" ON b_users
    FOR ALL
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- 3. Criar Política de Leitura Pública (Manter para ver coaches, etc)
-- SELECT precisa de uma política separada pois a "manage own" restringe a visão apenas ao dono.
CREATE POLICY "Public Read All Users" ON b_users
    FOR SELECT
    USING (true);

-- 4. Garantir Grants (Permissões de nível de tabela)
GRANT ALL ON TABLE b_users TO authenticated;
GRANT ALL ON TABLE b_users TO anon; -- Necessário se houver fallbacks, mas RLS protege.
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon;

-- 5. Verificar e corrigir trigger (caso o avatar tenha vindo com URL estranha)
-- Opcional: Nada a fazer aqui, o erro é RLS.

-- NOTA: O 'upsert' tenta INSERT se não existir, ou UPDATE se existir.
-- Com a política "Users can manage own profile" (FOR ALL), ambas operações são cobertas
-- desde que o ID enviado no upsert seja igual ao ID do usuário logado.
