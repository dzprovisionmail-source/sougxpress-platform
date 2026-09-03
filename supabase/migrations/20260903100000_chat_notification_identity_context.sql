-- Presentation-only notification context for the existing Chat notification trigger.
-- IDs, event keys, payload routing, and delivery infrastructure remain unchanged.

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
  v_conversation_type TEXT;
  v_sender_name TEXT;
  v_sender_role TEXT;
  v_sender_display_name TEXT;
  v_role_label TEXT;
  v_store_name TEXT;
BEGIN
  SELECT participant_one, participant_two, conversation_type
  INTO v_p1, v_p2, v_conversation_type
  FROM public.chat_conversations
  WHERE id = NEW.conversation_id;

  IF v_p1 IS NULL OR v_p2 IS NULL OR NEW.sender_id NOT IN (v_p1, v_p2) THEN
    RETURN NEW;
  END IF;

  v_recipient := CASE WHEN NEW.sender_id = v_p1 THEN v_p2 ELSE v_p1 END;

  SELECT p.full_name, p.role
  INTO v_sender_name, v_sender_role
  FROM public.profiles p
  WHERE p.id = NEW.sender_id;

  SELECT s.name
  INTO v_store_name
  FROM public.stores s
  LEFT JOIN public.merchants m ON m.id = s.merchant_id
  WHERE v_sender_role = 'merchant'
    AND (
      s.created_by = NEW.sender_id
      OR s.merchant_id = NEW.sender_id
      OR lower(trim(m.email)) = lower(trim((SELECT email FROM public.profiles WHERE id = NEW.sender_id)))
    )
  ORDER BY CASE WHEN s.created_by = NEW.sender_id THEN 0 ELSE 1 END, s.created_at NULLS LAST, s.id
  LIMIT 1;

  v_sender_display_name := COALESCE(NULLIF(trim(v_store_name), ''), NULLIF(trim(v_sender_name), ''), 'Participant');
  v_role_label := CASE
    WHEN v_sender_role = 'merchant' THEN 'Merchant'
    WHEN v_sender_role IN ('driver', 'courier') THEN 'Courier'
    WHEN v_sender_role = 'customer' THEN 'Customer'
    WHEN v_sender_role = 'founder' THEN 'Founder'
    WHEN v_sender_role = 'admin' THEN 'Admin'
    ELSE 'Participant'
  END;

  PERFORM public.create_notification(
    v_recipient,
    'chat_message',
    CASE WHEN v_conversation_type = 'support'
      THEN 'طلب دعم جديد من ' || v_sender_display_name || ' · ' || v_role_label
      ELSE 'رسالة جديدة من ' || v_sender_display_name || ' · ' || v_role_label
    END,
    CASE WHEN v_conversation_type = 'support'
      THEN 'طلب دعم جديد في محادثة الدعم'
      ELSE 'لديك رسالة جديدة في المحادثة'
    END,
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

NOTIFY pgrst, 'reload schema';
