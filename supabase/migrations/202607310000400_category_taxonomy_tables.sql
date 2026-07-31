-- Migration: Normalized category taxonomy tables
-- Adds categories, subcategories, and links stores via category_id/subcategory_id

-- 1. categories table
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar TEXT NOT NULL,
  icon TEXT,
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. subcategories table
CREATE TABLE IF NOT EXISTS subcategories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  name_ar TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Add FK columns to stores (nullable for safety during migration)
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS subcategory_id UUID REFERENCES subcategories(id) ON DELETE SET NULL;

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_categories_display_order ON categories (display_order);
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON categories (is_active);
CREATE INDEX IF NOT EXISTS idx_subcategories_category_id ON subcategories (category_id);
CREATE INDEX IF NOT EXISTS idx_subcategories_display_order ON subcategories (display_order);
CREATE INDEX IF NOT EXISTS idx_subcategories_is_active ON subcategories (is_active);
CREATE INDEX IF NOT EXISTS idx_stores_category_id ON stores (category_id);
CREATE INDEX IF NOT EXISTS idx_stores_subcategory_id ON stores (subcategory_id);

-- 5. RLS policies (allow public read for active categories/subcategories)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcategories ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'categories' AND policyname = 'Public read active categories') THEN
    CREATE POLICY "Public read active categories" ON categories FOR SELECT USING (is_active = TRUE);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subcategories' AND policyname = 'Public read active subcategories') THEN
    CREATE POLICY "Public read active subcategories" ON subcategories FOR SELECT USING (is_active = TRUE);
  END IF;
END $$;

-- 6. Fallback backfill: map legacy string category to new category_id
-- Uses the same safe mapping strategy from store_taxonomy_phase1.sql
WITH mapped AS (
  SELECT s.id, c.id AS cat_id
  FROM stores s
  LEFT JOIN categories c ON LOWER(COALESCE(s.category, '')) IN (
    LOWER(c.name_ar)
  )
  WHERE s.category_id IS NULL
)
UPDATE stores
SET category_id = mapped.cat_id
FROM mapped
WHERE stores.id = mapped.id AND mapped.cat_id IS NOT NULL;

-- 7. For any remaining unmapped stores, default to 'other' category (to be created in seed)
UPDATE stores
SET category_id = (
  SELECT id FROM categories WHERE name_ar = 'أخرى' LIMIT 1
)
WHERE category_id IS NULL;
