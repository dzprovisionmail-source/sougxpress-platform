-- Migration: 202607190000300_store_images_bucket.sql
-- Purpose: Create store_images storage bucket for store logos, covers, and gallery images.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'store_images',
  'store_images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "store_images_public_select"
ON storage.objects
FOR SELECT
USING (bucket_id = 'store_images');

CREATE POLICY "store_images_admin_insert"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'store_images'
  AND public.get_user_role(auth.uid()) IN ('admin', 'founder')
);

CREATE POLICY "store_images_admin_update"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'store_images'
  AND public.get_user_role(auth.uid()) IN ('admin', 'founder')
);

CREATE POLICY "store_images_admin_delete"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'store_images'
  AND public.get_user_role(auth.uid()) IN ('admin', 'founder')
);
