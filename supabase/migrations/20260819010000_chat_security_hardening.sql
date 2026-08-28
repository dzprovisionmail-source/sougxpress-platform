-- Migration: 20260819010000_chat_security_hardening.sql
-- Description: Hardens chat security by ensuring all functions and views follow best practices and correctly enforce commercial rules.

-- 1. Robust and secure commercial permission function
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
            BEGIN
                -- 1. Check customer_favorites (store favorite)
                IF EXISTS (
                    SELECT 1 FROM public.customer_favorites
                    WHERE customer_id = v_cust_id
                      AND target_type = 'store'
                      AND target_id IN (SELECT id FROM public.stores WHERE merchant_id = v_merch_id)
                ) THEN
                    v_is_valid := true;
                END IF;

                -- 2. Check merchant_favorites (customer favorite)
                IF NOT v_is_valid AND EXISTS (
                    SELECT 1 FROM public.merchant_favorites
                    WHERE merchant_id = v_merch_id
                      AND target_type = 'customer'
                      AND target_id = v_cust_id
                ) THEN
                    v_is_valid := true;
                END IF;

                -- 3. Check orders linking customer and merchant's stores
                IF NOT v_is_valid AND EXISTS (
                    SELECT 1 FROM public.orders o
                    WHERE o.customer_id = v_cust_id
                      AND o.store_id IN (SELECT s.id FROM public.stores s WHERE s.merchant_id = v_merch_id)
                      AND (p_reference_id IS NULL OR o.id = p_reference_id)
                ) THEN
                    v_is_valid := true;
                END IF;
            END;
        END IF;

    -- CASE 2: Customer <-> Courier ('customer_courier')
    ELSIF p_relationship_type = 'customer_courier' THEN
        IF (v_role_a = 'customer' AND v_role_b IN ('driver', 'courier')) OR (v_role_a IN ('driver', 'courier') AND v_role_b = 'customer') THEN
            DECLARE
                v_cust_id UUID := CASE WHEN v_role_a = 'customer' THEN p_user_a ELSE p_user_b END;
                v_driver_id UUID := CASE WHEN v_role_a IN ('driver', 'courier') THEN p_user_a ELSE p_user_b END;
            BEGIN
                -- 1. Check favorite_couriers (Customer favorite couriers)
                IF EXISTS (
                    SELECT 1 FROM public.favorite_couriers
                    WHERE user_id = v_cust_id AND courier_id = v_driver_id
                ) THEN
                    v_is_valid := true;
                END IF;

                -- 2. Check courier_favorites (Courier favorite customer)
                IF NOT v_is_valid AND EXISTS (
                    SELECT 1 FROM public.courier_favorites
                    WHERE courier_id = v_driver_id AND target_type = 'customer' AND target_id = v_cust_id
                ) THEN
                    v_is_valid := true;
                END IF;

                -- 3. Check delivery_assignments linking order and driver
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
                -- 1. Check merchant_favorites (courier favorite)
                IF EXISTS (
                    SELECT 1 FROM public.merchant_favorites
                    WHERE merchant_id = v_merch_id AND target_type = 'courier' AND target_id = v_driver_id
                ) THEN
                    v_is_valid := true;
                END IF;

                -- 2. Check courier_favorites (courier favorite store owned by merchant)
                IF NOT v_is_valid AND EXISTS (
                    SELECT 1 FROM public.courier_favorites
                    WHERE courier_id = v_driver_id
                      AND target_type = 'store'
                      AND target_id IN (SELECT s.id FROM public.stores s WHERE s.merchant_id = v_merch_id)
                ) THEN
                    v_is_valid := true;
                END IF;

                -- 3. Check delivery_assignments linking merchant stores and driver
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

-- 2. Ensure RLS is active for chat tables
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- 3. Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
