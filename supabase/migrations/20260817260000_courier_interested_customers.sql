-- Allow couriers to view favorite records where they are the target courier
CREATE POLICY "Couriers can view who favorited them"
  ON public.favorite_couriers
  FOR SELECT
  TO authenticated
  USING (courier_id = auth.uid());

-- Security definer function to get customers who favorited a courier (excluding phone number for privacy)
CREATE OR REPLACE FUNCTION public.get_courier_interested_customers(p_courier_id uuid)
RETURNS TABLE (
  id uuid,
  customer_id uuid,
  created_at timestamptz,
  full_name text,
  avatar_url text,
  neighborhood text
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fc.id,
    fc.user_id AS customer_id,
    fc.created_at,
    c.full_name,
    c.avatar_url,
    c.neighborhood
  FROM public.favorite_couriers fc
  JOIN public.customers c ON c.id = fc.user_id
  WHERE fc.courier_id = p_courier_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_courier_interested_customers(uuid) TO authenticated;
