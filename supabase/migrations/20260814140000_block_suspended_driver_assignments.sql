-- Block delivery assignment changes for drivers with 50+ unpaid deliveries.

CREATE OR REPLACE FUNCTION public.fn_block_suspended_driver_assignments()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF get_user_role(auth.uid()) NOT IN ('founder', 'admin')
     AND NEW.driver_id IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM public.drivers d
       WHERE d.id = NEW.driver_id
         AND (
           d.is_suspended_for_debt = true
           OR COALESCE(d.delivery_count, 0) - COALESCE(d.commission_paid_through_count, 0) >= 50
         )
     ) THEN
    RAISE EXCEPTION 'COURIER_COMMISSION_PAYMENT_REQUIRED';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_suspended_driver_assignments ON public.delivery_assignments;
CREATE TRIGGER trg_block_suspended_driver_assignments
  BEFORE INSERT OR UPDATE OF driver_id, status ON public.delivery_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_block_suspended_driver_assignments();
