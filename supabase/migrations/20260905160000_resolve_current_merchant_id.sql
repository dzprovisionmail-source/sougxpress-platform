BEGIN;

-- Resolve the merchant record belonging to the authenticated user without
-- exposing merchant rows through a client-side query that may be blocked by RLS.
-- Some legacy stores reference merchants.id while the active session is keyed
-- by auth.users.id; email is the stable identity bridge for those rows.
CREATE OR REPLACE FUNCTION public.resolve_current_merchant_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT m.id
  FROM public.merchants AS m
  WHERE m.id = auth.uid()
     OR lower(trim(COALESCE(m.email, m.contact_email))) =
        lower(trim(auth.jwt() ->> 'email'))
  ORDER BY (m.id = auth.uid()) DESC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.resolve_current_merchant_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_current_merchant_id() TO authenticated;

COMMIT;
