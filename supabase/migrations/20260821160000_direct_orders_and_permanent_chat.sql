-- 1. Add direct_driver_id to orders to support direct ordering
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS direct_driver_id UUID REFERENCES public.drivers(id);

-- 2. Create RPC for customer to send direct delivery offer to a favorite courier
CREATE OR REPLACE FUNCTION public.customer_send_direct_delivery_offer(
    p_order_id UUID,
    p_driver_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_customer_id UUID;
BEGIN
    -- Get current user
    v_customer_id := auth.uid();

    -- Check if order exists and belongs to customer
    IF NOT EXISTS (
        SELECT 1 FROM public.orders 
        WHERE id = p_order_id AND customer_id = v_customer_id
    ) THEN
        RAISE EXCEPTION 'Order not found or unauthorized.';
    END IF;

    -- Check if relationship exists in either direction (Customer favorite or Courier favorite)
    IF NOT EXISTS (
        SELECT 1 FROM public.favorite_couriers 
        WHERE user_id = v_customer_id AND courier_id = p_driver_id
    ) AND NOT EXISTS (
        SELECT 1 FROM public.courier_favorites
        WHERE courier_id = p_driver_id AND target_id = v_customer_id AND target_type = 'customer'
    ) AND NOT EXISTS (
        SELECT 1 FROM public.delivery_assignments da
        JOIN public.orders o ON da.order_id = o.id
        WHERE da.driver_id = p_driver_id AND o.customer_id = v_customer_id AND da.status = 'delivered'
    ) THEN
        RAISE EXCEPTION 'Direct offers only allowed for connected customers (favorites or past delivery).';
    END IF;

    -- Update order with direct driver
    UPDATE public.orders 
    SET direct_driver_id = p_driver_id
    WHERE id = p_order_id;

    -- Create or update delivery assignment
    -- Note: order_id is not unique in delivery_assignments schema, manually check and update or insert
    IF EXISTS (SELECT 1 FROM public.delivery_assignments WHERE order_id = p_order_id) THEN
        UPDATE public.delivery_assignments
        SET driver_id = p_driver_id,
            status = 'pending',
            updated_at = now()
        WHERE order_id = p_order_id;
    ELSE
        INSERT INTO public.delivery_assignments (order_id, driver_id, status)
        VALUES (p_order_id, p_driver_id, 'pending');
    END IF;

    -- Log audit
    PERFORM public.log_audit_event(v_customer_id, 'DIRECT_ORDER_SENT', 'orders', p_order_id);
END;
$$;

-- 3. Re-align get_or_create_chat_conversation with authoritative contract and add permanent favorite support
CREATE OR REPLACE FUNCTION public.get_or_create_chat_conversation(
    p_other_user UUID,
    p_relationship_type TEXT,
    p_reference_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_user UUID := auth.uid();
    v_conv_id UUID;
    v_p1 UUID;
    v_p2 UUID;
BEGIN
    IF v_current_user IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- The existing can_start_chat already checks favorites for permanent contact
    -- when reference_id is NULL. We just ensure it stays consistent.
    IF NOT public.can_start_chat(v_current_user, p_other_user, p_relationship_type, p_reference_id) THEN
        RAISE EXCEPTION 'Unauthorized: No valid commercial relationship between users';
    END IF;

    -- Deterministic participant ordering
    IF v_current_user < p_other_user THEN
        v_p1 := v_current_user;
        v_p2 := p_other_user;
    ELSE
        v_p1 := p_other_user;
        v_p2 := v_current_user;
    END IF;

    -- Try to find existing conversation
    SELECT id INTO v_conv_id
    FROM public.chat_conversations
    WHERE participant_one = v_p1 
      AND participant_two = v_p2 
      AND relationship_type = p_relationship_type
      AND (reference_id IS NOT NULL AND reference_id = p_reference_id OR reference_id IS NULL AND p_reference_id IS NULL);

    -- If not found, create one
    IF v_conv_id IS NULL THEN
        INSERT INTO public.chat_conversations (participant_one, participant_two, relationship_type, reference_id)
        VALUES (v_p1, v_p2, p_relationship_type, p_reference_id)
        RETURNING id INTO v_conv_id;
    END IF;

    RETURN v_conv_id;
END;
$$;

-- 4. RPC to check if permanent contact is allowed (for UI buttons)
CREATE OR REPLACE FUNCTION public.can_contact_permanently(p_target_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check Customer -> Courier favorite
    IF EXISTS (
        SELECT 1 FROM public.favorite_couriers 
        WHERE user_id = auth.uid() AND courier_id = p_target_id
    ) THEN RETURN true; END IF;

    -- Check Courier -> Customer favorite
    IF EXISTS (
        SELECT 1 FROM public.courier_favorites 
        WHERE courier_id = auth.uid() AND target_id = p_target_id AND target_type = 'customer'
    ) THEN RETURN true; END IF;

    -- Reverse checks for visibility
    IF EXISTS (
        SELECT 1 FROM public.favorite_couriers 
        WHERE user_id = p_target_id AND courier_id = auth.uid()
    ) THEN RETURN true; END IF;

    IF EXISTS (
        SELECT 1 FROM public.courier_favorites 
        WHERE courier_id = p_target_id AND target_id = auth.uid() AND target_type = 'customer'
    ) THEN RETURN true; END IF;

    RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.customer_send_direct_delivery_offer(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_contact_permanently(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
