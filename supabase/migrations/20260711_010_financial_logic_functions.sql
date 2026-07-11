-- Migration: 010_financial_logic_functions.sql
-- Purpose: Financial calculation and commission logic functions

-- Function to get platform financial settings
CREATE OR REPLACE FUNCTION public.get_platform_financial_setting(setting_key TEXT)
RETURNS TEXT AS $$
DECLARE
    setting_value TEXT;
BEGIN
    SELECT value INTO setting_value FROM public.platform_financial_settings WHERE key = setting_key;
    RETURN setting_value;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate order total
CREATE OR REPLACE FUNCTION public.calculate_order_total(
    p_order_id UUID
)
RETURNS TABLE (
    subtotal_minor INTEGER,
    delivery_fee_minor INTEGER,
    platform_commission_minor INTEGER,
    total_minor INTEGER
) AS $$
DECLARE
    v_subtotal_minor INTEGER := 0;
    v_base_delivery_fee_minor INTEGER;
    v_delivery_platform_share_percent INTEGER;
    v_delivery_fee_minor INTEGER;
    v_platform_commission_minor INTEGER;
BEGIN
    -- Calculate subtotal from order items
    SELECT COALESCE(SUM(oi.quantity * oi.price_at_order_minor), 0)
    INTO v_subtotal_minor
    FROM public.order_items oi
    WHERE oi.order_id = p_order_id;

    -- Get financial settings
    v_base_delivery_fee_minor := public.get_platform_financial_setting(
        'base_delivery_fee_minor'
    )::INTEGER;
    v_delivery_platform_share_percent := public.get_platform_financial_setting(
        'delivery_platform_share_percent'
    )::INTEGER;

    -- Calculate delivery fee (fixed for now)
    v_delivery_fee_minor := v_base_delivery_fee_minor;

    -- Calculate platform commission from delivery fee
    v_platform_commission_minor := (v_delivery_fee_minor * v_delivery_platform_share_percent) / 100;

    -- Return the calculated values
    RETURN QUERY SELECT
        v_subtotal_minor,
        v_delivery_fee_minor,
        v_platform_commission_minor,
        v_subtotal_minor + v_delivery_fee_minor AS total_minor;
END;
$$ LANGUAGE plpgsql;

-- Function to log audit events
CREATE OR REPLACE FUNCTION public.log_audit_event(
    p_user_id UUID,
    p_event_type TEXT,
    p_table_name TEXT,
    p_record_id UUID DEFAULT NULL,
    p_old_data JSONB DEFAULT NULL,
    p_new_data JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.audit_logs (
        user_id, event_type, table_name, record_id, old_data, new_data
    )
    VALUES (
        p_user_id, p_event_type, p_table_name, p_record_id, p_old_data, p_new_data
    );
END;
$$ LANGUAGE plpgsql;

-- Function to increment driver delivery commission counter
CREATE OR REPLACE FUNCTION public.increment_delivery_commission_counter(
    p_driver_id UUID,
    p_commission_amount_minor INTEGER
)
RETURNS VOID AS $$
DECLARE
    v_cycle_id UUID;
    v_commission_cycle_threshold INTEGER;
BEGIN
    -- Get commission cycle threshold
    v_commission_cycle_threshold := public.get_platform_financial_setting(
        'commission_cycle_threshold'
    )::INTEGER;

    -- Find active cycle or create a new one
    SELECT id INTO v_cycle_id
    FROM public.delivery_commission_cycles
    WHERE driver_id = p_driver_id AND status = 'active';

    IF v_cycle_id IS NULL THEN
        INSERT INTO public.delivery_commission_cycles (
            driver_id, deliveries_count, commission_earned_minor, status
        )
        VALUES (
            p_driver_id, 1, p_commission_amount_minor, 'active'
        )
        RETURNING id INTO v_cycle_id;
    ELSE
        UPDATE public.delivery_commission_cycles
        SET
            deliveries_count = deliveries_count + 1,
            commission_earned_minor = commission_earned_minor + p_commission_amount_minor
        WHERE id = v_cycle_id;
    END IF;

    -- Check if threshold is reached (guard against NULL or 0)
    IF v_commission_cycle_threshold IS NOT NULL AND v_commission_cycle_threshold > 0 THEN
        UPDATE public.delivery_commission_cycles
        SET
            status = 'payment_due',
            payment_due_at = now()
        WHERE id = v_cycle_id AND deliveries_count >= v_commission_cycle_threshold AND status = 'active';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to confirm delivery payment
CREATE OR REPLACE FUNCTION public.confirm_delivery_payment(
    p_cycle_id UUID,
    p_admin_user_id UUID
)
RETURNS VOID AS $$
BEGIN
    -- Capture the row before update for audit logging
    -- NOTE: We must read old values BEFORE the UPDATE, otherwise we get the already-modified row.
    PERFORM public.log_audit_event(
        p_admin_user_id, 'payment_confirmed', 'delivery_commission_cycles', p_cycle_id,
        (SELECT row_to_json(dcc) FROM public.delivery_commission_cycles dcc WHERE dcc.id = p_cycle_id),
        NULL -- Will be re-logged after update with new values if needed
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

-- Function to create order transaction
CREATE OR REPLACE FUNCTION public.create_order_transaction(
    p_order_id UUID,
    p_customer_id UUID,
    p_merchant_id UUID,
    p_driver_id UUID,
    p_amount_minor INTEGER,
    p_type TEXT,
    p_payment_method TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.transactions (
        order_id, customer_id, merchant_id, driver_id, amount_minor, type, payment_method
    )
    VALUES (
        p_order_id, p_customer_id, p_merchant_id, p_driver_id, p_amount_minor, p_type, p_payment_method
    );
END;
$$ LANGUAGE plpgsql;
