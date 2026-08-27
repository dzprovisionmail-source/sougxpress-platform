BEGIN;

-- Keep commercial chat restricted to the three supported role pairings.
-- Favorites and order relationships are evaluated server-side from auth.uid().
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
    v_customer_id UUID;
    v_merchant_id UUID;
    v_driver_id UUID;
BEGIN
    SELECT role INTO v_role_a FROM public.profiles WHERE id = p_user_a;
    SELECT role INTO v_role_b FROM public.profiles WHERE id = p_user_b;

    IF p_relationship_type = 'customer_merchant' THEN
        IF NOT ((v_role_a = 'customer' AND v_role_b = 'merchant')
            OR (v_role_a = 'merchant' AND v_role_b = 'customer')) THEN
            RETURN false;
        END IF;

        v_customer_id := CASE WHEN v_role_a = 'customer' THEN p_user_a ELSE p_user_b END;
        v_merchant_id := CASE WHEN v_role_a = 'merchant' THEN p_user_a ELSE p_user_b END;

        IF p_reference_id IS NOT NULL THEN
            RETURN EXISTS (
                SELECT 1
                FROM public.orders o
                JOIN public.stores s ON s.id = o.store_id
                WHERE o.id = p_reference_id
                  AND o.customer_id = v_customer_id
                  AND s.merchant_id = v_merchant_id
            );
        END IF;

        RETURN EXISTS (
            SELECT 1
            FROM public.customer_favorites cf
            JOIN public.stores s ON s.id = cf.target_id
            WHERE cf.customer_id = v_customer_id
              AND cf.target_type = 'store'
              AND s.merchant_id = v_merchant_id
        )
        OR EXISTS (
            SELECT 1
            FROM public.merchant_favorites mf
            WHERE mf.merchant_id = v_merchant_id
              AND mf.target_type = 'customer'
              AND mf.target_id = v_customer_id
        )
        OR EXISTS (
            SELECT 1
            FROM public.orders o
            JOIN public.stores s ON s.id = o.store_id
            WHERE o.customer_id = v_customer_id
              AND s.merchant_id = v_merchant_id
        );
    END IF;

    IF p_relationship_type = 'customer_courier' THEN
        IF NOT ((v_role_a = 'customer' AND v_role_b IN ('driver', 'courier'))
            OR (v_role_b = 'customer' AND v_role_a IN ('driver', 'courier'))) THEN
            RETURN false;
        END IF;

        v_customer_id := CASE WHEN v_role_a = 'customer' THEN p_user_a ELSE p_user_b END;
        v_driver_id := CASE WHEN v_role_a IN ('driver', 'courier') THEN p_user_a ELSE p_user_b END;

        IF p_reference_id IS NOT NULL AND EXISTS (
            SELECT 1
            FROM public.delivery_assignments da
            JOIN public.orders o ON o.id = da.order_id
            WHERE (o.id = p_reference_id OR da.order_id = p_reference_id)
              AND o.customer_id = v_customer_id
              AND da.driver_id = v_driver_id
        ) THEN
            RETURN true;
        END IF;

        RETURN EXISTS (
            SELECT 1 FROM public.favorite_couriers fc
            WHERE fc.user_id = v_customer_id AND fc.courier_id = v_driver_id
        )
        OR EXISTS (
            SELECT 1 FROM public.courier_favorites cf
            WHERE cf.courier_id = v_driver_id
              AND cf.target_type = 'customer'
              AND cf.target_id = v_customer_id
        )
        OR EXISTS (
            SELECT 1
            FROM public.delivery_assignments da
            JOIN public.orders o ON o.id = da.order_id
            WHERE o.customer_id = v_customer_id
              AND da.driver_id = v_driver_id
        );
    END IF;

    IF p_relationship_type = 'merchant_courier' THEN
        IF NOT ((v_role_a = 'merchant' AND v_role_b IN ('driver', 'courier'))
            OR (v_role_b = 'merchant' AND v_role_a IN ('driver', 'courier'))) THEN
            RETURN false;
        END IF;

        v_merchant_id := CASE WHEN v_role_a = 'merchant' THEN p_user_a ELSE p_user_b END;
        v_driver_id := CASE WHEN v_role_a IN ('driver', 'courier') THEN p_user_a ELSE p_user_b END;

        IF p_reference_id IS NOT NULL AND EXISTS (
            SELECT 1
            FROM public.delivery_assignments da
            JOIN public.orders o ON o.id = da.order_id
            JOIN public.stores s ON s.id = o.store_id
            WHERE (o.id = p_reference_id OR da.order_id = p_reference_id)
              AND s.merchant_id = v_merchant_id
              AND da.driver_id = v_driver_id
        ) THEN
            RETURN true;
        END IF;

        RETURN EXISTS (
            SELECT 1 FROM public.merchant_favorites mf
            WHERE mf.merchant_id = v_merchant_id
              AND mf.target_type = 'courier'
              AND mf.target_id = v_driver_id
        )
        OR EXISTS (
            SELECT 1
            FROM public.courier_favorites cf
            JOIN public.stores s ON s.id = cf.target_id
            WHERE cf.courier_id = v_driver_id
              AND cf.target_type = 'store'
              AND s.merchant_id = v_merchant_id
        )
        OR EXISTS (
            SELECT 1
            FROM public.delivery_assignments da
            JOIN public.orders o ON o.id = da.order_id
            JOIN public.stores s ON s.id = o.store_id
            WHERE s.merchant_id = v_merchant_id
              AND da.driver_id = v_driver_id
        );
    END IF;

    RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_start_chat(UUID, UUID, TEXT, UUID) TO authenticated;
NOTIFY pgrst, 'reload schema';

COMMIT;
