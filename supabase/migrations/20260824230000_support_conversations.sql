-- Support Conversations for Customer, Merchant, Driver and Soug-XPRESS Founder/Admin.
-- Commercial Chat rows remain commercial and retain their existing RLS semantics.

ALTER TABLE public.platform_public_profiles
  ADD COLUMN IF NOT EXISTS linked_profile_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'platform_public_profiles_linked_profile_id_fkey'
      AND conrelid = 'public.platform_public_profiles'::regclass
  ) THEN
    ALTER TABLE public.platform_public_profiles
      ADD CONSTRAINT platform_public_profiles_linked_profile_id_fkey
      FOREIGN KEY (linked_profile_id)
      REFERENCES public.profiles(id)
      ON DELETE RESTRICT;
  END IF;
END $$;

-- Resolve the official identity only when there is exactly one active
-- Soug-Admin row and exactly one Founder/Admin profile. Any other state
-- fails closed; no arbitrary profile is selected.
DO $$
DECLARE
  v_support_id UUID;
  v_staff_count BIGINT;
  v_identity_count BIGINT;
  v_valid_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_staff_count
  FROM public.profiles
  WHERE role IN ('founder', 'admin');

  SELECT COUNT(*) INTO v_identity_count
  FROM public.platform_public_profiles
  WHERE slug = 'soug-admin' AND is_active = TRUE;

  IF v_staff_count <> 1 OR v_identity_count <> 1 THEN
    RAISE EXCEPTION 'Soug-XPRESS support identity is missing or ambiguous';
  END IF;

  SELECT id INTO v_support_id
  FROM public.profiles
  WHERE role IN ('founder', 'admin');

  UPDATE public.platform_public_profiles
  SET linked_profile_id = v_support_id, updated_at = NOW()
  WHERE slug = 'soug-admin'
    AND is_active = TRUE
    AND linked_profile_id IS NULL;

  SELECT COUNT(*) INTO v_valid_count
  FROM public.platform_public_profiles ppp
  JOIN public.profiles p ON p.id = ppp.linked_profile_id
  WHERE ppp.slug = 'soug-admin'
    AND ppp.is_active = TRUE
    AND ppp.linked_profile_id IS NOT NULL
    AND p.role IN ('founder', 'admin');

  IF v_valid_count <> 1 THEN
    RAISE EXCEPTION 'Soug-XPRESS support identity link is missing or invalid';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS platform_public_profiles_linked_profile_id_key
  ON public.platform_public_profiles (linked_profile_id)
  WHERE linked_profile_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS platform_public_profiles_active_soug_admin_key
  ON public.platform_public_profiles (slug)
  WHERE is_active = TRUE AND slug = 'soug-admin';

ALTER TABLE public.chat_conversations
  ADD COLUMN IF NOT EXISTS conversation_type TEXT NOT NULL DEFAULT 'commercial';

ALTER TABLE public.chat_conversations
  DROP CONSTRAINT IF EXISTS chat_conversations_conversation_type_check;

ALTER TABLE public.chat_conversations
  ADD CONSTRAINT chat_conversations_conversation_type_check
  CHECK (conversation_type IN ('commercial', 'support'));

UPDATE public.chat_conversations
SET conversation_type = 'commercial'
WHERE conversation_type IS NULL;

ALTER TABLE public.chat_conversations
  ALTER COLUMN relationship_type DROP NOT NULL;

ALTER TABLE public.chat_conversations
  DROP CONSTRAINT IF EXISTS chat_conversations_relationship_type_check;

ALTER TABLE public.chat_conversations
  ADD CONSTRAINT chat_conversations_relationship_type_check
  CHECK (
    (conversation_type = 'commercial' AND relationship_type IN ('customer_merchant', 'customer_courier', 'merchant_courier'))
    OR (conversation_type = 'support' AND relationship_type IS NULL)
  );

