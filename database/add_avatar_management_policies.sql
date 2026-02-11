-- ============================================================
-- BENFIT TREINOS - AVATAR MANAGEMENT RLS POLICIES
-- Description: Add policies to allow authenticated users to manage avatars
-- ============================================================

-- Add policies for authenticated users to INSERT, UPDATE, DELETE avatars
CREATE POLICY "Authenticated users can insert avatars" ON B_Avatars
    FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update avatars" ON B_Avatars
    FOR UPDATE 
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete avatars" ON B_Avatars
    FOR DELETE 
    USING (auth.role() = 'authenticated');

-- End Migration
