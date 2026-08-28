-- Favorite-only commercial contact rules requested by the founder.
-- Local change only in this phase; apply to staging only after audit approval.
BEGIN;

ALTER TABLE public.merchant_favorites
  DROP CONSTRAINT IF EXISTS merchant_favorites_target_type_check;
ALTER TABLE public.merchant_favorites
  ADD CONSTRAINT merchant_favorites_target_type_check
  CHECK (target_type IN ('customer', 'courier', 'merchant'));

ALTER TABLE public.courier_favorites
  DROP CONSTRAINT IF EXISTS courier_favorites_target_type_check;
ALTER TABLE public.courier_favorites
  ADD CONSTRAINT courier_favorites_target_type_check
  CHECK (target_type IN ('store', 'customer', 'courier'));

CREATE OR REPLACE FUNCTION public.validate_merchant_favorite_target()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.target_type = 'courier' AND NOT EXISTS (
    SELECT 1 FROM public.drivers d
    WHERE d.id = NEW.target_id AND d.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Courier favorite target is not an active courier';
  ELSIF NEW.target_type = 'customer' AND NOT EXISTS (
    SELECT 1 FROM public.customers c WHERE c.id = NEW.target_id
  ) THEN
    RAISE EXCEPTION 'Customer favorite target does not exist';
  ELSIF NEW.target_type = 'merchant' AND NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = NEW.target_id AND p.role = 'merchant'
  ) THEN
    RAISE EXCEPTION 'Merchant favorite target does not exist';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_courier_favorite_target()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.target_type = 'store' AND NOT EXISTS (
    SELECT 1 FROM public.stores s WHERE s.id = NEW.target_id
  ) THEN
    RAISE EXCEPTION 'Store favorite target does not exist';
  ELSIF NEW.target_type = 'customer' AND NOT EXISTS (
    SELECT 1 FROM public.customers c WHERE c.id = NEW.target_id
  ) THEN
    RAISE EXCEPTION 'Customer favorite target does not exist';
  ELSIF NEW.target_type = 'courier' AND NOT EXISTS (
    SELECT 1 FROM public.drivers d
    WHERE d.id = NEW.target_id AND d.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Courier favorite target is not an active courier';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS courier_favorites_validate_target ON public.courier_favorites;
CREATE TRIGGER courier_favorites_validate_target
  BEFORE INSERT OR UPDATE OF target_id, target_type
  ON public.courier_favorites
  FOR EACH ROW EXECUTE FUNCTION public.validate_courier_favorite_target();

CREATE OR REPLACE FUNCTION public.can_start_chat(
  p_user_a UUID,
  p_user_b UUID,
  p_relationship_type TEXT,
  p_reference_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role_a TEXT;
  v_role_b TEXT;
  v_customer UUID;
  v_merchant UUID;
  v_driver UUID;
BEGIN
  SELECT role INTO v_role_a FROM public.profiles WHERE id = p_user_a;
  SELECT role INTO v_role_b FROM public.profiles WHERE id = p_user_b;

  IF p_relationship_type = 'merchant_merchant' THEN
    RETURN v_role_a = 'merchant' AND v_role_b = 'merchant' AND (
      EXISTS (SELECT 1 FROM public.merchant_favorites mf
              WHERE mf.merchant_id = p_user_a AND mf.target_type = 'merchant' AND mf.target_id = p_user_b)
      OR EXISTS (SELECT 1 FROM public.merchant_favorites mf
                 WHERE mf.merchant_id = p_user_b AND mf.target_type = 'merchant' AND mf.target_id = p_user_a)
    );
  END IF;

  IF p_relationship_type = 'courier_courier' THEN
    RETURN v_role_a IN ('driver', 'courier') AND v_role_b IN ('driver', 'courier') AND (
      EXISTS (SELECT 1 FROM public.courier_favorites cf
              WHERE cf.courier_id = p_user_a AND cf.target_type = 'courier' AND cf.target_id = p_user_b)
      OR EXISTS (SELECT 1 FROM public.courier_favorites cf
                 WHERE cf.courier_id = p_user_b AND cf.target_type = 'courier' AND cf.target_id = p_user_a)
    );
  END IF;

  IF p_relationship_type = 'customer_merchant' THEN
    IF NOT ((v_role_a = 'customer' AND v_role_b = 'merchant') OR
            (v_role_b = 'customer' AND v_role_a = 'merchant')) THEN RETURN false; END IF;
    v_customer := CASE WHEN v_role_a = 'customer' THEN p_user_a ELSE p_user_b END;
    v_merchant := CASE WHEN v_role_a = 'merchant' THEN p_user_a ELSE p_user_b END;
    RETURN EXISTS (
      SELECT 1 FROM public.merchant_favorites mf
      WHERE mf.merchant_id = v_merchant AND mf.target_type = 'customer' AND mf.target_id = v_customer
    ) OR EXISTS (
      SELECT 1 FROM public.customer_favorites cf
      JOIN public.stores s ON s.id = cf.target_id
      WHERE cf.customer_id = v_customer AND cf.target_type = 'store' AND s.merchant_id = v_merchant
    );
  END IF;

  IF p_relationship_type = 'customer_courier' THEN
    IF NOT ((v_role_a = 'customer' AND v_role_b IN ('driver', 'courier')) OR
            (v_role_b = 'customer' AND v_role_a IN ('driver', 'courier'))) THEN RETURN false; END IF;
    v_customer := CASE WHEN v_role_a = 'customer' THEN p_user_a ELSE p_user_b END;
    v_driver := CASE WHEN v_role_a IN ('driver', 'courier') THEN p_user_a ELSE p_user_b END;
    RETURN EXISTS (
      SELECT 1 FROM public.favorite_couriers fc
      WHERE fc.user_id = v_customer AND fc.courier_id = v_driver
    ) OR EXISTS (
      SELECT 1 FROM public.courier_favorites cf
      WHERE cf.courier_id = v_driver AND cf.target_type = 'customer' AND cf.target_id = v_customer
    );
  END IF;

  IF p_relationship_type = 'merchant_courier' THEN
    IF NOT ((v_role_a = 'merchant' AND v_role_b IN ('driver', 'courier')) OR
            (v_role_b = 'merchant' AND v_role_a IN ('driver', 'courier'))) THEN RETURN false; END IF;
    v_merchant := CASE WHEN v_role_a = 'merchant' THEN p_user_a ELSE p_user_b END;
    v_driver := CASE WHEN v_role_a IN ('driver', 'courier') THEN p_user_a ELSE p_user_b END;
    RETURN EXISTS (
      SELECT 1 FROM public.merchant_favorites mf
      WHERE mf.merchant_id = v_merchant AND mf.target_type = 'courier' AND mf.target_id = v_driver
    ) OR EXISTS (
      SELECT 1 FROM public.courier_favorites cf
      JOIN public.stores s ON s.id = cf.target_id
      WHERE cf.courier_id = v_driver AND cf.target_type = 'store' AND s.merchant_id = v_merchant
    );
  END IF;

  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.can_contact_permanently(p_target_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = p_target_id;
  IF v_role = 'merchant' THEN
    RETURN EXISTS (SELECT 1 FROM public.merchant_favorites WHERE merchant_id = auth.uid() AND target_type = 'merchant' AND target_id = p_target_id)
      OR EXISTS (SELECT 1 FROM public.merchant_favorites WHERE merchant_id = p_target_id AND target_type = 'merchant' AND target_id = auth.uid());
  ELSIF v_role IN ('driver', 'courier') THEN
    RETURN EXISTS (SELECT 1 FROM public.courier_favorites WHERE courier_id = auth.uid() AND target_type = 'courier' AND target_id = p_target_id)
      OR EXISTS (SELECT 1 FROM public.courier_favorites WHERE courier_id = p_target_id AND target_type = 'courier' AND target_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.merchant_favorites WHERE merchant_id = auth.uid() AND target_type = 'courier' AND target_id = p_target_id)
      OR EXISTS (SELECT 1 FROM public.courier_favorites WHERE courier_id = p_target_id AND target_type = 'store');
  ELSE
    RETURN EXISTS (SELECT 1 FROM public.merchant_favorites WHERE merchant_id = auth.uid() AND target_type = 'customer' AND target_id = p_target_id)
      OR EXISTS (SELECT 1 FROM public.courier_favorites WHERE courier_id = auth.uid() AND target_type = 'customer' AND target_id = p_target_id)
      OR EXISTS (SELECT 1 FROM public.favorite_couriers WHERE user_id = p_target_id AND courier_id = auth.uid());
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_start_chat(UUID, UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_contact_permanently(UUID) TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
