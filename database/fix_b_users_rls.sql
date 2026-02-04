-- Enable RLS on b_users
ALTER TABLE public.b_users ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own profile
CREATE POLICY "Users can view own profile" 
ON public.b_users FOR SELECT 
USING (auth.uid() = id);

-- Allow users to view public profiles (if needed for social features, e.g., friends)
-- CREATE POLICY "Users can view public profiles" ON public.b_users FOR SELECT USING (true);

-- Allow users to insert their own profile
CREATE POLICY "Users can insert own profile" 
ON public.b_users FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile" 
ON public.b_users FOR UPDATE 
USING (auth.uid() = id);

-- Grant access to authenticated users
GRANT ALL ON public.b_users TO authenticated;
