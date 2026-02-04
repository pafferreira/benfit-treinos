-- Add weight_kg column to b_users table
-- This allows storing the user's current weight directly in their profile

ALTER TABLE public.b_users 
ADD COLUMN IF NOT EXISTS weight_kg numeric(5,2);

-- Update RLS policies if necessary (usually existing update policy covers all columns, but good to verify)
-- Assuming existing policy: "Users can update own profile" is defined as:
-- create policy "Users can update own profile" on b_users for update using (auth.uid() = id);

COMMENT ON COLUMN public.b_users.weight_kg IS 'Peso atual do usuário em kg (ex: 75.50)';

-- Create a trigger function to automatically log weight changes to b_user_progress?
-- Optional, but good practice. For now, we will handle logging in the frontend application logic if needed,
-- but having the current weight in the profile is the primary request.
