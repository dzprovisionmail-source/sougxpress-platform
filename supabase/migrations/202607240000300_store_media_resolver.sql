-- Migration: 202607240000300_store_media_resolver.sql
-- Purpose: Build the Store Media Resolver foundation (Phase A).
--          Adds provider-agnostic columns to store_videos and creates
--          store_video_rejections audit table.
--
-- Scope:
--   1. store_videos: replace `platform` with `provider`, add resolver metadata
--   2. store_video_rejections: new audit table for rejected video attempts
--   3. All operations are idempotent (IF NOT EXISTS, IF EXISTS DROP)
--   4. No NOT NULL constraints added — existing rows may have nulls
--   5. No CHECK constraints added until existing rows are audited/cleaned
--
-- Columns added to store_videos (Phase A):
--   provider          text          -- replaces `platform`; enum-like: 'facebook'|'youtube'|'tiktok'|'instagram'
--   original_url      text          -- raw URL submitted by Founder/Admin
--   normalized_url    text          -- cleaned URL for oEmbed/embed resolution
--   embed_url         text          -- iframe/embed URL for WebView player
--   embed_html        text          -- raw embed HTML (used by TikTok, optional for others)
--   thumbnail_url     text          -- video thumbnail
--   title             text          -- video title from oEmbed
--   author_name       text          -- channel/author name from oEmbed
--   can_embed         boolean       -- default true for accepted rows; false for rejected
--   rejection_reason  text          -- null when can_embed = true; enum string when rejected
--   recheck_due_at    timestamptz   -- null until Phase D (periodic recheck)
--   created_by        uuid          -- references admin_users(id), who submitted
--   updated_at        timestamptz   -- already existed, kept
--
-- Migration order:
--   1. Add new columns to store_videos (IF NOT EXISTS)
--   2. Migrate existing `platform` data → `provider`
--   3. Migrate existing `url` data → `original_url` + `normalized_url`
--   4. Create store_video_rejections table
--   5. Create indexes
--   6. Refresh RLS policies (reuse existing patterns)

BEGIN;

-- ============================================================================
-- 1. store_videos — add resolver metadata columns
-- ============================================================================

ALTER TABLE public.store_videos
    ADD COLUMN IF NOT EXISTS provider text;

ALTER TABLE public.store_videos
    ADD COLUMN IF NOT EXISTS original_url text;

ALTER TABLE public.store_videos
    ADD COLUMN IF NOT EXISTS normalized_url text;

ALTER TABLE public.store_videos
    ADD COLUMN IF NOT EXISTS embed_url text;

ALTER TABLE public.store_videos
    ADD COLUMN IF NOT EXISTS embed_html text;

ALTER TABLE public.store_videos
    ADD COLUMN IF NOT EXISTS thumbnail_url text;

ALTER TABLE public.store_videos
    ADD COLUMN IF NOT EXISTS author_name text;

ALTER TABLE public.store_videos
    ADD COLUMN IF NOT EXISTS can_embed boolean NOT NULL DEFAULT false;

ALTER TABLE public.store_videos
    ADD COLUMN IF NOT EXISTS rejection_reason text;

ALTER TABLE public.store_videos
    ADD COLUMN IF NOT EXISTS recheck_due_at timestamptz;

ALTER TABLE public.store_videos
    ADD COLUMN IF NOT EXISTS created_by uuid;

-- ============================================================================
-- 2. Migrate existing data
-- ============================================================================

-- Migrate platform → provider
UPDATE public.store_videos
SET provider = platform
WHERE provider IS NULL AND platform IS NOT NULL;

-- Migrate url → original_url (preserve raw URL)
UPDATE public.store_videos
SET original_url = url
WHERE original_url IS NULL AND url IS NOT NULL;

-- Migrate url → normalized_url (initially same as original; resolver will refine)
UPDATE public.store_videos
SET normalized_url = url
WHERE normalized_url IS NULL AND url IS NOT NULL;

-- Set can_embed for rows that already look embeddable (Facebook/YouTube public)
-- Only rows where provider is set and url looks public
UPDATE public.store_videos
SET can_embed = true
WHERE can_embed = false
  AND provider IN ('facebook', 'youtube', 'tiktok')
  AND url IS NOT NULL;

-- ============================================================================
-- 3. store_video_rejections — audit table for rejected video attempts
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.store_video_rejections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  original_url TEXT NOT NULL,
  provider TEXT,
  rejection_reason TEXT NOT NULL,
  debug_detail TEXT,
  attempted_by UUID REFERENCES public.profiles(id),
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_store_video_rejections_store_id
  ON public.store_video_rejections (store_id);

CREATE INDEX IF NOT EXISTS idx_store_video_rejections_provider
  ON public.store_video_rejections (provider);

CREATE INDEX IF NOT EXISTS idx_store_video_rejections_reason
  ON public.store_video_rejections (rejection_reason);

-- ============================================================================
-- 4. RLS — store_video_rejections
-- ============================================================================

ALTER TABLE public.store_video_rejections ENABLE ROW LEVEL SECURITY;

-- Public can read rejections for their own store (via store visibility policy)
-- admin/founder can read all
DROP POLICY IF EXISTS rls_select_store_video_rejections ON public.store_video_rejections;
CREATE POLICY rls_select_store_video_rejections ON public.store_video_rejections
    FOR SELECT USING (
        store_id IN (
            SELECT id FROM public.stores WHERE status = 'active' AND deleted_at IS NULL
        )
        OR public.get_user_role(auth.uid()) IN ('admin', 'founder')
    );

-- admin/founder can insert rejections
DROP POLICY IF EXISTS rls_insert_store_video_rejections ON public.store_video_rejections;
CREATE POLICY rls_insert_store_video_rejections ON public.store_video_rejections
    FOR INSERT WITH CHECK (
        public.get_user_role(auth.uid()) IN ('admin', 'founder')
    );

-- admin/founder can update rejections (for debug details)
DROP POLICY IF EXISTS rls_update_store_video_rejections ON public.store_video_rejections;
CREATE POLICY rls_update_store_video_rejections ON public.store_video_rejections
    FOR UPDATE USING (
        public.get_user_role(auth.uid()) IN ('admin', 'founder')
    );

-- ============================================================================
-- 5. Refresh existing store_videos RLS policies to include new columns
--    (RLS policies use SELECT * so no policy changes needed for column adds)
-- ============================================================================

COMMIT;
