-- Fix infinite recursion in customers RLS update policy
BEGIN;

DROP POLICY IF EXISTS "rls_update_customers" ON public.customers;

CREATE POLICY "rls_update_customers"
  ON public.customers
  FOR UPDATE
  TO authenticated
  USING (
    id = auth.uid()
    OR public.get_user_role(auth.uid()) = ANY (ARRAY['admin', 'founder'])
  )
  WITH CHECK (
    CASE
      WHEN public.get_user_role(auth.uid()) = ANY (ARRAY['admin', 'founder']) THEN status = ANY (ARRAY['active', 'suspended', 'blocked'])
      ELSE status = status
    END
  );

COMMIT;
