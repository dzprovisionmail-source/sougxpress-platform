-- Keep Founder approval as the source of truth for account status.
-- The existing marketplace trigger remains installed, but it must not promote a
-- newly registered driver before Founder approval. Availability is independent.
BEGIN;

CREATE OR REPLACE FUNCTION public.auto_register_new_driver_in_market()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Approval status is owned by the Founder workflow. Do not convert
  -- pending_review into active here, and do not change availability.
  RETURN NEW;
END;
$$;

ALTER TABLE public.drivers
  DROP CONSTRAINT IF EXISTS drivers_status_check;

ALTER TABLE public.drivers
  ADD CONSTRAINT drivers_status_check
  CHECK (status IN ('pending', 'pending_review', 'active', 'suspended', 'rejected', 'offline'));

DROP POLICY IF EXISTS rls_insert_drivers ON public.drivers;
CREATE POLICY rls_insert_drivers ON public.drivers
  FOR INSERT WITH CHECK (
    CASE
      WHEN public.get_user_role(auth.uid()) IN ('admin', 'founder') THEN
        status IN ('pending', 'pending_review', 'active', 'suspended', 'rejected', 'offline')
      ELSE
        status IN ('pending', 'pending_review', 'active')
        AND id = auth.uid()
        AND auth.uid() IS NOT NULL
    END
  );

DROP POLICY IF EXISTS rls_update_drivers ON public.drivers;
CREATE POLICY rls_update_drivers ON public.drivers
  FOR UPDATE USING (
    id = auth.uid()
    OR public.get_user_role(auth.uid()) IN ('admin', 'founder')
  ) WITH CHECK (
    CASE
      WHEN public.get_user_role(auth.uid()) IN ('admin', 'founder') THEN
        status IN ('pending', 'pending_review', 'active', 'suspended', 'rejected', 'offline')
      ELSE
        status = (SELECT current_driver.status FROM public.drivers current_driver WHERE current_driver.id = auth.uid() LIMIT 1)
    END
  );

COMMENT ON FUNCTION public.auto_register_new_driver_in_market()
IS 'Compatibility trigger retained for the marketplace pipeline; it never changes approval status or availability. Founder approval controls drivers.status, while availability remains independent.';

COMMIT;

NOTIFY pgrst, 'reload schema';
