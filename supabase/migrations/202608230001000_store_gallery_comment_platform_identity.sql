-- Link official platform identities to gallery comments without creating auth users.
BEGIN;

ALTER TABLE public.store_gallery_comments
  ADD COLUMN IF NOT EXISTS platform_profile_slug TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'store_gallery_comments_platform_profile_slug_fkey'
      AND conrelid = 'public.store_gallery_comments'::regclass
  ) THEN
    ALTER TABLE public.store_gallery_comments
      ADD CONSTRAINT store_gallery_comments_platform_profile_slug_fkey
      FOREIGN KEY (platform_profile_slug)
      REFERENCES public.platform_public_profiles (slug)
      ON DELETE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_store_gallery_comments_platform_profile
  ON public.store_gallery_comments (platform_profile_slug)
  WHERE platform_profile_slug IS NOT NULL;

CREATE OR REPLACE FUNCTION public.set_store_gallery_comment_platform_identity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  platform_profile public.platform_public_profiles%ROWTYPE;
BEGIN
  IF NEW.platform_profile_slug IS NULL THEN
    RETURN NEW;
  END IF;

  IF public.get_user_role(auth.uid()) NOT IN ('admin', 'founder') THEN
    RAISE EXCEPTION 'Only founder or admin may post as a platform identity';
  END IF;

  IF NEW.user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Platform identity comments must use the current authenticated user';
  END IF;

  SELECT * INTO platform_profile
  FROM public.platform_public_profiles
  WHERE slug = NEW.platform_profile_slug
    AND is_active = TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'The platform identity is not active';
  END IF;

  NEW.user_name := platform_profile.display_name;
  NEW.user_avatar_url := platform_profile.avatar_url;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS store_gallery_comments_platform_identity
  ON public.store_gallery_comments;
CREATE TRIGGER store_gallery_comments_platform_identity
  BEFORE INSERT ON public.store_gallery_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.set_store_gallery_comment_platform_identity();

COMMIT;
