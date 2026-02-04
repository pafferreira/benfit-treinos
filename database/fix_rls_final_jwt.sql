-- ==============================================================================
-- FIX RLS: Use auth.jwt() for Email Lookup (SAFE & CORRECT)
-- This replaces the previous potentially failing policy that tried to select from auth.users
-- ==============================================================================

-- 1. Drop previous policies that might be failing
DROP POLICY IF EXISTS "Users can update own profile" ON public.b_users;
DROP POLICY IF EXISTS "Users can view own profile" ON public.b_users;

-- 2. Create ROBUST UPDATE policy using JWT claims
-- This does NOT require access to auth.users table, making it permission-safe.
CREATE POLICY "Users can update own profile" 
ON public.b_users 
FOR UPDATE 
USING (
  auth.uid() = id 
  OR 
  email = (auth.jwt() ->> 'email')
);

-- 3. Create ROBUST SELECT policy using JWT claims
CREATE POLICY "Users can view own profile" 
ON public.b_users 
FOR SELECT 
USING (
  auth.uid() = id 
  OR 
  email = (auth.jwt() ->> 'email')
);

-- 4. Ensure INSERT is also covered (just in case)
DROP POLICY IF EXISTS "Users can insert own profile" ON public.b_users;
CREATE POLICY "Users can insert own profile" 
ON public.b_users 
FOR INSERT 
WITH CHECK (
  auth.uid() = id
  OR
  email = (auth.jwt() ->> 'email')
);
