-- Secure, conversation-scoped profile summary for Chat profile cards.
-- Does not widen profiles/orders/delivery_assignments RLS policies.

CREATE OR REPLACE FUNCTION public.get_chat_profile_card(
  p_conversation_id UUID,
  p_profile_id UUID
)
RETURNS TABLE (
  profile_id UUID,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT,
  address TEXT,
  activity_count INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_other_id UUID;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT CASE
    WHEN c.participant_one = v_caller_id THEN c.participant_two
    WHEN c.participant_two = v_caller_id THEN c.participant_one
    ELSE NULL
  END
  INTO v_other_id
  FROM public.chat_conversations c
  WHERE c.id = p_conversation_id
    AND (c.participant_one = v_caller_id OR c.participant_two = v_caller_id);

  IF v_other_id IS NULL THEN
    RAISE EXCEPTION 'Conversation access denied';
  END IF;

  IF p_profile_id IS DISTINCT FROM v_other_id THEN
    RAISE EXCEPTION 'Profile is not a participant in this conversation';
  END IF;

  RETURN QUERY
  WITH profile_base AS (
    SELECT
      p.id,
      p.role,
      p.full_name AS profile_name,
      c.full_name AS customer_name,
      c.avatar_url AS customer_avatar,
      c.city AS customer_city,
      c.neighborhood AS customer_neighborhood,
      d.full_name AS driver_name,
      d.avatar_url AS driver_avatar,
      d.city AS driver_city,
      d.neighborhood AS driver_neighborhood,
      s.name AS store_name,
      s.logo_url AS store_logo,
      s.address_line1 AS store_address,
      s.city AS store_city,
      s.state_province AS store_state,
      ppp.display_name AS public_display_name,
      ppp.avatar_url AS public_avatar
    FROM public.profiles p
    LEFT JOIN public.customers c ON c.id = p.id
    LEFT JOIN public.drivers d ON d.id = p.id
    LEFT JOIN LATERAL (
      SELECT st.name, st.logo_url, st.address_line1, st.city, st.state_province
      FROM public.stores st
      WHERE st.merchant_id = p.id
        AND st.deleted_at IS NULL
      ORDER BY st.created_at ASC
      LIMIT 1
    ) s ON p.role = 'merchant'
    LEFT JOIN public.platform_public_profiles ppp
      ON ppp.linked_profile_id = p.id
     AND ppp.slug = 'soug-admin'
     AND ppp.is_active = TRUE
    WHERE p.id = v_other_id
  )
  SELECT
    pb.id,
    CASE
      WHEN pb.public_display_name IS NOT NULL THEN pb.public_display_name
      WHEN pb.role = 'merchant' THEN COALESCE(pb.store_name, pb.profile_name)
      WHEN pb.role = 'customer' THEN COALESCE(pb.customer_name, pb.profile_name)
      WHEN pb.role IN ('driver', 'courier') THEN COALESCE(pb.driver_name, pb.profile_name)
      ELSE COALESCE(pb.profile_name, 'Soug-XPRESS')
    END,
    CASE
      WHEN pb.public_avatar IS NOT NULL THEN pb.public_avatar
      WHEN pb.role = 'merchant' THEN pb.store_logo
      WHEN pb.role = 'customer' THEN pb.customer_avatar
      WHEN pb.role IN ('driver', 'courier') THEN pb.driver_avatar
      ELSE NULL
    END,
    pb.role,
    CASE
      WHEN pb.role = 'merchant' THEN NULLIF(concat_ws('، ', pb.store_address, pb.store_city, pb.store_state), '')
      WHEN pb.role = 'customer' THEN NULLIF(concat_ws('، ', pb.customer_city, pb.customer_neighborhood), '')
      WHEN pb.role IN ('driver', 'courier') THEN NULLIF(concat_ws('، ', pb.driver_city, pb.driver_neighborhood), '')
      ELSE NULL
    END,
    CASE
      WHEN pb.role = 'customer' THEN (
        SELECT COUNT(*)::INTEGER
        FROM public.orders o
        WHERE o.customer_id = pb.id
          AND o.status NOT IN ('cancelled', 'rejected')
      )
      WHEN pb.role = 'merchant' THEN (
        SELECT COUNT(*)::INTEGER
        FROM public.orders o
        JOIN public.stores st ON st.id = o.store_id
        WHERE st.merchant_id = pb.id
          AND o.status NOT IN ('cancelled', 'rejected')
      )
      WHEN pb.role IN ('driver', 'courier') THEN (
        SELECT COUNT(*)::INTEGER
        FROM public.delivery_assignments da
        WHERE da.driver_id = pb.id
          AND da.status = 'delivered'
      )
      ELSE 0
    END
  FROM profile_base pb;
END;
$$;

REVOKE ALL ON FUNCTION public.get_chat_profile_card(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_chat_profile_card(UUID, UUID) TO authenticated;
COMMENT ON FUNCTION public.get_chat_profile_card(UUID, UUID) IS
  'Returns a minimal role-aware profile summary only for the other participant in an authenticated conversation.';

NOTIFY pgrst, 'reload schema';
