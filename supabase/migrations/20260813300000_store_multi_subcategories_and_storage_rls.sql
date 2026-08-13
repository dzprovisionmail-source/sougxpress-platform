-- Migration: Multi-secondary subcategories & Merchant Storage/RLS Policies

-- 1. Create store_subcategories_map table for 1:N secondary subcategories
CREATE TABLE IF NOT EXISTS store_subcategories_map (
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  subcategory_id UUID NOT NULL REFERENCES subcategories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (store_id, subcategory_id)
);

CREATE INDEX IF NOT EXISTS idx_store_subcategories_map_store_id ON store_subcategories_map(store_id);
CREATE INDEX IF NOT EXISTS idx_store_subcategories_map_subcategory_id ON store_subcategories_map(subcategory_id);

ALTER TABLE store_subcategories_map ENABLE ROW LEVEL SECURITY;

-- RLS for store_subcategories_map
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'store_subcategories_map' AND policyname = 'Public read store subcategories') THEN
    CREATE POLICY "Public read store subcategories" ON store_subcategories_map FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'store_subcategories_map' AND policyname = 'Merchant manage own store subcategories') THEN
    CREATE POLICY "Merchant manage own store subcategories" ON store_subcategories_map
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM stores
          WHERE stores.id = store_subcategories_map.store_id
          AND stores.merchant_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM stores
          WHERE stores.id = store_subcategories_map.store_id
          AND stores.merchant_id = auth.uid()
        )
      );
  END IF;
end $$;

-- 2. Ensure store_gallery allows merchant management
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'store_gallery' AND policyname = 'Merchant manage own store gallery') THEN
    CREATE POLICY "Merchant manage own store gallery" ON store_gallery
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM stores
          WHERE stores.id = store_gallery.store_id
          AND stores.merchant_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM stores
          WHERE stores.id = store_gallery.store_id
          AND stores.merchant_id = auth.uid()
        )
      );
  END IF;
END $$;

-- 3. Storage bucket policies for store_images
-- Allow authenticated merchants to upload/update/delete objects in their store folders
-- Path convention: store_id/..., store_gallery/store_id/..., etc.
DROP POLICY IF EXISTS "Merchant upload store images" ON storage.objects;
CREATE POLICY "Merchant upload store images" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'store_images' AND
    auth.role() = 'authenticated' AND (
      -- Check if path starts with merchant's store id
      EXISTS (
        SELECT 1 FROM stores
        WHERE stores.merchant_id = auth.uid()
        AND (
          storage.objects.name LIKE stores.id || '/%' OR
          storage.objects.name LIKE 'store_gallery/' || stores.id || '/%' OR
          storage.objects.name LIKE 'products/' || stores.id || '/%'
        )
      ) OR
      public.get_user_role(auth.uid()) IN ('admin', 'founder')
    )
  );

DROP POLICY IF EXISTS "Merchant update store images" ON storage.objects;
CREATE POLICY "Merchant update store images" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'store_images' AND
    auth.role() = 'authenticated' AND (
      EXISTS (
        SELECT 1 FROM stores
        WHERE stores.merchant_id = auth.uid()
        AND (
          storage.objects.name LIKE stores.id || '/%' OR
          storage.objects.name LIKE 'store_gallery/' || stores.id || '/%' OR
          storage.objects.name LIKE 'products/' || stores.id || '/%'
        )
      ) OR
      public.get_user_role(auth.uid()) IN ('admin', 'founder')
    )
  );

DROP POLICY IF EXISTS "Merchant delete store images" ON storage.objects;
CREATE POLICY "Merchant delete store images" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'store_images' AND
    auth.role() = 'authenticated' AND (
      EXISTS (
        SELECT 1 FROM stores
        WHERE stores.merchant_id = auth.uid()
        AND (
          storage.objects.name LIKE stores.id || '/%' OR
          storage.objects.name LIKE 'store_gallery/' || stores.id || '/%' OR
          storage.objects.name LIKE 'products/' || stores.id || '/%'
        )
      ) OR
      public.get_user_role(auth.uid()) IN ('admin', 'founder')
    )
  );
