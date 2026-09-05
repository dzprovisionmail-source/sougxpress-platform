-- Add the independent "كتب وتعليم" taxonomy without changing existing categories.
-- Re-running this migration is safe and does not duplicate rows.

DO $$
DECLARE
  books_category_id UUID;
BEGIN
  SELECT id
    INTO books_category_id
  FROM categories
  WHERE name_ar = 'كتب وتعليم'
  ORDER BY created_at ASC
  LIMIT 1;

  IF books_category_id IS NULL THEN
    INSERT INTO categories (name_ar, icon, display_order, is_active)
    SELECT 'كتب وتعليم', 'book-outline', COALESCE(MAX(display_order), -1) + 1, TRUE
    FROM categories
    RETURNING id INTO books_category_id;
  END IF;

  INSERT INTO subcategories (category_id, name_ar, display_order, is_active)
  SELECT books_category_id, item.name_ar, item.display_order, TRUE
  FROM (VALUES
    ('مكتبة', 0),
    ('لوازم مدرسية', 1),
    ('كتب', 2),
    ('أدوات تعليمية', 3),
    ('لواحق إلكترونية', 4),
    ('كوسميتيك', 5)
  ) AS item(name_ar, display_order)
  WHERE NOT EXISTS (
    SELECT 1
    FROM subcategories existing
    WHERE existing.category_id = books_category_id
      AND existing.name_ar = item.name_ar
  );
END $$;
