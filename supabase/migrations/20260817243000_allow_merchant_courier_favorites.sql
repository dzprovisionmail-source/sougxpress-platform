-- Extend the merchant-owned favorites relation to include couriers.
-- customer_favorites remains customer-owned and is not changed.

BEGIN;

ALTER TABLE public.merchant_favorites
  DROP CONSTRAINT IF EXISTS merchant_favorites_target_type_check;

ALTER TABLE public.merchant_favorites
  ADD CONSTRAINT merchant_favorites_target_type_check
  CHECK (target_type IN ('customer', 'courier'));

CREATE OR REPLACE FUNCTION public.validate_merchant_favorite_target()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.target_type = 'courier' AND NOT EXISTS (
    SELECT 1
    FROM public.drivers d
    WHERE d.id = NEW.target_id
      AND d.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Courier favorite target is not an active courier';
  END IF;

  IF NEW.target_type = 'customer' AND NOT EXISTS (
    SELECT 1
    FROM public.customers c
    WHERE c.id = NEW.target_id
  ) THEN
    RAISE EXCEPTION 'Customer favorite target does not exist';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS merchant_favorites_validate_target
  ON public.merchant_favorites;

CREATE TRIGGER merchant_favorites_validate_target
  BEFORE INSERT OR UPDATE OF target_id, target_type
  ON public.merchant_favorites
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_merchant_favorite_target();

DROP POLICY IF EXISTS "Merchants can view their own favorites" ON public.merchant_favorites;
CREATE POLICY "Merchants can view their own favorites"
  ON public.merchant_favorites
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = merchant_id
    AND public.get_user_role(auth.uid()) = 'merchant'
  );

DROP POLICY IF EXISTS "Merchants can insert their own favorites" ON public.merchant_favorites;
CREATE POLICY "Merchants can insert their own favorites"
  ON public.merchant_favorites
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = merchant_id
    AND public.get_user_role(auth.uid()) = 'merchant'
  );

DROP POLICY IF EXISTS "Merchants can delete their own favorites" ON public.merchant_favorites;
CREATE POLICY "Merchants can delete their own favorites"
  ON public.merchant_favorites
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = merchant_id
    AND public.get_user_role(auth.uid()) = 'merchant'
  );

COMMIT;
