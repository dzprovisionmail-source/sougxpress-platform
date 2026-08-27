-- Fix driver self-update RLS without changing driver ownership.
-- Local-only for review; do not deploy automatically.

DROP POLICY IF EXISTS rls_update_drivers ON public.drivers;

CREATE POLICY rls_update_drivers ON public.drivers
    FOR UPDATE
    USING (
        id = auth.uid()
        OR public.get_user_role(auth.uid()) IN ('admin', 'founder')
    )
    WITH CHECK (
        public.get_user_role(auth.uid()) IN ('admin', 'founder')
        OR (
            id = auth.uid()
            AND status = (
                SELECT current_driver.status
                FROM public.drivers AS current_driver
                WHERE current_driver.id = auth.uid()
                LIMIT 1
            )
        )
    );

COMMENT ON POLICY rls_update_drivers ON public.drivers IS
  'Drivers may update their own profile fields without changing ownership or administrative status; admins/founders may update valid driver statuses.';
