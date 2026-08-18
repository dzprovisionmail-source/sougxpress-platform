-- 1. Check if driver favorites are in the wrong table
SELECT * FROM public.customer_favorites 
WHERE customer_id = (SELECT id FROM public.profiles WHERE role = 'driver' ORDER BY updated_at DESC LIMIT 1);

-- 2. Check who favorited this driver
SELECT * FROM public.favorite_couriers 
WHERE courier_id = (SELECT id FROM public.profiles WHERE role = 'driver' ORDER BY updated_at DESC LIMIT 1);

-- 3. Test the RPC for this driver
SELECT * FROM get_courier_interested_customers(
    (SELECT id FROM public.profiles WHERE role = 'driver' ORDER BY updated_at DESC LIMIT 1)
);

-- 4. Check courier_favorites table
SELECT * FROM public.courier_favorites
WHERE courier_id = (SELECT id FROM public.profiles WHERE role = 'driver' ORDER BY updated_at DESC LIMIT 1);
