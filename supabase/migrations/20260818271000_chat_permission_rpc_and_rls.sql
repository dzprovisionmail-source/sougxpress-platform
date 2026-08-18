-- Migration: 20260818271000_chat_permission_rpc_and_rls.sql
-- Description: Implements can_start_chat RPC and RLS policies for chat_conversations and chat_messages.

-- 1. Commercial Permission Function: can_start_chat
CREATE OR REPLACE FUNCTION public.can_start_chat(
    p_user_a UUID,
    p_user_b UUID,
    p_relationship_type TEXT,
    p_reference_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_role_a TEXT;
    v_role_b TEXT;
    v_is_valid BOOLEAN := false;
BEGIN
    -- Retrieve roles
    SELECT role INTO v_role_a FROM public.profiles WHERE id = p_user_a;
    SELECT role INTO v_role_b FROM public.profiles WHERE id = p_user_b;

    IF v_role_a IS NULL OR v_role_b IS NULL THEN
        RETURN false;
    END IF;

    -- CASE 1: Customer <-> Merchant ('customer_merchant')
    IF p_relationship_type = 'customer_merchant' THEN
        IF (v_role_a = 'customer' AND v_role_b = 'merchant') OR (v_role_a = 'merchant' AND v_role_b = 'customer') THEN
            DECLARE
                v_cust_id UUID := CASE WHEN v_role_a = 'customer' THEN p_user_a ELSE p_user_b END;
                v_merch_id UUID := CASE WHEN v_role_a = 'merchant' THEN p_user_a ELSE p_user_b END;
                v_store_id UUID;
            BEGIN
                -- Find store(s) belonging to merchant
                FOR v_store_id IN SELECT id FROM public.stores WHERE merchant_id = v_merch_id LOOP
                    -- Check customer_favorites (store favorite)
                    IF EXISTS (
                        SELECT 1 FROM public.customer_favorites 
                        WHERE customer_id = v_cust_id AND target_type = 'store' AND target_id = v_store_id
                    ) THEN
                        v_is_valid := true;
                        EXIT;
                    END IF;
                    -- Check merchant_favorites (customer favorite)
                    IF EXISTS (
                        SELECT 1 FROM public.merchant_favorites 
                        WHERE merchant_id = v_merch_id AND target_type = 'customer' AND target_id = v_cust_id
                    ) THEN
                        v_is_valid := true;
                        EXIT;
                    END IF;
                    -- Check orders linking customer and store
                    IF EXISTS (
                        SELECT 1 FROM public.orders 
                        WHERE customer_id = v_cust_id AND store_id = v_store_id 
                        AND (p_reference_id IS NULL OR id = p_reference_id)
                    ) THEN
                        v_is_valid := true;
                        EXIT;
                    END IF;
                END LOOP;
            END;
        END IF;

    -- CASE 2: Customer <-> Courier ('customer_courier')
    ELSIF p_relationship_type = 'customer_courier' THEN
        IF (v_role_a = 'customer' AND v_role_b IN ('driver', 'courier')) OR (v_role_a IN ('driver', 'courier') AND v_role_b = 'customer') THEN
            DECLARE
                v_cust_id UUID := CASE WHEN v_role_a = 'customer' THEN p_user_a ELSE p_user_b END;
                v_driver_id UUID := CASE WHEN v_role_a IN ('driver', 'courier') THEN p_user_a ELSE p_user_b END;
            BEGIN
                -- Check favorite_couriers (Customer favorite couriers, limit 10)
                IF EXISTS (
                    SELECT 1 FROM public.favorite_couriers 
                    WHERE user_id = v_cust_id AND courier_id = v_driver_id
                ) THEN
                    v_is_valid := true;
                END IF;
                -- Check delivery_assignments linking order and driver
                IF NOT v_is_valid AND EXISTS (
                    SELECT 1 FROM public.delivery_assignments da
                    JOIN public.orders o ON da.order_id = o.id
                    WHERE da.driver_id = v_driver_id AND o.customer_id = v_cust_id
                    AND (p_reference_id IS NULL OR o.id = p_reference_id OR da.order_id = p_reference_id)
                ) THEN
                    v_is_valid := true;
                END IF;
            END;
        END IF;

    -- CASE 3: Merchant <-> Courier ('merchant_courier')
    ELSIF p_relationship_type = 'merchant_courier' THEN
        IF (v_role_a = 'merchant' AND v_role_b IN ('driver', 'courier')) OR (v_role_a IN ('driver', 'courier') AND v_role_b = 'merchant') THEN
            DECLARE
                v_merch_id UUID := CASE WHEN v_role_a = 'merchant' THEN p_user_a ELSE p_user_b END;
                v_driver_id UUID := CASE WHEN v_role_a IN ('driver', 'courier') THEN p_user_a ELSE p_user_b END;
            BEGIN
                -- Check merchant_favorites (courier favorite)
                IF EXISTS (
                    SELECT 1 FROM public.merchant_favorites 
                    WHERE merchant_id = v_merch_id AND target_type = 'courier' AND target_id = v_driver_id
                ) THEN
                    v_is_valid := true;
                END IF;
                -- Check delivery_assignments linking merchant stores and driver
                IF NOT v_is_valid AND EXISTS (
                    SELECT 1 FROM public.delivery_assignments da
                    JOIN public.orders o ON da.order_id = o.id
                    JOIN public.stores s ON o.store_id = s.id
                    WHERE da.driver_id = v_driver_id AND s.merchant_id = v_merch_id
                    AND (p_reference_id IS NULL OR o.id = p_reference_id OR da.order_id = p_reference_id)
                ) THEN
                    v_is_valid := true;
                END IF;
            END;
        END IF;
    END IF;

    RETURN v_is_valid;
END;
$$;

-- 2. RLS Policies for chat_conversations
DROP POLICY IF EXISTS "Users can view their own chat conversations" ON public.chat_conversations;
CREATE POLICY "Users can view their own chat conversations"
ON public.chat_conversations
FOR SELECT
USING (participant_one = auth.uid() OR participant_two = auth.uid());

DROP POLICY IF EXISTS "Users can insert chat conversations if commercially eligible" ON public.chat_conversations;
CREATE POLICY "Users can insert chat conversations if commercially eligible"
ON public.chat_conversations
FOR INSERT
WITH CHECK (
    (participant_one = auth.uid() OR participant_two = auth.uid())
    AND public.can_start_chat(participant_one, participant_two, relationship_type, reference_id)
);

-- 3. RLS Policies for chat_messages
DROP POLICY IF EXISTS "Users can view messages of their conversations" ON public.chat_messages;
CREATE POLICY "Users can view messages of their conversations"
ON public.chat_messages
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.chat_conversations c
        WHERE c.id = chat_messages.conversation_id
        AND (c.participant_one = auth.uid() OR c.participant_two = auth.uid())
    )
);

DROP POLICY IF EXISTS "Users can insert messages into their conversations" ON public.chat_messages;
CREATE POLICY "Users can insert messages into their conversations"
ON public.chat_messages
FOR INSERT
WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM public.chat_conversations c
        WHERE c.id = chat_messages.conversation_id
        AND (c.participant_one = auth.uid() OR c.participant_two = auth.uid())
    )
);
