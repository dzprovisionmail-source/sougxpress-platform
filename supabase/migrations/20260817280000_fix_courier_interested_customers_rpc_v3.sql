-- Fix the RPC to ensure ANY user (customer or merchant) who favorited the courier shows up.
-- We join with profiles to get the identity data.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_courier_interested_customers(p_courier_id UUID)
RETURNS TABLE (
    id UUID,
    customer_id UUID,
    created_at TIMESTAMPTZ,
    full_name TEXT,
    avatar_url TEXT,
    neighborhood TEXT,
    role TEXT
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
        COALESCE(p.full_name, 'مستخدم جديد') as full_name,
        COALESCE(c.avatar_url, m.logo_url) as avatar_url,
        COALESCE(c.neighborhood, m.city) as neighborhood,
        p.role
    FROM public.favorite_couriers fc
    JOIN public.profiles p ON p.id = fc.user_id
    LEFT JOIN public.customers c ON c.id = fc.user_id
    LEFT JOIN public.merchants m ON m.user_id = fc.user_id
    WHERE fc.courier_id = p_courier_id;
$$;

COMMIT;
