-- Migration: 20260809_courier_assets_storage_rls.sql
-- Purpose: Ensure courier-assets storage bucket exists with correct RLS policies
-- Note: Idempotent - safe to run multiple times

-- 1. Create bucket if not exists (public read)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'courier-assets',
  'courier-assets',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "courier_assets_public_select" ON storage.objects;
DROP POLICY IF EXISTS "courier_assets_owner_insert" ON storage.objects;
DROP POLICY IF EXISTS "courier_assets_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "courier_assets_owner_delete" ON storage.objects;

-- 3. Public read access (anyone can view courier images)
CREATE POLICY "courier_assets_public_select"
ON storage.objects
FOR SELECT
USING (bucket_id = 'courier-assets');

-- 4. Authenticated upload (only users with a courier record can upload)
CREATE POLICY "courier_assets_owner_insert"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'courier-assets'
  AND auth.role() = 'authenticated'
  AND EXISTS (SELECT 1 FROM public.couriers WHERE user_id = auth.uid())
);

-- 5. Authenticated update (only owners can update their images)
CREATE POLICY "courier_assets_owner_update"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'courier-assets'
  AND auth.role() = 'authenticated'
  AND EXISTS (SELECT 1 FROM public.couriers WHERE user_id = auth.uid())
);

-- 6. Authenticated delete (only owners can delete their images)
CREATE POLICY "courier_assets_owner_delete"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'courier-assets'
  AND auth.role() = 'authenticated'
  AND EXISTS (SELECT 1 FROM public.couriers WHERE user_id = auth.uid())
);
