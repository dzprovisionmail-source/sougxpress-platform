-- Migration: 011_business_logic_triggers.sql
-- Purpose: Automatic business logic enforcement

-- Trigger for order status changes
CREATE OR REPLACE FUNCTION public.handle_order_status_change()
RETURNS TRIGGER AS $$
DECLARE
    v_driver_id UUID;
    v_platform_commission_minor INTEGER;
    v_customer_id UUID;
    v_merchant_id UUID;
BEGIN
    -- Log audit event for order status change
    PERFORM public.log_audit_event(
        NEW.customer_id, -- Assuming customer_id is the primary actor for order changes
        'order_status_change',
        'orders',
        NEW.id,
        jsonb_build_object('status', OLD.status),
        jsonb_build_object('status', NEW.status)
    );

    IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
        -- Get driver_id and platform_commission_minor for the delivered order
        SELECT da.driver_id, o.platform_commission_minor
        INTO v_driver_id, v_platform_commission_minor
        FROM public.delivery_assignments da
        JOIN public.orders o ON da.order_id = o.id
        WHERE da.order_id = NEW.id AND da.status = 'delivered';

        IF v_driver_id IS NOT NULL AND v_platform_commission_minor IS NOT NULL THEN
            PERFORM public.increment_delivery_commission_counter(v_driver_id, v_platform_commission_minor);
        END IF;

        -- Create transaction for platform commission
        SELECT customer_id, store_id INTO v_customer_id, v_merchant_id FROM public.orders WHERE id = NEW.id;
        PERFORM public.create_order_transaction(
            NEW.id,
            v_customer_id,
            v_merchant_id,
            v_driver_id,
            NEW.platform_commission_minor,
            'commission',
            NULL
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_order_status_change
AFTER UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.handle_order_status_change();

-- Trigger for delivery assignments status changes
CREATE OR REPLACE FUNCTION public.handle_delivery_assignment_change()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM public.log_audit_event(
        NEW.driver_id, -- Assuming driver_id is the primary actor for delivery assignment changes
        'delivery_assignment_status_change',
        'delivery_assignments',
        NEW.id,
        jsonb_build_object('status', OLD.status),
        jsonb_build_object('status', NEW.status)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_delivery_assignment_change
AFTER UPDATE OF status ON public.delivery_assignments
FOR EACH ROW
EXECUTE FUNCTION public.handle_delivery_assignment_change();

-- Trigger for disputes creation/status changes
CREATE OR REPLACE FUNCTION public.handle_dispute_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM public.log_audit_event(
            NEW.customer_id, -- Assuming customer_id initiates the dispute
            'dispute_created',
            'disputes',
            NEW.id,
            NULL,
            row_to_json(NEW)::jsonb
        );
    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM public.log_audit_event(
            NEW.resolved_by, -- Assuming resolved_by is the actor for status change
            'dispute_status_change',
            'disputes',
            NEW.id,
            jsonb_build_object('status', OLD.status),
            jsonb_build_object('status', NEW.status)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_dispute_change
AFTER INSERT OR UPDATE OF status ON public.disputes
FOR EACH ROW
EXECUTE FUNCTION public.handle_dispute_change();

-- Trigger for founder overrides
CREATE OR REPLACE FUNCTION public.handle_founder_override()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM public.log_audit_event(
        NEW.founder_id,
        'founder_override',
        'founder_overrides',
        NEW.id,
        NULL,
        row_to_json(NEW)::jsonb
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_founder_override
AFTER INSERT ON public.founder_overrides
FOR EACH ROW
EXECUTE FUNCTION public.handle_founder_override();