CREATE UNIQUE INDEX IF NOT EXISTS chat_support_one_per_user
  ON public.chat_conversations (LEAST(participant_one, participant_two), GREATEST(participant_one, participant_two))
  WHERE conversation_type = 'support';

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
    s.name AS store_name,
    s.logo_url AS store_logo
  FROM public.profiles p
  LEFT JOIN public.customers c ON p.id = c.id
  LEFT JOIN public.drivers d ON p.id = d.id
  LEFT JOIN public.stores s ON p.id = s.merchant_id AND p.role = 'merchant'
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
LEFT JOIN participant_details p1 ON c.participant_one = p1.id
LEFT JOIN participant_details p2 ON c.participant_two = p2.id
LEFT JOIN last_messages lm ON c.id = lm.conversation_id;

GRANT SELECT ON public.v_chat_conversations_list TO authenticated;

-- Retain the old overload for dependency safety, but make it unusable by clients
-- when it exists. The guarded block also supports a first-time deployment.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'is_support_staff'
      AND pg_get_function_identity_arguments(p.oid) = 'p_user_id uuid'
  ) THEN
    REVOKE ALL ON FUNCTION public.is_support_staff(UUID) FROM PUBLIC, authenticated;
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.is_support_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('founder', 'admin')
  );
$$;

REVOKE ALL ON FUNCTION public.is_support_staff() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_support_staff() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_or_create_support_conversation()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_user_role TEXT;
  v_support_id UUID;
  v_support_count BIGINT;
  v_conversation_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT role INTO v_user_role FROM public.profiles WHERE id = v_user_id;
  IF v_user_role IS NULL OR v_user_role NOT IN ('customer', 'merchant', 'driver', 'courier') THEN
    RAISE EXCEPTION 'Support is available to customer, merchant and driver accounts only';
  END IF;

  -- Resolve the participant through exactly one official platform identity.
  -- Any ambiguity, missing link, or invalid role fails closed.
  SELECT COUNT(*) INTO v_support_count
  FROM public.platform_public_profiles ppp
  JOIN public.profiles p ON p.id = ppp.linked_profile_id
  WHERE ppp.slug = 'soug-admin'
    AND ppp.is_active = TRUE
    AND ppp.linked_profile_id IS NOT NULL
    AND p.role IN ('founder', 'admin');

  IF v_support_count <> 1 THEN
    RAISE EXCEPTION 'Soug-XPRESS support account is missing or ambiguous';
  END IF;

  SELECT ppp.linked_profile_id INTO v_support_id
  FROM public.platform_public_profiles ppp
  JOIN public.profiles p ON p.id = ppp.linked_profile_id
  WHERE ppp.slug = 'soug-admin'
    AND ppp.is_active = TRUE
    AND ppp.linked_profile_id IS NOT NULL
    AND p.role IN ('founder', 'admin');

  IF v_support_id = v_user_id THEN
    RAISE EXCEPTION 'Support staff cannot open a self-support conversation';
  END IF;

  SELECT id INTO v_conversation_id
  FROM public.chat_conversations
  WHERE conversation_type = 'support'
    AND LEAST(participant_one, participant_two) = LEAST(v_user_id, v_support_id)
    AND GREATEST(participant_one, participant_two) = GREATEST(v_user_id, v_support_id);

  IF v_conversation_id IS NOT NULL THEN
    RETURN v_conversation_id;
  END IF;

  INSERT INTO public.chat_conversations (
    participant_one,
    participant_two,
    relationship_type,
    reference_id,
    conversation_type
  )
  VALUES (v_user_id, v_support_id, NULL, NULL, 'support')
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_conversation_id;

  IF v_conversation_id IS NULL THEN
    SELECT id INTO v_conversation_id
    FROM public.chat_conversations
    WHERE conversation_type = 'support'
      AND LEAST(participant_one, participant_two) = LEAST(v_user_id, v_support_id)
      AND GREATEST(participant_one, participant_two) = GREATEST(v_user_id, v_support_id);
  END IF;

  IF v_conversation_id IS NULL THEN
    RAISE EXCEPTION 'Could not create support conversation';
  END IF;

  RETURN v_conversation_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_or_create_support_conversation() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_or_create_support_conversation() TO authenticated;

-- Keep commercial behavior unchanged, but make the existing commercial INSERT
-- policy explicitly reject Support rows. This avoids permissive-policy OR leakage.
DROP POLICY IF EXISTS "Users can insert chat conversations if commercially eligible" ON public.chat_conversations;
CREATE POLICY "Users can insert chat conversations if commercially eligible"
ON public.chat_conversations
FOR INSERT
WITH CHECK (
  conversation_type = 'commercial'
  AND (participant_one = auth.uid() OR participant_two = auth.uid())
  AND public.can_start_chat(participant_one, participant_two, relationship_type, reference_id)
);

