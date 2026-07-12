-- Migration 023: Fix audit call in confirm_delivery_payment
-- Correcting SQLSTATE 42883 (function does not exist) by fixing argument types and count.

CREATE OR REPLACE FUNCTION public.confirm_delivery_payment(
    p_cycle_id UUID,
    p_admin_user_id UUID
)
RETURNS VOID AS $$
BEGIN
    -- Capture the row before update for audit logging
    -- Fix: Explicitly cast row_to_json to JSONB to match log_audit_event signature
    PERFORM public.log_audit_event(
        p_admin_user_id, 
        'payment_confirmed', 
        'delivery_commission_cycles', 
        p_cycle_id,
        (SELECT row_to_json(dcc)::jsonb FROM public.delivery_commission_cycles dcc WHERE dcc.id = p_cycle_id),
        NULL::jsonb
    );

    UPDATE public.delivery_commission_cycles
    SET
        status = 'payment_confirmed',
        payment_confirmed_at = now()
    WHERE id = p_cycle_id AND status = 'payment_due';

    -- Create a new active cycle for the driver
    INSERT INTO public.delivery_commission_cycles (
        driver_id, deliveries_count, commission_earned_minor, status
    )
    SELECT driver_id, 0, 0, 'active'
    FROM public.delivery_commission_cycles
    WHERE id = p_cycle_id;
END;
$$ LANGUAGE plpgsql;
