-- Add courier commission tracking and profile enhancements.

ALTER TABLE public.couriers
ADD COLUMN IF NOT EXISTS delivery_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS commission_owed_minor INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS commission_paid BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_suspended_for_debt BOOLEAN DEFAULT false;

-- Trigger to increment delivery count and commission owed (20% of 200 DZD fixed delivery fee = 40 DZD per delivery)
CREATE OR REPLACE FUNCTION public.fn_handle_courier_delivery_completion()
RETURNS TRIGGER AS $$
DECLARE
  delivery_fee_minor INTEGER := 20000; -- 200.00 DZD in minor units (cents/centimes)
  commission_minor INTEGER := 4000;  -- 20% of 200 DZD = 40.00 DZD
BEGIN
  -- When delivery status transitions to 'delivered' or 'completed'
  IF (NEW.status IN ('delivered', 'completed') AND (OLD.status IS DISTINCT FROM NEW.status)) AND NEW.driver_id IS NOT NULL THEN
    UPDATE public.couriers
    SET 
      delivery_count = COALESCE(delivery_count, 0) + 1,
      commission_owed_minor = COALESCE(commission_owed_minor, 0) + commission_minor,
      is_suspended_for_debt = CASE WHEN (COALESCE(delivery_count, 0) + 1) >= 50 AND NOT COALESCE(commission_paid, false) THEN true ELSE is_suspended_for_debt END
    WHERE id = NEW.driver_id OR user_id = NEW.driver_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trg_courier_delivery_completion ON public.orders;
CREATE TRIGGER trg_courier_delivery_completion
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_handle_courier_delivery_completion();

COMMENT ON COLUMN public.couriers.delivery_count IS 'Total completed deliveries by the courier';
COMMENT ON COLUMN public.couriers.commission_owed_minor IS 'Commission owed to platform in minor units (20% of fixed delivery fee)';
COMMENT ON COLUMN public.couriers.is_suspended_for_debt IS 'True if courier reached 50 deliveries without paying commission';
