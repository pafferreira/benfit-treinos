# BENFIT TREINOS - GUIA DE CONFIGURAÇÃO DO BANCO DE DADOS SUPABASE

## 📋 Arquivos Criados

Este guia explica como usar os arquivos SQL criados para configurar o banco de dados do projeto Benfit Treinos no Supabase.

### Arquivos Disponíveis:

1. **supabase_database_script.sql** - Script principal de criação do schema
2. **supabase_data_population.sql** - Script de população de dados iniciais
3. **SUPABASE_DATABASE_DOCUMENTATION.txt** - Documentação completa do banco

---

## 🚀 Passo a Passo de Instalação

### 1. Acesse o Supabase

1. Acesse [https://supabase.com](https://supabase.com)
2. Faça login na sua conta
3. Selecione o projeto **benfit**

### 2. Execute o Script de Schema

1. No painel do Supabase, vá para **SQL Editor** (menu lateral)
2. Clique em **New Query**
3. Abra o arquivo `supabase_database_script.sql`
4. Copie todo o conteúdo
5. Cole no editor SQL do Supabase
6. Clique em **Run** (ou pressione Ctrl+Enter)
7. Aguarde a execução (pode levar alguns segundos)
8. Verifique se não há erros na saída

### 3. Execute o Script de População de Dados

1. Ainda no **SQL Editor**, crie uma **New Query**
2. Abra o arquivo `supabase_data_population.sql`
3. Copie todo o conteúdo
4. Cole no editor SQL
5. Clique em **Run**
6. Aguarde a execução

### 4. Verifique a Instalação

Execute as seguintes queries para verificar:

```sql
-- Verificar total de exercícios
SELECT COUNT(*) as total_exercises FROM B_Exercises;
-- Resultado esperado: 61 exercícios

-- Verificar exercícios por grupo muscular
SELECT muscle_group, COUNT(*) as count
FROM B_Exercises
GROUP BY muscle_group
ORDER BY count DESC;

-- Verificar treinos criados
SELECT * FROM B_Workouts;
-- Resultado esperado: 1 treino (wk_01)

-- Verificar estrutura completa do primeiro treino
SELECT w.title, wd.day_name, e.name, we.sets, we.reps
FROM B_Workout_Exercises we
JOIN B_Workout_Days wd ON we.workout_day_id = wd.id
JOIN B_Workouts w ON wd.workout_id = w.id
JOIN B_Exercises e ON we.exercise_id = e.id
WHERE w.workout_key = 'wk_01'
ORDER BY wd.day_number, we.order_index;
```

---

## 📊 Estrutura do Banco de Dados

### Tabelas Criadas (com prefixo B_):

1. **B_Users** - Usuários do sistema
2. **B_Exercises** - Biblioteca de exercícios (61 exercícios)
3. **B_Workouts** - Planos de treino
4. **B_Workout_Days** - Dias de treino dentro dos planos
5. **B_Workout_Exercises** - Exercícios prescritos para cada dia
6. **B_User_Assignments** - Atribuições de treino aos usuários
7. **B_Workout_Sessions** - Sessões de treino realizadas
8. **B_Session_Logs** - Logs detalhados de séries
9. **B_AI_Chat_History** - Histórico de conversas com AI Coach
10. **B_User_Progress** - Acompanhamento de progresso físico

---

## 🔐 Segurança (RLS)

O banco de dados já está configurado com **Row Level Security (RLS)** para:

- ✅ Usuários só podem ver seus próprios dados
- ✅ Exercícios e treinos públicos são visíveis para todos
- ✅ Sessões e logs são privados por usuário
- ✅ Histórico de chat é privado
- ✅ Progresso é privado

---

## 🔑 Configuração no Projeto React

Após criar o banco, você precisa configurar as credenciais no seu projeto:

### 1. Instale o cliente Supabase:

```bash
npm install @supabase/supabase-js
```

### 2. Obtenha as credenciais:

No Supabase, vá para **Settings** → **API**:
- Copie a **Project URL**
- Copie a **anon/public key**

### 3. Crie um arquivo `.env` na raiz do projeto:

```env
VITE_SUPABASE_URL=sua_project_url_aqui
VITE_SUPABASE_ANON_KEY=sua_anon_key_aqui
```

### 4. Crie o cliente Supabase:

Crie o arquivo `src/lib/supabase.js`:

```javascript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

---

## 📝 Próximos Passos

### 1. Popular os Treinos Restantes

O script de população incluiu apenas o **Treino 01**. Você precisa adicionar:
- Treino 02 (wk_02)
- Treino 03 (wk_03)

Você pode fazer isso:
- Manualmente via SQL (seguindo o padrão do script)
- Programaticamente via código React
- Através de um script de migração adicional

### 2. Implementar Autenticação

```javascript
// Exemplo de signup
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123',
})

