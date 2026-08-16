-- ============================================================================
-- Phase 3 Foundation Migration: Soug-XPRESS
-- 1. Orders schema enhancements (timestamps, courier_assigned status)
-- 2. Favorite Couriers constraints (limit 2, no self-add, reference drivers)
-- 3. Order lifecycle & delivery sync updates
-- 4. Stalled orders detection view
-- ============================================================================

-- 1. Orders schema enhancements
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_progress_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS deadline_at TIMESTAMPTZ;

-- Drop old check constraint and add new one with 'courier_assigned'
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check CHECK (
    status = ANY (ARRAY[
        'pending'::text, 
        'accepted'::text, 
        'preparing'::text, 
        'ready_for_pickup'::text, 
        'courier_assigned'::text,
        'picked_up'::text, 
        'out_for_delivery'::text, 
        'delivered'::text, 
        'cancelled'::text, 
        'rejected'::text
    ])
);

-- 2. Favorite Couriers refinement
-- First drop existing foreign key if it points to couriers(id) and repoint to drivers(id)
ALTER TABLE public.favorite_couriers DROP CONSTRAINT IF EXISTS favorite_couriers_courier_id_fkey;

-- Ensure courier_id references drivers(id)
ALTER TABLE public.favorite_couriers 
ADD CONSTRAINT favorite_couriers_driver_id_fkey 
FOREIGN KEY (courier_id) REFERENCES public.drivers(id) ON DELETE CASCADE;

-- Add check constraint to prevent self-adding (if driver has a profile/user_id matching user_id)
-- Note: drivers.id is the user_id (auth.uid()) as established in profiling.
ALTER TABLE public.favorite_couriers DROP CONSTRAINT IF EXISTS check_no_self_favorite;
ALTER TABLE public.favorite_couriers ADD CONSTRAINT check_no_self_favorite CHECK (user_id != courier_id);

-- Trigger function to limit favorites to 2 per user
CREATE OR REPLACE FUNCTION check_favorite_couriers_limit()
RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT count(*) FROM public.favorite_couriers WHERE user_id = NEW.user_id) >= 2 THEN
        RAISE EXCEPTION 'Maximum limit of 2 favorite couriers reached';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_favorite_couriers_limit ON public.favorite_couriers;
CREATE TRIGGER trg_favorite_couriers_limit
BEFORE INSERT ON public.favorite_couriers
FOR EACH ROW
EXECUTE FUNCTION check_favorite_couriers_limit();

-- 3. Update sync_order_status_from_delivery function to support 'courier_assigned'
CREATE OR REPLACE FUNCTION sync_order_status_from_delivery()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
        -- Enable system sync bypass for the order update
        PERFORM set_config('public.system_sync', 'on', true);
        
        IF NEW.status = 'accepted' THEN
            -- When courier accepts delivery assignment, order becomes courier_assigned
            UPDATE public.orders SET status = 'courier_assigned', last_progress_at = now() WHERE id = NEW.order_id;
        ELSIF NEW.status = 'picked_up' THEN
            UPDATE public.orders SET status = 'picked_up', last_progress_at = now() WHERE id = NEW.order_id;
        ELSIF NEW.status = 'out_for_delivery' THEN
            UPDATE public.orders SET status = 'out_for_delivery', last_progress_at = now() WHERE id = NEW.order_id;
        ELSIF NEW.status = 'delivered' THEN
            UPDATE public.orders SET status = 'delivered', last_progress_at = now(), delivered_at = now() WHERE id = NEW.order_id;
        END IF;
        
        -- Reset system sync bypass
        PERFORM set_config('public.system_sync', 'off', true);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Update enforce_order_lifecycle to allow system transition to courier_assigned
CREATE OR REPLACE FUNCTION enforce_order_lifecycle()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
        -- Admin/Founder or System Sync bypass
        IF public.get_user_role(auth.uid()) IN ('admin', 'founder') OR current_setting('public.system_sync', true) = 'on' THEN
            -- Update last_progress_at automatically
            NEW.last_progress_at = now();
            IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
                NEW.accepted_at = now();
            END IF;
            RETURN NEW;
        END IF;

        -- Customer cancellation
        IF auth.uid() = NEW.customer_id THEN
            IF NEW.status = 'cancelled' AND OLD.status IN ('pending', 'accepted') THEN
                NEW.last_progress_at = now();
                RETURN NEW;
            END IF;
            RAISE EXCEPTION 'Invalid order status transition for customer: % -> %', OLD.status, NEW.status;
        END IF;

        -- Merchant transitions
        IF EXISTS (SELECT 1 FROM public.stores WHERE id = NEW.store_id AND merchant_id = auth.uid()) THEN
            IF (OLD.status = 'pending' AND NEW.status IN ('accepted', 'rejected', 'cancelled')) OR
               (OLD.status = 'accepted' AND NEW.status IN ('preparing', 'cancelled')) OR
               (OLD.status = 'preparing' AND NEW.status IN ('ready_for_pickup', 'cancelled')) OR
               (OLD.status = 'ready_for_pickup' AND NEW.status = 'ready_for_pickup') THEN
                NEW.last_progress_at = now();
                IF NEW.status = 'accepted' THEN
                    NEW.accepted_at = now();
                END IF;
                RETURN NEW;
            END IF;
            RAISE EXCEPTION 'Invalid order status transition for merchant: % -> %', OLD.status, NEW.status;
        END IF;

        -- Drivers cannot update orders directly
        IF EXISTS (SELECT 1 FROM public.delivery_assignments WHERE order_id = NEW.id AND driver_id = auth.uid()) THEN
            RAISE EXCEPTION 'Drivers cannot update order status directly';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Stalled orders view (Orders in active state > 24 hours without progress)
CREATE OR REPLACE VIEW public.v_stalled_orders AS
SELECT 
    id,
    customer_id,
    store_id,
    status,
    created_at,
    last_progress_at,
    EXTRACT(EPOCH FROM (now() - COALESCE(last_progress_at, created_at))) / 3600 as hours_inactive,
    CASE 
        WHEN EXTRACT(EPOCH FROM (now() - COALESCE(last_progress_at, created_at))) / 3600 >= 48 THEN 'cancellation_eligible'
        WHEN EXTRACT(EPOCH FROM (now() - COALESCE(last_progress_at, created_at))) / 3600 >= 24 THEN 'warning'
        ELSE 'normal'
    END as stalled_state
FROM public.orders
WHERE status NOT IN ('delivered', 'cancelled', 'rejected');
