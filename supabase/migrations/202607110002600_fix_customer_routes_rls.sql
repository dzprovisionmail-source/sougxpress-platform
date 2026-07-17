-- Migration: 202607110002600_fix_customer_routes_rls
-- Fixes:
--   1. notifications RLS policies query auth.users directly → 42501
--      Replace with get_user_role() which reads only public.profiles
--   2. orders/order_items/order_status_history infinite recursion → 42P17
--      get_order_status() queried orders without SECURITY DEFINER;
--      order_items + order_status_history SELECT policies subqueried
--      orders under RLS, creating a recursive evaluation cycle.
--      Fix: SECURITY DEFINER helper functions break the cycle.
--   3. customer_favorites table was never created (PGRST116 on favorites screen)

-- ══════════════════════════════════════════════════════════════
-- 1. FIX NOTIFICATIONS: remove auth.users subqueries
-- ══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS rls_select_notifications ON public.notifications;
DROP POLICY IF EXISTS rls_update_notifications ON public.notifications;
DROP POLICY IF EXISTS rls_insert_notifications ON public.notifications;

CREATE POLICY rls_select_notifications ON public.notifications
  FOR SELECT USING (
    user_id = auth.uid()
    OR get_user_role(auth.uid()) = ANY (ARRAY['admin'::text, 'founder'::text])
  );

CREATE POLICY rls_update_notifications ON public.notifications
  FOR UPDATE
  USING (
    user_id = auth.uid()
    OR get_user_role(auth.uid()) = ANY (ARRAY['admin'::text, 'founder'::text])
  )
  WITH CHECK (
    CASE
      WHEN get_user_role(auth.uid()) = ANY (ARRAY['admin'::text, 'founder'::text]) THEN true
      ELSE user_id = auth.uid()
    END
  );

CREATE POLICY rls_insert_notifications ON public.notifications
  FOR INSERT WITH CHECK (
    get_user_role(auth.uid()) = ANY (ARRAY['admin'::text, 'founder'::text])
  );

-- ══════════════════════════════════════════════════════════════
-- 2. FIX ORDERS INFINITE RECURSION (42P17)
-- ══════════════════════════════════════════════════════════════

-- 2a. Fix get_order_status: was plain sql without SECURITY DEFINER,
--     so calling it from orders UPDATE with_check re-entered orders RLS
CREATE OR REPLACE FUNCTION public.get_order_status(order_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT status FROM public.orders WHERE id = order_id;
$$;

-- 2b. Store-ownership check that bypasses RLS on stores
CREATE OR REPLACE FUNCTION public.store_belongs_to_merchant(
  p_store_id   uuid,
  p_merchant_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.stores
    WHERE id = p_store_id AND merchant_id = p_merchant_id
  );
$$;

-- 2c. Driver-assignment check that bypasses RLS on delivery_assignments
CREATE OR REPLACE FUNCTION public.order_assigned_to_driver(
  p_order_id uuid,
  p_driver_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.delivery_assignments
    WHERE order_id = p_order_id AND driver_id = p_driver_id
  );
$$;

-- 2d. Generic participant check used by child tables (order_items, order_status_history)
CREATE OR REPLACE FUNCTION public.is_order_participant(
  p_order_id uuid,
  p_user_id  uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = p_order_id
      AND (
        o.customer_id = p_user_id
        OR public.store_belongs_to_merchant(o.store_id, p_user_id)
        OR public.order_assigned_to_driver(p_order_id, p_user_id)
        OR get_user_role(p_user_id) = ANY (ARRAY['admin'::text, 'founder'::text])
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_order_status(uuid)                      TO authenticated;
GRANT EXECUTE ON FUNCTION public.store_belongs_to_merchant(uuid, uuid)       TO authenticated;
GRANT EXECUTE ON FUNCTION public.order_assigned_to_driver(uuid, uuid)        TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_order_participant(uuid, uuid)            TO authenticated;

-- 2e. Replace orders SELECT: use SECURITY DEFINER helpers to eliminate
--     any cross-table RLS cycle through delivery_assignments
DROP POLICY IF EXISTS rls_select_orders ON public.orders;
CREATE POLICY rls_select_orders ON public.orders
  FOR SELECT USING (
    customer_id = auth.uid()
    OR public.store_belongs_to_merchant(store_id, auth.uid())
    OR public.order_assigned_to_driver(id, auth.uid())
    OR get_user_role(auth.uid()) = ANY (ARRAY['admin'::text, 'founder'::text])
  );

-- 2f. Replace order_items SELECT: was subquerying orders under RLS
DROP POLICY IF EXISTS rls_select_order_items ON public.order_items;
CREATE POLICY rls_select_order_items ON public.order_items
  FOR SELECT USING (
    public.is_order_participant(order_id, auth.uid())
  );

-- 2g. Replace order_status_history SELECT: same issue
DROP POLICY IF EXISTS rls_select_order_status_history ON public.order_status_history;
CREATE POLICY rls_select_order_status_history ON public.order_status_history
  FOR SELECT USING (
    public.is_order_participant(order_id, auth.uid())
  );

-- ══════════════════════════════════════════════════════════════
-- 3. CREATE customer_favorites TABLE (was missing entirely)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.customer_favorites (
  id          uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id uuid        NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  product_id  uuid        NOT NULL REFERENCES public.products(id)  ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_id, product_id)
);

ALTER TABLE public.customer_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_select_customer_favorites ON public.customer_favorites;
DROP POLICY IF EXISTS rls_insert_customer_favorites ON public.customer_favorites;
DROP POLICY IF EXISTS rls_delete_customer_favorites ON public.customer_favorites;

CREATE POLICY rls_select_customer_favorites ON public.customer_favorites
  FOR SELECT USING (customer_id = auth.uid());

CREATE POLICY rls_insert_customer_favorites ON public.customer_favorites
  FOR INSERT WITH CHECK (customer_id = auth.uid() AND auth.uid() IS NOT NULL);

CREATE POLICY rls_delete_customer_favorites ON public.customer_favorites
  FOR DELETE USING (customer_id = auth.uid());
