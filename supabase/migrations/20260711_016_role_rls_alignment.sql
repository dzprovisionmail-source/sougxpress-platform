-- Migration: 016_role_rls_alignment.sql
-- Purpose: Role & RLS Alignment — make public.profiles.role the single
--          authorization source, update get_user_role(), and correct RLS
--          role checks where required.
--          This is an incremental, non-destructive migration.
--          Do NOT modify previous migrations (001-015).

-- =============================================================================
-- Part 1: Create public.profiles as the single authorization source
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
    id      UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role    TEXT NOT NULL DEFAULT 'customer'
        CHECK (role IN ('customer', 'merchant', 'driver', 'admin', 'founder')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Trigger to auto-update updated_at on profiles
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- Part 2: Update get_user_role(auth.uid()) to read from public.profiles
-- The function now reads from public.profiles.role as the single source of truth.
-- Falls back to 'customer' if no profile exists (safe default).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_role TEXT;
BEGIN
    SELECT p.role INTO v_role
    FROM public.profiles p
    WHERE p.id = user_id;

    IF v_role IS NULL THEN
        -- No profile found: default to customer for safety
        -- Anonymous users (auth.uid() returns NULL) also get 'customer'
        -- but RLS policies will block them because id = auth.uid() fails
        RETURN 'customer';
    END IF;

    RETURN v_role;
END;
$$;

-- =============================================================================
-- Part 3: Enable RLS on public.profiles
-- =============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY rls_select_profiles ON public.profiles
    FOR SELECT USING (id = auth.uid() OR public.get_user_role(auth.uid()) IN ('admin', 'founder'));

-- Users can insert their own profile
CREATE POLICY rls_insert_profiles ON public.profiles
    FOR INSERT WITH CHECK (id = auth.uid());

-- Users can update their own profile; admin/founder can update any
-- Only admin/founder can set admin or founder roles
CREATE POLICY rls_update_profiles ON public.profiles
    FOR UPDATE USING (id = auth.uid() OR public.get_user_role(auth.uid()) IN ('admin', 'founder'))
    WITH CHECK (
        public.get_user_role(auth.uid()) IN ('admin', 'founder')
    );

-- =============================================================================
-- Part 4: Correct RLS role checks where required
-- All existing policies in migration 012 already use get_user_role() correctly.
-- The only correction needed is to add anonymous protection where get_user_role
-- is called but auth.uid() could be NULL. In the current implementation,
-- get_user_role(NULL) returns 'customer', but 'customer' does NOT have
-- admin/founder access, so these policies are safe.
--
-- However, some policies need to explicitly block anonymous access on INSERT/UPDATE/DELETE
-- where auth.uid() could match NULL on identity columns.
-- =============================================================================

-- Ensure customers INSERT requires a real authenticated user (not anonymous)
DROP POLICY IF EXISTS rls_insert_customers ON public.customers;
CREATE POLICY rls_insert_customers ON public.customers
    FOR INSERT WITH CHECK (id = auth.uid() AND auth.uid() IS NOT NULL);

-- Ensure merchants INSERT requires a real authenticated user
DROP POLICY IF EXISTS rls_insert_merchants ON public.merchants;
CREATE POLICY rls_insert_merchants ON public.merchants
    FOR INSERT WITH CHECK (id = auth.uid() AND auth.uid() IS NOT NULL);

-- Ensure drivers INSERT requires a real authenticated user
DROP POLICY IF EXISTS rls_insert_drivers ON public.drivers;
CREATE POLICY rls_insert_drivers ON public.drivers
    FOR INSERT WITH CHECK (id = auth.uid() AND auth.uid() IS NOT NULL);

-- Ensure orders INSERT requires a real authenticated customer
DROP POLICY IF EXISTS rls_insert_orders ON public.orders;
CREATE POLICY rls_insert_orders ON public.orders
    FOR INSERT WITH CHECK (customer_id = auth.uid() AND auth.uid() IS NOT NULL);

-- Ensure customer_addresses INSERT requires a real authenticated user
DROP POLICY IF EXISTS rls_insert_customer_addresses ON public.customer_addresses;
CREATE POLICY rls_insert_customer_addresses ON public.customer_addresses
    FOR INSERT WITH CHECK (customer_id = auth.uid() AND auth.uid() IS NOT NULL);

-- Ensure delivery_assignments INSERT requires admin/founder (already correct, but add NULL guard)
DROP POLICY IF EXISTS rls_insert_delivery_assignments ON public.delivery_assignments;
CREATE POLICY rls_insert_delivery_assignments ON public.delivery_assignments
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND public.get_user_role(auth.uid()) IN ('admin', 'founder'));

-- Ensure disputes INSERT requires a real authenticated customer
DROP POLICY IF EXISTS rls_insert_disputes ON public.disputes;
CREATE POLICY rls_insert_disputes ON public.disputes
    FOR INSERT WITH CHECK (customer_id = auth.uid() AND auth.uid() IS NOT NULL);

-- Ensure promotion_redemptions INSERT requires a real authenticated user
DROP POLICY IF EXISTS rls_insert_promotion_redemptions ON public.promotion_redemptions;
CREATE POLICY rls_insert_promotion_redemptions ON public.promotion_redemptions
    FOR INSERT WITH CHECK (user_id = auth.uid() AND auth.uid() IS NOT NULL);
