-- Migration: 018_profile_role_immutability.sql
-- Purpose: Profile Role Immutability — make role fully immutable for all users
--          after profile creation. Only admin/founder may assign roles.
--          This is an incremental, non-destructive migration.
--          Do NOT modify previous migrations (001-017).

-- =============================================================================
-- Part 1: Replace profiles RLS policies — enforce role immutability
-- =============================================================================

-- Drop existing policies from migration 017 to replace them
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
--         but only with role 'customer', 'merchant', or 'driver'.
--         admin and founder are BLOCKED at insert time.
CREATE POLICY rls_insert_profiles ON public.profiles
    FOR INSERT WITH CHECK (
        id = auth.uid()
        AND auth.uid() IS NOT NULL
        AND role IN ('customer', 'merchant', 'driver')
    );

-- UPDATE: users can update their own profile's non-role fields,
--         but the role is IMMUTABLE — no user can change their own role.
--         Only admin/founder can assign roles to anyone.
CREATE POLICY rls_update_profiles ON public.profiles
    FOR UPDATE USING (
        id = auth.uid()
        OR public.get_user_role(auth.uid()) IN ('admin', 'founder')
    )
    WITH CHECK (
        CASE
            -- admin/founder can assign any approved role
            WHEN public.get_user_role(auth.uid()) IN ('admin', 'founder')
            THEN role IN ('customer', 'merchant', 'driver', 'admin', 'founder')
            -- All other users: role MUST NOT change from its current value
            -- The role column must equal the old value (immutability)
            ELSE role = (SELECT OLD.role FROM public.profiles OLD WHERE OLD.id = id LIMIT 1)
        END
    );
