-- The push processor uses the service role to mark delivery_status.
-- The content lock must allow that server-side state transition while continuing
-- to prevent regular users from changing notification content.

CREATE OR REPLACE FUNCTION public.lock_notification_content()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF auth.role() = 'service_role' THEN
        RETURN NEW;
    END IF;

    IF (SELECT (raw_app_meta_data->>'user_role') FROM auth.users WHERE id = auth.uid()) IN ('admin', 'founder') THEN
        RETURN NEW;
    END IF;

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
$$;
