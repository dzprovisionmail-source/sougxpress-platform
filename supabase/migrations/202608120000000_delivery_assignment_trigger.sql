-- Migration: 202608120000000_delivery_assignment_trigger.sql
-- Purpose: Automatically create a delivery assignment when an order is ready for pickup.

CREATE OR REPLACE FUNCTION public.handle_order_ready_for_pickup()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create assignment if status changed to 'ready_for_pickup'
    -- and no assignment already exists for this order.
    IF (NEW.status = 'ready_for_pickup' AND OLD.status != 'ready_for_pickup') THEN
        IF NOT EXISTS (SELECT 1 FROM public.delivery_assignments WHERE order_id = NEW.id) THEN
            INSERT INTO public.delivery_assignments (order_id, status, created_at, updated_at)
            VALUES (NEW.id, 'pending', now(), now());
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_create_delivery_assignment ON public.orders;
CREATE TRIGGER trg_create_delivery_assignment
    AFTER UPDATE OF status ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_order_ready_for_pickup();
