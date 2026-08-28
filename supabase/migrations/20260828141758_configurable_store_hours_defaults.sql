-- Enforce the canonical default schedule for every store.
-- Keep closed_day unchanged; it remains the weekly exception field.
ALTER TABLE public.stores
  ALTER COLUMN opens_at SET DEFAULT '09:00:00'::time,
  ALTER COLUMN closes_at SET DEFAULT '22:00:00'::time;

UPDATE public.stores
SET opens_at = COALESCE(opens_at, '09:00:00'::time),
    closes_at = COALESCE(closes_at, '22:00:00'::time)
WHERE opens_at IS NULL OR closes_at IS NULL;

ALTER TABLE public.stores
  ALTER COLUMN opens_at SET NOT NULL,
  ALTER COLUMN closes_at SET NOT NULL;
