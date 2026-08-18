-- Fix the RPC to ensure customers who haven't filled their profile yet still show up for the courier.
-- We join with profiles to get the name and avatar, and left join with customers for location data.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_courier_interested_customers(p_courier_id UUID)
RETURNS TABLE (
    id UUID,
    customer_id UUID,
    created_at TIMESTAMPTZ,
    full_name TEXT,
    avatar_url TEXT,
    neighborhood TEXT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT 
        fc.id,
        fc.user_id as customer_id,
        fc.created_at,
        COALESCE(p.full_name, 'زبون جديد') as full_name,
        p.avatar_url,
        c.neighborhood
    FROM public.favorite_couriers fc
    JOIN public.profiles p ON p.id = fc.user_id
    LEFT JOIN public.customers c ON c.id = fc.user_id
    WHERE fc.courier_id = p_courier_id;
$$;

COMMIT;
