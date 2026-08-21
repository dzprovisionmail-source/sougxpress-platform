-- Extend courier customer relationship RPCs with order context only.
-- Phone numbers are intentionally excluded; call eligibility is evaluated by
-- get_commercial_phone at click time on the server.

BEGIN;

DROP FUNCTION IF EXISTS public.get_courier_relationship_customers(UUID);

CREATE FUNCTION public.get_courier_relationship_customers(p_courier_id UUID)
RETURNS TABLE (
    id UUID,
    full_name TEXT,
    avatar_url TEXT,
    neighborhood TEXT,
    address TEXT,
    last_order_id UUID,
    last_order_status TEXT,
    last_assignment_status TEXT,
    store_name TEXT,
    order_created_at TIMESTAMPTZ,
    contact_allowed BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    WITH latest_orders AS (
        SELECT DISTINCT ON (o.customer_id)
            o.customer_id,
            o.id AS order_id,
            o.status AS order_status,
            da.status AS assignment_status,
            s.name AS store_name,
            o.created_at AS order_created_at
        FROM public.orders o
        INNER JOIN public.delivery_assignments da
            ON da.order_id = o.id
           AND da.driver_id = auth.uid()
        LEFT JOIN public.stores s ON s.id = o.store_id
        ORDER BY o.customer_id, o.created_at DESC
    )
    SELECT DISTINCT
        c.id,
        c.full_name,
        c.avatar_url,
        c.neighborhood,
        c.address,
        lo.order_id,
        lo.order_status,
        lo.assignment_status,
        lo.store_name,
        lo.order_created_at,
        COALESCE(lo.assignment_status IN ('pending', 'accepted', 'arrived_at_store', 'picked_up', 'out_for_delivery'), false)
    FROM public.customers c
    LEFT JOIN latest_orders lo ON lo.customer_id = c.id
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
$$;

DROP FUNCTION IF EXISTS public.get_courier_interested_customers(UUID);

CREATE FUNCTION public.get_courier_interested_customers(p_courier_id UUID)
RETURNS TABLE (
    id UUID,
    customer_id UUID,
    created_at TIMESTAMPTZ,
    full_name TEXT,
    avatar_url TEXT,
    neighborhood TEXT,
    role TEXT,
    last_order_id UUID,
    last_order_status TEXT,
    last_assignment_status TEXT,
    store_name TEXT,
    order_created_at TIMESTAMPTZ,
    contact_allowed BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    WITH latest_orders AS (
        SELECT DISTINCT ON (o.customer_id)
            o.customer_id,
            o.id AS order_id,
            o.status AS order_status,
            da.status AS assignment_status,
            s.name AS store_name,
            o.created_at AS order_created_at
        FROM public.orders o
        INNER JOIN public.delivery_assignments da
            ON da.order_id = o.id
           AND da.driver_id = auth.uid()
        LEFT JOIN public.stores s ON s.id = o.store_id
        ORDER BY o.customer_id, o.created_at DESC
    )
    SELECT
        fc.id,
        fc.user_id AS customer_id,
        fc.created_at,
        COALESCE(p.full_name, 'مستخدم جديد') AS full_name,
        c.avatar_url,
        c.neighborhood,
        p.role,
        lo.order_id,
        lo.order_status,
        lo.assignment_status,
        lo.store_name,
        lo.order_created_at,
        COALESCE(lo.assignment_status IN ('pending', 'accepted', 'arrived_at_store', 'picked_up', 'out_for_delivery'), false)
    FROM public.favorite_couriers fc
    INNER JOIN public.profiles p ON p.id = fc.user_id
    LEFT JOIN public.customers c ON c.id = fc.user_id
    LEFT JOIN latest_orders lo ON lo.customer_id = fc.user_id
    WHERE auth.uid() IS NOT NULL
      AND p_courier_id = auth.uid()
      AND public.get_user_role(auth.uid()) = 'driver';
$$;

REVOKE ALL ON FUNCTION public.get_courier_relationship_customers(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_courier_relationship_customers(UUID) TO authenticated;
REVOKE ALL ON FUNCTION public.get_courier_interested_customers(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_courier_interested_customers(UUID) TO authenticated;

COMMIT;
