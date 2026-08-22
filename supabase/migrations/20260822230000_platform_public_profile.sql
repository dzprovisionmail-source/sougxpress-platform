-- Official, non-user public identity for the Soug-XPRESS platform.
-- This is intentionally separate from auth.users and public.profiles.
CREATE TABLE IF NOT EXISTS public.platform_public_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE CHECK (slug = 'soug-admin'),
  display_name TEXT NOT NULL,
  bio TEXT NOT NULL,
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.platform_public_profiles (slug, display_name, bio)
VALUES ('soug-admin', 'soug-admin', 'الحساب الرسمي لمنصة Soug-XPRESS')
ON CONFLICT (slug) DO UPDATE
SET display_name = EXCLUDED.display_name,
    bio = EXCLUDED.bio,
    updated_at = NOW();

ALTER TABLE public.platform_public_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS platform_public_profiles_select_active ON public.platform_public_profiles;
CREATE POLICY platform_public_profiles_select_active
  ON public.platform_public_profiles
  FOR SELECT
  USING (is_active = TRUE);

DROP POLICY IF EXISTS platform_public_profiles_manage_admin ON public.platform_public_profiles;
CREATE POLICY platform_public_profiles_manage_admin
  ON public.platform_public_profiles
  FOR ALL
  USING (public.get_user_role(auth.uid()) IN ('admin', 'founder'))
  WITH CHECK (public.get_user_role(auth.uid()) IN ('admin', 'founder'));

CREATE OR REPLACE FUNCTION public.update_platform_public_profiles_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS platform_public_profiles_updated_at ON public.platform_public_profiles;
CREATE TRIGGER platform_public_profiles_updated_at
  BEFORE UPDATE ON public.platform_public_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_platform_public_profiles_updated_at();

REVOKE INSERT, UPDATE, DELETE ON public.platform_public_profiles FROM anon, authenticated;
GRANT SELECT ON public.platform_public_profiles TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.platform_public_profiles TO authenticated;
