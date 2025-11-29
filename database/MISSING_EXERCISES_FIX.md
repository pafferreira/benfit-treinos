# Problema: Exercícios Faltando na Tela de Exercícios

## Diagnóstico

A tela de exercícios não está apresentando todos os dados porque **2 exercícios estão faltando no banco de dados Supabase**:

1. **`leg_press_45`** - Leg Press 45º
2. **`cadeira_abdutora_45`** - Cadeira Abdutora 45º

### Contagem de Exercícios
- **Arquivo Local** (`src/data/exercises.js`): **57 exercícios**
- **Banco de Dados Supabase**: **55 exercícios**
- **Diferença**: **2 exercícios faltando**

## Causa Raiz

Embora os 2 exercícios estejam presentes no arquivo `database/supabase_data_population.sql`, eles não foram inseridos no banco de dados Supabase. Isso pode ter ocorrido por:

1. O script SQL não foi executado completamente
2. Houve um erro durante a execução do INSERT específico
3. Os exercícios foram deletados acidentalmente

## Solução

### Opção 1: Executar Script de Correção (RECOMENDADO)

Execute o script `database/fix_missing_exercises.sql` no Supabase SQL Editor:

1. Acesse o Supabase Dashboard
2. Vá para SQL Editor
3. Abra o arquivo `database/fix_missing_exercises.sql`
4. Execute o script
5. Verifique que a contagem final é 57 exercícios

### Opção 2: Inserir Manualmente via SQL

Execute os seguintes comandos SQL no Supabase:

```sql
-- Inserir Leg Press 45º
INSERT INTO B_Exercises (exercise_key, name, muscle_group, equipment, video_url, instructions, tags) 
VALUES ('leg_press_45', 'Leg Press 45º', 'Pernas (Geral)', 'Leg Press', '', 
    ARRAY['Apoie os pés na plataforma na largura dos ombros.', 'Desça até formar 90 graus ou mais.', 'Empurre sem travar os joelhos.'], 
    ARRAY['perna', 'composto']);

-- Inserir Cadeira Abdutora 45º
INSERT INTO B_Exercises (exercise_key, name, muscle_group, equipment, video_url, instructions, tags) 
VALUES ('cadeira_abdutora_45', 'Cadeira Abdutora 45º', 'Glúteo', 'Máquina', '', 
    ARRAY['Tronco inclinado à frente ou ajuste da máquina.'], 
    ARRAY['abdutor', 'gluteo']);
```

### Opção 3: Re-executar Script Completo

Se preferir, você pode re-executar o script completo de população de dados:

1. Execute `database/supabase_cleanup.sql` para limpar os dados existentes
2. Execute `database/supabase_data_population.sql` para popular novamente

⚠️ **ATENÇÃO**: Esta opção irá deletar todos os dados existentes!

## Verificação

Após executar a solução, verifique:

1. **No Supabase SQL Editor**:
   ```sql
   SELECT COUNT(*) FROM B_Exercises;
   -- Deve retornar 57
   ```

2. **Na aplicação**:
   - Recarregue a página de exercícios
   - Verifique que todos os 57 exercícios estão sendo exibidos
   - Verifique que os filtros estão funcionando corretamente

## Prevenção

Para evitar este problema no futuro:

1. Sempre execute scripts SQL completos
2. Verifique a contagem de registros após a execução
3. Use transações para garantir atomicidade
4. Mantenha backups regulares do banco de dados
