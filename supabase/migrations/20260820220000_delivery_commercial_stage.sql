-- Delivery Commercial Stage
-- Scope: merchant selects courier, commercial communication remains on chat/tel:,
-- and completed operations are reflected in party statistics.
-- Platform commission is 20% of the fixed courier delivery fee only.

-- -----------------------------------------------------------------------------
-- 1) Robust courier discovery RPC
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_available_drivers_for_merchant(p_order_id UUID)
RETURNS TABLE (
    driver_id UUID,
    full_name TEXT,
    first_name TEXT,
    last_name TEXT,
    vehicle_type TEXT,
    rating NUMERIC,
    delivered_count INTEGER,
    is_available BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_zone_id UUID;
    v_store_id UUID;
    v_order_status TEXT;
BEGIN
    SELECT o.store_id, o.zone_id, o.status
      INTO v_store_id, v_zone_id, v_order_status
    FROM public.orders AS o
    WHERE o.id = p_order_id;

    IF v_store_id IS NULL THEN
        RAISE EXCEPTION 'Order not found';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.stores AS s
        WHERE s.id = v_store_id
          AND s.merchant_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Unauthorized: You are not the merchant for this order.';
    END IF;

    IF v_order_status <> 'ready_for_pickup' THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        d.id AS driver_id,
        d.full_name,
        d.first_name,
        d.last_name,
        d.vehicle_type,
        d.rating,
        d.delivered_count,
        d.is_available
    FROM public.drivers AS d
    WHERE d.is_available = true
      AND d.status = 'active'
      AND (d.zone_id = v_zone_id OR d.zone_id IS NULL)
      AND d.deleted_at IS NULL
      AND NOT EXISTS (
          SELECT 1
          FROM public.delivery_assignments AS da
          WHERE da.driver_id = d.id
            AND da.status IN ('pending', 'accepted', 'arrived_at_store', 'picked_up', 'out_for_delivery')
      )
    ORDER BY d.rating DESC NULLS LAST, d.delivered_count DESC NULLS LAST;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_available_drivers_for_merchant(UUID) TO authenticated;

-- -----------------------------------------------------------------------------
-- 2) Secure merchant selection of a courier
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.merchant_assign_driver(
    p_order_id UUID,
    p_driver_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_store_id UUID;
    v_zone_id UUID;
    v_order_status TEXT;
    v_assignment_id UUID;
    v_driver_zone UUID;
BEGIN
    SELECT o.store_id, o.zone_id, o.status
      INTO v_store_id, v_zone_id, v_order_status
    FROM public.orders AS o
    WHERE o.id = p_order_id;

    IF v_store_id IS NULL THEN
        RAISE EXCEPTION 'Order not found';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.stores AS s
        WHERE s.id = v_store_id
          AND s.merchant_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Unauthorized: You are not the merchant for this order.';
    END IF;

    IF v_order_status <> 'ready_for_pickup' THEN
        RAISE EXCEPTION 'Order is not ready for delivery.';
    END IF;

    SELECT d.zone_id
      INTO v_driver_zone
    FROM public.drivers AS d
    WHERE d.id = p_driver_id
      AND d.is_available = true
      AND d.status = 'active'
      AND d.deleted_at IS NULL;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Courier is not available.';
    END IF;

    IF v_driver_zone IS NOT NULL
       AND v_zone_id IS NOT NULL
       AND v_driver_zone <> v_zone_id THEN
        RAISE EXCEPTION 'Courier is outside the order zone.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.delivery_assignments AS da
        WHERE da.driver_id = p_driver_id
          AND da.status IN ('pending', 'accepted', 'arrived_at_store', 'picked_up', 'out_for_delivery')
          AND da.order_id <> p_order_id
    ) THEN
        RAISE EXCEPTION 'Courier is already handling another delivery.';
    END IF;

    SELECT da.id
      INTO v_assignment_id
    FROM public.delivery_assignments AS da
    WHERE da.order_id = p_order_id
    ORDER BY da.created_at DESC NULLS LAST
    LIMIT 1;

    IF v_assignment_id IS NULL THEN
        INSERT INTO public.delivery_assignments (order_id, driver_id, status, created_at, updated_at)
        VALUES (p_order_id, p_driver_id, 'pending', now(), now());
    ELSE
        UPDATE public.delivery_assignments AS da
        SET driver_id = p_driver_id,
            status = 'pending',
            updated_at = now()
        WHERE da.id = v_assignment_id;
    END IF;

    -- Keep the order-level courier reference synchronized with the delivery.
    UPDATE public.orders AS o
    SET driver_id = p_driver_id,
        updated_at = now()
    WHERE o.id = p_order_id;

    RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.merchant_assign_driver(UUID, UUID) TO authenticated;

-- -----------------------------------------------------------------------------
-- 3) One commercial counter source for customer / merchant / courier views
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_commercial_stats()
RETURNS TABLE (
    customer_purchases_completed BIGINT,
    customer_deliveries_completed BIGINT,
    merchant_orders_completed BIGINT,
    merchant_sales_completed_minor BIGINT,
    driver_deliveries_completed BIGINT,
    driver_delivery_gross_minor BIGINT,
    driver_commission_owed_minor BIGINT,
    driver_net_minor BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_customer_purchases BIGINT := 0;
    v_customer_deliveries BIGINT := 0;
    v_merchant_orders BIGINT := 0;
    v_merchant_sales BIGINT := 0;
    v_driver_deliveries BIGINT := 0;
    v_driver_commission BIGINT := 0;
BEGIN
    SELECT COUNT(*)
      INTO v_customer_purchases
    FROM public.orders AS o
    WHERE o.customer_id = auth.uid()
      AND o.status = 'delivered';

    v_customer_deliveries := v_customer_purchases;

    SELECT COUNT(*), COALESCE(SUM(o.total_minor), 0)
      INTO v_merchant_orders, v_merchant_sales
    FROM public.orders AS o
    INNER JOIN public.stores AS s ON s.id = o.store_id
    WHERE s.merchant_id = auth.uid()
      AND o.status = 'delivered';

    SELECT COALESCE(d.delivery_count, 0), COALESCE(d.commission_owed_minor, 0)
      INTO v_driver_deliveries, v_driver_commission
    FROM public.drivers AS d
    WHERE d.id = auth.uid();

    RETURN QUERY
    SELECT
        v_customer_purchases,
        v_customer_deliveries,
        v_merchant_orders,
        v_merchant_sales,
        v_driver_deliveries,
        v_driver_deliveries * 20000,
        v_driver_commission,
        (v_driver_deliveries * 20000) - v_driver_commission;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_commercial_stats() TO authenticated;

COMMENT ON FUNCTION public.get_my_commercial_stats() IS
'Authoritative commercial counters. Completed customer/merchant operations are derived from delivered orders; courier commission is 20% of the fixed 200 DZD delivery fee only.';
