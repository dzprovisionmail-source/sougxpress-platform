-- Expose only non-sensitive customer profile fields to the courier who has the relationship.
-- This avoids granting a courier row-level access to phone numbers or other private columns.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_courier_relationship_customers(p_courier_id UUID)
RETURNS TABLE (
    id UUID,
    full_name TEXT,
    avatar_url TEXT,
    neighborhood TEXT,
    address TEXT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT DISTINCT
        c.id,
        c.full_name,
        c.avatar_url,
        c.neighborhood,
        c.address
    FROM public.customers c
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

REVOKE ALL ON FUNCTION public.get_courier_relationship_customers(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_courier_relationship_customers(UUID) TO authenticated;

COMMIT;
