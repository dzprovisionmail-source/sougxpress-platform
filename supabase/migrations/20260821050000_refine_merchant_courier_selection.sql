-- Refine merchant courier selection:
-- 1) exclude demo couriers using the canonical is_demo flag;
-- 2) require an active, online, available courier;
-- 3) match duplicate zone records by city as well as exact zone UUID;
-- 4) exclude couriers with an active delivery assignment.

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
SET search_path = public, pg_temp
AS $$
DECLARE
    v_zone_id UUID;
    v_store_id UUID;
    v_zone_city TEXT;
BEGIN
    SELECT o.store_id, o.zone_id, z.city
    INTO v_store_id, v_zone_id, v_zone_city
    FROM public.orders AS o
    LEFT JOIN public.zones AS z ON z.id = o.zone_id
    WHERE o.id = p_order_id;

    IF v_store_id IS NULL THEN
        RAISE EXCEPTION 'Order not found.';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.stores AS s
        WHERE s.id = v_store_id
          AND s.merchant_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Unauthorized: You are not the merchant for this order.';
    END IF;

    RETURN QUERY
    SELECT
        d.id AS driver_id,
        COALESCE(NULLIF(TRIM(d.full_name), ''), NULLIF(TRIM(CONCAT_WS(' ', d.first_name, d.last_name)), ''), 'موصل') AS full_name,
        d.first_name,
        d.last_name,
        d.vehicle_type,
        d.rating,
        d.delivered_count,
        d.is_available
    FROM public.drivers AS d
    LEFT JOIN public.zones AS driver_zone ON driver_zone.id = d.zone_id
    WHERE d.is_demo = FALSE
      AND d.is_available = TRUE
      AND d.availability = 'online'
      AND d.status = 'active'
      AND d.deleted_at IS NULL
      AND (
          d.zone_id = v_zone_id
          OR (
              v_zone_city IS NOT NULL
              AND driver_zone.city = v_zone_city
          )
      )
      AND NOT EXISTS (
          SELECT 1
          FROM public.delivery_assignments AS da
          WHERE da.driver_id = d.id
            AND da.status IN (
                'pending',
                'accepted',
                'arrived_at_store',
                'picked_up',
                'out_for_delivery'
            )
      )
    ORDER BY d.rating DESC NULLS LAST, d.delivered_count DESC NULLS LAST, d.full_name ASC NULLS LAST;
END;
$$;

REVOKE ALL ON FUNCTION public.get_available_drivers_for_merchant(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_available_drivers_for_merchant(UUID) TO authenticated;
