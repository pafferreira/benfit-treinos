-- ============================================================
-- BENFIT TREINOS - STORAGE POLICIES FOR FILE UPLOAD
-- Description: Add policies to allow authenticated users to upload files to storage
-- ============================================================

-- Allow authenticated users to upload files to the benfit-assets bucket
CREATE POLICY "Authenticated users can upload to benfit-assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'benfit-assets');

-- Allow authenticated users to update files in the benfit-assets bucket
CREATE POLICY "Authenticated users can update in benfit-assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'benfit-assets');

-- Allow authenticated users to delete files from the benfit-assets bucket
CREATE POLICY "Authenticated users can delete from benfit-assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'benfit-assets');

-- End Migration
