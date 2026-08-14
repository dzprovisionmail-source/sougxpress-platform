-- Enforce the 50-delivery unpaid commission lock at the database boundary.

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

    IF OLD.is_suspended_for_debt
       OR (COALESCE(OLD.delivery_count, 0) - COALESCE(OLD.commission_paid_through_count, 0) >= 50) THEN
      NEW.is_suspended_for_debt := true;
      NEW.availability := 'offline';
      NEW.status := 'suspended';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
