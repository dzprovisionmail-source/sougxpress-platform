-- Migration: 021_order_delivery_lifecycle.sql
-- Purpose: Enforce valid forward transitions for orders and delivery assignments.
--          Implement role-based status control and audit logging.
--          This is an incremental, non-destructive migration.
--          Do NOT modify previous migrations (001-020).

-- =============================================================================
-- Part 0: Helper functions for lifecycle enforcement
-- =============================================================================

-- Helper to get the current (pre-update) status of an order
CREATE OR REPLACE FUNCTION public.get_order_status(order_id UUID)
RETURNS TEXT AS $$
    SELECT status FROM public.orders WHERE id = order_id;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper to get the current (pre-update) status of a delivery assignment
CREATE OR REPLACE FUNCTION public.get_delivery_status(delivery_id UUID)
RETURNS TEXT AS $$
    SELECT status FROM public.delivery_assignments WHERE id = delivery_id;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- =============================================================================
-- Part 1: Add CHECK constraints for valid statuses
-- =============================================================================

-- Orders: pending, accepted, preparing, ready_for_pickup, picked_up, out_for_delivery, delivered, cancelled, rejected
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'orders_status_check' AND conrelid = 'public.orders'::regclass
    ) THEN
        ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
            CHECK (status IN ('pending', 'accepted', 'preparing', 'ready_for_pickup', 'picked_up', 'out_for_delivery', 'delivered', 'cancelled', 'rejected'));
    END IF;
END $$;

-- Order Lifecycle Transition Guard (Trigger-based for strict enforcement)
CREATE OR REPLACE FUNCTION public.enforce_order_lifecycle()
RETURNS TRIGGER AS $$
BEGIN
    -- Only check if status is changing
    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
        -- Admin/Founder bypass (simulated via role check or special setting)
        -- Also bypass if system sync is active
        IF public.get_user_role(auth.uid()) IN ('admin', 'founder') 
           OR current_setting('public.system_sync', true) = 'on' THEN
            RETURN NEW;
        END IF;

        -- Customer transitions
        IF auth.uid() = NEW.customer_id THEN
            IF NEW.status = 'cancelled' AND OLD.status IN ('pending', 'accepted') THEN
                RETURN NEW;
            END IF;
            RAISE EXCEPTION 'Invalid order status transition for customer: % -> %', OLD.status, NEW.status;
        END IF;

        -- Merchant transitions (via store owner)
        IF EXISTS (SELECT 1 FROM public.stores WHERE id = NEW.store_id AND merchant_id = auth.uid()) THEN
            IF (OLD.status = 'pending' AND NEW.status IN ('accepted', 'rejected')) OR
               (OLD.status = 'accepted' AND NEW.status = 'preparing') OR
               (OLD.status = 'preparing' AND NEW.status = 'ready_for_pickup') OR
               (OLD.status = 'ready_for_pickup' AND NEW.status = 'ready_for_pickup') THEN
                RETURN NEW;
            END IF;
            RAISE EXCEPTION 'Invalid order status transition for merchant: % -> %', OLD.status, NEW.status;
        END IF;

        -- Driver transitions (handled via sync trigger, but blocked here if direct)
        IF EXISTS (SELECT 1 FROM public.delivery_assignments WHERE order_id = NEW.id AND driver_id = auth.uid()) THEN
            -- Drivers don't update orders directly, they update delivery_assignments
            RAISE EXCEPTION 'Drivers cannot update order status directly';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_order_lifecycle ON public.orders;
CREATE TRIGGER trg_enforce_order_lifecycle
    BEFORE UPDATE OF status ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_order_lifecycle();

-- Delivery Assignments: pending, accepted, arrived_at_store, picked_up, out_for_delivery, delivered, cancelled, failed
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'delivery_assignments_status_check' AND conrelid = 'public.delivery_assignments'::regclass
    ) THEN
        ALTER TABLE public.delivery_assignments ADD CONSTRAINT delivery_assignments_status_check
            CHECK (status IN ('pending', 'accepted', 'arrived_at_store', 'picked_up', 'out_for_delivery', 'delivered', 'cancelled', 'failed'));
    END IF;
END $$;

-- Delivery Lifecycle Transition Guard
CREATE OR REPLACE FUNCTION public.enforce_delivery_lifecycle()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
        -- Admin/Founder bypass
        IF public.get_user_role(auth.uid()) IN ('admin', 'founder') THEN
            RETURN NEW;
        END IF;

        -- Driver transitions
        IF auth.uid() = NEW.driver_id THEN
            IF (OLD.status = 'pending' AND NEW.status = 'accepted') OR
               (OLD.status = 'accepted' AND NEW.status = 'arrived_at_store') OR
               (OLD.status = 'arrived_at_store' AND NEW.status = 'picked_up') OR
               (OLD.status = 'picked_up' AND NEW.status = 'out_for_delivery') OR
               (OLD.status = 'out_for_delivery' AND NEW.status = 'delivered') THEN
                RETURN NEW;
            END IF;
            RAISE EXCEPTION 'Invalid delivery status transition for driver: % -> %', OLD.status, NEW.status;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_delivery_lifecycle ON public.delivery_assignments;
