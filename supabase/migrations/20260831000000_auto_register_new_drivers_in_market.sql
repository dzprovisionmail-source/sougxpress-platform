-- Automatically make every newly-created real driver discoverable through the
-- existing public.drivers availability pipeline used by marketplace/assignment.
-- Existing driver rows are untouched; UPDATEs are intentionally excluded.
-- The drivers primary key (auth user id) remains the idempotency boundary.

BEGIN;

CREATE OR REPLACE FUNCTION public.auto_register_new_driver_in_market()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Demo/fixture rows are not real marketplace drivers and retain their
  -- caller-supplied state.
  IF COALESCE(NEW.is_demo, FALSE) THEN
    RETURN NEW;
  END IF;

  -- The current marketplace source requires an active, online, available
  -- driver. Apply this only at creation time; existing driver state and all
  -- later availability/status transitions remain governed by current RLS and
  -- driver_set_availability()/admin flows.
  NEW.status := 'active';
  NEW.availability := 'online';
  NEW.is_available := TRUE;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_register_new_driver_in_market ON public.drivers;
CREATE TRIGGER trg_auto_register_new_driver_in_market
BEFORE INSERT ON public.drivers
FOR EACH ROW
EXECUTE FUNCTION public.auto_register_new_driver_in_market();

REVOKE ALL ON FUNCTION public.auto_register_new_driver_in_market() FROM PUBLIC;
COMMENT ON FUNCTION public.auto_register_new_driver_in_market()
IS 'Creation-time registration for real drivers in the existing active/online/available marketplace pipeline; does not modify existing rows.';

COMMIT;

NOTIFY pgrst, 'reload schema';
