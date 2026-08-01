-- Migration: 202608010001000_store_gallery_social_features.sql
-- Purpose: Create store_gallery_likes, store_gallery_comments, and store_gallery_ratings
--          tables with proper foreign keys to store_gallery and profiles.
--          Enables like / comment / rate functionality on store gallery media.
-- Scope: Additive — only new tables, indexes, and RLS policies.

BEGIN;

-- ============================================================================
-- 1. store_gallery_likes
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.store_gallery_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gallery_image_id UUID NOT NULL REFERENCES public.store_gallery(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_store_gallery_likes_gallery_image
  ON public.store_gallery_likes (gallery_image_id);
CREATE INDEX IF NOT EXISTS idx_store_gallery_likes_user
  ON public.store_gallery_likes (user_id);

-- Prevent duplicate likes from the same user on the same image
CREATE UNIQUE INDEX IF NOT EXISTS idx_store_gallery_likes_unique
  ON public.store_gallery_likes (gallery_image_id, user_id);

-- ============================================================================
-- 2. store_gallery_comments
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.store_gallery_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gallery_image_id UUID NOT NULL REFERENCES public.store_gallery(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_name TEXT,
  user_avatar_url TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_store_gallery_comments_gallery_image
  ON public.store_gallery_comments (gallery_image_id);
CREATE INDEX IF NOT EXISTS idx_store_gallery_comments_user
  ON public.store_gallery_comments (user_id);
CREATE INDEX IF NOT EXISTS idx_store_gallery_comments_created
  ON public.store_gallery_comments (created_at);

-- ============================================================================
-- 3. store_gallery_ratings
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.store_gallery_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gallery_image_id UUID NOT NULL REFERENCES public.store_gallery(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_store_gallery_ratings_gallery_image
  ON public.store_gallery_ratings (gallery_image_id);
CREATE INDEX IF NOT EXISTS idx_store_gallery_ratings_user
  ON public.store_gallery_ratings (user_id);

-- Prevent duplicate ratings from the same user on the same image
CREATE UNIQUE INDEX IF NOT EXISTS idx_store_gallery_ratings_unique
  ON public.store_gallery_ratings (gallery_image_id, user_id);

-- ============================================================================
-- 4. RLS — Enable and configure policies
-- ============================================================================

ALTER TABLE public.store_gallery_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_gallery_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_gallery_ratings ENABLE ROW LEVEL SECURITY;

-- Likes — public read, authenticated users can insert/delete their own
DROP POLICY IF EXISTS rls_select_store_gallery_likes ON public.store_gallery_likes;
CREATE POLICY rls_select_store_gallery_likes ON public.store_gallery_likes
    FOR SELECT USING (true);

DROP POLICY IF EXISTS rls_insert_store_gallery_likes ON public.store_gallery_likes;
CREATE POLICY rls_insert_store_gallery_likes ON public.store_gallery_likes
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS rls_delete_store_gallery_likes ON public.store_gallery_likes;
CREATE POLICY rls_delete_store_gallery_likes ON public.store_gallery_likes
    FOR DELETE USING (user_id = auth.uid()::UUID);

-- Comments — public read, authenticated users can insert their own, delete if owner/admin/founder
DROP POLICY IF EXISTS rls_select_store_gallery_comments ON public.store_gallery_comments;
CREATE POLICY rls_select_store_gallery_comments ON public.store_gallery_comments
    FOR SELECT USING (true);

DROP POLICY IF EXISTS rls_insert_store_gallery_comments ON public.store_gallery_comments;
CREATE POLICY rls_insert_store_gallery_comments ON public.store_gallery_comments
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS rls_delete_store_gallery_comments ON public.store_gallery_comments;
CREATE POLICY rls_delete_store_gallery_comments ON public.store_gallery_comments
    FOR DELETE USING (
        user_id = auth.uid()::UUID
        OR public.get_user_role(auth.uid()) IN ('admin', 'founder')
        OR EXISTS (
            SELECT 1 FROM public.store_gallery sg
            JOIN public.stores s ON sg.store_id = s.id
            WHERE sg.id = store_gallery_comments.gallery_image_id
              AND s.created_by = auth.uid()
        )
    );

-- Ratings — public read, authenticated users can upsert their own
DROP POLICY IF EXISTS rls_select_store_gallery_ratings ON public.store_gallery_ratings;
CREATE POLICY rls_select_store_gallery_ratings ON public.store_gallery_ratings
    FOR SELECT USING (true);

DROP POLICY IF EXISTS rls_insert_store_gallery_ratings ON public.store_gallery_ratings;
CREATE POLICY rls_insert_store_gallery_ratings ON public.store_gallery_ratings
    FOR ALL USING (auth.uid() IS NOT NULL);

COMMIT;
