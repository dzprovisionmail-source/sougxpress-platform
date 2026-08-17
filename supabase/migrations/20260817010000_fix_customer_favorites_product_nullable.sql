-- Allow customer_favorites to represent stores as well as products.
-- Product favorites continue to populate product_id; store favorites use target_type/target_id.
ALTER TABLE public.customer_favorites
  ALTER COLUMN product_id DROP NOT NULL;

COMMENT ON COLUMN public.customer_favorites.product_id IS
  'Legacy/product favorite reference; nullable for store favorites represented by target_type and target_id.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.customer_favorites'::regclass
      AND conname = 'customer_favorites_target_reference_check'
  ) THEN
    ALTER TABLE public.customer_favorites
      ADD CONSTRAINT customer_favorites_target_reference_check
      CHECK (
        (target_type IS NOT NULL AND target_id IS NOT NULL)
        OR product_id IS NOT NULL
      );
  END IF;
END $$;

COMMENT ON CONSTRAINT customer_favorites_target_reference_check ON public.customer_favorites IS
  'Every favorite must reference either a legacy product_id or a target_type/target_id pair.';

NOTIFY pgrst, 'reload schema';
