---
name: manage_database
description: Diretrizes para modificar o banco de dados e atualizar a documentação
---

# Skill: Gerenciar Banco de Dados

Use esta skill quando precisar criar tabelas, alterar colunas ou corrigir dados no Supabase.

## Script de Migração
Os scripts SQL ficam na pasta `database/`.

## Fluxo de Trabalho
1. **Analise**: Antes de criar, verifique se a tabela já existe em `database/DATABASE_SCHEMA.md` ou nos arquivos `.sql`.
2. **Crie o Script**:
   - Crie um novo arquivo `.sql` em `database/` com um nome descritivo (ex: `add_users_table.sql`).
   - Escreva o SQL PostgreSQL válido.
   - Adicione políticas RLS (Row Level Security) sempre que criar uma tabela.
3. **Documente**:
   - Atualize `database/DATABASE_SCHEMA.md` com as novas alterações.
   - Se for uma mudança crítica, atualize o diagrama (se possível descrever a mudança).

## Padrões Supabase
- Use `auth.uid()` para RLS de usuário.
- Chaves primárias devem ser `id` (uuid ou bigint).
- Use `created_at` com `default now()`.
