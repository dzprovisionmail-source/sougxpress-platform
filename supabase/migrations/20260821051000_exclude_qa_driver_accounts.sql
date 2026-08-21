-- Exclude QA/test courier accounts from merchant selection.
-- is_demo is the canonical flag; the additional guards cover legacy QA rows
-- that were incorrectly stored with is_demo = false.

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
    LEFT JOIN public.profiles AS profile ON profile.id = d.id
    LEFT JOIN public.zones AS driver_zone ON driver_zone.id = d.zone_id
    WHERE d.is_demo = FALSE
      AND d.is_available = TRUE
      AND d.availability = 'online'
      AND d.status = 'active'
      AND d.deleted_at IS NULL
      AND COALESCE(profile.role, 'driver') = 'driver'
      AND LOWER(COALESCE(profile.email, '')) NOT LIKE '%@example.com'
      AND COALESCE(d.full_name, '') NOT ILIKE '%اختبار%'
      AND COALESCE(d.full_name, '') NOT ILIKE '%تجريب%'
      AND COALESCE(d.full_name, '') NOT ILIKE '%demo%'
      AND COALESCE(d.full_name, '') NOT ILIKE '%test%'
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

COMMENT ON FUNCTION public.get_available_drivers_for_merchant(UUID)
IS 'Returns only real, active, online, available couriers eligible for a merchant order; excludes demo and legacy QA accounts.';
