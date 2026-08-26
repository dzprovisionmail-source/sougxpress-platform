-- Push device lifecycle: safely claim a token for one authenticated user and release it on logout.
-- No changes to notifications RLS or business logic.

CREATE OR REPLACE FUNCTION public.claim_user_device(
  p_push_token TEXT,
  p_platform TEXT,
  p_device_name TEXT DEFAULT NULL
)
RETURNS public.user_devices
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_device public.user_devices;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NULLIF(trim(p_push_token), '') IS NULL THEN
    RAISE EXCEPTION 'Push token is required';
  END IF;

  IF p_platform NOT IN ('android', 'ios', 'web') THEN
    RAISE EXCEPTION 'Unsupported platform';
  END IF;

  UPDATE public.user_devices
  SET is_active = FALSE,
      last_seen_at = now(),
      updated_at = now()
  WHERE push_token = p_push_token
    AND user_id <> v_user_id;

  INSERT INTO public.user_devices (
    user_id, push_token, platform, device_name, is_active, last_seen_at, updated_at
  ) VALUES (
    v_user_id, p_push_token, p_platform, p_device_name, TRUE, now(), now()
  )
  ON CONFLICT (user_id, push_token)
  DO UPDATE SET
    platform = EXCLUDED.platform,
    device_name = EXCLUDED.device_name,
    is_active = TRUE,
    last_seen_at = now(),
    updated_at = now()
  RETURNING * INTO v_device;

  RETURN v_device;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_user_device(p_push_token TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  UPDATE public.user_devices
  SET is_active = FALSE,
      last_seen_at = now(),
      updated_at = now()
  WHERE user_id = v_user_id
    AND push_token = p_push_token;

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_user_device(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_user_device(TEXT, TEXT, TEXT) TO authenticated;
REVOKE ALL ON FUNCTION public.release_user_device(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.release_user_device(TEXT) TO authenticated;
