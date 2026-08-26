-- Create a notification row for the other chat participant.
-- The existing notifications webhook can deliver this row as a push.

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
  SELECT participant_one, participant_two
    INTO v_p1, v_p2
  FROM public.chat_conversations
  WHERE id = NEW.conversation_id;

  IF v_p1 IS NULL OR v_p2 IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.sender_id <> v_p1 AND NEW.sender_id <> v_p2 THEN
    RETURN NEW;
  END IF;

  v_recipient := CASE
    WHEN NEW.sender_id = v_p1 THEN v_p2
    ELSE v_p1
  END;

  PERFORM public.create_notification(
    v_recipient,
    'chat_message',
    'رسالة جديدة',
    'لديك رسالة جديدة في المحادثة',
    jsonb_build_object(
      'conversation_id', NEW.conversation_id,
      'sender_id', NEW.sender_id
    ),
    'chat_conversations',
    NEW.conversation_id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS chat_message_notification_after_insert ON public.chat_messages;
CREATE TRIGGER chat_message_notification_after_insert
AFTER INSERT ON public.chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.handle_chat_message_notification();
