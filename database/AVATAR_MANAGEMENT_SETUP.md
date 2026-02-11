# Aplicar Políticas RLS para Gerenciamento de Avatares

## Objetivo
Adicionar políticas de segurança (Row Level Security) para permitir que usuários autenticados possam criar, editar e deletar avatares na tabela `B_Avatars`.

## Passos para Aplicação

### 1. Acessar o Supabase Dashboard
1. Acesse https://app.supabase.com
2. Selecione o projeto **benfit-treinos**
3. Navegue até **SQL Editor** no menu lateral

### 2. Executar a Migração
Copie e cole o conteúdo do arquivo `add_avatar_management_policies.sql` no editor SQL e execute.

Ou execute diretamente o seguinte SQL:

```sql
-- Add policies for authenticated users to INSERT, UPDATE, DELETE avatars
CREATE POLICY "Authenticated users can insert avatars" ON B_Avatars
    FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update avatars" ON B_Avatars
    FOR UPDATE 
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete avatars" ON B_Avatars
    FOR DELETE 
    USING (auth.role() = 'authenticated');
```

### 3. Verificar Aplicação
Após executar, verifique se as políticas foram criadas:
1. Vá em **Database** > **Policies**
2. Selecione a tabela `b_avatars`
3. Você deve ver 4 políticas no total:
   - "Anyone can view avatars" (SELECT - público)
   - "Authenticated users can insert avatars" (INSERT)
   - "Authenticated users can update avatars" (UPDATE)
   - "Authenticated users can delete avatars" (DELETE)

## Funcionalidade Implementada

Com estas políticas aplicadas, a funcionalidade de **Gerenciar Avatares** estará totalmente operacional:

### Acesso
- Menu: **Perfil** → **Aplicativo** → **Gerenciar Avatares**

### Recursos
- ✅ **Visualizar** todos os avatares existentes
- ✅ **Criar** novos avatares
- ✅ **Editar** avatares existentes
- ✅ **Deletar** avatares (com confirmação)

### Campos do Avatar
- **Nome**: Identificação do avatar
- **URL da Imagem**: Caminho local (`/avatar.png`) ou URL externa (HTTPS)
- **Categoria**: 3D, Real, Avatar, exercicio, etc.
- **Gênero**: male, female, neutral
- **Tags**: Array de palavras-chave para busca
- **Status**: Ativo/Inativo (controla visibilidade)

## Troubleshooting

### Erro: "new row violates row-level security policy"
**Causa**: As políticas RLS ainda não foram aplicadas.
**Solução**: Execute o script SQL acima no SQL Editor do Supabase.

### Erro: "permission denied for table b_avatars"
**Causa**: Usuário não está autenticado.
**Solução**: Faça login no aplicativo antes de tentar gerenciar avatares.

### Avatares não aparecem na lista
**Causa**: Campo `is_active` pode estar como `false`.
**Solução**: No modal de edição, certifique-se que o toggle "Avatar Ativo" está ligado.

## Observações
- Qualquer pessoa pode **visualizar** avatares (útil para tela de login)
- Apenas usuários **autenticados** podem criar/editar/deletar
- Para adicionar permissões mais granulares (ex: apenas admins), modifique as políticas usando `auth.jwt() ->> 'role'`
