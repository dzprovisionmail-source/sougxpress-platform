-- Secure commercial order details for merchant/courier order-bound screens.
-- Returns only order context, delivery address, item names/prices, and totals.
-- Phone numbers remain available only through get_commercial_contact_phone.

CREATE OR REPLACE FUNCTION public.get_commercial_order_details(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid UUID := auth.uid();
    v_order RECORD;
    v_address RECORD;
    v_items JSONB;
    v_assignment RECORD;
    v_customer_name TEXT;
    v_driver_name TEXT;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    SELECT
        o.id,
        o.customer_id,
        o.store_id,
        o.delivery_address_id,
        o.order_total_minor,
        o.delivery_fee_minor,
        o.status,
        o.special_instructions,
        o.created_at,
        o.updated_at,
        s.name AS store_name,
        s.merchant_id
    INTO v_order
    FROM public.orders AS o
    JOIN public.stores AS s ON s.id = o.store_id
    WHERE o.id = p_order_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found';
    END IF;

    IF NOT (
        v_order.customer_id = v_uid
        OR v_order.merchant_id = v_uid
        OR EXISTS (
            SELECT 1
            FROM public.delivery_assignments AS da_auth
            WHERE da_auth.order_id = v_order.id
              AND da_auth.driver_id = v_uid
        )
    ) THEN
        RAISE EXCEPTION 'Not authorized to access this order';
    END IF;

    SELECT
        ca.address_text,
        ca.address_line1,
        ca.address_line2,
        ca.city,
        ca.state_province,
        ca.postal_code,
        ca.country
    INTO v_address
    FROM public.customer_addresses AS ca
    WHERE ca.id = v_order.delivery_address_id;

    SELECT COALESCE(
        NULLIF(TRIM(c.full_name), ''),
        NULLIF(TRIM(CONCAT_WS(' ', c.first_name, c.last_name)), ''),
        'الزبون'
    )
    INTO v_customer_name
    FROM public.customers AS c
    WHERE c.id = v_order.customer_id;

    SELECT
        da.id,
        da.driver_id,
        da.status
    INTO v_assignment
    FROM public.delivery_assignments AS da
    WHERE da.order_id = v_order.id
    ORDER BY da.created_at DESC NULLS LAST
    LIMIT 1;

    IF v_assignment.driver_id IS NOT NULL THEN
        SELECT COALESCE(
            NULLIF(TRIM(d.full_name), ''),
            NULLIF(TRIM(CONCAT_WS(' ', d.first_name, d.last_name)), ''),
            'الموصل'
        )
        INTO v_driver_name
        FROM public.drivers AS d
        WHERE d.id = v_assignment.driver_id;
    END IF;

    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', oi.id,
                'product_id', oi.product_id,
                'name', p.name,
                'image_url', p.image_url,
                'quantity', oi.quantity,
                'unit_price_minor', oi.price_at_order_minor,
                'line_total_minor', oi.line_total_minor
            ) ORDER BY oi.created_at
        ),
        '[]'::jsonb
    )
    INTO v_items
    FROM public.order_items AS oi
    JOIN public.products AS p ON p.id = oi.product_id
    WHERE oi.order_id = v_order.id;

    RETURN jsonb_build_object(
        'order_id', v_order.id,
        'customer_id', v_order.customer_id,
        'customer_name', v_customer_name,
        'store_id', v_order.store_id,
        'store_name', v_order.store_name,
        'merchant_id', v_order.merchant_id,
        'driver_id', v_assignment.driver_id,
        'driver_name', v_driver_name,
        'order_status', v_order.status,
        'delivery_status', v_assignment.status,
        'total_minor', v_order.order_total_minor,
        'delivery_fee_minor', v_order.delivery_fee_minor,
        'special_instructions', v_order.special_instructions,
        'created_at', v_order.created_at,
        'updated_at', v_order.updated_at,
        'address', jsonb_build_object(
            'address_text', COALESCE(
                NULLIF(TRIM(v_address.address_text), ''),
                NULLIF(TRIM(v_address.address_line1), ''),
                NULLIF(TRIM(CONCAT_WS(', ', v_address.city, v_address.country)), '')
            ),
            'address_line1', v_address.address_line1,
            'address_line2', v_address.address_line2,
            'city', v_address.city,
            'state_province', v_address.state_province,
            'postal_code', v_address.postal_code,
            'country', v_address.country
        ),
        'items', v_items
    );
END;
$$;

REVOKE ALL ON FUNCTION public.get_commercial_order_details(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_commercial_order_details(UUID) TO authenticated;
