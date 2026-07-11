-- Migration: 017_profile_role_security.sql
-- Purpose: Profile Role Security — harden get_user_role() and profiles RLS
--          to prevent privilege escalation.
--          This is an incremental, non-destructive migration.
--          Do NOT modify previous migrations (001-016).

-- =============================================================================
-- Part 1: Update get_user_role() to return NULL for anonymous or missing profile
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
    -- Anonymous user (auth.uid() returns NULL)
    IF user_id IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT p.role INTO v_role
    FROM public.profiles p
    WHERE p.id = user_id;

    IF v_role IS NULL THEN
        RETURN NULL;
    END IF;

    RETURN v_role;
END;
$$;

-- =============================================================================
-- Part 2: Replace profiles RLS policies — tighten INSERT and UPDATE
-- =============================================================================

-- Drop existing policies from migration 016 to replace them
DROP POLICY IF EXISTS rls_select_profiles ON public.profiles;
DROP POLICY IF EXISTS rls_insert_profiles ON public.profiles;
DROP POLICY IF EXISTS rls_update_profiles ON public.profiles;

-- SELECT: users can read their own profile; admin/founder can read all
CREATE POLICY rls_select_profiles ON public.profiles
    FOR SELECT USING (
        id = auth.uid()
        OR public.get_user_role(auth.uid()) IN ('admin', 'founder')
    );

-- INSERT: any authenticated user can insert their own profile,
--         but they CANNOT insert with role 'admin' or 'founder'.
--         This prevents privilege escalation at creation time.
CREATE POLICY rls_insert_profiles ON public.profiles
    FOR INSERT WITH CHECK (
        id = auth.uid()
        AND auth.uid() IS NOT NULL
        AND role NOT IN ('admin', 'founder')
    );

-- UPDATE: users can update their own profile, but they CANNOT change
--         their role to 'admin' or 'founder'. Only admin/founder can
--         assign those roles to anyone (including themselves).
CREATE POLICY rls_update_profiles ON public.profiles
    FOR UPDATE USING (
        id = auth.uid()
        OR public.get_user_role(auth.uid()) IN ('admin', 'founder')
    )
    WITH CHECK (
        CASE
            -- If the updater is admin/founder, they can set any role
            WHEN public.get_user_role(auth.uid()) IN ('admin', 'founder')
            THEN role IN ('customer', 'merchant', 'driver', 'admin', 'founder')
            -- If the updater is NOT admin/founder, they can only change
            -- non-sensitive fields — role must stay in {customer, merchant, driver}
            ELSE role IN ('customer', 'merchant', 'driver')
        END
    );
