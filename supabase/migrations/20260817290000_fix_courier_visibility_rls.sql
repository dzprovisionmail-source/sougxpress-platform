-- Allow drivers to view profiles of users who favorited them
CREATE POLICY "Drivers can view profiles of users who favorited them"
ON public.profiles
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.favorite_couriers fc
        WHERE fc.courier_id = auth.uid() AND fc.user_id = profiles.id
    )
);

-- Allow drivers to view customer details for those who favorited them
CREATE POLICY "Drivers can view customers who favorited them"
ON public.customers
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.favorite_couriers fc
        WHERE fc.courier_id = auth.uid() AND fc.user_id = customers.id
    )
);

-- Allow drivers to view customer details for their relationship customers (past deliveries)
CREATE POLICY "Drivers can view relationship customers"
ON public.customers
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.delivery_assignments da
        JOIN public.orders o ON o.id = da.order_id
        WHERE da.driver_id = auth.uid() AND o.customer_id = customers.id
    )
);

-- Update the RPCs to be SECURITY DEFINER but with a safe search path
-- This ensures they bypass RLS if needed, but we've added the policies above to be safe.
-- Actually, since they are already SECURITY DEFINER, they should work if the owner is postgres.
-- The main issue was likely the JOINs in the RPC failing due to RLS if the owner wasn't bypassing it.
