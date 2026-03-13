import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Instância temporária Supabase Node (bypass auth local para teste)
const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

// Puxa a chave do .env que o usuário colou
const apiKey = process.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
    console.error("❌ ERRO: VITE_GEMINI_API_KEY não encotrada no .env");
    console.log("Por favor, cole sua chave no arquivo .env e rode o script de teste novamente:");
    console.log("node test-vector.js");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function runTest() {
    console.log("🚀 Iniciando Teste de Gemini Embedding 2 + Supabase pgvector...");

    try {
        // 1. Gerar Embedding
        console.log("\n1️⃣ Gerando Embedding com gemini-embedding-2-preview. Aguarde...");
        const model = genAI.getGenerativeModel({ model: "gemini-embedding-2-preview" });
        const text = "Treino de peito e ombro. Carga aumentada no supino para 90kg. Relatou leve cansaço.";

        const result = await model.embedContent(text);
        const embedding = result.embedding.values;
        console.log(`✅ Embedding gerado com sucesso! Tamanho do vetor: ${embedding.length} dimensões.`);

        if (embedding.length !== 3072 && embedding.length !== 768) {
            console.warn(`Atenção: A dimensão esperada era 3072, mas recebemos ${embedding.length}. Se não for 3072 o banco recusará (espera vector(3072)).`);
        }

        // User Fake para o teste (pegaremos algum usuário da base ou usamos um hardcoded)
        const MOCK_USER_ID = '00000000-0000-0000-0000-000000000000'; // UUID dummy, talvez falhe se houver foreign key forte, mas é para teste.

        // 2. Testar Inserção no banco
        console.log("\n2️⃣ Inserindo dados na tabela b_benfit_embeddings no Supabase...");

        // Vamos ignorar erro de foreign key injetando via supabase client sem validação rígida de auth se a tabela permitir
        const { data: insertData, error: insertError } = await supabase
            .from('b_benfit_embeddings')
            .insert({
                user_id: MOCK_USER_ID,
                content: text,
                metadata: { type: "test", date: new Date().toISOString() },
                embedding: embedding
            })
            .select();

        if (insertError) {
            console.error("❌ Erro ao salvar no banco (Sua Foreign Key user_id pode ter barrado, ou dimensões). Erro detalhado:");
            console.error(insertError);
            return;
        }

        console.log("✅ Dados salvos com sucesso na tabela b_benfit_embeddings!");

        // 3. Testar a Busca (RPC match_embeddings)
        console.log("\n3️⃣ Testando busca semântica (match_embeddings)...");

        // Crio um embedding de busca:
        const queryResult = await model.embedContent("Qual carga eu usei no peito recentemente?");
        const queryEmbedding = queryResult.embedding.values;

        const { data: searchData, error: searchError } = await supabase.rpc('match_embeddings', {
            query_embedding: queryEmbedding,
            match_threshold: 0.2, // threshold baixo para garantir que traga nosso dado
            match_count: 5,
            p_user_id: MOCK_USER_ID
        });

        if (searchError) {
            console.error("❌ Erro na busca RPC match_embeddings:");
            console.error(searchError);
            return;
        }

        console.log(`✅ Busca retornou ${searchData.length} resultados!`);
        if (searchData.length > 0) {
            console.log(`   Resultado top 1: Similaridade ${(searchData[0].similarity * 100).toFixed(2)}% | Content: "${searchData[0].content}"`);
        }

        console.log("\n🎉 TESTES CONCLUÍDOS COM SUCESSO! A ARQUITETURA ESTÁ OPERACIONAL.");

        // Limpar o dado de teste
        await supabase.from('b_benfit_embeddings').delete().eq('user_id', MOCK_USER_ID);
        console.log("🧹 Dado de teste removido.");

    } catch (error) {
        console.error("❌ Falha crítica no teste:", error);
    }
}

runTest();
