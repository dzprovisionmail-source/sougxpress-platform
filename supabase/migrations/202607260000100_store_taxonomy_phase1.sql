-- Phase 1 Migration: Add structural taxonomy and metadata columns to stores table
-- Preserves existing legacy 'category' column unchanged.
-- Persists stable lowercase slugs in main_category and sub_category.

-- 1. Add new columns
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS main_category TEXT,
  ADD COLUMN IF NOT EXISTS sub_category TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  ADD COLUMN IF NOT EXISTS badges TEXT[] NOT NULL DEFAULT '{}'::TEXT[];

-- 2. Backfill main_category using explicit safe legacy mapping strategy to stable lowercase slugs
UPDATE stores
SET main_category = CASE
  WHEN LOWER(category) IN ('restaurant', 'food', 'fast_food', 'cafe', 'bakery', 'مخبوزات') THEN 'food_dining'
  WHEN LOWER(category) IN ('grocery', 'supermarket', 'convenience', 'market', 'butcher', 'خضروات', 'فواكه', 'لحوم', 'ألبان') THEN 'groceries'
  WHEN LOWER(category) IN ('clothing', 'fashion', 'apparel', 'shoes', 'boutique') THEN 'fashion'
  WHEN LOWER(category) IN ('electronics', 'tech', 'phones', 'computers') THEN 'electronics'
  WHEN LOWER(category) IN ('pharmacy', 'health', 'medical', 'beauty') THEN 'health_beauty'
  WHEN LOWER(category) IN ('household') THEN 'household'
  ELSE 'other'
END
WHERE main_category IS NULL;

-- 3. Required indexes
CREATE INDEX IF NOT EXISTS idx_stores_main_category ON stores (main_category);

CREATE INDEX IF NOT EXISTS idx_stores_sub_category ON stores (sub_category) 
  WHERE sub_category IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_stores_tags ON stores USING GIN (tags);

CREATE INDEX IF NOT EXISTS idx_stores_badges ON stores USING GIN (badges);
