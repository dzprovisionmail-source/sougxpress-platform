-- Legacy commercial conversations were created before conversation_type existed.
-- Treat NULL conversation_type as commercial for Founder visibility only.
-- No conversation, message, participant, or ID is created or changed.

DROP POLICY IF EXISTS "Founder staff can view commercial conversations" ON public.chat_conversations;
CREATE POLICY "Founder staff can view commercial conversations"
ON public.chat_conversations
FOR SELECT
USING (
  (conversation_type = 'commercial' OR conversation_type IS NULL)
  AND public.is_support_staff()
);

DROP POLICY IF EXISTS "Founder staff can update commercial timestamps" ON public.chat_conversations;
CREATE POLICY "Founder staff can update commercial timestamps"
ON public.chat_conversations
FOR UPDATE
USING (
  (conversation_type = 'commercial' OR conversation_type IS NULL)
  AND public.is_support_staff()
)
WITH CHECK (
  (conversation_type = 'commercial' OR conversation_type IS NULL)
  AND public.is_support_staff()
);

DROP POLICY IF EXISTS "Founder staff can view commercial messages" ON public.chat_messages;
CREATE POLICY "Founder staff can view commercial messages"
ON public.chat_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.chat_conversations c
    WHERE c.id = chat_messages.conversation_id
      AND (c.conversation_type = 'commercial' OR c.conversation_type IS NULL)
      AND public.is_support_staff()
  )
);

DROP POLICY IF EXISTS "Founder staff can send commercial messages" ON public.chat_messages;
CREATE POLICY "Founder staff can send commercial messages"
ON public.chat_messages
FOR INSERT
WITH CHECK (
  sender_id = auth.uid()
  AND public.is_support_staff()
  AND EXISTS (
    SELECT 1
    FROM public.chat_conversations c
    WHERE c.id = chat_messages.conversation_id
      AND (c.conversation_type = 'commercial' OR c.conversation_type IS NULL)
  )
);

NOTIFY pgrst, 'reload schema';