// Exemplo de login
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123',
})
```

### 3. Buscar Exercícios

```javascript
// Buscar todos os exercícios
const { data: exercises, error } = await supabase
  .from('B_Exercises')
  .select('*')
  .order('name')

// Buscar por grupo muscular
const { data: exercises, error } = await supabase
  .from('B_Exercises')
  .select('*')
  .eq('muscle_group', 'Peito')
```

### 4. Buscar Treinos

```javascript
// Buscar todos os treinos públicos
const { data: workouts, error } = await supabase
  .from('B_Workouts')
  .select(`
    *,
    B_Workout_Days (
      *,
      B_Workout_Exercises (
        *,
        B_Exercises (*)
      )
    )
  `)
  .eq('is_public', true)
```

### 5. Registrar Sessão de Treino

```javascript
// Criar sessão
const { data: session, error } = await supabase
  .from('B_Workout_Sessions')
  .insert({
    user_id: userId,
    workout_id: workoutId,
    started_at: new Date().toISOString(),
  })
  .select()
  .single()

// Registrar série
const { data: log, error } = await supabase
  .from('B_Session_Logs')
  .insert({
    session_id: session.id,
    exercise_id: exerciseId,
    set_number: 1,
    weight_kg: 50,
    reps_completed: 12,
  })
```

---

## 🔍 Queries Úteis para o Dashboard

### Frequência (Últimos 7 dias):
```javascript
const { count } = await supabase
  .from('B_Workout_Sessions')
  .select('*', { count: 'exact', head: true })
  .eq('user_id', userId)
  .gte('started_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
```

### Calorias Totais:
```javascript
const { data } = await supabase
  .from('B_Workout_Sessions')
  .select('calories_burned')
  .eq('user_id', userId)

const totalCalories = data.reduce((sum, s) => sum + (s.calories_burned || 0), 0)
```

### Volume Total:
```javascript
const { data } = await supabase
  .from('B_Session_Logs')
  .select(`
    weight_kg,
    reps_completed,
    B_Workout_Sessions!inner(user_id)
  `)
  .eq('B_Workout_Sessions.user_id', userId)

const totalVolume = data.reduce((sum, log) => 
  sum + (log.weight_kg * log.reps_completed), 0
)
```

---

## 📚 Documentação Adicional

Para mais detalhes sobre a estrutura do banco, consulte:
- **SUPABASE_DATABASE_DOCUMENTATION.txt** - Documentação completa
- **DATABASE_SCHEMA.md** - Schema conceitual original

---

## ⚠️ Observações Importantes

1. **Backup**: Sempre faça backup antes de executar scripts em produção
2. **Ambiente**: Teste primeiro em um projeto de desenvolvimento
3. **UUIDs**: O Supabase gera UUIDs automaticamente
4. **RLS**: As políticas de segurança estão ativas, certifique-se de estar autenticado
5. **Índices**: Os índices já estão criados para otimizar consultas

---

## 🆘 Solução de Problemas

### Erro: "relation already exists"
- As tabelas já foram criadas. Delete-as primeiro ou use DROP TABLE IF EXISTS

### Erro: "permission denied"
- Verifique se você tem permissões de admin no projeto Supabase

### Erro ao inserir dados
- Verifique se o script de schema foi executado primeiro
- Confirme que não há conflitos de chave única

### RLS bloqueando queries
- Certifique-se de estar autenticado
- Verifique se o user_id corresponde ao usuário autenticado

---

## 📞 Suporte

Para dúvidas ou problemas:
1. Consulte a documentação do Supabase: https://supabase.com/docs
2. Revise o arquivo SUPABASE_DATABASE_DOCUMENTATION.txt
3. Verifique os logs de erro no SQL Editor do Supabase

---

**Criado em:** 2025-11-25  
**Projeto:** Benfit Treinos  
**Banco:** Supabase (PostgreSQL)
