-- Courier reviews: verified customer/merchant reviews for completed deliveries.
-- This migration is intentionally additive and must be applied through the project's
-- controlled migration workflow; it does not alter orders or delivery business logic.

CREATE TABLE IF NOT EXISTS public.courier_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  courier_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reviewer_role TEXT NOT NULL CHECK (reviewer_role IN ('customer', 'merchant')),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  delivery_assignment_id UUID NOT NULL REFERENCES public.delivery_assignments(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT CHECK (comment IS NULL OR char_length(comment) <= 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_courier_reviews_reviewer_order UNIQUE (reviewer_id, order_id)
);

CREATE INDEX IF NOT EXISTS idx_courier_reviews_courier_created
  ON public.courier_reviews (courier_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_courier_reviews_order
  ON public.courier_reviews (order_id);

ALTER TABLE public.courier_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS courier_reviews_select_authenticated ON public.courier_reviews;
CREATE POLICY courier_reviews_select_authenticated
  ON public.courier_reviews FOR SELECT TO authenticated
  USING (true);

-- No INSERT/UPDATE/DELETE policy is exposed to clients. Mutations are performed
-- by the SECURITY DEFINER functions below after server-side eligibility checks.

CREATE OR REPLACE FUNCTION public.refresh_driver_review_summary(p_courier_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.drivers d
  SET rating = COALESCE((
        SELECT ROUND(AVG(cr.rating)::numeric, 1)
        FROM public.courier_reviews cr
        WHERE cr.courier_id = p_courier_id
      ), 0.0),
      review_count = COALESCE((
        SELECT COUNT(*)::integer
        FROM public.courier_reviews cr
        WHERE cr.courier_id = p_courier_id
      ), 0)
  WHERE d.id = p_courier_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_courier_review_summary()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.refresh_driver_review_summary(COALESCE(NEW.courier_id, OLD.courier_id));
  IF TG_OP = 'UPDATE' AND NEW.courier_id IS DISTINCT FROM OLD.courier_id THEN
    PERFORM public.refresh_driver_review_summary(OLD.courier_id);
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_refresh_driver_review_summary ON public.courier_reviews;
CREATE TRIGGER trg_refresh_driver_review_summary
  AFTER INSERT OR UPDATE OR DELETE ON public.courier_reviews
  FOR EACH ROW EXECUTE FUNCTION public.handle_courier_review_summary();

CREATE OR REPLACE FUNCTION public.get_courier_review_eligibility(p_courier_id UUID)
RETURNS TABLE (
  order_id UUID,
  delivery_assignment_id UUID,
  reviewer_role TEXT,
  already_reviewed BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT p.role INTO v_role FROM public.profiles p WHERE p.id = auth.uid();
  IF v_role NOT IN ('customer', 'merchant') THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT o.id,
         da.id,
         v_role,
         EXISTS (
           SELECT 1 FROM public.courier_reviews cr
           WHERE cr.reviewer_id = auth.uid() AND cr.order_id = o.id
         )
  FROM public.orders o
  JOIN public.delivery_assignments da ON da.order_id = o.id
  JOIN public.stores s ON s.id = o.store_id
  WHERE da.driver_id = p_courier_id
    AND o.status = 'delivered'
    AND da.status = 'delivered'
    AND (
      (v_role = 'customer' AND o.customer_id = auth.uid())
      OR (v_role = 'merchant' AND s.merchant_id = auth.uid())
    )
  ORDER BY da.delivered_at DESC NULLS LAST, o.updated_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_courier_reviews(p_courier_id UUID)
RETURNS TABLE (
  id UUID,
  courier_id UUID,
  reviewer_id UUID,
  reviewer_role TEXT,
  reviewer_name TEXT,
  order_id UUID,
  delivery_assignment_id UUID,
  rating SMALLINT,
  comment TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT cr.id,
         cr.courier_id,
         cr.reviewer_id,
         cr.reviewer_role,
         COALESCE(NULLIF(BTRIM(p.full_name), ''),
                  CASE WHEN cr.reviewer_role = 'merchant' THEN 'تاجر' ELSE 'زبون' END),
         cr.order_id,
         cr.delivery_assignment_id,
         cr.rating,
         cr.comment,
         cr.created_at
  FROM public.courier_reviews cr
  LEFT JOIN public.profiles p ON p.id = cr.reviewer_id
  WHERE cr.courier_id = p_courier_id
  ORDER BY cr.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.submit_courier_review(
  p_courier_id UUID,
  p_order_id UUID,
  p_rating SMALLINT,
  p_comment TEXT DEFAULT NULL
)
RETURNS public.courier_reviews
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_assignment public.delivery_assignments%ROWTYPE;
  v_store_merchant UUID;
  v_review public.courier_reviews;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول لإضافة تقييم' USING ERRCODE = '42501';
  END IF;
  IF p_rating IS NULL OR p_rating < 1 OR p_rating > 5 THEN
    RAISE EXCEPTION 'التقييم يجب أن يكون بين 1 و5' USING ERRCODE = '22023';
  END IF;

  SELECT p.role INTO v_role FROM public.profiles p WHERE p.id = auth.uid();
  IF v_role NOT IN ('customer', 'merchant') THEN
    RAISE EXCEPTION 'هذا الدور غير مؤهل لإضافة تقييم' USING ERRCODE = '42501';
  END IF;

  SELECT da.* INTO v_assignment
  FROM public.delivery_assignments da
  JOIN public.orders o ON o.id = da.order_id
  JOIN public.stores s ON s.id = o.store_id
  WHERE o.id = p_order_id
    AND da.driver_id = p_courier_id
    AND o.status = 'delivered'
    AND da.status = 'delivered'
    AND (
      (v_role = 'customer' AND o.customer_id = auth.uid())
      OR (v_role = 'merchant' AND s.merchant_id = auth.uid())
    )
  LIMIT 1;

  IF v_assignment.id IS NULL THEN
    RAISE EXCEPTION 'لا توجد عملية مكتملة مؤهلة لهذا التقييم' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.courier_reviews (
    courier_id, reviewer_id, reviewer_role, order_id,
    delivery_assignment_id, rating, comment
  )
  VALUES (
    p_courier_id, auth.uid(), v_role, p_order_id,
    v_assignment.id, p_rating, NULLIF(BTRIM(p_comment), '')
  )
  RETURNING * INTO v_review;

  RETURN v_review;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'لقد قيّمت هذه العملية من قبل' USING ERRCODE = '23505';
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_courier_review(p_review_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.get_user_role(auth.uid()) NOT IN ('founder', 'admin') THEN
    RAISE EXCEPTION 'ليس لديك صلاحية حذف التقييم' USING ERRCODE = '42501';
  END IF;
  DELETE FROM public.courier_reviews WHERE id = p_review_id;
  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_courier_review_eligibility(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_courier_reviews(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_courier_review(UUID, UUID, SMALLINT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_courier_review(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.refresh_driver_review_summary(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_courier_review_summary() FROM PUBLIC, anon, authenticated;
