-- Align courier commission accounting with the runtime driver workspace.
-- The active mobile driver flow uses public.drivers and public.delivery_assignments.

-- Remove the previously introduced trigger that watched the wrong runtime path.
DROP TRIGGER IF EXISTS trg_courier_delivery_completion ON public.orders;
DROP FUNCTION IF EXISTS public.fn_handle_courier_delivery_completion();

-- The first draft added these unused fields to public.couriers. Remove them so
-- there is one authoritative commission model for the active driver workspace.
ALTER TABLE public.couriers
  DROP COLUMN IF EXISTS delivery_count,
  DROP COLUMN IF EXISTS commission_owed_minor,
  DROP COLUMN IF EXISTS commission_paid,
  DROP COLUMN IF EXISTS is_suspended_for_debt;

-- Profile fields used by the existing /driver/profile screen.
ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS vehicle_photo_url TEXT,
  ADD COLUMN IF NOT EXISTS vehicle_make TEXT,
  ADD COLUMN IF NOT EXISTS vehicle_color TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS neighborhood TEXT;

-- Commission state for the 200 DZD fixed delivery fee and 20% platform share.
ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS delivery_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission_owed_minor INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission_paid_through_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_suspended_for_debt BOOLEAN NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.fn_handle_driver_delivery_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  commission_minor INTEGER := 4000; -- 20% of 200 DZD, stored in minor units
  next_delivery_count INTEGER;
  paid_through_count INTEGER;
BEGIN
  IF NEW.status = 'delivered'
     AND OLD.status IS DISTINCT FROM NEW.status
     AND NEW.driver_id IS NOT NULL THEN
    UPDATE public.drivers
    SET
      delivery_count = COALESCE(delivery_count, 0) + 1,
      commission_owed_minor = COALESCE(commission_owed_minor, 0) + commission_minor,
      is_suspended_for_debt = (
        (COALESCE(delivery_count, 0) + 1) - COALESCE(commission_paid_through_count, 0) >= 50
      )
    WHERE id = NEW.driver_id
    RETURNING delivery_count, commission_paid_through_count
    INTO next_delivery_count, paid_through_count;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_driver_delivery_completion ON public.delivery_assignments;
CREATE TRIGGER trg_driver_delivery_completion
  AFTER UPDATE OF status ON public.delivery_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_handle_driver_delivery_completion();

-- Prevent a driver from changing financial counters or suspension state from
-- the mobile client. Founder/Admin remain able to reconcile payment.
CREATE OR REPLACE FUNCTION public.fn_protect_driver_commission_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF pg_trigger_depth() = 1
     AND get_user_role(auth.uid()) NOT IN ('founder', 'admin') THEN
    NEW.delivery_count := OLD.delivery_count;
    NEW.commission_owed_minor := OLD.commission_owed_minor;
    NEW.commission_paid_through_count := OLD.commission_paid_through_count;
    NEW.is_suspended_for_debt := OLD.is_suspended_for_debt;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_driver_commission_fields ON public.drivers;
CREATE TRIGGER trg_protect_driver_commission_fields
  BEFORE UPDATE ON public.drivers
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_protect_driver_commission_fields();

COMMENT ON COLUMN public.drivers.delivery_count IS 'Completed delivery count from delivery_assignments';
COMMENT ON COLUMN public.drivers.commission_owed_minor IS 'Outstanding platform commission in minor units';
COMMENT ON COLUMN public.drivers.commission_paid_through_count IS 'Completed deliveries reconciled by Founder/Admin';
COMMENT ON COLUMN public.drivers.is_suspended_for_debt IS 'Account is blocked after 50 unpaid deliveries';
