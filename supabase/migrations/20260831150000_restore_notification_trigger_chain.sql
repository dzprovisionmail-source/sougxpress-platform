-- Restore the existing notification trigger chain that is present in source but absent in staging.
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
        IF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status = 'accepted' THEN
            PERFORM public.create_notification(
                v_customer_id, 'order_accepted', 'Commande acceptée',
                'Votre commande chez ' || v_store_name || ' a été acceptée.',
                jsonb_build_object('order_id', v_order_id), 'orders', v_order_id
            );
        END IF;

        -- Customer: Order Rejected
        IF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status = 'rejected' THEN
            PERFORM public.create_notification(
                v_customer_id, 'order_rejected', 'Commande refusée',
                'Désolé, votre commande chez ' || v_store_name || ' a été refusée.',
                jsonb_build_object('order_id', v_order_id), 'orders', v_order_id
            );
        END IF;

        -- Customer: Order Preparing
        IF TG_OP = 'UPDATE' AND OLD.status = 'accepted' AND NEW.status = 'preparing' THEN
            PERFORM public.create_notification(
                v_customer_id, 'order_preparing', 'Préparation en cours',
                'Votre commande est en cours de préparation chez ' || v_store_name || '.',
                jsonb_build_object('order_id', v_order_id), 'orders', v_order_id
            );
        END IF;

        -- Customer: Ready for Pickup
        IF TG_OP = 'UPDATE' AND OLD.status = 'preparing' AND NEW.status = 'ready_for_pickup' THEN
            PERFORM public.create_notification(
                v_customer_id, 'order_ready', 'Commande prête',
                'Votre commande est prête à être récupérée chez ' || v_store_name || '.',
                jsonb_build_object('order_id', v_order_id), 'orders', v_order_id
            );
        END IF;

        -- Customer: Order Cancelled
        IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM 'cancelled' AND NEW.status = 'cancelled' THEN
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
        IF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status = 'accepted' THEN
            PERFORM public.create_notification(
                v_customer_id, 'driver_assigned', 'Livreur assigné',
                'Un livreur a accepté votre commande et se rend au magasin.',
                jsonb_build_object('order_id', v_order_id), 'orders', v_order_id
            );
        END IF;

        -- Customer: Picked Up
        IF TG_OP = 'UPDATE' AND OLD.status = 'arrived_at_store' AND NEW.status = 'picked_up' THEN
            PERFORM public.create_notification(
                v_customer_id, 'order_picked_up', 'Commande récupérée',
                'Votre commande a été récupérée par le livreur.',
                jsonb_build_object('order_id', v_order_id), 'orders', v_order_id
            );
        END IF;

        -- Customer: Out for Delivery
        IF TG_OP = 'UPDATE' AND OLD.status = 'picked_up' AND NEW.status = 'out_for_delivery' THEN
            PERFORM public.create_notification(
                v_customer_id, 'order_out_for_delivery', 'En cours de livraison',
                'Votre livreur est en route vers votre adresse.',
                jsonb_build_object('order_id', v_order_id), 'orders', v_order_id
            );
        END IF;

        -- Customer: Delivered
        IF TG_OP = 'UPDATE' AND OLD.status = 'out_for_delivery' AND NEW.status = 'delivered' THEN
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
        IF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status = 'completed' THEN
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

-- Restore the notification content protection trigger as part of the same chain.
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
