-- Drop and recreate the update policy for orders to correctly handle merchant transitions including cancellation/rejection
DROP POLICY IF EXISTS rls_update_orders ON public.orders;

CREATE POLICY rls_update_orders ON public.orders
    FOR UPDATE
    USING (
        customer_id = auth.uid()
        OR store_id IN (SELECT id FROM stores WHERE merchant_id = auth.uid())
        OR get_user_role(auth.uid()) = ANY(ARRAY['admin', 'founder'])
    )
    WITH CHECK (
        CASE
            WHEN get_user_role(auth.uid()) = ANY(ARRAY['admin', 'founder']) THEN
                status = ANY(ARRAY['pending', 'accepted', 'preparing', 'ready_for_pickup', 'picked_up', 'out_for_delivery', 'delivered', 'cancelled', 'rejected'])
            WHEN customer_id = auth.uid() THEN
                status = 'cancelled' AND get_order_status(id) = ANY(ARRAY['pending', 'accepted'])
            WHEN store_id IN (SELECT id FROM stores WHERE merchant_id = auth.uid()) THEN
                (
                    (get_order_status(id) = 'pending' AND status = ANY(ARRAY['accepted', 'rejected', 'cancelled']))
                    OR (get_order_status(id) = 'accepted' AND status = ANY(ARRAY['preparing', 'cancelled']))
                    OR (get_order_status(id) = 'preparing' AND status = ANY(ARRAY['ready_for_pickup', 'cancelled']))
                    OR (get_order_status(id) = 'ready_for_pickup' AND status = 'ready_for_pickup')
                )
            ELSE false
        END
    );
