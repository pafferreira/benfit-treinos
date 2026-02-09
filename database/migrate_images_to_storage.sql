-- ============================================================
-- BENFIT TREINOS - IMAGE MANAGEMENT MIGRATION
-- Project: benfit
-- Description: Creates B_Avatars table and updates related schemas
-- ============================================================

-- 1. Create Storage Bucket (if not exists)
-- Note: Requires superuser or specific storage permissions. 
-- If this fails, create bucket 'benfit-assets' manually in Supabase Dashboard.
INSERT INTO storage.buckets (id, name, public) 
VALUES ('benfit-assets', 'benfit-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow public access to assets
CREATE POLICY "Public Access to Benfit Assets" ON storage.objects
  FOR SELECT USING (bucket_id = 'benfit-assets');

-- 2. Create B_Avatars Table
CREATE TABLE IF NOT EXISTS B_Avatars (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    storage_path VARCHAR(500) NOT NULL, -- e.g., 'avatars/avatar_ana_feliz.png'
    public_url VARCHAR(500) NOT NULL,
    name VARCHAR(100), -- Display name e.g. "Ana Feliz"
    category VARCHAR(50) DEFAULT '3D', -- 3D, Real, etc.
    tags TEXT[], -- ['female', 'happy']
    gender VARCHAR(20), -- 'male', 'female', 'neutral'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- RLS for B_Avatars (Public Read)
ALTER TABLE B_Avatars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view avatars" ON B_Avatars
    FOR SELECT USING (true);
    
-- Only admins can manage (using service_role or admin flag if exists)
-- For now, we assume only authenticated users can read, but maybe we want public access for login screen?
-- Keeping it public read for now.

-- 3. Update B_Exercises Table
-- Add image storage reference
ALTER TABLE B_Exercises 
ADD COLUMN IF NOT EXISTS image_storage_path VARCHAR(500),
ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);

-- 4. Update B_Users Table
-- Ensure avatar_url is large enough (already VARCHAR(500) in schema)
-- No structural change needed if it's already VARCHAR(500).

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_b_avatars_tags ON B_Avatars USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_b_avatars_gender ON B_Avatars(gender);

-- End Migration
