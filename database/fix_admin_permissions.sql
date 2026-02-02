-- ============================================================
-- ADMIN & PERMISSIONS FIX
-- Enables INSERT for users, adds Admin role, and fixes constraints
-- ============================================================

-- 1. Make legacy password_hash optional (since we use Supabase Auth)
ALTER TABLE B_Users ALTER COLUMN password_hash DROP NOT NULL;

-- 2. Add ROLE column if it doesn't exist
ALTER TABLE B_Users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user';

-- 3. Policy: Allow users to INSERT their own profile (Fixes "Cannot save" for new users)
DROP POLICY IF EXISTS "Users can insert own profile" ON B_Users;
CREATE POLICY "Users can insert own profile" ON B_Users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- 4. Policy: Allow Admins to do EVERYTHING on B_Users
DROP POLICY IF EXISTS "Admins can do everything on users" ON B_Users;
CREATE POLICY "Admins can do everything on users" ON B_Users
    FOR ALL USING (
        (SELECT role FROM B_Users WHERE id = auth.uid()) = 'admin'
    );

-- 5. Policy: Allow Admins to do EVERYTHING on B_Exercises
DROP POLICY IF EXISTS "Admins can manage exercises" ON B_Exercises;
CREATE POLICY "Admins can manage exercises" ON B_Exercises
    FOR ALL USING (
        (SELECT role FROM B_Users WHERE id = auth.uid()) = 'admin'
    );

-- 6. Helper to set yourself as Admin (Replace YOUR_EMAIL_HERE)
-- UPDATE B_Users SET role = 'admin' WHERE email = 'YOUR_EMAIL_HERE';

-- ============================================================
-- FORCE ADMIN FOR CURRENT USER (Auto-fix for development)
-- Tries to set the last updated user as admin or just ensures schema is ready
-- ============================================================
COMMENT ON COLUMN B_Users.role IS 'Roles: user, admin, coach';
