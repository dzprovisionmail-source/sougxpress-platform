BEGIN;

CREATE OR REPLACE FUNCTION public.resolve_chat_participant_profile(
  p_raw_id uuid,
  p_relationship_type text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid;
  v_email text;
BEGIN
  IF p_raw_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- The canonical chat identity is always profiles.id.
  SELECT p.id
    INTO v_profile_id
    FROM public.profiles AS p
   WHERE p.id = p_raw_id
   LIMIT 1;

  IF v_profile_id IS NOT NULL THEN
    RETURN v_profile_id;
  END IF;

  -- Legacy role-table IDs are resolved server-side so client RLS cannot
  -- incorrectly hide the target profile from the authenticated caller.
  IF p_relationship_type IN ('customer_merchant', 'merchant_merchant', 'merchant_courier') THEN
    SELECT lower(trim(m.email))
      INTO v_email
      FROM public.merchants AS m
     WHERE m.id = p_raw_id
     LIMIT 1;
  ELSE
    SELECT lower(trim(d.email))
      INTO v_email
      FROM public.drivers AS d
     WHERE d.id = p_raw_id
     LIMIT 1;
  END IF;

  IF v_email IS NULL OR v_email = '' THEN
    RETURN NULL;
  END IF;

  SELECT p.id
    INTO v_profile_id
    FROM public.profiles AS p
   WHERE lower(trim(p.email)) = v_email
   LIMIT 1;

  RETURN v_profile_id;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_chat_participant_profile(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_chat_participant_profile(uuid, text) TO authenticated;

COMMIT;
