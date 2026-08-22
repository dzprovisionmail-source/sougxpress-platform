CREATE OR REPLACE FUNCTION public.get_store_order_count(p_store_id UUID)
RETURNS INTEGER
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.orders
  WHERE store_id = p_store_id
    AND status NOT IN ('cancelled', 'rejected');
$$;

REVOKE ALL ON FUNCTION public.get_store_order_count(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_store_order_count(UUID) TO authenticated;
