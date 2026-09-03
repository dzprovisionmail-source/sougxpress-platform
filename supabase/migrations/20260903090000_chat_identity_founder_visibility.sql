-- Chat identity/context layer and narrow Founder/Admin visibility.
-- Reuses the existing conversations and messages; no IDs, routing, or duplicate rows are introduced.

CREATE OR REPLACE VIEW public.v_chat_conversations_list
WITH (security_invoker = true)
AS
WITH last_messages AS (
  SELECT DISTINCT ON (conversation_id)
    conversation_id,
    content,
    created_at
  FROM public.chat_messages
  ORDER BY conversation_id, created_at DESC
), participant_details AS (
  SELECT
    p.id,
    p.full_name,
    COALESCE(c.avatar_url, d.avatar_url) AS avatar_url,
    p.role,
    store_context.store_name,
    store_context.store_logo
  FROM public.profiles p
  LEFT JOIN public.customers c ON c.id = p.id
  LEFT JOIN public.drivers d ON d.id = p.id
  LEFT JOIN LATERAL (
    SELECT
      s.name AS store_name,
      s.logo_url AS store_logo
    FROM public.stores s
    LEFT JOIN public.merchants m ON m.id = s.merchant_id
    WHERE p.role = 'merchant'
      AND (
        s.created_by = p.id
        OR s.merchant_id = p.id
        OR lower(trim(m.email)) = lower(trim(p.email))
      )
    ORDER BY CASE WHEN s.created_by = p.id THEN 0 ELSE 1 END, s.created_at NULLS LAST, s.id
    LIMIT 1
  ) store_context ON true
)
SELECT
  c.id,
  c.participant_one,
  c.participant_two,
  c.relationship_type,
  c.reference_id,
  c.last_message_at,
  c.created_at,
  p1.full_name AS p1_full_name,
  p1.avatar_url AS p1_avatar_url,
  p1.role AS p1_role,
  p1.store_name AS p1_store_name,
  p1.store_logo AS p1_store_logo,
  p2.full_name AS p2_full_name,
  p2.avatar_url AS p2_avatar_url,
  p2.role AS p2_role,
  p2.store_name AS p2_store_name,
  p2.store_logo AS p2_store_logo,
  lm.content AS last_message_content,
  lm.created_at AS last_message_time,
  c.conversation_type
FROM public.chat_conversations c
LEFT JOIN participant_details p1 ON p1.id = c.participant_one
LEFT JOIN participant_details p2 ON p2.id = c.participant_two
LEFT JOIN last_messages lm ON lm.conversation_id = c.id;

GRANT SELECT ON public.v_chat_conversations_list TO authenticated;

DROP POLICY IF EXISTS "Founder staff can view commercial conversations" ON public.chat_conversations;
CREATE POLICY "Founder staff can view commercial conversations"
ON public.chat_conversations
FOR SELECT
USING (
  conversation_type = 'commercial'
  AND public.is_support_staff()
);

DROP POLICY IF EXISTS "Founder staff can update commercial timestamps" ON public.chat_conversations;
CREATE POLICY "Founder staff can update commercial timestamps"
ON public.chat_conversations
FOR UPDATE
USING (
  conversation_type = 'commercial'
  AND public.is_support_staff()
)
WITH CHECK (
  conversation_type = 'commercial'
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
      AND c.conversation_type = 'commercial'
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
      AND c.conversation_type = 'commercial'
  )
);

NOTIFY pgrst, 'reload schema';
