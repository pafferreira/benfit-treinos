
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Error: Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
}

// Create a Supabase client with the SERVICE ROLE KEY
// This client bypasses Row Level Security.
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});
const BUCKET_NAME = 'benfit-assets';

const EXERCISE_TAGS = {
    superior: ['rosca', 'triceps', 'supino', 'desenvolvimento', 'elevacao', 'remada', 'puxador', 'fly', 'flexao', 'ombro', 'peito', 'costas', 'biceps', 'abdominal'],
    inferior: ['agachamento', 'leg', 'stiff', 'rdl', 'afundo', 'cadeira', 'mesa', 'panturrilha', 'gluteo', 'quadriceps', 'posterior', 'good_morning']
};

function getExerciseTags(filename) {
    const lowerName = filename.toLowerCase();
    const tags = ['exercicio']; // Base tag

    // Muscle Group / Type
    if (EXERCISE_TAGS.superior.some(k => lowerName.includes(k))) tags.push('superior');
    if (EXERCISE_TAGS.inferior.some(k => lowerName.includes(k))) tags.push('inferior');

    return tags;
}

function getExerciseGender(filename) {
    // Default to neutral as most exercises are demonstrated by models but the exercise itself is neutral.
    return 'neutral';
}

async function uploadFile(filePath, storagePath) {
    const fileContent = fs.readFileSync(filePath);
    const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(storagePath, fileContent, {
            contentType: 'image/png', // Assuming PNG for now, can detect
            upsert: true
        });

    if (error) {
        console.error(`Error uploading ${storagePath}:`, error.message);
        return null;
    }

    const { data: publicUrlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(storagePath);

    return publicUrlData.publicUrl;
}

async function migrateAvatars() {
    console.log('--- Migrating Avatars ---');
    const avatarsDir = path.join(PROJECT_ROOT, 'public', 'avatars');
    if (!fs.existsSync(avatarsDir)) {
        console.log('No avatars directory found.');
        return;
    }

    const files = fs.readdirSync(avatarsDir).filter(f => f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.webp'));

    for (const file of files) {
        const storagePath = `avatars/${file}`;
        const filePath = path.join(avatarsDir, file);

        console.log(`Processing ${file}...`);
        const publicUrl = await uploadFile(filePath, storagePath);

        if (publicUrl) {
            // Infer metadata
            const name = file.replace(/^(avatar_)/, '').replace(/(\.png|\.jpg)$/, '').replace(/_/g, ' ');
            const tags = [];
            if (file.includes('female') || file.includes('mariana') || file.includes('ana') || file.includes('clara') || file.includes('julia') || file.includes('sofia') || file.includes('laura')) tags.push('female');
            if (file.includes('male') || file.includes('gabriel') || file.includes('pedro') || file.includes('marcos') || file.includes('thiago') || file.includes('bruno') || file.includes('lucas') || file.includes('joao')) tags.push('male');
            if (file.includes('happy') || file.includes('feliz')) tags.push('happy');
            if (file.includes('brave') || file.includes('bravo') || file.includes('brava')) tags.push('brave');
            if (file.includes('pixar') || file.includes('avatar')) tags.push('3d');

            const gender = tags.includes('female') ? 'female' : (tags.includes('male') ? 'male' : 'neutral');

            // Insert into DB
            const { error } = await supabase
                .from('b_avatars')
                .upsert({
                    storage_path: storagePath,
                    public_url: publicUrl,
                    name: name,
                    category: '3D',
                    tags: tags,
                    gender: gender,
                    is_active: true
                }, { onConflict: ['storage_path'] });

            if (error) console.error(`Error inserting DB record for ${file}:`, error.message);
            else console.log(`Saved ${file} to DB.`);
        }
    }
}

async function migrateExercises() {
    console.log('--- Migrating Exercises ---');
    const exercisesDir = path.join(PROJECT_ROOT, 'public', 'exercicios');
    if (!fs.existsSync(exercisesDir)) {
        console.log('No exercises directory found.');
        return;
    }

    const files = fs.readdirSync(exercisesDir).filter(f => f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.gif'));

    for (const file of files) {
        const storagePath = `exercises/${file}`;
        const filePath = path.join(exercisesDir, file);

        console.log(`Processing ${file}...`);
        const publicUrl = await uploadFile(filePath, storagePath);

        if (publicUrl) {
            // 1. Update B_Exercises (Existing logic)
            const exerciseKey = file.replace(/\.(png|jpg|gif)$/, '');

            const { error: updateError } = await supabase
                .from('b_exercises')
                .update({
                    image_storage_path: storagePath,
                    image_url: publicUrl
                })
                .eq('exercise_key', exerciseKey);

            if (updateError) {
                console.error(`Error updating B_Exercises for ${exerciseKey}:`, updateError.message);
            } else {
                console.log(`Updated B_Exercises for ${exerciseKey}.`);
            }

            // 2. Insert into B_Avatars (NEW LOGIC)
            const name = exerciseKey.replace(/_/g, ' ');
            const tags = getExerciseTags(file);
            const gender = getExerciseGender(file);

            const { error: insertError } = await supabase
                .from('b_avatars')
                .upsert({
                    storage_path: storagePath,
                    public_url: publicUrl,
                    name: name,
                    category: 'exercicio',
                    tags: tags,
                    gender: gender,
                    is_active: true
                }, { onConflict: ['storage_path'] });

            if (insertError) {
                console.error(`Error inserting B_Avatars for ${file}:`, insertError.message);
            } else {
                console.log(`Inserted ${file} into B_Avatars (Category: exercicio).`);
            }
        }
    }
}

async function run() {
    // await migrateAvatars(); // Comment out if you only want to process exercises, or leave enabled to ensure sync
    await migrateExercises();
    console.log('Migration complete.');
}

run();
