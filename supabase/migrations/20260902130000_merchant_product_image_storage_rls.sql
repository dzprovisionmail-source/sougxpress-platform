-- Allow merchants to manage product images inside their own store folder.
-- Scope is limited to the existing store_images bucket; no tables or business logic change.

BEGIN;

DROP POLICY IF EXISTS "merchant_product_images_insert" ON storage.objects;
CREATE POLICY "merchant_product_images_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'store_images'
  AND EXISTS (
    SELECT 1
    FROM public.stores s
    WHERE s.merchant_id = auth.uid()
      AND name LIKE 'products/' || s.id::text || '/%'
  )
);

DROP POLICY IF EXISTS "merchant_product_images_update" ON storage.objects;
CREATE POLICY "merchant_product_images_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'store_images'
  AND EXISTS (
    SELECT 1
    FROM public.stores s
    WHERE s.merchant_id = auth.uid()
      AND name LIKE 'products/' || s.id::text || '/%'
  )
)
WITH CHECK (
  bucket_id = 'store_images'
  AND EXISTS (
    SELECT 1
    FROM public.stores s
    WHERE s.merchant_id = auth.uid()
      AND name LIKE 'products/' || s.id::text || '/%'
  )
);

DROP POLICY IF EXISTS "merchant_product_images_delete" ON storage.objects;
CREATE POLICY "merchant_product_images_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'store_images'
  AND EXISTS (
    SELECT 1
    FROM public.stores s
    WHERE s.merchant_id = auth.uid()
      AND name LIKE 'products/' || s.id::text || '/%'
  )
);

COMMIT;
