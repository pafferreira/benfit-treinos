import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { email, password } = await req.json()
        const normalizedEmail = email?.trim().toLowerCase() ?? ""

        if (!normalizedEmail) {
            return new Response(JSON.stringify({ error: "E-mail obrigatório." }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400
            })
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, serviceRoleKey)

        // 1. Verify z_usuarios
        const { data: userRecord, error: userError } = await supabase
            .from("z_usuarios")
            .select("id, email, senha_hash, ativo")
            .ilike("email", normalizedEmail)
            .maybeSingle()

        if (userError) {
            console.error('Error fetching z_usuarios:', userError);
            return new Response(JSON.stringify({ error: "Erro interno ao validar usuário." }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        if (!userRecord || !userRecord.ativo) {
            return new Response(
                JSON.stringify({ error: "E-mail ou senha inválidos." }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
            )
        }

        // 2. Hash Password and Check
        async function hash(pwd: string) {
            const msgUint8 = new TextEncoder().encode(pwd);
            const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        }

        let tempPassword: string | null = null
        let finalPassword = password

        if (!userRecord.senha_hash) {
            // Generate Temp PW
            const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
            const randomValues = new Uint32Array(10);
            crypto.getRandomValues(randomValues);
            tempPassword = "";
            for (let i = 0; i < 10; i++) tempPassword += charset[randomValues[i] % charset.length];

            const newHash = await hash(tempPassword);
            await supabase.from("z_usuarios").update({ senha_hash: newHash }).eq("id", userRecord.id);
            finalPassword = tempPassword;
        } else {
            if (!password) {
                return new Response(JSON.stringify({ error: "Senha obrigatória." }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
            }
            const hashed = await hash(password);
            if (userRecord.senha_hash !== hashed && userRecord.senha_hash !== password) {
                return new Response(JSON.stringify({ error: "E-mail ou senha inválidos." }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
            }
        }

        // 3. Sync Auth
        // Try to find user in Auth first to avoid "primary key violation" error noises
        const { data: { users } } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
        const authUser = users.find(u => u.email?.toLowerCase() === normalizedEmail)

        if (authUser) {
            await supabase.auth.admin.updateUserById(authUser.id, { password: finalPassword as string })
        } else {
            const { error: createError } = await supabase.auth.admin.createUser({
                email: normalizedEmail,
                password: finalPassword as string,
                email_confirm: true
            })
            if (createError) {
                console.error('Error creating auth user:', createError);
                // Fallback: This might happen if paginated list missed the user.
                // Try Update via z_usuarios ID as a guess
                await supabase.auth.admin.updateUserById(userRecord.id, { password: finalPassword as string }).catch(() => { })
            }
        }

        return new Response(JSON.stringify({ success: true, tempPassword }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
        })

    } catch (err) {
        console.error('Critical Error:', err);
        return new Response(JSON.stringify({ error: err.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
        })
    }
})
