-- ==============================================================================
-- FIX RLS: Allow updates based on Email match (Fixes "orphan" user issue)
-- ==============================================================================

-- 1. Drop strict policies
DROP POLICY IF EXISTS "Users can update own profile" ON public.b_users;
DROP POLICY IF EXISTS "Users can update own profile by email" ON public.b_users;

-- 2. Create flexible UPDATE policy
-- Allows update if ID matches OR if the confirmed email matches the row's email
CREATE POLICY "Users can update own profile" 
ON public.b_users 
FOR UPDATE 
USING (
  auth.uid() = id 
  OR 
  email = (select email from auth.users where id = auth.uid())
);

-- 3. Ensure SELECT is also flexible (so they can see the profile they are about to update)
DROP POLICY IF EXISTS "Users can view own profile" ON public.b_users;

CREATE POLICY "Users can view own profile" 
ON public.b_users 
FOR SELECT 
USING (
  auth.uid() = id 
  OR 
  email = (select email from auth.users where id = auth.uid())
);

-- Note: We do not enable this for INSERT, because INSERT should always use the correct Auth ID.
-- If an insert happens, it means the user doesn't exist yet, so we should create it with the correct ID.
