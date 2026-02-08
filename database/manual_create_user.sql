-- ==============================================================================
-- BYPASS DE RATE LIMIT: CRIAR USUÁRIO VIA SQL
-- Use este script quando o Supabase bloquear o envio de emails ("rate limit exceeded").
-- Ele cria o usuário direto no banco, já confirmado e com senha definida.
-- ==============================================================================

-- 1. Habilitar extensão de criptografia (necessária para gerar o hash da senha)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Defina os dados do usuário aqui:
\set email 'novo_usuario@email.com'
\set password '123456'

-- 3. Inserir na tabela auth.users (Bypassing API e Email)
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token
)
VALUES (
    '00000000-0000-0000-0000-000000000000', -- Instance ID padrão
    gen_random_uuid(),                      -- Gera um novo ID
    'authenticated',                        -- Audience
    'authenticated',                        -- Role
    'seu_email_aqui@exemplo.com',           -- 🔴 TROQUE PELO EMAIL DESEJADO
    crypt('sua_senha_aqui', gen_salt('bf')),-- 🔴 TROQUE PELA SENHA DESEJADA
    now(),                                  -- Email já confirmado!
    '{"provider":"email","providers":["email"]}',
    '{"name": "Novo Usuário"}',             -- Metadados (Nome, etc)
    now(),
    now(),
    '',
    ''
);

-- NOTA: O Trigger `handle_new_user` que criamos antes vai rodar automaticamente
-- e criar o perfil em public.b_users para este novo login.
