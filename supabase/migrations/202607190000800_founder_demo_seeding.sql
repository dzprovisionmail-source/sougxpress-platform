-- Migration: 029_founder_demo_seeding.sql
-- Purpose: Add is_demo / created_by markers and founder INSERT policy for demo seeding.
--           Normal public registration RLS is NOT changed.
--
-- Scope:
--   - stores      : add is_demo, created_by, deleted_at, admin_notes
--                   add admin/founder INSERT policy (merchants keep existing self-insert)
--   - merchants   : add is_demo
--   - drivers     : add is_demo
--   - customers   : add is_demo
--
-- Demo flag is internal. Public SELECT on stores/customers/drivers/merchants
-- remains open so demo records appear as normal marketplace entities.

BEGIN;

-- ============================================================================
-- 1. stores — add demo + audit columns
-- ============================================================================

ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS is_demo     BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS created_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS deleted_at   TIMESTAMPTZ;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS admin_notes  TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS description TEXT;

CREATE INDEX IF NOT EXISTS idx_stores_is_demo   ON public.stores(is_demo);
CREATE INDEX IF NOT EXISTS idx_stores_created_by ON public.stores(created_by);

-- ============================================================================
-- 2. merchants — add is_demo
-- ============================================================================

ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_merchants_is_demo ON public.merchants(is_demo);

-- ============================================================================
-- 3. drivers — add is_demo
-- ============================================================================

ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_drivers_is_demo ON public.drivers(is_demo);

-- ============================================================================
-- 4. customers — add is_demo
-- ============================================================================

ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_customers_is_demo ON public.customers(is_demo);

-- ============================================================================
-- 5. RLS — allow admin/founder to INSERT stores (demo seeding)
--    Existing merchant self-insert is preserved.
-- ============================================================================

DROP POLICY IF EXISTS rls_insert_stores ON public.stores;

CREATE POLICY rls_insert_stores ON public.stores
    FOR INSERT WITH CHECK (
        merchant_id = auth.uid()
        OR public.get_user_role(auth.uid()) IN ('admin', 'founder')
    );

COMMIT;
