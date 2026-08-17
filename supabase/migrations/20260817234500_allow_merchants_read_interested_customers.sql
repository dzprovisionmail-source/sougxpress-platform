-- Allow merchants to render Phase 2 customer interest without exposing unrelated customers.
-- A merchant may read only customer rows linked to a store favorite for a store they own.

DROP POLICY IF EXISTS "Merchants can view interested customers" ON public.customers;

CREATE POLICY "Merchants can view interested customers"
ON public.customers
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM public.customer_favorites AS cf
    INNER JOIN public.stores AS s ON s.id = cf.target_id
    WHERE cf.customer_id = customers.id
      AND cf.target_type = 'store'
      AND s.merchant_id = auth.uid()
  )
);
