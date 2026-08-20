-- ============================================================================
-- Phone Call Security & Audit Logging: Soug-XPRESS
-- 1. Harden Drivers RLS to protect phone numbers.
-- 2. Secure RPC for commercial phone retrieval.
-- 3. Secure RPC for call button audit logging.
-- ============================================================================

-- 1. HARDEN DRIVERS RLS
-- Drop the overly permissive policy if it exists
DROP POLICY IF EXISTS "rls_select_drivers" ON public.drivers;

-- Create a more restrictive policy for drivers
-- Everyone can see driver profiles (names, ratings, availability)
-- but phone numbers should ideally be handled via RPC or restricted view.
-- For now, we keep the basic SELECT but we will rely on the RPC for the actual phone retrieval in commercial flows.
CREATE POLICY "rls_select_drivers_public" ON public.drivers
FOR SELECT
USING (
    auth.uid() IS NOT NULL
);

-- 2. SECURE RPC FOR COMMERCIAL PHONE RETRIEVAL
CREATE OR REPLACE FUNCTION public.get_commercial_contact_phone(
    p_order_id UUID,
    p_target_role TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_auth_uid UUID := auth.uid();
    v_order_record RECORD;
    v_delivery_record RECORD;
    v_phone TEXT;
BEGIN
    -- Get order details
    SELECT o.*, s.merchant_id 
    INTO v_order_record
    FROM public.orders o
    JOIN public.stores s ON o.store_id = s.id
    WHERE o.id = p_order_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found';
    END IF;

    -- Get delivery details if any
    SELECT * INTO v_delivery_record
    FROM public.delivery_assignments
    WHERE order_id = p_order_id
    LIMIT 1;

    -- CHECK ELIGIBILITY
    -- Only allow if the requester is the customer, merchant, or assigned driver
    IF NOT (
        v_order_record.customer_id = v_auth_uid OR 
        v_order_record.merchant_id = v_auth_uid OR 
        (v_delivery_record.driver_id IS NOT NULL AND v_delivery_record.driver_id = v_auth_uid)
    ) THEN
        RAISE EXCEPTION 'Not authorized to access contact info for this order';
    END IF;

    -- CHECK ORDER STATUS ELIGIBILITY
    -- Generally, phone is available for active orders (not delivered/cancelled/failed)
    IF v_order_record.status IN ('delivered', 'cancelled', 'rejected') THEN
        RAISE EXCEPTION 'Order is no longer active for phone contact';
    END IF;

    -- RETRIEVE PHONE BASED ON TARGET ROLE
    CASE p_target_role
        WHEN 'customer' THEN
            SELECT phone_number INTO v_phone FROM public.customers WHERE id = v_order_record.customer_id;
        WHEN 'merchant' THEN
            SELECT contact_phone INTO v_phone FROM public.merchants WHERE id = v_order_record.merchant_id;
        WHEN 'courier' THEN
            IF v_delivery_record.driver_id IS NULL THEN
                RAISE EXCEPTION 'No courier assigned to this order yet';
            END IF;
            SELECT phone_number INTO v_phone FROM public.drivers WHERE id = v_delivery_record.driver_id;
        ELSE
            RAISE EXCEPTION 'Invalid target role';
    END CASE;

    RETURN v_phone;
END;
$$;

-- 3. SECURE RPC FOR CALL BUTTON AUDIT LOGGING
CREATE OR REPLACE FUNCTION public.log_call_button_press(
    p_order_id UUID,
    p_receiver_id UUID,
    p_relationship_type TEXT -- 'customer_merchant', 'customer_courier', etc.
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.audit_logs (
        user_id,
        event_type,
        table_name,
        record_id,
        new_data
    ) VALUES (
        auth.uid(),
        'CALL_BUTTON_PRESSED',
        'orders',
        p_order_id,
        jsonb_build_object(
            'receiver_id', p_receiver_id,
            'relationship_type', p_relationship_type,
            'timestamp', now()
        )
    );
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_commercial_contact_phone(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_call_button_press(UUID, UUID, TEXT) TO authenticated;
