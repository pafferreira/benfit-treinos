-- Enable Admins to update any user profile
-- This policy allows users with role 'admin' in b_users to UPDATE any row in b_users.

CREATE POLICY "Admins can update all profiles" 
ON public.b_users 
FOR UPDATE 
USING (
  (SELECT role FROM public.b_users WHERE id = auth.uid()) = 'admin'
);
