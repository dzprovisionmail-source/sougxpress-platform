-- Read-only Founder/Admin access to existing commercial message history.
-- Reuses existing conversation/message rows and preserves all IDs and participants.
CREATE OR REPLACE FUNCTION public.get_founder_commercial_messages(
  p_conversation_id UUID
)
RETURNS TABLE (
  id UUID,
  conversation_id UUID,
  sender_id UUID,
  content TEXT,
  is_read BOOLEAN,
  created_at TIMESTAMPTZ,
  sender_full_name TEXT,
  sender_role TEXT,
  sender_avatar_url TEXT,
  sender_store_name TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF public.get_user_role(auth.uid()) NOT IN ('founder', 'admin') THEN
    RAISE EXCEPTION 'Founder access required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.chat_conversations c
    WHERE c.id = p_conversation_id
      AND (
        c.conversation_type = 'commercial'
        OR (c.conversation_type IS NULL AND c.relationship_type IS NOT NULL)
      )
  ) THEN
    RAISE EXCEPTION 'Commercial conversation not found';
  END IF;

  RETURN QUERY
  SELECT
    m.id,
    m.conversation_id,
    m.sender_id,
    m.content,
    m.is_read,
    m.created_at,
    p.full_name,
    p.role,
    COALESCE(c.avatar_url, d.avatar_url),
    store_context.store_name
  FROM public.chat_messages m
  JOIN public.profiles p ON p.id = m.sender_id
  LEFT JOIN public.customers c ON c.id = p.id
  LEFT JOIN public.drivers d ON d.id = p.id
  LEFT JOIN LATERAL (
    SELECT s.name AS store_name
    FROM public.stores s
    LEFT JOIN public.merchants merchant ON merchant.id = s.merchant_id
    WHERE p.role = 'merchant'
      AND (
        s.created_by = p.id
        OR s.merchant_id = p.id
        OR lower(trim(merchant.email)) = lower(trim(p.email))
      )
      AND s.deleted_at IS NULL
    ORDER BY CASE WHEN s.created_by = p.id THEN 0 ELSE 1 END,
             s.created_at NULLS LAST,
             s.id
    LIMIT 1
  ) store_context ON TRUE
  WHERE m.conversation_id = p_conversation_id
  ORDER BY m.created_at ASC, m.id ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_founder_commercial_messages(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_founder_commercial_messages(UUID) TO authenticated;
NOTIFY pgrst, 'reload schema';
