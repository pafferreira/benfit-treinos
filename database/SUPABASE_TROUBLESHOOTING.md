# 🔧 SUPABASE TROUBLESHOOTING GUIDE

## ❌ Erro: "Could not find the table 'public.B_Exercises' in the schema cache"

Este erro significa que as tabelas ainda não foram criadas no Supabase.

---

## 🛠️ SOLUÇÃO RÁPIDA

### 1️⃣ Acesse a Página de Diagnóstico

Abra no navegador:
```
http://localhost:5173/diagnostic
```

Clique em **"Run Diagnostic"** para ver o status de todas as tabelas.

### 2️⃣ Verifique o Console do Navegador

Abra o DevTools (F12) e vá para a aba **Console**.

Você verá uma das seguintes mensagens:

#### ✅ Se estiver conectado:
```
✅ Supabase connected successfully!
📊 Found X exercises in B_Exercises table
```

#### ❌ Se houver erro:
```
❌ Supabase connection error: Could not find the table...
💡 Make sure you have executed the SQL scripts in Supabase Dashboard
📁 Scripts location: database/supabase_database_script.sql
```

---

## 📋 CHECKLIST DE VERIFICAÇÃO

### ✅ 1. Credenciais Configuradas

Verifique o arquivo `.env`:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-aqui
```

**Como obter:**
1. Acesse https://supabase.com/dashboard
2. Selecione o projeto "benfit"
3. Vá em **Settings** → **API**
4. Copie:
   - **Project URL** → VITE_SUPABASE_URL
   - **anon/public key** → VITE_SUPABASE_ANON_KEY

### ✅ 2. Scripts SQL Executados

**Você DEVE executar os scripts SQL no Supabase Dashboard:**

#### Script 1: Criar Tabelas
1. Acesse: https://supabase.com/dashboard/project/SEU_PROJETO/sql
2. Clique em **"New Query"**
3. Abra: `database/supabase_database_script.sql`
4. Copie TODO o conteúdo
5. Cole no editor
6. Clique em **"Run"** (Ctrl+Enter)
7. Aguarde até ver "Success"

#### Script 2: Popular Dados
1. Clique em **"New Query"** novamente
2. Abra: `database/supabase_data_population.sql`
3. Copie TODO o conteúdo
4. Cole no editor
5. Clique em **"Run"**
6. Aguarde até ver "Success"

### ✅ 3. Verificar Tabelas Criadas

No Supabase Dashboard:
1. Vá para **Table Editor** (menu lateral)
2. Você deve ver 10 tabelas:
   - B_Users
   - B_Exercises ← **Esta é a que está faltando!**
   - B_Workouts
   - B_Workout_Days
   - B_Workout_Exercises
   - B_User_Assignments
   - B_Workout_Sessions
   - B_Session_Logs
   - B_AI_Chat_History
   - B_User_Progress

### ✅ 4. Verificar Dados Populados

Clique em **B_Exercises**:
- Deve ter **61 linhas**
- Se estiver vazio, execute o script de população novamente

### ✅ 5. Reiniciar Servidor

Depois de executar os scripts:
```bash
# Parar o servidor (Ctrl+C)
npm run dev
```

---

## 🔍 DIAGNÓSTICO DETALHADO

### Verificar Logs no Console

O código agora mostra logs detalhados:

```javascript
🔄 Loading exercises from Supabase...
❌ Error loading exercises from Supabase: [erro]
Error code: [código]
Error message: [mensagem]
Error details: [detalhes]
🔄 Falling back to local data...
✅ Loaded 61 exercises from local data
```

### Códigos de Erro Comuns

| Código | Significado | Solução |
|--------|-------------|---------|
| `PGRST116` | Tabela não encontrada | Execute os scripts SQL |
| `42P01` | Tabela não existe | Execute os scripts SQL |
| `401` | Credenciais inválidas | Verifique o .env |
| `CORS` | Problema de CORS | Verifique a URL no .env |

---

## 🎯 TESTE RÁPIDO

### Opção 1: Via Página de Diagnóstico
```
http://localhost:5173/diagnostic
```

### Opção 2: Via Console do Navegador

Cole este código no console (F12):

```javascript
// Testar conexão
const { data, error } = await supabase
  .from('B_Exercises')
  .select('count', { count: 'exact', head: true });

if (error) {
  console.error('❌ Erro:', error);
} else {
  console.log('✅ Sucesso! Exercícios:', data);
}
```

---

## 📊 COMPORTAMENTO ESPERADO

### ✅ Com Supabase Configurado Corretamente:
1. Página carrega
2. Mostra spinner de loading
3. Console mostra: "✅ Supabase connected successfully!"
4. Dados aparecem na tela
5. Sem mensagens de erro

### ⚠️ Sem Tabelas Criadas:
1. Página carrega
2. Mostra spinner de loading
3. Console mostra erro detalhado
4. Mensagem de erro na tela
5. Dados locais carregados automaticamente (fallback)

---

## 🚀 PRÓXIMOS PASSOS APÓS RESOLVER

1. ✅ Verificar que os dados carregam do Supabase
2. ✅ Testar filtros e busca
3. ✅ Verificar página de treinos
4. ✅ Implementar autenticação (próximo passo)

---

## 💡 DICAS

### Dica 1: Verificar Schema
As tabelas devem estar no schema `public` (padrão do Supabase).

### Dica 2: Case Sensitive
Os nomes das tabelas são case-sensitive:
- ✅ `B_Exercises` (correto)
- ❌ `b_exercises` (errado)
- ❌ `B_exercises` (errado)

### Dica 3: Limpar Cache
Se os dados não aparecem:
1. Limpe o cache do navegador (Ctrl+Shift+Delete)
2. Recarregue a página (Ctrl+F5)

---

## 🆘 AINDA COM PROBLEMAS?

### Verifique:
1. ✅ Arquivo `.env` existe e está configurado
2. ✅ Servidor foi reiniciado após editar `.env`
3. ✅ Scripts SQL foram executados SEM erros
4. ✅ Tabelas aparecem no Table Editor
5. ✅ B_Exercises tem 61 linhas
6. ✅ URL e Key estão corretas (sem espaços extras)

### Logs Úteis:
- Console do navegador (F12)
- Terminal onde o `npm run dev` está rodando
- Página de diagnóstico: `/diagnostic`

---

## 📞 SUPORTE

Se ainda estiver com problemas, compartilhe:
1. Screenshot da página `/diagnostic`
2. Logs do console do navegador
3. Conteúdo do arquivo `.env` (SEM as chaves reais!)
4. Screenshot do Table Editor do Supabase

---

**Última atualização:** 2025-11-25  
**Versão:** 1.0
