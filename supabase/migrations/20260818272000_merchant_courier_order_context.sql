-- Migration: 20260818272000_merchant_courier_order_context.sql
-- Description: Provides secure order context views and safe RPC functions for merchant-courier delivery operations without breaking existing order states.

-- 1. Secure view for order context within chats (zero phone disclosure)
CREATE OR REPLACE VIEW public.v_chat_order_context AS
SELECT 
    o.id AS order_id,
    o.customer_id,
    o.store_id,
    s.name AS store_name,
    s.merchant_id,
    da.driver_id,
    o.status AS order_status,
    da.status AS delivery_status,
    o.total_minor,
    o.delivery_fee_minor,
    o.created_at
FROM public.orders o
JOIN public.stores s ON o.store_id = s.id
LEFT JOIN public.delivery_assignments da ON o.id = da.order_id;

-- 2. Grant select on view to authenticated users
GRANT SELECT ON public.v_chat_order_context TO authenticated;

-- 3. Safe helper function to get or create a chat conversation for an order/relationship
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

    -- Check if commercial permission is valid
    IF NOT public.can_start_chat(v_current_user, p_other_user, p_relationship_type, p_reference_id) THEN
        RAISE EXCEPTION 'Unauthorized: No valid commercial relationship between users';
    END IF;

    -- Deterministic participant ordering to prevent duplicate conversations
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
