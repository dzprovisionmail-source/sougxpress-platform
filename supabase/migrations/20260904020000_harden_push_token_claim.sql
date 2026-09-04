-- Harden push-token lifecycle: one active token per user/platform/device identity.
-- Older tokens are deactivated when the app claims a newly acquired token.

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

  -- A token can only belong to one user at a time.
  UPDATE public.user_devices
  SET is_active = FALSE,
      last_seen_at = now(),
      updated_at = now()
  WHERE push_token = p_push_token
    AND user_id <> v_user_id;

  -- When the same app/device claims a rotated token, retire older tokens
  -- before upserting the current token. IS NOT DISTINCT FROM handles NULL names.
  UPDATE public.user_devices
  SET is_active = FALSE,
      last_seen_at = now(),
      updated_at = now()
  WHERE user_id = v_user_id
    AND platform = p_platform
    AND device_name IS NOT DISTINCT FROM p_device_name
    AND push_token <> p_push_token
    AND is_active = TRUE;

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

REVOKE ALL ON FUNCTION public.claim_user_device(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_user_device(TEXT, TEXT, TEXT) TO authenticated;
