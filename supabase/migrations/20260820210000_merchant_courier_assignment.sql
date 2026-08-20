-- Migration: 20260820210000_merchant_courier_assignment.sql
-- Purpose: Allow merchants to select and assign specific couriers to their orders.

-- 1. Function to get available drivers in the same zone as an order
CREATE OR REPLACE FUNCTION public.get_available_drivers_for_merchant(p_order_id UUID)
RETURNS TABLE (
    id UUID,
    full_name TEXT,
    first_name TEXT,
    last_name TEXT,
    vehicle_type TEXT,
    rating NUMERIC,
    delivered_count INTEGER,
    is_available BOOLEAN
) AS $$
DECLARE
    v_zone_id UUID;
    v_store_id UUID;
BEGIN
    -- Security check: Is the caller the merchant of this order?
    SELECT store_id, zone_id INTO v_store_id, v_zone_id
    FROM public.orders
    WHERE id = p_order_id;

    IF NOT EXISTS (
        SELECT 1 FROM public.stores
        WHERE id = v_store_id AND merchant_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Unauthorized: You are not the merchant for this order.';
    END IF;

    RETURN QUERY
    SELECT 
        d.id,
        d.full_name,
        d.first_name,
        d.last_name,
        d.vehicle_type,
        d.rating,
        d.delivered_count,
        d.is_available
    FROM public.drivers d
    WHERE d.is_available = true
      AND d.status = 'active'
      AND (d.zone_id = v_zone_id OR d.zone_id IS NULL)
      AND d.deleted_at IS NULL
    ORDER BY d.rating DESC, d.delivered_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Function for merchant to assign a specific driver
CREATE OR REPLACE FUNCTION public.merchant_assign_driver(p_order_id UUID, p_driver_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_store_id UUID;
    v_assignment_id UUID;
BEGIN
    -- Security check: Is the caller the merchant of this order?
    SELECT store_id INTO v_store_id
    FROM public.orders
    WHERE id = p_order_id;

    IF NOT EXISTS (
        SELECT 1 FROM public.stores
        WHERE id = v_store_id AND merchant_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Unauthorized: You are not the merchant for this order.';
    END IF;

    -- Get or create delivery assignment
    SELECT id INTO v_assignment_id
    FROM public.delivery_assignments
    WHERE order_id = p_order_id;

    IF v_assignment_id IS NULL THEN
        INSERT INTO public.delivery_assignments (order_id, driver_id, status)
        VALUES (p_order_id, p_driver_id, 'pending')
        RETURNING id INTO v_assignment_id;
    ELSE
        UPDATE public.delivery_assignments
        SET driver_id = p_driver_id,
            status = 'pending',
            updated_at = now()
        WHERE id = v_assignment_id;
    END IF;

    -- Log status history if needed (optional, handled by other triggers usually)
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_available_drivers_for_merchant(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.merchant_assign_driver(UUID, UUID) TO authenticated;
