-- Allow merchants to render customers they explicitly favorited in Phase 3.
-- This does not expose unrelated customer records.

DROP POLICY IF EXISTS "Merchants can view explicitly favorited customers" ON public.customers;

CREATE POLICY "Merchants can view explicitly favorited customers"
ON public.customers
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM public.merchant_favorites AS mf
    WHERE mf.merchant_id = auth.uid()
      AND mf.target_type = 'customer'
      AND mf.target_id = customers.id
  )
);
