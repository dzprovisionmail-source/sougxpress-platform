BEGIN;

-- Return the best available real identity for courier favorite cards.
-- Do not manufacture a generic "new user" name in the data layer; the mobile
-- display helper owns role-based fallbacks when every real source is empty.
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
        fc.user_id AS customer_id,
        fc.created_at,
        NULLIF(
            COALESCE(
                NULLIF(BTRIM(p.full_name), ''),
                NULLIF(BTRIM(c.full_name), ''),
                NULLIF(BTRIM(CONCAT_WS(' ', c.first_name, c.last_name)), ''),
                NULLIF(BTRIM(m.owner_full_name), ''),
                NULLIF(BTRIM(m.business_name), '')
            ),
            ''
        ) AS full_name,
        COALESCE(c.avatar_url, m.logo_url) AS avatar_url,
        COALESCE(c.neighborhood, m.address) AS neighborhood,
        p.role
    FROM public.favorite_couriers fc
    JOIN public.profiles p ON p.id = fc.user_id
    LEFT JOIN public.customers c ON c.id = fc.user_id
    LEFT JOIN public.merchants m ON m.id = fc.user_id
    WHERE fc.courier_id = p_courier_id;
$$;

REVOKE ALL ON FUNCTION public.get_courier_interested_customers(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_courier_interested_customers(UUID) TO authenticated;
NOTIFY pgrst, 'reload schema';

COMMIT;
