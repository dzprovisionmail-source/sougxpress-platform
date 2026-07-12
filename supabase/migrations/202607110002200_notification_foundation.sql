-- Migration: 022_notification_foundation.sql
-- Purpose: Implement Notification Foundation including push token storage,
--          enhanced notification schema, secure creation function, and
--          automatic notification triggers for order and delivery events.
--          This is an incremental, non-destructive migration.
--          Do NOT modify previous migrations (001-021).

-- =============================================================================
-- Part 1: Create user_devices table for push tokens
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.user_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    push_token TEXT NOT NULL,
    platform TEXT NOT NULL, -- 'ios', 'android', 'web'
    device_name TEXT,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE(user_id, push_token)
);

CREATE INDEX IF NOT EXISTS idx_user_devices_user_id ON public.user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_push_token ON public.user_devices(push_token);

CREATE TRIGGER update_user_devices_updated_at
BEFORE UPDATE ON public.user_devices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- Part 2: Align existing notifications table
-- =============================================================================

-- Rename message to body if it exists, otherwise add it
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'message') THEN
        ALTER TABLE public.notifications RENAME COLUMN message TO body;
    END IF;
END $$;

-- Add missing columns to notifications
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS notification_type TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS related_entity_type TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS related_entity_id UUID;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS delivery_status TEXT DEFAULT 'pending'; -- 'pending', 'sent', 'failed'
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL;

-- Backfill notification_type from old type column if necessary
UPDATE public.notifications SET notification_type = type WHERE notification_type IS NULL;

-- Ensure constraints and defaults
-- For backward compatibility with existing code that might use 'type'
-- We keep 'type' and sync it with 'notification_type'
ALTER TABLE public.notifications ALTER COLUMN notification_type SET NOT NULL;
ALTER TABLE public.notifications ALTER COLUMN delivery_status SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_related_entity ON public.notifications(related_entity_type, related_entity_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);

-- Idempotent trigger creation
DROP TRIGGER IF EXISTS update_notifications_updated_at ON public.notifications;
CREATE TRIGGER update_notifications_updated_at
BEFORE UPDATE ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- Part 3: Secure create_notification() function
-- =============================================================================

