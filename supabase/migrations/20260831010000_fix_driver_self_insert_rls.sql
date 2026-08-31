-- Allow self-registration after the creation-time marketplace trigger normalizes
-- a real driver's status to active/online/available.
-- The caller is still restricted to creating a row whose id is auth.uid().
BEGIN;

DROP POLICY IF EXISTS rls_insert_drivers ON public.drivers;

CREATE POLICY rls_insert_drivers ON public.drivers
  FOR INSERT
  WITH CHECK (
    CASE
      WHEN public.get_user_role(auth.uid()) IN ('admin', 'founder') THEN
        status IN ('pending', 'pending_review', 'active', 'suspended', 'offline')
      ELSE
        status IN ('pending', 'pending_review', 'active')
        AND id = auth.uid()
        AND auth.uid() IS NOT NULL
    END
  );

COMMENT ON POLICY rls_insert_drivers ON public.drivers IS
  'Admins/founders may provision allowed driver statuses; a regular authenticated user may insert only their own driver row. Active is allowed because the BEFORE INSERT marketplace trigger normalizes real drivers to active.';

ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

COMMIT;

NOTIFY pgrst, 'reload schema';