CREATE TRIGGER trg_enforce_delivery_lifecycle
    BEFORE UPDATE OF status ON public.delivery_assignments
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_delivery_lifecycle();

-- =============================================================================
-- Part 2: Status change trigger for history tracking
-- =============================================================================

-- Enhanced order status history trigger to capture the user who made the change
CREATE OR REPLACE FUNCTION public.handle_order_status_history()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO public.order_status_history (order_id, status, changed_by)
        VALUES (NEW.id, NEW.status, auth.uid());
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_order_status_history ON public.orders;
CREATE TRIGGER trg_order_status_history
    AFTER UPDATE OF status ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_order_status_history();

-- =============================================================================
-- Part 3: Replace UPDATE policies — Enforce lifecycle rules
-- =============================================================================

-- -----------------------------------------------------------------------------
-- ORDERS UPDATE:
--   - Customer: may only cancel (status -> 'cancelled') and only if current status is 'pending' or 'accepted'.
--   - Merchant: may accept, reject, prepare, and mark ready.
--   - Driver: may not update order status directly (updated via delivery_assignment triggers or specific flows).
--   - Admin/Founder: full override.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS rls_update_orders ON public.orders;

CREATE POLICY rls_update_orders ON public.orders
    FOR UPDATE USING (
        customer_id = auth.uid()
        OR store_id IN (SELECT id FROM public.stores WHERE merchant_id = auth.uid())
        OR public.get_user_role(auth.uid()) IN ('admin', 'founder')
    )
    WITH CHECK (
        CASE
            -- Admin/founder can set any valid status
            WHEN public.get_user_role(auth.uid()) IN ('admin', 'founder')
            THEN status IN ('pending', 'accepted', 'preparing', 'ready_for_pickup', 'picked_up', 'out_for_delivery', 'delivered', 'cancelled', 'rejected')
            
            -- Customer: can only cancel from pending/accepted
            WHEN customer_id = auth.uid()
            THEN (
                status = 'cancelled' 
                AND public.get_order_status(id) IN ('pending', 'accepted')
            )
            
            -- Merchant: can transition through store lifecycle
            WHEN store_id IN (SELECT id FROM public.stores WHERE merchant_id = auth.uid())
            THEN (
                (public.get_order_status(id) = 'pending' AND status IN ('accepted', 'rejected')) OR
                (public.get_order_status(id) = 'accepted' AND status = 'preparing') OR
                (public.get_order_status(id) = 'preparing' AND status = 'ready_for_pickup') OR
                (public.get_order_status(id) = 'ready_for_pickup' AND status = 'ready_for_pickup')
            )
            
            ELSE FALSE
        END
    );

-- -----------------------------------------------------------------------------
-- DELIVERY ASSIGNMENTS UPDATE:
--   - Driver: may accept, mark arrival, pickup, out-for-delivery, and delivered.
--   - Admin/Founder: full override.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS rls_update_delivery_assignments ON public.delivery_assignments;

CREATE POLICY rls_update_delivery_assignments ON public.delivery_assignments
    FOR UPDATE USING (
        driver_id = auth.uid()
        OR public.get_user_role(auth.uid()) IN ('admin', 'founder')
    )
    WITH CHECK (
        CASE
            -- Admin/founder can set any valid status
            WHEN public.get_user_role(auth.uid()) IN ('admin', 'founder')
            THEN status IN ('pending', 'accepted', 'arrived_at_store', 'picked_up', 'out_for_delivery', 'delivered', 'cancelled', 'failed')
            
            -- Driver: can transition through delivery lifecycle
            WHEN driver_id = auth.uid()
            THEN (
                (public.get_delivery_status(id) = 'pending' AND status = 'accepted') OR
                (public.get_delivery_status(id) = 'accepted' AND status = 'arrived_at_store') OR
                (public.get_delivery_status(id) = 'arrived_at_store' AND status = 'picked_up') OR
                (public.get_delivery_status(id) = 'picked_up' AND status = 'out_for_delivery') OR
                (public.get_delivery_status(id) = 'out_for_delivery' AND status = 'delivered')
            )
            
            ELSE FALSE
        END
    );

-- =============================================================================
-- Part 4: Synchronization triggers
-- =============================================================================

-- Sync order status when delivery assignment status changes
CREATE OR REPLACE FUNCTION public.sync_order_status_from_delivery()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
        -- Map delivery status to order status
        -- Enable system sync bypass for the order update
        PERFORM set_config('public.system_sync', 'on', true);
        
        IF NEW.status = 'picked_up' THEN
            UPDATE public.orders SET status = 'picked_up' WHERE id = NEW.order_id;
        ELSIF NEW.status = 'out_for_delivery' THEN
            UPDATE public.orders SET status = 'out_for_delivery' WHERE id = NEW.order_id;
        ELSIF NEW.status = 'delivered' THEN
            UPDATE public.orders SET status = 'delivered' WHERE id = NEW.order_id;
        END IF;
        
        -- Reset system sync bypass
        PERFORM set_config('public.system_sync', 'off', true);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_order_status ON public.delivery_assignments;
CREATE TRIGGER trg_sync_order_status
    AFTER UPDATE OF status ON public.delivery_assignments
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_order_status_from_delivery();