CREATE OR REPLACE FUNCTION public.create_notification(
    p_user_id UUID,
    p_notification_type TEXT,
    p_title TEXT,
    p_body TEXT,
    p_data JSONB DEFAULT '{}'::jsonb,
    p_related_entity_type TEXT DEFAULT NULL,
    p_related_entity_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    -- Duplicate prevention: check for same notification for same entity within last 5 seconds
    SELECT id INTO v_notification_id
    FROM public.notifications
    WHERE user_id = p_user_id
      AND notification_type = p_notification_type
      AND related_entity_type = p_related_entity_type
      AND related_entity_id = p_related_entity_id
      AND created_at > now() - interval '5 seconds'
    LIMIT 1;

    IF v_notification_id IS NOT NULL THEN
        RETURN v_notification_id;
    END IF;

    INSERT INTO public.notifications (
        user_id, type, notification_type, title, body, data, 
        related_entity_type, related_entity_id
    )
    VALUES (
        p_user_id, p_notification_type, p_notification_type, p_title, p_body, p_data,
        p_related_entity_type, p_related_entity_id
    )
    RETURNING id INTO v_notification_id;

    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- Part 4: Automatic notification triggers
-- =============================================================================

-- Helper to handle order and delivery notification events
CREATE OR REPLACE FUNCTION public.handle_notification_events()
RETURNS TRIGGER AS $$
DECLARE
    v_merchant_id UUID;
    v_customer_id UUID;
    v_driver_id UUID;
    v_order_id UUID;
    v_store_name TEXT;
BEGIN
    -- 1. Order Status Notifications
    IF TG_TABLE_NAME = 'orders' THEN
        v_order_id := NEW.id;
        v_customer_id := NEW.customer_id;
        
        SELECT merchant_id, name INTO v_merchant_id, v_store_name 
        FROM public.stores WHERE id = NEW.store_id;

        -- Merchant: New Order
        IF (TG_OP = 'INSERT' AND NEW.status = 'pending') OR (TG_OP = 'UPDATE' AND (OLD.status IS NULL OR OLD.status = 'pending') AND NEW.status = 'pending') THEN
            PERFORM public.create_notification(
                v_merchant_id, 'new_order', 'Nouvelle commande',
                'Vous avez reçu une nouvelle commande pour ' || v_store_name,
                jsonb_build_object('order_id', v_order_id), 'orders', v_order_id
            );
        END IF;

        -- Customer: Order Accepted
        IF OLD.status = 'pending' AND NEW.status = 'accepted' THEN
            PERFORM public.create_notification(
                v_customer_id, 'order_accepted', 'Commande acceptée',
                'Votre commande chez ' || v_store_name || ' a été acceptée.',
                jsonb_build_object('order_id', v_order_id), 'orders', v_order_id
            );
        END IF;

        -- Customer: Order Rejected
        IF OLD.status = 'pending' AND NEW.status = 'rejected' THEN
            PERFORM public.create_notification(
                v_customer_id, 'order_rejected', 'Commande refusée',
                'Désolé, votre commande chez ' || v_store_name || ' a été refusée.',
                jsonb_build_object('order_id', v_order_id), 'orders', v_order_id
            );
        END IF;

        -- Customer: Order Preparing
        IF OLD.status = 'accepted' AND NEW.status = 'preparing' THEN
            PERFORM public.create_notification(
                v_customer_id, 'order_preparing', 'Préparation en cours',
                'Votre commande est en cours de préparation chez ' || v_store_name || '.',
                jsonb_build_object('order_id', v_order_id), 'orders', v_order_id
            );
        END IF;

        -- Customer: Ready for Pickup
        IF OLD.status = 'preparing' AND NEW.status = 'ready_for_pickup' THEN
            PERFORM public.create_notification(
                v_customer_id, 'order_ready', 'Commande prête',
                'Votre commande est prête à être récupérée chez ' || v_store_name || '.',
                jsonb_build_object('order_id', v_order_id), 'orders', v_order_id
            );
        END IF;

        -- Customer: Order Cancelled
        IF OLD.status != 'cancelled' AND NEW.status = 'cancelled' THEN
            -- Notify merchant if they had already accepted it
            IF OLD.status IN ('accepted', 'preparing', 'ready_for_pickup') THEN
                PERFORM public.create_notification(
                    v_merchant_id, 'order_cancelled', 'Commande annulée',
                    'La commande #' || v_order_id || ' a été annulée par le client.',
                    jsonb_build_object('order_id', v_order_id), 'orders', v_order_id
                );
            END IF;
        END IF;
    END IF;

    -- 2. Delivery Assignment Notifications
    IF TG_TABLE_NAME = 'delivery_assignments' THEN
        v_order_id := NEW.order_id;
        v_driver_id := NEW.driver_id;
        
        SELECT customer_id INTO v_customer_id FROM public.orders WHERE id = v_order_id;

        -- Driver: New Assignment
        IF ((TG_OP = 'INSERT' AND NEW.status = 'pending') OR (TG_OP = 'UPDATE' AND OLD.status IS NULL AND NEW.status = 'pending')) AND v_driver_id IS NOT NULL THEN
            PERFORM public.create_notification(
                v_driver_id, 'delivery_assigned', 'Nouvelle livraison',
                'Une nouvelle livraison vous a été assignée.',
                jsonb_build_object('delivery_id', NEW.id, 'order_id', v_order_id), 'delivery_assignments', NEW.id
            );
        END IF;

        -- Customer: Driver Assigned (when driver accepts)
        IF OLD.status = 'pending' AND NEW.status = 'accepted' THEN
            PERFORM public.create_notification(
                v_customer_id, 'driver_assigned', 'Livreur assigné',
                'Un livreur a accepté votre commande et se rend au magasin.',
                jsonb_build_object('order_id', v_order_id), 'orders', v_order_id
            );
        END IF;

        -- Customer: Picked Up
        IF OLD.status = 'arrived_at_store' AND NEW.status = 'picked_up' THEN
            PERFORM public.create_notification(
                v_customer_id, 'order_picked_up', 'Commande récupérée',
                'Votre commande a été récupérée par le livreur.',
                jsonb_build_object('order_id', v_order_id), 'orders', v_order_id
            );
        END IF;

        -- Customer: Out for Delivery
        IF OLD.status = 'picked_up' AND NEW.status = 'out_for_delivery' THEN
            PERFORM public.create_notification(
                v_customer_id, 'order_out_for_delivery', 'En cours de livraison',
                'Votre livreur est en route vers votre adresse.',
                jsonb_build_object('order_id', v_order_id), 'orders', v_order_id
            );
        END IF;

        -- Customer: Delivered
        IF OLD.status = 'out_for_delivery' AND NEW.status = 'delivered' THEN
            PERFORM public.create_notification(
                v_customer_id, 'order_delivered', 'Commande livrée',
                'Votre commande a été livrée. Bon appétit !',
                jsonb_build_object('order_id', v_order_id), 'orders', v_order_id
            );
            
            -- Driver Achievement: reaches 50 deliveries (simplified check)
            -- This is a placeholder for more complex achievement logic
            DECLARE
                v_total_deliveries INTEGER;
            BEGIN
                SELECT deliveries_count INTO v_total_deliveries 
                FROM public.delivery_commission_cycles 
                WHERE driver_id = v_driver_id AND status = 'active';
                
                IF v_total_deliveries = 50 THEN
                    PERFORM public.create_notification(
                        v_driver_id, 'achievement', 'Félicitations !',
                        'Vous avez atteint 50 livraisons dans ce cycle.',
                        jsonb_build_object('count', 50), 'drivers', v_driver_id
                    );
                END IF;
            END;
        END IF;
    END IF;

    -- 3. Payment Notifications
    IF TG_TABLE_NAME = 'transactions' THEN
        -- Notify relevant party on payment completion
        IF OLD.status = 'pending' AND NEW.status = 'completed' THEN
            IF NEW.type = 'payout' THEN
                -- Notify merchant or driver
                DECLARE
                    v_target_user_id UUID := COALESCE(NEW.merchant_id, NEW.driver_id);
                BEGIN
                    IF v_target_user_id IS NOT NULL THEN
                        PERFORM public.create_notification(
                            v_target_user_id, 'payment_confirmed', 'Paiement confirmé',
                            'Votre versement de ' || (NEW.amount_minor / 100.0) || ' DZD a été confirmé.',
                            jsonb_build_object('transaction_id', NEW.id), 'transactions', NEW.id
                        );
                    END IF;
                END;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach triggers
DROP TRIGGER IF EXISTS trg_order_notifications ON public.orders;
CREATE TRIGGER trg_order_notifications
    AFTER INSERT OR UPDATE OF status ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_notification_events();

DROP TRIGGER IF EXISTS trg_delivery_notifications ON public.delivery_assignments;
CREATE TRIGGER trg_delivery_notifications
    AFTER INSERT OR UPDATE OF status ON public.delivery_assignments
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_notification_events();

DROP TRIGGER IF EXISTS trg_transaction_notifications ON public.transactions;
CREATE TRIGGER trg_transaction_notifications
    AFTER UPDATE OF status ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_notification_events();

-- =============================================================================
-- Part 5: Apply RLS Policies
-- =============================================================================

-- user_devices RLS
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_select_user_devices ON public.user_devices;
CREATE POLICY rls_select_user_devices ON public.user_devices
    FOR SELECT USING (user_id = auth.uid() OR (SELECT (raw_app_meta_data->>'user_role') FROM auth.users WHERE id = auth.uid()) IN ('admin', 'founder'));

DROP POLICY IF EXISTS rls_insert_user_devices ON public.user_devices;
CREATE POLICY rls_insert_user_devices ON public.user_devices
    FOR INSERT WITH CHECK (user_id = auth.uid() OR (SELECT (raw_app_meta_data->>'user_role') FROM auth.users WHERE id = auth.uid()) IN ('admin', 'founder'));

DROP POLICY IF EXISTS rls_update_user_devices ON public.user_devices;
CREATE POLICY rls_update_user_devices ON public.user_devices
    FOR UPDATE USING (user_id = auth.uid() OR (SELECT (raw_app_meta_data->>'user_role') FROM auth.users WHERE id = auth.uid()) IN ('admin', 'founder'));

DROP POLICY IF EXISTS rls_delete_user_devices ON public.user_devices;
CREATE POLICY rls_delete_user_devices ON public.user_devices
    FOR DELETE USING (user_id = auth.uid() OR (SELECT (raw_app_meta_data->>'user_role') FROM auth.users WHERE id = auth.uid()) IN ('admin', 'founder'));

-- notifications RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_select_notifications ON public.notifications;
CREATE POLICY rls_select_notifications ON public.notifications
    FOR SELECT USING (
        user_id = auth.uid() 
        OR (SELECT (raw_app_meta_data->>'user_role') FROM auth.users WHERE id = auth.uid()) IN ('admin', 'founder')
    );

DROP POLICY IF EXISTS rls_update_notifications ON public.notifications;
CREATE POLICY rls_update_notifications ON public.notifications
    FOR UPDATE USING (
        user_id = auth.uid() 
        OR (SELECT (raw_app_meta_data->>'user_role') FROM auth.users WHERE id = auth.uid()) IN ('admin', 'founder')
    )
    WITH CHECK (
        CASE
            WHEN (SELECT (raw_app_meta_data->>'user_role') FROM auth.users WHERE id = auth.uid()) IN ('admin', 'founder') THEN TRUE
            -- Users can only update their own notifications
            -- Note: We don't compare with OLD values here to avoid recursion.
            -- Instead, we rely on the fact that regular users shouldn't be able to change other fields.
            -- In a real Supabase environment, we would use a trigger to lock fields.
            ELSE user_id = auth.uid()
        END
    );

-- Trigger to prevent users from changing notification content
CREATE OR REPLACE FUNCTION public.lock_notification_content()
RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT (raw_app_meta_data->>'user_role') FROM auth.users WHERE id = auth.uid()) IN ('admin', 'founder') THEN
        RETURN NEW;
    END IF;

    -- Regular users can only change is_read and read_at
    IF NEW.user_id <> OLD.user_id OR
       NEW.notification_type <> OLD.notification_type OR
       NEW.title <> OLD.title OR
       NEW.body <> OLD.body OR
       NEW.data <> OLD.data OR
       NEW.related_entity_type IS DISTINCT FROM OLD.related_entity_type OR
       NEW.related_entity_id IS DISTINCT FROM OLD.related_entity_id THEN
        RAISE EXCEPTION 'You can only update is_read and read_at fields.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_lock_notification_content ON public.notifications;
CREATE TRIGGER trg_lock_notification_content
    BEFORE UPDATE ON public.notifications
    FOR EACH ROW
    EXECUTE FUNCTION public.lock_notification_content();

-- Prevent direct insert into notifications for regular users (must use create_notification function)
DROP POLICY IF EXISTS rls_insert_notifications ON public.notifications;
CREATE POLICY rls_insert_notifications ON public.notifications
    FOR INSERT WITH CHECK ((SELECT (raw_app_meta_data->>'user_role') FROM auth.users WHERE id = auth.uid()) IN ('admin', 'founder'));
