-- ============================================================================
-- Fix Drivers SELECT RLS Policy: Soug-XPRESS
-- Allow authenticated users (customers, merchants, couriers) to view active drivers
-- so order assignments and courier profiles can be fetched correctly.
-- ============================================================================

DROP POLICY IF EXISTS "rls_select_drivers" ON public.drivers;

CREATE POLICY "rls_select_drivers" ON public.drivers
FOR SELECT
USING (
    auth.uid() IS NOT NULL
);
