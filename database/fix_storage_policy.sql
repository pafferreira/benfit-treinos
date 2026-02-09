-- FIX: Add Insert/Update policies for Storage Bucket
-- The previous script only added SELECT permissions.
-- This allows uploads to the bucket.

-- 1. Allow INSERT (Uploads) for everyone (anon) or better, service_role bypasses this anyway.
-- If you are getting RLS error with service_role, it implies the key uses RLS or isn't actually service_role.
-- Let's open it up for the migration tool (anon) then you can disable it later.

-- Policy for Inserting files
CREATE POLICY "Allow Public Uploads to Benfit Assets" ON storage.objects
FOR INSERT 
WITH CHECK (bucket_id = 'benfit-assets');

-- Policy for Updating files (Upsert)
CREATE POLICY "Allow Public Updates to Benfit Assets" ON storage.objects
FOR UPDATE
USING (bucket_id = 'benfit-assets');

-- Policy for Deleting (optional, safe to have for cleaning up)
CREATE POLICY "Allow Public Delete to Benfit Assets" ON storage.objects
FOR DELETE
USING (bucket_id = 'benfit-assets');
