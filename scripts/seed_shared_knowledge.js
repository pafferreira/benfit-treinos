/**
 * seed_shared_knowledge.js
 *
 * Popula a tabela b_shared_knowledge com embeddings do catálogo de exercícios.
 * Usa service_role para bypassar RLS e a API do Gemini para gerar embeddings.
 *
 * Execução: node scripts/seed_shared_knowledge.js
 *
 * Requer no .env:
 *   VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   VITE_GEMINI_API_KEY
 */

import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

// ── Validação de ambiente ─────────────────────────────────────────────────────
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !GEMINI_API_KEY) {
    console.error('[Seed] Erro: variáveis de ambiente ausentes.');
    console.error('  Necessário: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VITE_GEMINI_API_KEY');
    process.exit(1);
}

// ── Clientes ──────────────────────────────────────────────────────────────────
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const embeddingModel = genAI.getGenerativeModel({ model: 'gemini-embedding-2-preview' });

// ── Helpers ───────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function embedText(text) {
    const result = await embeddingModel.embedContent(text);
    return result.embedding.values;
}

/**
 * Monta texto descritivo rico para embedar.
 * Quanto mais semântico, mais precisa a busca vetorial.
 */
function buildExerciseContent(ex) {
    const parts = [
        `Exercício: ${ex.name}`,
        `Grupo muscular: ${ex.muscle_group || 'Geral'}`,
        ex.equipment ? `Equipamento: ${ex.equipment}` : null,
        Array.isArray(ex.instructions) && ex.instructions.length > 0
            ? `Execução: ${ex.instructions.slice(0, 2).join(' ')}`
            : null,
        Array.isArray(ex.tags) && ex.tags.length > 0
            ? `Tags: ${ex.tags.join(', ')}`
            : null,
    ].filter(Boolean);
    return parts.join('. ') + '.';
}

// ── Seed: Exercícios ──────────────────────────────────────────────────────────
async function seedExercises() {
    console.log('\n[Seed] Buscando exercícios do catálogo b_exercises...');

    const { data: exercises, error } = await supabase
        .from('b_exercises')
        .select('id, exercise_key, name, muscle_group, equipment, instructions, tags');

    if (error) {
        console.error('[Seed] Erro ao buscar exercícios:', error.message);
        process.exit(1);
    }

    console.log(`[Seed] ${exercises.length} exercícios encontrados.`);

    // Verifica quais já foram embedados (idempotência)
    const { data: existing } = await supabase
        .from('b_shared_knowledge')
        .select('source_id')
        .eq('knowledge_type', 'exercise');

    const seededIds = new Set((existing || []).map(r => r.source_id?.toString()));
    const toSeed = exercises.filter(ex => !seededIds.has(ex.id?.toString()));

    console.log(`[Seed] ${toSeed.length} exercícios a embedar (${seededIds.size} já existentes).\n`);

    if (toSeed.length === 0) {
        console.log('[Seed] Nenhum exercício novo para embedar.');
        return;
    }

    const BATCH_SIZE = 15;
    let processados = 0;
    let erros = 0;

    for (let i = 0; i < toSeed.length; i += BATCH_SIZE) {
        const batch = toSeed.slice(i, i + BATCH_SIZE);

        const rows = [];
        for (const ex of batch) {
            try {
                const content = buildExerciseContent(ex);
                const embedding = await embedText(content);
                rows.push({
                    knowledge_type: 'exercise',
                    source_id: ex.id,
                    content,
                    metadata: {
                        name: ex.name,
                        exercise_key: ex.exercise_key || null,
                        muscle_group: ex.muscle_group || null,
                        equipment: ex.equipment || null,
                        tags: ex.tags || [],
                    },
                    embedding,
                });
                processados++;
            } catch (e) {
                console.warn(`[Seed] Erro ao embedar "${ex.name}":`, e.message);
                erros++;
            }
        }

        if (rows.length > 0) {
            const { error: insertError } = await supabase
                .from('b_shared_knowledge')
                .insert(rows);

            if (insertError) {
                console.error(`[Seed] Erro ao inserir batch ${i}–${i + batch.length}:`, insertError.message);
            } else {
                console.log(`[Seed] ✓ Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${rows.length} exercícios inseridos (total: ${processados}/${toSeed.length})`);
            }
        }

        // Throttle entre batches para respeitar rate limit da API Gemini
        if (i + BATCH_SIZE < toSeed.length) {
            await sleep(2500);
        }
    }

    console.log(`\n[Seed] Exercícios concluídos: ${processados} inseridos, ${erros} erros.`);
}

// ── Ponto de entrada ──────────────────────────────────────────────────────────
async function run() {
    console.log('======================================================');
    console.log('  Benfit — Seed da Base de Conhecimento Compartilhada');
    console.log('======================================================');

    await seedExercises();

    console.log('\n[Seed] Processo concluído!');
    console.log('[Seed] Próximo passo: verifique no Supabase a tabela b_shared_knowledge.');
}

run().catch(err => {
    console.error('\n[Seed] Falha fatal:', err.message || err);
    process.exit(1);
});
