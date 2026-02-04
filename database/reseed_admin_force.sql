-- ==============================================================================
-- RE-SEED USER SCRIPT (MANDATORY)
-- The table appears empty to the application. Run this to fix it.
-- ==============================================================================

-- 1. Ensure permissions (just in case)
ALTER TABLE public.b_users DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.b_users TO anon;
GRANT ALL ON public.b_users TO authenticated;

-- 2. Insert User (Force Insert)
DELETE FROM public.b_users WHERE email = 'admin@benfit.com';

INSERT INTO public.b_users (
    name, 
    email, 
    plan_type, 
    phone, 
    gender, 
    height_cm, 
    weight_kg
)
VALUES (
    'Admin Benfit',
    'admin@benfit.com',
    'ELITE',
    '11999999999',
    'Masculino',
    180,
    80.5
);

-- 3. Verify immediately
SELECT * FROM public.b_users WHERE email = 'admin@benfit.com';
