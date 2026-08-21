-- Fix commercial phone sources and harden call-button auditing.
-- Phone numbers are returned only for an authenticated participant in an active order.

CREATE OR REPLACE FUNCTION public.get_commercial_contact_phone(
    p_order_id UUID,
    p_target_role TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid UUID := auth.uid();
    v_target_role TEXT := lower(trim(coalesce(p_target_role, '')));
    v_order RECORD;
    v_assignment RECORD;
    v_phone TEXT;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    SELECT
        o.id,
        o.customer_id,
        o.status,
        s.merchant_id
    INTO v_order
    FROM public.orders AS o
    JOIN public.stores AS s ON s.id = o.store_id
    WHERE o.id = p_order_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found';
    END IF;

    SELECT
        da.driver_id,
        da.status
    INTO v_assignment
    FROM public.delivery_assignments AS da
    WHERE da.order_id = p_order_id
    ORDER BY da.created_at DESC NULLS LAST, da.updated_at DESC NULLS LAST
    LIMIT 1;

    IF NOT (
        v_order.customer_id = v_uid
        OR v_order.merchant_id = v_uid
        OR (v_assignment.driver_id IS NOT NULL AND v_assignment.driver_id = v_uid)
    ) THEN
        RAISE EXCEPTION 'Not authorized to access contact info for this order';
    END IF;

    IF v_order.status IN ('delivered', 'cancelled', 'rejected')
       OR coalesce(v_assignment.status, '') IN ('delivered', 'cancelled', 'failed') THEN
        RAISE EXCEPTION 'Order is no longer active for phone contact';
    END IF;

    CASE v_target_role
        WHEN 'customer' THEN
            SELECT COALESCE(
                NULLIF(BTRIM(c.phone_number), ''),
                NULLIF(BTRIM(c.phone), '')
            )
            INTO v_phone
            FROM public.customers AS c
            WHERE c.id = v_order.customer_id;
        WHEN 'merchant' THEN
            SELECT COALESCE(
                NULLIF(BTRIM(m.contact_phone), ''),
                NULLIF(BTRIM(m.phone), '')
            )
            INTO v_phone
            FROM public.merchants AS m
            WHERE m.id = v_order.merchant_id;
        WHEN 'courier' THEN
            IF v_assignment.driver_id IS NULL THEN
                RAISE EXCEPTION 'No courier assigned to this order yet';
            END IF;

            SELECT COALESCE(
                NULLIF(BTRIM(d.phone_number), ''),
                NULLIF(BTRIM(d.phone), '')
            )
            INTO v_phone
            FROM public.drivers AS d
            WHERE d.id = v_assignment.driver_id;
        ELSE
            RAISE EXCEPTION 'Invalid target role';
    END CASE;

    IF v_phone IS NULL THEN
        RAISE EXCEPTION 'Phone number unavailable';
    END IF;

    RETURN v_phone;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_call_button_press(
    p_order_id UUID,
    p_receiver_id UUID,
    p_relationship_type TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid UUID := auth.uid();
    v_order RECORD;
    v_assignment RECORD;
    v_relationship TEXT := lower(trim(coalesce(p_relationship_type, '')));
    v_is_valid BOOLEAN := false;
BEGIN
    IF v_uid IS NULL OR p_receiver_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    SELECT o.id, o.customer_id, s.merchant_id, o.status
    INTO v_order
    FROM public.orders AS o
    JOIN public.stores AS s ON s.id = o.store_id
    WHERE o.id = p_order_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found';
    END IF;

    SELECT da.driver_id, da.status
    INTO v_assignment
    FROM public.delivery_assignments AS da
    WHERE da.order_id = p_order_id
    ORDER BY da.created_at DESC NULLS LAST, da.updated_at DESC NULLS LAST
    LIMIT 1;

    IF v_order.status IN ('delivered', 'cancelled', 'rejected')
       OR coalesce(v_assignment.status, '') IN ('delivered', 'cancelled', 'failed') THEN
        RAISE EXCEPTION 'Order is no longer active for call auditing';
    END IF;

    IF v_relationship = 'customer_merchant' THEN
        v_is_valid := (
            (v_uid = v_order.customer_id AND p_receiver_id = v_order.merchant_id)
            OR (v_uid = v_order.merchant_id AND p_receiver_id = v_order.customer_id)
        );
    ELSIF v_relationship = 'customer_courier' THEN
        v_is_valid := (
            v_assignment.driver_id IS NOT NULL
            AND (
                (v_uid = v_order.customer_id AND p_receiver_id = v_assignment.driver_id)
                OR (v_uid = v_assignment.driver_id AND p_receiver_id = v_order.customer_id)
            )
        );
    ELSIF v_relationship = 'merchant_courier' THEN
        v_is_valid := (
            v_assignment.driver_id IS NOT NULL
            AND (
                (v_uid = v_order.merchant_id AND p_receiver_id = v_assignment.driver_id)
                OR (v_uid = v_assignment.driver_id AND p_receiver_id = v_order.merchant_id)
            )
        );
    END IF;

    IF NOT v_is_valid THEN
        RAISE EXCEPTION 'Not authorized to audit this commercial call';
    END IF;

    INSERT INTO public.audit_logs (
        user_id,
        event_type,
        table_name,
        record_id,
        new_data
    ) VALUES (
        v_uid,
        'CALL_BUTTON_PRESSED',
        'orders',
        p_order_id,
        jsonb_build_object(
            'receiver_id', p_receiver_id,
            'relationship_type', v_relationship,
            'timestamp', now()
        )
    );
END;
$$;

REVOKE ALL ON FUNCTION public.get_commercial_contact_phone(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_commercial_contact_phone(UUID, TEXT) TO authenticated;
REVOKE ALL ON FUNCTION public.log_call_button_press(UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_call_button_press(UUID, UUID, TEXT) TO authenticated;

-- Call audit entries must be written through the relationship-checked RPC only.
REVOKE INSERT ON public.audit_logs FROM authenticated;
