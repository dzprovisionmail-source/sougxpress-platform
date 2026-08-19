-- Migration: 20260819010000_chat_security_hardening.sql
-- Description: Hardens chat security by ensuring all functions and views follow best practices.

-- 1. Ensure can_start_chat is robust and follows strict commercial rules
-- Using parameter names that match existing definition to avoid schema cache issues
CREATE OR REPLACE FUNCTION public.can_start_chat(
    p_user_a UUID,
    p_user_b UUID,
    p_relationship_type TEXT,
    p_reference_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Customer <-> Merchant (Store)
    IF p_relationship_type = 'customer_merchant' THEN
        RETURN EXISTS (
            SELECT 1 FROM public.customer_favorites 
            WHERE customer_id = p_user_a AND store_id IN (SELECT id FROM public.stores WHERE merchant_id = p_user_b)
        ) OR EXISTS (
            SELECT 1 FROM public.customer_favorites 
            WHERE customer_id = p_user_b AND store_id IN (SELECT id FROM public.stores WHERE merchant_id = p_user_a)
        ) OR EXISTS (
            SELECT 1 FROM public.orders 
            WHERE (customer_id = p_user_a AND store_id IN (SELECT id FROM public.stores WHERE merchant_id = p_user_b))
               OR (customer_id = p_user_b AND store_id IN (SELECT id FROM public.stores WHERE merchant_id = p_user_a))
        );
    END IF;

    -- Customer <-> Courier
    IF p_relationship_type = 'customer_courier' THEN
        RETURN EXISTS (
            SELECT 1 FROM public.favorite_couriers 
            WHERE (user_id = p_user_a AND courier_id = p_user_b)
               OR (user_id = p_user_b AND courier_id = p_user_a)
        ) OR EXISTS (
            SELECT 1 FROM public.delivery_assignments 
            WHERE (driver_id = p_user_a AND order_id IN (SELECT id FROM public.orders WHERE customer_id = p_user_b))
               OR (driver_id = p_user_b AND order_id IN (SELECT id FROM public.orders WHERE customer_id = p_user_a))
        );
    END IF;

    -- Merchant <-> Courier
    IF p_relationship_type = 'merchant_courier' THEN
        RETURN EXISTS (
            SELECT 1 FROM public.delivery_assignments 
            WHERE (driver_id = p_user_a AND order_id IN (SELECT id FROM public.orders o JOIN public.stores s ON o.store_id = s.id WHERE s.merchant_id = p_user_b))
               OR (driver_id = p_user_b AND order_id IN (SELECT id FROM public.orders o JOIN public.stores s ON o.store_id = s.id WHERE s.merchant_id = p_user_a))
        );
    END IF;

    RETURN FALSE;
END;
$$;

-- 2. Ensure RLS is active for chat tables
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- 3. Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
