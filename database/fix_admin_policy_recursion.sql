-- Create a secure function to check admin status, avoiding RLS recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.b_users
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the potentially problematic policy
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.b_users;

-- Re-create the policy using the secure function
CREATE POLICY "Admins can update all profiles" 
ON public.b_users 
FOR UPDATE 
USING ( public.is_admin() );

-- Also allow Admins to INSERT if needed in future (optional but good practice)
-- CREATE POLICY "Admins can insert all profiles" ON public.b_users FOR INSERT WITH CHECK (public.is_admin());
