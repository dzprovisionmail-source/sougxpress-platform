-- Migration: 202607240000300_store_video_rejections_and_missing_columns.sql
-- Purpose: Add missing store_videos metadata columns and create store_video_rejections table.
--           Idempotent — safe to run on existing databases with old rows.
--
-- Scope:
--   - Adds author_name, rejection_reason, recheck_due_at, created_by columns
--   - Creates store_video_rejections audit table
--   - Backfills provider from platform where provider is null
--   - No strict NOT NULL or CHECK constraints on new columns

BEGIN;

-- ============================================================================
-- 1. Add missing columns to store_videos (idempotent)
-- ============================================================================

ALTER TABLE public.store_videos
    ADD COLUMN IF NOT EXISTS author_name text;

ALTER TABLE public.store_videos
    ADD COLUMN IF NOT EXISTS rejection_reason text;

ALTER TABLE public.store_videos
    ADD COLUMN IF NOT EXISTS recheck_due_at timestamptz;

ALTER TABLE public.store_videos
    ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id);

-- ============================================================================
-- 2. Backfill provider from platform where provider is null
-- ============================================================================

UPDATE public.store_videos
SET provider = platform
WHERE provider IS NULL
  AND platform IS NOT NULL;

-- ============================================================================
-- 3. Create store_video_rejections table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.store_video_rejections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  provider text,
  original_url text NOT NULL,
  reason text NOT NULL,
  message_ar text NOT NULL,
  debug_detail text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_store_video_rejections_store_id
  ON public.store_video_rejections(store_id);

-- ============================================================================
-- 4. RLS for store_video_rejections
-- ============================================================================

ALTER TABLE public.store_video_rejections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_select_store_video_rejections ON public.store_video_rejections;
CREATE POLICY rls_select_store_video_rejections ON public.store_video_rejections
    FOR SELECT USING (
        public.get_user_role(auth.uid()) IN ('admin', 'founder')
    );

DROP POLICY IF EXISTS rls_insert_store_video_rejections ON public.store_video_rejections;
CREATE POLICY rls_insert_store_video_rejections ON public.store_video_rejections
    FOR INSERT WITH CHECK (
        public.get_user_role(auth.uid()) IN ('admin', 'founder')
    );

COMMIT;
