-- Read-only Founder inbox for all existing market conversations.
-- This does not create, copy, or mutate conversations/messages.
CREATE OR REPLACE FUNCTION public.get_founder_commercial_conversations(
  p_relationship_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  participant_one UUID,
  participant_two UUID,
  relationship_type TEXT,
  reference_id UUID,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  p1_full_name TEXT,
  p1_avatar_url TEXT,
  p1_role TEXT,
  p1_store_name TEXT,
  p1_store_logo TEXT,
  p2_full_name TEXT,
  p2_avatar_url TEXT,
  p2_role TEXT,
  p2_store_name TEXT,
  p2_store_logo TEXT,
  last_message_content TEXT,
  last_message_time TIMESTAMPTZ,
  conversation_type TEXT
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

  RETURN QUERY
  WITH last_messages AS (
    SELECT DISTINCT ON (m.conversation_id)
      m.conversation_id,
      m.content,
      m.created_at
    FROM public.chat_messages m
    ORDER BY m.conversation_id, m.created_at DESC
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
      SELECT s.name AS store_name, s.logo_url AS store_logo
      FROM public.stores s
      LEFT JOIN public.merchants m ON m.id = s.merchant_id
      WHERE p.role = 'merchant'
        AND (
          s.created_by = p.id
          OR s.merchant_id = p.id
          OR lower(trim(m.email)) = lower(trim(p.email))
        )
        AND s.deleted_at IS NULL
      ORDER BY CASE WHEN s.created_by = p.id THEN 0 ELSE 1 END, s.created_at NULLS LAST, s.id
      LIMIT 1
    ) store_context ON TRUE
  )
  SELECT
    c.id,
    c.participant_one,
    c.participant_two,
    c.relationship_type,
    c.reference_id,
    c.last_message_at,
    c.created_at,
    p1.full_name,
    p1.avatar_url,
    p1.role,
    p1.store_name,
    p1.store_logo,
    p2.full_name,
    p2.avatar_url,
    p2.role,
    p2.store_name,
    p2.store_logo,
    lm.content,
    lm.created_at,
    COALESCE(c.conversation_type, 'commercial')
  FROM public.chat_conversations c
  LEFT JOIN participant_details p1 ON p1.id = c.participant_one
  LEFT JOIN participant_details p2 ON p2.id = c.participant_two
  LEFT JOIN last_messages lm ON lm.conversation_id = c.id
  WHERE (
    c.conversation_type = 'commercial'
    OR (c.conversation_type IS NULL AND c.relationship_type IS NOT NULL)
  )
    AND (p_relationship_type IS NULL OR c.relationship_type = p_relationship_type)
  ORDER BY c.last_message_at DESC NULLS LAST, c.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_founder_commercial_conversations(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_founder_commercial_conversations(TEXT) TO authenticated;
NOTIFY pgrst, 'reload schema';
