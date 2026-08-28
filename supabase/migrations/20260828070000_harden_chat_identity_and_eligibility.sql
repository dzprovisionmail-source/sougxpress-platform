BEGIN;

CREATE OR REPLACE FUNCTION public.resolve_chat_participant_profile(
  p_raw_id uuid,
  p_relationship_type text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_profile_id uuid;
  v_email text;
BEGIN
  IF p_raw_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT p.id INTO v_profile_id
  FROM public.profiles p
  WHERE p.id = p_raw_id
  LIMIT 1;
  IF v_profile_id IS NOT NULL THEN
    RETURN v_profile_id;
  END IF;

  -- Store favorites and order screens may provide stores.id. Resolve the
  -- store owner directly before falling back to legacy role-table IDs.
  IF p_relationship_type IN ('customer_merchant', 'merchant_merchant', 'merchant_courier') THEN
    SELECT COALESCE(
      CASE WHEN s.created_by IN (SELECT id FROM public.profiles) THEN s.created_by END,
      owner_profile.id
    ) INTO v_profile_id
    FROM public.stores s
    LEFT JOIN public.merchants m ON m.id = s.merchant_id
    LEFT JOIN public.profiles owner_profile
      ON lower(trim(owner_profile.email)) = lower(trim(m.email))
    WHERE s.id = p_raw_id
    LIMIT 1;
    IF v_profile_id IS NOT NULL THEN
      RETURN v_profile_id;
    END IF;

    SELECT lower(trim(m.email)) INTO v_email
    FROM public.merchants m
    WHERE m.id = p_raw_id
    LIMIT 1;
  ELSE
    SELECT lower(trim(d.email)) INTO v_email
    FROM public.drivers d
    WHERE d.id = p_raw_id
    LIMIT 1;
  END IF;

  IF v_email IS NULL OR v_email = '' THEN
    RETURN NULL;
  END IF;

  SELECT p.id INTO v_profile_id
  FROM public.profiles p
  WHERE lower(trim(p.email)) = v_email
  LIMIT 1;
  RETURN v_profile_id;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_chat_participant_profile(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_chat_participant_profile(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.can_start_chat(
  p_user_a uuid,
  p_user_b uuid,
  p_relationship_type text,
  p_reference_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role_a text;
  v_role_b text;
  v_customer_id uuid;
  v_merchant_profile_id uuid;
  v_merchant_id uuid;
  v_driver_profile_id uuid;
  v_driver_id uuid;
BEGIN
  SELECT role INTO v_role_a FROM public.profiles WHERE id = p_user_a;
  SELECT role INTO v_role_b FROM public.profiles WHERE id = p_user_b;

  IF p_relationship_type = 'customer_merchant' THEN
    IF NOT ((v_role_a = 'customer' AND v_role_b = 'merchant') OR (v_role_b = 'customer' AND v_role_a = 'merchant')) THEN
      RETURN false;
    END IF;
    v_customer_id := CASE WHEN v_role_a = 'customer' THEN p_user_a ELSE p_user_b END;
    v_merchant_profile_id := CASE WHEN v_role_a = 'merchant' THEN p_user_a ELSE p_user_b END;
    SELECT m.id INTO v_merchant_id
    FROM public.merchants m JOIN public.profiles p ON lower(trim(p.email)) = lower(trim(m.email))
    WHERE p.id = v_merchant_profile_id LIMIT 1;

    IF p_reference_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.orders o JOIN public.stores s ON s.id = o.store_id
      WHERE o.id = p_reference_id AND o.customer_id = v_customer_id
        AND (s.merchant_id = v_merchant_id OR s.merchant_id = v_merchant_profile_id OR s.created_by = v_merchant_profile_id)
    ) THEN RETURN true; END IF;

    RETURN EXISTS (
      SELECT 1 FROM public.customer_favorites cf JOIN public.stores s ON s.id = cf.target_id
      WHERE cf.customer_id = v_customer_id AND cf.target_type = 'store'
        AND (s.merchant_id = v_merchant_id OR s.merchant_id = v_merchant_profile_id OR s.created_by = v_merchant_profile_id)
    ) OR EXISTS (
      SELECT 1 FROM public.merchant_favorites mf
      WHERE mf.merchant_id = v_merchant_profile_id AND mf.target_type = 'customer' AND mf.target_id = v_customer_id
    ) OR EXISTS (
      SELECT 1 FROM public.orders o JOIN public.stores s ON s.id = o.store_id
      WHERE o.customer_id = v_customer_id
        AND (s.merchant_id = v_merchant_id OR s.merchant_id = v_merchant_profile_id OR s.created_by = v_merchant_profile_id)
    );
  END IF;

  IF p_relationship_type = 'customer_courier' THEN
    IF NOT ((v_role_a = 'customer' AND v_role_b IN ('driver','courier')) OR (v_role_b = 'customer' AND v_role_a IN ('driver','courier'))) THEN
      RETURN false;
    END IF;
    v_customer_id := CASE WHEN v_role_a = 'customer' THEN p_user_a ELSE p_user_b END;
    v_driver_profile_id := CASE WHEN v_role_a IN ('driver','courier') THEN p_user_a ELSE p_user_b END;
    SELECT d.id INTO v_driver_id FROM public.drivers d JOIN public.profiles p ON lower(trim(p.email)) = lower(trim(d.email))
    WHERE p.id = v_driver_profile_id LIMIT 1;

    IF p_reference_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.delivery_assignments da JOIN public.orders o ON o.id = da.order_id
      WHERE (o.id = p_reference_id OR da.order_id = p_reference_id) AND o.customer_id = v_customer_id
        AND (da.driver_id = v_driver_id OR da.driver_id = v_driver_profile_id)
    ) THEN RETURN true; END IF;

    RETURN EXISTS (SELECT 1 FROM public.favorite_couriers fc WHERE fc.user_id = v_customer_id AND (fc.courier_id = v_driver_id OR fc.courier_id = v_driver_profile_id))
      OR EXISTS (SELECT 1 FROM public.courier_favorites cf WHERE (cf.courier_id = v_driver_id OR cf.courier_id = v_driver_profile_id) AND cf.target_type = 'customer' AND cf.target_id = v_customer_id)
      OR EXISTS (SELECT 1 FROM public.delivery_assignments da JOIN public.orders o ON o.id = da.order_id WHERE o.customer_id = v_customer_id AND (da.driver_id = v_driver_id OR da.driver_id = v_driver_profile_id));
  END IF;

  IF p_relationship_type = 'merchant_courier' THEN
    IF NOT ((v_role_a = 'merchant' AND v_role_b IN ('driver','courier')) OR (v_role_b = 'merchant' AND v_role_a IN ('driver','courier'))) THEN
      RETURN false;
    END IF;
    v_merchant_profile_id := CASE WHEN v_role_a = 'merchant' THEN p_user_a ELSE p_user_b END;
    v_driver_profile_id := CASE WHEN v_role_a IN ('driver','courier') THEN p_user_a ELSE p_user_b END;
    SELECT m.id INTO v_merchant_id FROM public.merchants m JOIN public.profiles p ON lower(trim(p.email)) = lower(trim(m.email)) WHERE p.id = v_merchant_profile_id LIMIT 1;
    SELECT d.id INTO v_driver_id FROM public.drivers d JOIN public.profiles p ON lower(trim(p.email)) = lower(trim(d.email)) WHERE p.id = v_driver_profile_id LIMIT 1;

    IF p_reference_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.delivery_assignments da JOIN public.orders o ON o.id = da.order_id JOIN public.stores s ON s.id = o.store_id
      WHERE (o.id = p_reference_id OR da.order_id = p_reference_id)
        AND (s.merchant_id = v_merchant_id OR s.merchant_id = v_merchant_profile_id OR s.created_by = v_merchant_profile_id)
        AND (da.driver_id = v_driver_id OR da.driver_id = v_driver_profile_id)
    ) THEN RETURN true; END IF;

    RETURN EXISTS (SELECT 1 FROM public.merchant_favorites mf WHERE mf.merchant_id = v_merchant_profile_id AND mf.target_type = 'courier' AND (mf.target_id = v_driver_id OR mf.target_id = v_driver_profile_id))
      OR EXISTS (SELECT 1 FROM public.courier_favorites cf JOIN public.stores s ON s.id = cf.target_id WHERE (cf.courier_id = v_driver_id OR cf.courier_id = v_driver_profile_id) AND cf.target_type = 'store' AND (s.merchant_id = v_merchant_id OR s.merchant_id = v_merchant_profile_id OR s.created_by = v_merchant_profile_id))
      OR EXISTS (SELECT 1 FROM public.delivery_assignments da JOIN public.orders o ON o.id = da.order_id JOIN public.stores s ON s.id = o.store_id WHERE (s.merchant_id = v_merchant_id OR s.merchant_id = v_merchant_profile_id OR s.created_by = v_merchant_profile_id) AND (da.driver_id = v_driver_id OR da.driver_id = v_driver_profile_id));
  END IF;

  IF p_relationship_type = 'merchant_merchant' THEN
    IF v_role_a <> 'merchant' OR v_role_b <> 'merchant' THEN RETURN false; END IF;
    RETURN EXISTS (SELECT 1 FROM public.merchant_favorites mf WHERE mf.merchant_id = p_user_a AND mf.target_type = 'merchant' AND mf.target_id = p_user_b)
      OR EXISTS (SELECT 1 FROM public.merchant_favorites mf WHERE mf.merchant_id = p_user_b AND mf.target_type = 'merchant' AND mf.target_id = p_user_a);
  END IF;

  IF p_relationship_type = 'courier_courier' THEN
    IF v_role_a NOT IN ('driver','courier') OR v_role_b NOT IN ('driver','courier') THEN RETURN false; END IF;
    RETURN EXISTS (SELECT 1 FROM public.courier_favorites cf WHERE cf.courier_id IN (p_user_a, p_user_b) AND cf.target_type = 'courier' AND cf.target_id IN (p_user_a, p_user_b) AND cf.courier_id <> cf.target_id);
  END IF;

  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_start_chat(uuid, uuid, text, uuid) TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
