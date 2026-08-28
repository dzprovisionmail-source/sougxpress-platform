-- Fix customer↔merchant chat eligibility: stores.merchant_id references merchants.id,
-- while chat participants are profiles.id. Staging-only until explicitly deployed.
BEGIN;

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
  v_merchant_profile UUID;
  v_merchant_record UUID;
  v_driver UUID;
BEGIN
  SELECT role INTO v_role_a FROM public.profiles WHERE id = p_user_a;
  SELECT role INTO v_role_b FROM public.profiles WHERE id = p_user_b;

  IF p_relationship_type = 'merchant_merchant' THEN
    RETURN v_role_a = 'merchant' AND v_role_b = 'merchant' AND (
      EXISTS (
        SELECT 1 FROM public.merchant_favorites mf
        WHERE mf.merchant_id = p_user_a
          AND mf.target_type = 'merchant'
          AND mf.target_id = p_user_b
      )
      OR EXISTS (
        SELECT 1 FROM public.merchant_favorites mf
        WHERE mf.merchant_id = p_user_b
          AND mf.target_type = 'merchant'
          AND mf.target_id = p_user_a
      )
    );
  END IF;

  IF p_relationship_type = 'courier_courier' THEN
    RETURN v_role_a IN ('driver', 'courier') AND v_role_b IN ('driver', 'courier') AND (
      EXISTS (
        SELECT 1 FROM public.courier_favorites cf
        WHERE cf.courier_id = p_user_a
          AND cf.target_type = 'courier'
          AND cf.target_id = p_user_b
      )
      OR EXISTS (
        SELECT 1 FROM public.courier_favorites cf
        WHERE cf.courier_id = p_user_b
          AND cf.target_type = 'courier'
          AND cf.target_id = p_user_a
      )
    );
  END IF;

  IF p_relationship_type = 'customer_merchant' THEN
    IF NOT (
      (v_role_a = 'customer' AND v_role_b = 'merchant') OR
      (v_role_b = 'customer' AND v_role_a = 'merchant')
    ) THEN
      RETURN false;
    END IF;

    v_customer := CASE WHEN v_role_a = 'customer' THEN p_user_a ELSE p_user_b END;
    v_merchant_profile := CASE WHEN v_role_a = 'merchant' THEN p_user_a ELSE p_user_b END;

    SELECT m.id INTO v_merchant_record
    FROM public.merchants m
    JOIN public.profiles p ON lower(p.email) = lower(m.email)
    WHERE p.id = v_merchant_profile
    LIMIT 1;

    RETURN EXISTS (
      SELECT 1 FROM public.merchant_favorites mf
      WHERE mf.merchant_id = v_merchant_profile
        AND mf.target_type = 'customer'
        AND mf.target_id = v_customer
    )
    OR EXISTS (
      SELECT 1 FROM public.customer_favorites cf
      JOIN public.stores s ON s.id = cf.target_id
      WHERE cf.customer_id = v_customer
        AND cf.target_type = 'store'
        AND (
          s.created_by = v_merchant_profile
          OR s.merchant_id = v_merchant_record
        )
    )
    OR EXISTS (
      SELECT 1 FROM public.orders o
      JOIN public.stores s ON s.id = o.store_id
      WHERE o.customer_id = v_customer
        AND (
          s.created_by = v_merchant_profile
          OR s.merchant_id = v_merchant_record
        )
    );
  END IF;

  IF p_relationship_type = 'customer_courier' THEN
    IF NOT (
      (v_role_a = 'customer' AND v_role_b IN ('driver', 'courier')) OR
      (v_role_b = 'customer' AND v_role_a IN ('driver', 'courier'))
    ) THEN
      RETURN false;
    END IF;

    v_customer := CASE WHEN v_role_a = 'customer' THEN p_user_a ELSE p_user_b END;
    v_driver := CASE WHEN v_role_a IN ('driver', 'courier') THEN p_user_a ELSE p_user_b END;

    RETURN EXISTS (
      SELECT 1 FROM public.favorite_couriers fc
      WHERE fc.user_id = v_customer AND fc.courier_id = v_driver
    )
    OR EXISTS (
      SELECT 1 FROM public.courier_favorites cf
      WHERE cf.courier_id = v_driver
        AND cf.target_type = 'customer'
        AND cf.target_id = v_customer
    );
  END IF;

  IF p_relationship_type = 'merchant_courier' THEN
    IF NOT (
      (v_role_a = 'merchant' AND v_role_b IN ('driver', 'courier')) OR
      (v_role_b = 'merchant' AND v_role_a IN ('driver', 'courier'))
    ) THEN
      RETURN false;
    END IF;

    v_merchant_profile := CASE WHEN v_role_a = 'merchant' THEN p_user_a ELSE p_user_b END;
    v_driver := CASE WHEN v_role_a IN ('driver', 'courier') THEN p_user_a ELSE p_user_b END;

    SELECT m.id INTO v_merchant_record
    FROM public.merchants m
    JOIN public.profiles p ON lower(p.email) = lower(m.email)
    WHERE p.id = v_merchant_profile
    LIMIT 1;

    RETURN EXISTS (
      SELECT 1 FROM public.merchant_favorites mf
      WHERE mf.merchant_id = v_merchant_profile
        AND mf.target_type = 'courier'
        AND mf.target_id = v_driver
    )
    OR EXISTS (
      SELECT 1 FROM public.courier_favorites cf
      JOIN public.stores s ON s.id = cf.target_id
      WHERE cf.courier_id = v_driver
        AND cf.target_type = 'store'
        AND (
          s.created_by = v_merchant_profile
          OR s.merchant_id = v_merchant_record
        )
    );
  END IF;

  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_start_chat(UUID, UUID, TEXT, UUID) TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
