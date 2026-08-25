-- Image Upload Hardening
-- Scope: database-side count invariants for store gallery and product images.
-- No Storage policy changes. Existing rows are preserved.

BEGIN;

CREATE OR REPLACE FUNCTION public.enforce_store_gallery_image_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  current_count INTEGER;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.store_id::text, 0));

  SELECT COUNT(*)::INTEGER
    INTO current_count
    FROM public.store_gallery
   WHERE store_id = NEW.store_id
     AND id <> NEW.id;

  IF current_count >= 20 THEN
    RAISE EXCEPTION 'Store gallery limit exceeded: maximum 20 images per store';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_store_gallery_image_limit ON public.store_gallery;
CREATE TRIGGER enforce_store_gallery_image_limit
BEFORE INSERT OR UPDATE OF store_id ON public.store_gallery
FOR EACH ROW
EXECUTE FUNCTION public.enforce_store_gallery_image_limit();

CREATE OR REPLACE FUNCTION public.enforce_store_product_image_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  target_store_id UUID;
  current_count INTEGER;
BEGIN
  IF TG_TABLE_NAME = 'products' THEN
    IF TG_OP = 'INSERT' AND NEW.image_url IS NULL THEN
      RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE'
       AND NEW.store_id = OLD.store_id
       AND NEW.image_url IS NOT DISTINCT FROM OLD.image_url THEN
      RETURN NEW;
    END IF;

    target_store_id := NEW.store_id;
    PERFORM pg_advisory_xact_lock(hashtextextended(target_store_id::text, 0));

    WITH existing_images AS (
      SELECT p.image_url
        FROM public.products p
       WHERE p.store_id = target_store_id
         AND p.id IS DISTINCT FROM NEW.id
         AND p.image_url IS NOT NULL
      UNION
      SELECT pi.image_url
        FROM public.product_images pi
        JOIN public.products p ON p.id = pi.product_id
       WHERE (p.store_id = target_store_id OR p.id = NEW.id)
         AND pi.image_url IS NOT NULL
    ), final_images AS (
      SELECT image_url
        FROM existing_images
      UNION
      SELECT NEW.image_url
       WHERE NEW.image_url IS NOT NULL
    )
    SELECT COUNT(*)::INTEGER
      INTO current_count
      FROM final_images;
  ELSE
    SELECT p.store_id
      INTO target_store_id
      FROM public.products p
     WHERE p.id = NEW.product_id;

    IF target_store_id IS NULL THEN
      RAISE EXCEPTION 'Cannot add product image for an unknown product';
    END IF;

    PERFORM pg_advisory_xact_lock(hashtextextended(target_store_id::text, 0));

    WITH existing_images AS (
      SELECT p.image_url
        FROM public.products p
       WHERE p.store_id = target_store_id
         AND p.image_url IS NOT NULL
      UNION
      SELECT pi.image_url
        FROM public.product_images pi
        JOIN public.products p ON p.id = pi.product_id
       WHERE p.store_id = target_store_id
         AND pi.id IS DISTINCT FROM NEW.id
         AND pi.image_url IS NOT NULL
    ), final_images AS (
      SELECT image_url
        FROM existing_images
      UNION
      SELECT NEW.image_url
       WHERE NEW.image_url IS NOT NULL
    )
    SELECT COUNT(*)::INTEGER
      INTO current_count
      FROM final_images;
  END IF;

  IF current_count > 50 THEN
    RAISE EXCEPTION 'Product image limit exceeded: maximum 50 images per store';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_store_product_image_limit ON public.products;
CREATE TRIGGER enforce_store_product_image_limit
BEFORE INSERT OR UPDATE OF store_id, image_url ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.enforce_store_product_image_limit();

DROP TRIGGER IF EXISTS enforce_product_image_limit ON public.product_images;
CREATE TRIGGER enforce_product_image_limit
BEFORE INSERT OR UPDATE OF product_id, image_url ON public.product_images
FOR EACH ROW
EXECUTE FUNCTION public.enforce_store_product_image_limit();

REVOKE ALL ON FUNCTION public.enforce_store_gallery_image_limit() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_store_product_image_limit() FROM PUBLIC;

COMMIT;
