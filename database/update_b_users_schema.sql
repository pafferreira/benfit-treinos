-- ==============================================================================
-- FIX SCRIPT: Update B_Users Schema and RLS
-- This script fixes missing columns, nullable constraints, and permissions.
-- ==============================================================================

-- 1. Add missing columns referenced in the frontend code
ALTER TABLE public.b_users 
ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
ADD COLUMN IF NOT EXISTS birth_date DATE,
ADD COLUMN IF NOT EXISTS gender VARCHAR(20),
ADD COLUMN IF NOT EXISTS height_cm INTEGER,
ADD COLUMN IF NOT EXISTS weight_kg DECIMAL(5,2);

-- 2. Make password_hash nullable (since Auth handles passwords, and profiles might be created via frontend upsert)
ALTER TABLE public.b_users 
ALTER COLUMN password_hash DROP NOT NULL;

-- 3. Reset RLS Policies to ensure a clean slate
-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own profile" ON public.b_users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.b_users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.b_users;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.b_users;

-- Enable RLS (idempotent)
ALTER TABLE public.b_users ENABLE ROW LEVEL SECURITY;

-- 4. Re-create Policies
-- VIEW: Users see their own profile
CREATE POLICY "Users can view own profile" 
ON public.b_users FOR SELECT 
USING (auth.uid() = id);

-- INSERT: Users can insert their own profile
CREATE POLICY "Users can insert own profile" 
ON public.b_users FOR INSERT 
WITH CHECK (auth.uid() = id);

-- UPDATE: Users can update their own profile
CREATE POLICY "Users can update own profile" 
ON public.b_users FOR UPDATE 
USING (auth.uid() = id);

-- 5. Grant Permissions to authenticated role
GRANT ALL ON public.b_users TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 6. Optional: Trigger to auto-create profile on signup (Best Practice)
-- This ensures the row exists, but we handle it via frontend upsert too/
-- Commented out to avoid complexity if not requested, but good to know.
