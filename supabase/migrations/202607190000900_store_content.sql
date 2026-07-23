-- Migration: 202607190000900_store_content.sql
-- Purpose: Add store gallery, store videos/social links, and demo flag for products.
--           Enables Founder-managed demo store content (Phase 1C).
--
-- Scope:
--   - store_gallery : store images with visibility, title, sort_order
--   - store_videos  : video/social links (TikTok, Facebook, Instagram, YouTube)
--   - products      : add is_demo flag

BEGIN;

-- ============================================================================
-- 1. store_gallery
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.store_gallery (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  title TEXT,
  is_visible BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_store_gallery_store_id ON public.store_gallery(store_id);
CREATE INDEX IF NOT EXISTS idx_store_gallery_visible ON public.store_gallery(is_visible);

-- ============================================================================
-- 2. store_videos
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.store_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title TEXT,
  platform TEXT NOT NULL DEFAULT 'youtube',
  is_visible BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_store_videos_store_id ON public.store_videos(store_id);
CREATE INDEX IF NOT EXISTS idx_store_videos_visible ON public.store_videos(is_visible);

-- Platform constraint
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'store_videos_platform_check'
          AND conrelid = 'public.store_videos'::regclass
    ) THEN
        ALTER TABLE public.store_videos
            ADD CONSTRAINT store_videos_platform_check
            CHECK (platform IN ('tiktok', 'facebook', 'instagram', 'youtube'));
    END IF;
END $$;

-- ============================================================================
-- 3. products — add is_demo
-- ============================================================================

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_products_is_demo ON public.products(is_demo);

-- ============================================================================
-- 4. RLS — store_gallery and store_videos
-- ============================================================================

ALTER TABLE public.store_gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_videos ENABLE ROW LEVEL SECURITY;

-- Public can view visible gallery/videos for active stores
DROP POLICY IF EXISTS rls_select_store_gallery ON public.store_gallery;
CREATE POLICY rls_select_store_gallery ON public.store_gallery
    FOR SELECT USING (
        store_id IN (
            SELECT id FROM public.stores WHERE status = 'active' AND deleted_at IS NULL
        )
        OR public.get_user_role(auth.uid()) IN ('admin', 'founder')
    );

DROP POLICY IF EXISTS rls_select_store_videos ON public.store_videos;
CREATE POLICY rls_select_store_videos ON public.store_videos
    FOR SELECT USING (
        store_id IN (
            SELECT id FROM public.stores WHERE status = 'active' AND deleted_at IS NULL
        )
        OR public.get_user_role(auth.uid()) IN ('admin', 'founder')
    );

-- Admin/founder can insert/update/delete
DROP POLICY IF EXISTS rls_insert_store_gallery ON public.store_gallery;
CREATE POLICY rls_insert_store_gallery ON public.store_gallery
    FOR INSERT WITH CHECK (
        public.get_user_role(auth.uid()) IN ('admin', 'founder')
    );

DROP POLICY IF EXISTS rls_update_store_gallery ON public.store_gallery;
CREATE POLICY rls_update_store_gallery ON public.store_gallery
    FOR UPDATE USING (
        public.get_user_role(auth.uid()) IN ('admin', 'founder')
    );

DROP POLICY IF EXISTS rls_delete_store_gallery ON public.store_gallery;
CREATE POLICY rls_delete_store_gallery ON public.store_gallery
    FOR DELETE USING (
        public.get_user_role(auth.uid()) IN ('admin', 'founder')
    );

DROP POLICY IF EXISTS rls_insert_store_videos ON public.store_videos;
CREATE POLICY rls_insert_store_videos ON public.store_videos
    FOR INSERT WITH CHECK (
        public.get_user_role(auth.uid()) IN ('admin', 'founder')
    );

DROP POLICY IF EXISTS rls_update_store_videos ON public.store_videos;
CREATE POLICY rls_update_store_videos ON public.store_videos
    FOR UPDATE USING (
        public.get_user_role(auth.uid()) IN ('admin', 'founder')
    );

DROP POLICY IF EXISTS rls_delete_store_videos ON public.store_videos;
CREATE POLICY rls_delete_store_videos ON public.store_videos
    FOR DELETE USING (
        public.get_user_role(auth.uid()) IN ('admin', 'founder')
    );

COMMIT;
