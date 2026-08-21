-- Enhance fn_handle_driver_delivery_completion to auto-add favorites
OR REPLACE FUNCTION public.fn_handle_driver_delivery_completion()
RETURNS TRIGGER AS $$
DECLARE
    commission_minor INTEGER := 4000; -- 40 DZD
    next_delivery_count INTEGER;
    paid_through_count INTEGER;
    v_customer_id UUID;
BEGIN
    IF NEW.status = 'delivered' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.driver_id IS NOT NULL THEN
        -- 1. Update driver stats
        UPDATE public.drivers
        SET 
            delivery_count = COALESCE(delivery_count, 0) + 1,
            commission_owed_minor = COALESCE(commission_owed_minor, 0) + commission_minor,
            is_suspended_for_debt = ((COALESCE(delivery_count, 0) + 1) - COALESCE(commission_paid_through_count, 0) >= 50)
        WHERE id = NEW.driver_id
        RETURNING delivery_count, commission_paid_through_count INTO next_delivery_count, paid_through_count;

        -- 2. Get customer_id from the order
        SELECT customer_id INTO v_customer_id FROM public.orders WHERE id = NEW.order_id;

        -- 3. Auto-add customer to courier favorites if not exists
        IF v_customer_id IS NOT NULL THEN
            INSERT INTO public.courier_favorites (courier_id, target_type, target_id)
            VALUES (NEW.driver_id, 'customer', v_customer_id)
            ON CONFLICT DO NOTHING;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhance get_courier_relationship_customers to return delivery stats
DROP FUNCTION IF EXISTS public.get_courier_relationship_customers(UUID);
CREATE OR REPLACE FUNCTION public.get_courier_relationship_customers(p_courier_id UUID)
RETURNS TABLE (
    id UUID,
    full_name TEXT,
    avatar_url TEXT,
    neighborhood TEXT,
    address TEXT,
    delivery_count BIGINT,
    last_delivery_at TIMESTAMPTZ,
    last_order_id UUID
) AS $$
BEGIN
    RETURN QUERY
    WITH delivery_stats AS (
        SELECT 
            o.customer_id,
            COUNT(da.id) as d_count,
            MAX(o.delivered_at) as last_d_at,
            (ARRAY_AGG(o.id ORDER BY o.delivered_at DESC))[1] as last_o_id
        FROM public.orders o
        INNER JOIN public.delivery_assignments da ON da.order_id = o.id
        WHERE da.driver_id = p_courier_id
          AND o.status = 'delivered'
        GROUP BY o.customer_id
    )
    SELECT DISTINCT
        c.id,
        c.full_name,
        c.avatar_url,
        c.neighborhood,
        c.address,
        COALESCE(ds.d_count, 0) as delivery_count,
        ds.last_d_at as last_delivery_at,
        ds.last_o_id as last_order_id
    FROM public.customers c
    LEFT JOIN delivery_stats ds ON ds.customer_id = c.id
    WHERE auth.uid() IS NOT NULL
      AND p_courier_id = auth.uid()
      AND public.get_user_role(auth.uid()) = 'driver'
      AND (
          EXISTS (
              SELECT 1
              FROM public.orders o
              INNER JOIN public.delivery_assignments da ON da.order_id = o.id
              WHERE da.driver_id = auth.uid()
                AND o.customer_id = c.id
          )
          OR EXISTS (
              SELECT 1
              FROM public.courier_favorites cf
              WHERE cf.courier_id = auth.uid()
                AND cf.target_type = 'customer'
                AND cf.target_id = c.id
          )
      );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
