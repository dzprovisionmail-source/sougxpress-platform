-- Fix recursive self-reference in profiles UPDATE policy.
-- Preserve the existing role immutability rule for non-admin users
-- without querying public.profiles from inside its own policy.
DROP POLICY IF EXISTS "rls_update_profiles" ON public.profiles;

CREATE POLICY "rls_update_profiles"
ON public.profiles
FOR UPDATE
TO public
USING (
  (id = auth.uid())
  OR (get_user_role(auth.uid()) = ANY (ARRAY['admin'::text, 'founder'::text]))
)
WITH CHECK (
  CASE
    WHEN (get_user_role(auth.uid()) = ANY (ARRAY['admin'::text, 'founder'::text]))
      THEN (role = ANY (ARRAY['customer'::text, 'merchant'::text, 'driver'::text, 'admin'::text, 'founder'::text]))
    ELSE (role = get_user_role(auth.uid()))
  END
);
