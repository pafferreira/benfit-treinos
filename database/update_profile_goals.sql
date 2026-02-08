-- ==============================================================================
-- CORREÇÃO CRÍTICA PARA "ERRO DE RLS" E "CUSTOM AUTH"
-- Como a aplicação usa autenticação customizada (sem Supabase Auth tokens reais),
-- as políticas baseadas em auth.uid() FALHAM.
-- Precisamos liberar o acesso público (anon) às tabelas, confiando na lógica do Frontend.
-- ==============================================================================

-- 1. B_User_Goals (Metas)
CREATE TABLE IF NOT EXISTS B_User_Goals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL, -- Removida a FK estrita para auth.users para evitar erros se o user não existir no Auth
    title TEXT NOT NULL,
    description TEXT,
    deadline DATE,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- DESABILITAR RLS para permitir que o "Custom Auth" funcione sem tokens JWT
ALTER TABLE B_User_Goals DISABLE ROW LEVEL SECURITY;

-- (Opcional) Se quiser manter RLS habilitado, use esta política permissiva:
-- ALTER TABLE B_User_Goals ENABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "Public access to goals" ON B_User_Goals;
-- CREATE POLICY "Public access to goals" ON B_User_Goals FOR ALL USING (true);


-- 2. B_Users (Perfil)
-- Assegurar colunas
ALTER TABLE B_Users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE B_Users ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE B_Users ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE B_Users ADD COLUMN IF NOT EXISTS height_cm NUMERIC;
ALTER TABLE B_Users ADD COLUMN IF NOT EXISTS weight_kg NUMERIC;
ALTER TABLE B_Users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- DESABILITAR RLS no B_Users também para permitir atualização de perfil com Custom Auth
ALTER TABLE B_Users DISABLE ROW LEVEL SECURITY;


-- 3. Limpeza de Políticas Antigas (que causam o erro)
DROP POLICY IF EXISTS "Users can view their own goals" ON B_User_Goals;
DROP POLICY IF EXISTS "Users can create their own goals" ON B_User_Goals;
DROP POLICY IF EXISTS "Users can update their own goals" ON B_User_Goals;
DROP POLICY IF EXISTS "Users can delete their own goals" ON B_User_Goals;
DROP POLICY IF EXISTS "Users can update own profile" ON B_Users;
DROP POLICY IF EXISTS "Users can insert own profile" ON B_Users;

-- 4. Garantir permissões GRANT para a role 'anon' e 'authenticated' (usadas pela API)
GRANT ALL ON TABLE B_User_Goals TO anon, authenticated, service_role;
GRANT ALL ON TABLE B_Users TO anon, authenticated, service_role;

-- Se houver sequências, conceder uso também
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
