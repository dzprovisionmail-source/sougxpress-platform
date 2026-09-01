-- Make notification creation idempotent per business event and preserve
-- source-entity metadata through the push payload.
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS event_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_notifications_user_event_key
  ON public.notifications (user_id, event_key)
  WHERE event_key IS NOT NULL;

CREATE OR REPLACE FUNCTION public.create_notification(
    p_user_id UUID,
    p_notification_type TEXT,
    p_title TEXT,
    p_body TEXT,
    p_data JSONB DEFAULT '{}'::jsonb,
    p_related_entity_type TEXT DEFAULT NULL,
    p_related_entity_id UUID DEFAULT NULL,
    p_event_key TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_notification_id UUID;
    v_event_key TEXT;
BEGIN
    IF p_user_id IS NULL THEN
        RETURN NULL;
    END IF;

    v_event_key := COALESCE(
        NULLIF(p_event_key, ''),
        NULLIF(p_data ->> 'event_key', ''),
        p_notification_type || ':' || COALESCE(p_related_entity_type, 'none') || ':' || COALESCE(p_related_entity_id::text, 'none')
    );

    INSERT INTO public.notifications (
        user_id, type, notification_type, title, body, data,
        related_entity_type, related_entity_id, event_key
    )
    VALUES (
        p_user_id, p_notification_type, p_notification_type, p_title, p_body,
        COALESCE(p_data, '{}'::jsonb), p_related_entity_type, p_related_entity_id, v_event_key
    )
    ON CONFLICT (user_id, event_key) WHERE event_key IS NOT NULL DO NOTHING
    RETURNING id INTO v_notification_id;

    IF v_notification_id IS NULL THEN
        SELECT id INTO v_notification_id
        FROM public.notifications
        WHERE user_id = p_user_id AND event_key = v_event_key
        LIMIT 1;
    END IF;

    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

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
       NEW.delivery_status IS DISTINCT FROM OLD.delivery_status OR
       NEW.event_key IS DISTINCT FROM OLD.event_key OR
       NEW.related_entity_type IS DISTINCT FROM OLD.related_entity_type OR
       NEW.related_entity_id IS DISTINCT FROM OLD.related_entity_id THEN
        RAISE EXCEPTION 'You can only update read state.';
    END IF;
    RETURN NEW;
END;
$$;

-- Include the message identity so two messages in one conversation are not
-- collapsed into one notification, while retries remain idempotent.
CREATE OR REPLACE FUNCTION public.handle_chat_message_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_recipient UUID;
  v_p1 UUID;
  v_p2 UUID;
BEGIN
  SELECT participant_one, participant_two INTO v_p1, v_p2
  FROM public.chat_conversations WHERE id = NEW.conversation_id;

  IF v_p1 IS NULL OR v_p2 IS NULL OR NEW.sender_id NOT IN (v_p1, v_p2) THEN
    RETURN NEW;
  END IF;

  v_recipient := CASE WHEN NEW.sender_id = v_p1 THEN v_p2 ELSE v_p1 END;

  PERFORM public.create_notification(
    v_recipient,
    'chat_message',
    'رسالة جديدة',
    'لديك رسالة جديدة في المحادثة',
    jsonb_build_object(
      'conversation_id', NEW.conversation_id,
      'message_id', NEW.id,
      'sender_id', NEW.sender_id,
      'event_key', 'chat_message:' || NEW.id::text
    ),
    'chat_conversations',
    NEW.conversation_id,
    'chat_message:' || NEW.id::text
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS chat_message_notification_after_insert ON public.chat_messages;
CREATE TRIGGER chat_message_notification_after_insert
AFTER INSERT ON public.chat_messages
FOR EACH ROW EXECUTE FUNCTION public.handle_chat_message_notification();
