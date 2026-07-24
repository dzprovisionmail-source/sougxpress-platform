-- Migration: 202607240000200_store_videos_facebook_columns.sql
-- Purpose: Add Facebook oEmbed metadata columns to store_videos (Phase 1D-FB).
--           Idempotent — safe to run on existing databases with old rows.
--
-- Scope:
--   - Adds provider, normalized_url, embed_url, embed_html, thumbnail_url,
--     can_embed, meta_checked_at columns if they do not already exist.
--   - No NOT NULL constraints added (old rows may have nulls).
--   - No CHECK constraint added until existing rows are audited/cleaned.
--   - provider defaults to 'facebook' for new inserts; can_embed defaults to false.

BEGIN;

-- ============================================================================
-- 1. Add missing columns (idempotent via IF NOT EXISTS)
-- ============================================================================

ALTER TABLE public.store_videos
    ADD COLUMN IF NOT EXISTS provider text;

ALTER TABLE public.store_videos
    ADD COLUMN IF NOT EXISTS normalized_url text;

ALTER TABLE public.store_videos
    ADD COLUMN IF NOT EXISTS embed_url text;

ALTER TABLE public.store_videos
    ADD COLUMN IF NOT EXISTS embed_html text;

ALTER TABLE public.store_videos
    ADD COLUMN IF NOT EXISTS thumbnail_url text;

ALTER TABLE public.store_videos
    ADD COLUMN IF NOT EXISTS can_embed boolean NOT NULL DEFAULT false;

ALTER TABLE public.store_videos
    ADD COLUMN IF NOT EXISTS meta_checked_at timestamptz;

-- ============================================================================
-- 2. Update existing rows that have platform='facebook' but no provider set
-- ============================================================================

UPDATE public.store_videos
SET provider = 'facebook'
WHERE provider IS NULL
  AND platform = 'facebook';

UPDATE public.store_videos
SET provider = 'facebook'
WHERE provider IS NULL
  AND (url LIKE '%facebook.com%' OR url LIKE '%fb.watch%');

-- ============================================================================
-- 3. Refresh RLS policies to include the new columns in SELECT
--    (RLS policies use SELECT * so no policy changes needed for column adds)
-- ============================================================================

COMMIT;
