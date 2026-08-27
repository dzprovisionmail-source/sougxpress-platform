-- Optional weekly closing day for stores.
-- This migration is intentionally local-only for review; do not apply automatically.
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS closed_day text NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'stores_closed_day_check'
      AND conrelid = 'public.stores'::regclass
  ) THEN
    ALTER TABLE public.stores
      ADD CONSTRAINT stores_closed_day_check
      CHECK (
        closed_day IS NULL
        OR closed_day IN ('sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday')
      );
  END IF;
END;
$$;
