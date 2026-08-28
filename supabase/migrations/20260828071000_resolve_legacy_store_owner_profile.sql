BEGIN;

CREATE OR REPLACE FUNCTION public.resolve_chat_participant_profile(
  p_raw_id uuid,
  p_relationship_type text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_profile_id uuid;
  v_email text;
BEGIN
  IF p_raw_id IS NULL THEN RETURN NULL; END IF;

  SELECT p.id INTO v_profile_id FROM public.profiles p WHERE p.id = p_raw_id LIMIT 1;
  IF v_profile_id IS NOT NULL THEN RETURN v_profile_id; END IF;

  IF p_relationship_type IN ('customer_merchant','merchant_merchant','merchant_courier') THEN
    SELECT candidate.profile_id INTO v_profile_id
    FROM (
      SELECT s.created_by AS profile_id
      FROM public.stores s
      WHERE s.id = p_raw_id AND s.created_by IS NOT NULL
      UNION ALL
      SELECT s.merchant_id AS profile_id
      FROM public.stores s
      WHERE s.id = p_raw_id
      UNION ALL
      SELECT p.id AS profile_id
      FROM public.stores s
      JOIN public.merchants m ON m.id = s.merchant_id
      JOIN public.profiles p ON lower(trim(p.email)) = lower(trim(m.email))
      WHERE s.id = p_raw_id
    ) candidate
    JOIN public.profiles p ON p.id = candidate.profile_id
    LIMIT 1;
    IF v_profile_id IS NOT NULL THEN RETURN v_profile_id; END IF;

    SELECT lower(trim(m.email)) INTO v_email FROM public.merchants m WHERE m.id = p_raw_id LIMIT 1;
  ELSE
    SELECT lower(trim(d.email)) INTO v_email FROM public.drivers d WHERE d.id = p_raw_id LIMIT 1;
  END IF;

  IF v_email IS NULL OR v_email = '' THEN RETURN NULL; END IF;
  SELECT p.id INTO v_profile_id FROM public.profiles p WHERE lower(trim(p.email)) = v_email LIMIT 1;
  RETURN v_profile_id;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_chat_participant_profile(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_chat_participant_profile(uuid, text) TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
