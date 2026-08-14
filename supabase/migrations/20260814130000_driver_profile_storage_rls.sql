-- Driver-owned profile and vehicle images in the existing avatars bucket.

DROP POLICY IF EXISTS "drivers_insert_own_profile_images" ON storage.objects;
CREATE POLICY "drivers_insert_own_profile_images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND EXISTS (SELECT 1 FROM public.drivers d WHERE d.id = auth.uid())
  AND (
    name LIKE 'driver_avatars/' || auth.uid()::text || '%'
    OR name LIKE 'driver_vehicles/' || auth.uid()::text || '%'
  )
);

DROP POLICY IF EXISTS "drivers_update_own_profile_images" ON storage.objects;
CREATE POLICY "drivers_update_own_profile_images"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars'
  AND EXISTS (SELECT 1 FROM public.drivers d WHERE d.id = auth.uid())
  AND (
    name LIKE 'driver_avatars/' || auth.uid()::text || '%'
    OR name LIKE 'driver_vehicles/' || auth.uid()::text || '%'
  )
)
WITH CHECK (
  bucket_id = 'avatars'
  AND EXISTS (SELECT 1 FROM public.drivers d WHERE d.id = auth.uid())
  AND (
    name LIKE 'driver_avatars/' || auth.uid()::text || '%'
    OR name LIKE 'driver_vehicles/' || auth.uid()::text || '%'
  )
);

DROP POLICY IF EXISTS "drivers_delete_own_profile_images" ON storage.objects;
CREATE POLICY "drivers_delete_own_profile_images"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars'
  AND EXISTS (SELECT 1 FROM public.drivers d WHERE d.id = auth.uid())
  AND (
    name LIKE 'driver_avatars/' || auth.uid()::text || '%'
    OR name LIKE 'driver_vehicles/' || auth.uid()::text || '%'
  )
);
