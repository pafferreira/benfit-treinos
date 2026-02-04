-- ==============================================================================
-- SEED USER SCRIPT
-- RUN THIS IN SUPABASE SQL EDITOR TO CREATE A TEST USER
-- ==============================================================================

-- Insert a default user if it doesn't exist.
-- You can use this email to login: admin@benfit.com
-- Password does not matter.

INSERT INTO public.b_users (
    name, 
    email, 
    password_hash, 
    plan_type, 
    phone, 
    birth_date, 
    gender, 
    height_cm, 
    weight_kg,
    avatar_url
)
VALUES (
    'Admin Benfit',
    'admin@benfit.com',
    NULL, -- No password needed for our custom flow
    'ELITE',
    '11999999999',
    '1990-01-01',
    'Masculino',
    180,
    80.5,
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin'
)
ON CONFLICT (email) DO UPDATE 
SET 
  name = EXCLUDED.name,
  plan_type = EXCLUDED.plan_type,
  updated_at = NOW();

-- Check what users exist (Optional, for your view)
SELECT email, name, id FROM public.b_users;
