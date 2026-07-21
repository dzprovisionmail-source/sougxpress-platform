-- Migration: 202607190000700_store_columns_fix.sql
-- Purpose: Add missing columns to stores table expected by Founder Platform.

ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS cover_url TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS is_new BOOLEAN DEFAULT FALSE NOT NULL;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE NOT NULL;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS show_on_home BOOLEAN DEFAULT FALSE NOT NULL;
