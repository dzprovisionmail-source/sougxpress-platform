SELECT fc.*, p.full_name, p.role
FROM public.favorite_couriers fc
JOIN public.profiles p ON p.id = fc.user_id
WHERE fc.courier_id = '4570e2c4-c7eb-4688-9e52-840b53357553';
