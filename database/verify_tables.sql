-- ============================================================
-- VERIFICAR TABELAS EXISTENTES NO SUPABASE
-- Execute este script para ver quais tabelas com prefixo B_ existem
-- ============================================================

-- Listar todas as tabelas que começam com B_
SELECT 
    tablename,
    schemaname
FROM 
    pg_tables 
WHERE 
    schemaname = 'public' 
    AND (tablename LIKE 'B_%' OR tablename LIKE 'b_%')
ORDER BY 
    tablename;

-- Listar todos os índices que começam com idx_b_
SELECT 
    indexname,
    tablename
FROM 
    pg_indexes 
WHERE 
    schemaname = 'public' 
    AND (indexname LIKE 'idx_b_%' OR indexname LIKE 'idx_B_%')
ORDER BY 
    indexname;
