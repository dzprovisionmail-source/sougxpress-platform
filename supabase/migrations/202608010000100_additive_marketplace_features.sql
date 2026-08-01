-- Migration: 202608010000100_additive_marketplace_features.sql
-- Purpose: Additive marketplace features — gallery captions, comments, courier profiles,
--          customer favorites, and public read RLS policies.
-- Note: This migration is strictly additive. No existing columns/tables are dropped or altered.

BEGIN;

-- ============================================================================
-- 1. Gallery Captions — add caption to store_gallery
-- ============================================================================

ALTER TABLE public.store_gallery
  ADD COLUMN IF NOT EXISTS caption VARCHAR(50);

-- ============================================================================
-- 2. Social Comments Table — gallery_comments
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.gallery_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  user_id UUID NOT NULL,
  user_role TEXT NOT NULL,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gallery_comments_target
  ON public.gallery_comments (target_type, target_id);

CREATE INDEX IF NOT EXISTS idx_gallery_comments_user
  ON public.gallery_comments (user_id);

-- ============================================================================
-- 3. Courier Profiles Table — courier_profiles
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.courier_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  vehicle_type TEXT,
  phone_number TEXT,
  coverage_zones TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_courier_profiles_user_id
  ON public.courier_profiles (user_id);

CREATE INDEX IF NOT EXISTS idx_courier_profiles_active
  ON public.courier_profiles (is_active);

-- ============================================================================
-- 4. Customer Favorites — ensure table exists (idempotent) and add public read policy
-- ============================================================================

-- Create table with new schema if it does not exist
CREATE TABLE IF NOT EXISTS public.customer_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (customer_id, target_type, target_id)
);

-- Add columns to existing table if missing (additive, no drop/rename)
ALTER TABLE public.customer_favorites
  ADD COLUMN IF NOT EXISTS target_type TEXT,
  ADD COLUMN IF NOT EXISTS target_id UUID;

-- Drop and recreate unique constraint to cover new columns if possible
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'customer_favorites_customer_id_target_type_target_id_key'
      AND conrelid = 'public.customer_favorites'::regclass
  ) THEN
    ALTER TABLE public.customer_favorites
      DROP CONSTRAINT customer_favorites_customer_id_target_type_target_id_key;
  END IF;
END $$;

ALTER TABLE public.customer_favorites
  ADD CONSTRAINT customer_favorites_customer_id_target_type_target_id_key
  UNIQUE (customer_id, target_type, target_id);

-- Create indexes only if columns exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'customer_favorites'
      AND column_name = 'customer_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_customer_favorites_customer
      ON public.customer_favorites (customer_id);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'customer_favorites'
      AND column_name = 'target_type'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'customer_favorites'
      AND column_name = 'target_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_customer_favorites_target
      ON public.customer_favorites (target_type, target_id);
  END IF;
END $$;

-- ============================================================================
-- 5. RLS — Enable and Public Read Policies
-- ============================================================================

-- categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_select_categories ON public.categories;
CREATE POLICY rls_select_categories ON public.categories
  FOR SELECT USING (true);

-- subcategories
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_select_subcategories ON public.subcategories;
CREATE POLICY rls_select_subcategories ON public.subcategories
  FOR SELECT USING (true);

-- stores
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_select_stores ON public.stores;
CREATE POLICY rls_select_stores ON public.stores
  FOR SELECT USING (true);

-- store_gallery
ALTER TABLE public.store_gallery ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_select_store_gallery ON public.store_gallery;
CREATE POLICY rls_select_store_gallery ON public.store_gallery
  FOR SELECT USING (true);

-- gallery_comments
ALTER TABLE public.gallery_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_select_gallery_comments ON public.gallery_comments;
CREATE POLICY rls_select_gallery_comments ON public.gallery_comments
  FOR SELECT USING (true);

-- courier_profiles
ALTER TABLE public.courier_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_select_courier_profiles ON public.courier_profiles;
CREATE POLICY rls_select_courier_profiles ON public.courier_profiles
  FOR SELECT USING (true);

-- customer_favorites
ALTER TABLE public.customer_favorites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_select_customer_favorites ON public.customer_favorites;
CREATE POLICY rls_select_customer_favorites ON public.customer_favorites
  FOR SELECT USING (true);

COMMIT;
