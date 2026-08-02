-- Migration: 20260802_couriers_system.sql
-- Purpose: Phase 4.1 Delivery Courier Subsystem — couriers table, favorite_couriers
--          junction, RLS policies, courier-assets storage bucket, and mock seed data.
-- Note: Strictly additive. No existing columns/tables are dropped or altered.

BEGIN;

-- ============================================================================
-- 1. couriers table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.couriers (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name        VARCHAR(100) NOT NULL,
  phone_number     VARCHAR(20) NOT NULL,
  bio              VARCHAR(160) DEFAULT '' CHECK (CHAR_LENGTH(bio) <= 160),
  avatar_url       TEXT,
  vehicle_type     VARCHAR(50) NOT NULL CHECK (vehicle_type IN ('motorcycle', 'car', 'van', 'bicycle', 'truck')),
  vehicle_photo_url TEXT,
  rating           NUMERIC(2,1) DEFAULT 5.0 CHECK (rating >= 1.0 AND rating <= 5.0),
  is_available     BOOLEAN DEFAULT true,
  is_mock          BOOLEAN DEFAULT false,
  created_at       TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_couriers_user_id      ON public.couriers(user_id);
CREATE INDEX IF NOT EXISTS idx_couriers_is_available ON public.couriers(is_available);
CREATE INDEX IF NOT EXISTS idx_couriers_is_mock      ON public.couriers(is_mock);
CREATE INDEX IF NOT EXISTS idx_couriers_rating       ON public.couriers(rating DESC);

-- ============================================================================
-- 2. favorite_couriers table (user <-> courier favorites)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.favorite_couriers (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  courier_id UUID REFERENCES public.couriers(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  CONSTRAINT favorite_couriers_user_courier_uk UNIQUE (user_id, courier_id)
);

CREATE INDEX IF NOT EXISTS idx_favorite_couriers_user_id    ON public.favorite_couriers(user_id);
CREATE INDEX IF NOT EXISTS idx_favorite_couriers_courier_id ON public.favorite_couriers(courier_id);

-- ============================================================================
-- 3. Row Level Security (RLS) policies
-- ============================================================================

-- --- couriers ---
ALTER TABLE public.couriers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_select_couriers ON public.couriers;
CREATE POLICY rls_select_couriers ON public.couriers
  FOR SELECT
  USING (is_available = true OR is_mock = true);

DROP POLICY IF EXISTS rls_update_couriers ON public.couriers;
CREATE POLICY rls_update_couriers ON public.couriers
  FOR UPDATE
  USING (auth.uid() = user_id);

-- --- favorite_couriers ---
ALTER TABLE public.favorite_couriers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_select_favorite_couriers ON public.favorite_couriers;
CREATE POLICY rls_select_favorite_couriers ON public.favorite_couriers
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS rls_insert_favorite_couriers ON public.favorite_couriers;
CREATE POLICY rls_insert_favorite_couriers ON public.favorite_couriers
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS rls_delete_favorite_couriers ON public.favorite_couriers;
CREATE POLICY rls_delete_favorite_couriers ON public.favorite_couriers
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 4. Storage bucket: courier-assets (tables now exist for policy references)
--    Mirrors the existing store_images bucket pattern. Public read so courier
--    avatar/vehicle photos render anywhere; writes restricted to authenticated
--    users who own a courier record.
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'courier-assets',
  'courier-assets',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "courier_assets_public_select" ON storage.objects;
CREATE POLICY "courier_assets_public_select"
ON storage.objects
FOR SELECT
USING (bucket_id = 'courier-assets');

DROP POLICY IF EXISTS "courier_assets_owner_insert" ON storage.objects;
CREATE POLICY "courier_assets_owner_insert"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'courier-assets'
  AND auth.role() = 'authenticated'
  AND EXISTS (SELECT 1 FROM public.couriers WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "courier_assets_owner_update" ON storage.objects;
CREATE POLICY "courier_assets_owner_update"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'courier-assets'
  AND auth.role() = 'authenticated'
  AND EXISTS (SELECT 1 FROM public.couriers WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "courier_assets_owner_delete" ON storage.objects;
CREATE POLICY "courier_assets_owner_delete"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'courier-assets'
  AND auth.role() = 'authenticated'
  AND EXISTS (SELECT 1 FROM public.couriers WHERE user_id = auth.uid())
);

-- ============================================================================
-- 5. Seed data: 3 mock Algerian couriers
--    is_mock = true so they are publicly readable regardless of availability,
--    and user_id is NULL (no auth.users row) per the nullable FK design.
-- ============================================================================

INSERT INTO public.couriers
  (id, user_id, full_name, phone_number, bio, avatar_url, vehicle_type, vehicle_photo_url, rating, is_available, is_mock, created_at)
VALUES
  ('a1b2c3d4-1111-4c00-8000-000000000001', NULL, 'أحمد التوصيل السريع', '+213 5 12 34 56 78',
   'توصيل سريع وموثوق في كل الأحياء، أدقق ملابسك ووجبتك',
   'https://images.unsplash.com/photo-1597533087424-123456789d3d?auto=format&fit=crop&w=256&h=256&q=80',
   'motorcycle',
   'https://images.unsplash.com/photo-1624224730890-3e3c2b2c0e8c?auto=format&fit=crop&w=800&h=600&q=80',
   4.9, true, true, timezone('utc'::text, now())),
  ('a1b2c3d4-2222-4c00-8000-000000000002', NULL, 'ياسين النقل السريع', '+213 7 98 76 54 32',
   'نقل بضائعك بأمان وبأسعار منافسة، خدمة 24/7 على مدار الأسبوع',
   'https://images.unsplash.com/photo-1507003211167-12ed9e2bc6a8?auto=format&fit=crop&w=256&h=256&q=80',
   'van',
   'https://images.unsplash.com/photo-1624224730890-3e3c2b2c0e8c?auto=format&fit=crop&w=800&h=600&q=80',
   4.8, true, true, timezone('utc'::text, now())),
  ('a1b2c3d4-3333-4c00-8000-000000000003', NULL, 'عمر للمهمات', '+213 6 55 44 33 22',
   'للمهمات الصغيرة والكبيرة، سعر ثابت وتسليم مضمون',
   'https://images.unsplash.com/photo-158025397586212449404ec1d7b5b0e2?auto=format&fit=crop&w=256&h=256&q=80',
   'car',
   'https://images.unsplash.com/photo-1624224730890-3e3c2b2c0e8c?auto=format&fit=crop&w=800&h=600&q=80',
   4.7, true, true, timezone('utc'::text, now()))
ON CONFLICT (id) DO NOTHING;

COMMIT;