-- Keep commercial policies unchanged; add narrowly-scoped support access only.
CREATE OR REPLACE FUNCTION public.prevent_chat_identity_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.participant_one IS DISTINCT FROM OLD.participant_one
     OR NEW.participant_two IS DISTINCT FROM OLD.participant_two
     OR NEW.relationship_type IS DISTINCT FROM OLD.relationship_type
     OR NEW.reference_id IS DISTINCT FROM OLD.reference_id
     OR NEW.conversation_type IS DISTINCT FROM OLD.conversation_type THEN
    RAISE EXCEPTION 'Conversation identity fields are immutable';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS chat_conversations_identity_immutable ON public.chat_conversations;
CREATE TRIGGER chat_conversations_identity_immutable
  BEFORE UPDATE ON public.chat_conversations
  FOR EACH ROW EXECUTE FUNCTION public.prevent_chat_identity_changes();

DROP POLICY IF EXISTS "Support participants can update support timestamps" ON public.chat_conversations;
CREATE POLICY "Support participants can update support timestamps"
ON public.chat_conversations
FOR UPDATE
USING (
  conversation_type = 'support'
  AND (participant_one = auth.uid() OR participant_two = auth.uid() OR public.is_support_staff())
)
WITH CHECK (
  conversation_type = 'support'
  AND (participant_one = auth.uid() OR participant_two = auth.uid() OR public.is_support_staff())
);

DROP POLICY IF EXISTS "Support users can view their own support conversations" ON public.chat_conversations;
CREATE POLICY "Support users can view their own support conversations"
ON public.chat_conversations
FOR SELECT
USING (
  conversation_type = 'support'
  AND (participant_one = auth.uid() OR participant_two = auth.uid())
);

DROP POLICY IF EXISTS "Support staff can view support conversations" ON public.chat_conversations;
CREATE POLICY "Support staff can view support conversations"
ON public.chat_conversations
FOR SELECT
USING (
  conversation_type = 'support'
  AND public.is_support_staff()
);

DROP POLICY IF EXISTS "Support users cannot insert conversations directly" ON public.chat_conversations;
CREATE POLICY "Support users cannot insert conversations directly"
ON public.chat_conversations
FOR INSERT
WITH CHECK (false);

DROP POLICY IF EXISTS "Support users can view their support messages" ON public.chat_messages;
CREATE POLICY "Support users can view their support messages"
ON public.chat_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.chat_conversations c
    WHERE c.id = chat_messages.conversation_id
      AND c.conversation_type = 'support'
      AND (c.participant_one = auth.uid() OR c.participant_two = auth.uid())
  )
);

DROP POLICY IF EXISTS "Support staff can view support messages" ON public.chat_messages;
CREATE POLICY "Support staff can view support messages"
ON public.chat_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.chat_conversations c
    WHERE c.id = chat_messages.conversation_id
      AND c.conversation_type = 'support'
      AND public.is_support_staff()
  )
);

DROP POLICY IF EXISTS "Support participants can send support messages" ON public.chat_messages;
CREATE POLICY "Support participants can send support messages"
ON public.chat_messages
FOR INSERT
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.chat_conversations c
    WHERE c.id = chat_messages.conversation_id
      AND c.conversation_type = 'support'
      AND (c.participant_one = auth.uid() OR c.participant_two = auth.uid())
  )
);

DROP POLICY IF EXISTS "Support staff can send support messages" ON public.chat_messages;
CREATE POLICY "Support staff can send support messages"
ON public.chat_messages
FOR INSERT
WITH CHECK (
  sender_id = auth.uid()
  AND public.is_support_staff()
  AND EXISTS (
    SELECT 1 FROM public.chat_conversations c
    WHERE c.id = chat_messages.conversation_id
      AND c.conversation_type = 'support'
  )
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'chat_conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversations;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  END IF;
END;
$$;

NOTIFY pgrst, 'reload schema';
