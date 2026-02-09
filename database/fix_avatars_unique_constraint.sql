-- FIX: Add Unique Constraint to storage_path
-- The migration script uses UPSERT on 'storage_path', which requires a unique constraint.

ALTER TABLE B_Avatars 
ADD CONSTRAINT b_avatars_storage_path_key UNIQUE (storage_path);
