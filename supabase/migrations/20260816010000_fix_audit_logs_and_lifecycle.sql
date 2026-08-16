-- Make log_audit_event SECURITY DEFINER so audit logs can be written by triggers without RLS blocking
CREATE OR REPLACE FUNCTION public.log_audit_event(
    p_user_id uuid,
    p_event_type text,
    p_table_name text,
    p_record_id uuid,
    p_old_data jsonb,
    p_new_data jsonb
) RETURNS void 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.audit_logs (
        user_id, event_type, table_name, record_id, old_data, new_data
    )
    VALUES (
        p_user_id, p_event_type, p_table_name, p_record_id, p_old_data, p_new_data
    );
END;
$$ LANGUAGE plpgsql;

-- Update enforce_order_lifecycle to allow merchants to cancel or reject orders
CREATE OR REPLACE FUNCTION public.enforce_order_lifecycle()
RETURNS TRIGGER AS $$
BEGIN
    -- Only check if status is changing
    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
        -- Admin/Founder bypass
        IF public.get_user_role(auth.uid()) IN ('admin', 'founder') 
           OR current_setting('public.system_sync', true) = 'on' THEN
            RETURN NEW;
        END IF;

        -- Customer transitions
        IF auth.uid() = NEW.customer_id THEN
            IF NEW.status = 'cancelled' AND OLD.status IN ('pending', 'accepted') THEN
                RETURN NEW;
            END IF;
            RAISE EXCEPTION 'Invalid order status transition for customer: % -> %', OLD.status, NEW.status;
        END IF;

        -- Merchant transitions (via store owner)
        IF EXISTS (SELECT 1 FROM public.stores WHERE id = NEW.store_id AND merchant_id = auth.uid()) THEN
            IF (OLD.status = 'pending' AND NEW.status IN ('accepted', 'rejected', 'cancelled')) OR
               (OLD.status = 'accepted' AND NEW.status IN ('preparing', 'cancelled')) OR
               (OLD.status = 'preparing' AND NEW.status IN ('ready_for_pickup', 'cancelled')) OR
               (OLD.status = 'ready_for_pickup' AND NEW.status = 'ready_for_pickup') THEN
                RETURN NEW;
            END IF;
            RAISE EXCEPTION 'Invalid order status transition for merchant: % -> %', OLD.status, NEW.status;
        END IF;

        -- Driver transitions
        IF EXISTS (SELECT 1 FROM public.delivery_assignments WHERE order_id = NEW.id AND driver_id = auth.uid()) THEN
            RAISE EXCEPTION 'Drivers cannot update order status directly';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
