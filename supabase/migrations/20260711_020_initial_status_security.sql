-- Migration: 020_initial_status_security.sql
-- Purpose: Enforce secure initial statuses on INSERT for all entity tables.
--          Prevent users from bypassing secure defaults during creation.
--          Only admin/founder may create non-default initial statuses.
--          This is an incremental, non-destructive migration.
--          Do NOT modify previous migrations (001-019).

-- =============================================================================
-- Secure initial status defaults:
--   customers  : active   (customer self-registers as active)
--   merchants  : pending  (must be approved by admin/founder)
--   stores     : pending  (must be approved by admin/founder)
--   products   : draft    (merchant creates in draft, approves to active)
--   drivers    : pending  (must be approved by admin/founder)
-- =============================================================================

-- =============================================================================
-- Part 1: Replace INSERT policies — enforce secure initial statuses
-- =============================================================================

-- -----------------------------------------------------------------------------
-- CUSTOMERS: Self-registration defaults to 'active'.
-- Customer may only insert with status = 'active'.
-- Admin/founder may insert with any valid status.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS rls_insert_customers ON public.customers;

CREATE POLICY rls_insert_customers ON public.customers
    FOR INSERT WITH CHECK (
        CASE
            -- Admin/founder can insert with any valid status
            WHEN public.get_user_role(auth.uid()) IN ('admin', 'founder')
            THEN status IN ('active', 'suspended', 'blocked')
            -- Customer self-registration: must be 'active', and must be their own id
            ELSE (status = 'active' AND id = auth.uid())
        END
    );

-- -----------------------------------------------------------------------------
-- MERCHANTS: New merchants must start as 'pending'.
-- Only admin/founder may insert a merchant directly as 'active'.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS rls_insert_merchants ON public.merchants;

CREATE POLICY rls_insert_merchants ON public.merchants
    FOR INSERT WITH CHECK (
        CASE
            -- Admin/founder may insert with any valid status
            WHEN public.get_user_role(auth.uid()) IN ('admin', 'founder')
            THEN status IN ('pending', 'active', 'suspended', 'rejected')
            -- Merchant self-registration: must start as 'pending'
            ELSE (status = 'pending' AND id = auth.uid())
        END
    );

-- -----------------------------------------------------------------------------
-- STORES: New stores must start as 'pending'.
-- Admin/founder may insert directly as 'active'.
-- Merchant can insert for their own stores only, always 'pending'.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS rls_insert_stores ON public.stores;

CREATE POLICY rls_insert_stores ON public.stores
    FOR INSERT WITH CHECK (
        CASE
            -- Admin/founder may insert with any valid status
            WHEN public.get_user_role(auth.uid()) IN ('admin', 'founder')
            THEN status IN ('pending', 'active', 'paused', 'suspended', 'closed')
            -- Merchant can only insert their own stores as 'pending'
            ELSE (merchant_id = auth.uid() AND status = 'pending')
        END
    );

-- -----------------------------------------------------------------------------
-- PRODUCTS: New products must start as 'draft'.
-- Merchant may insert for their own stores, always 'draft'.
-- Admin/founder may insert with any valid status.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS rls_insert_products ON public.products;

CREATE POLICY rls_insert_products ON public.products
    FOR INSERT WITH CHECK (
        CASE
            -- Admin/founder may insert with any valid status
            WHEN public.get_user_role(auth.uid()) IN ('admin', 'founder')
            THEN status IN ('draft', 'active', 'out_of_stock', 'hidden', 'archived')
            -- Merchant can only insert 'draft' products for their own stores
            ELSE (
                store_id IN (SELECT id FROM public.stores WHERE merchant_id = auth.uid())
                AND status = 'draft'
            )
        END
    );

-- -----------------------------------------------------------------------------
-- DRIVERS: New drivers must start as 'pending'.
-- Driver self-registration must be 'pending'.
-- Admin/founder may insert with any valid status.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS rls_insert_drivers ON public.drivers;

CREATE POLICY rls_insert_drivers ON public.drivers
    FOR INSERT WITH CHECK (
        CASE
            -- Admin/founder may insert with any valid status
            WHEN public.get_user_role(auth.uid()) IN ('admin', 'founder')
            THEN status IN ('pending', 'active', 'suspended')
            -- Driver self-registration: must start as 'pending'
            ELSE (status = 'pending' AND id = auth.uid())
        END
    );

-- =============================================================================
-- Part 2: Replace UPDATE policies — combine with migration 019 security
--          These policies merge the migration 019 UPDATE restrictions with
--          the new INSERT defaults. An UPDATE cannot change status from the
--          secure default unless the user has admin/founder role.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- CUSTOMERS UPDATE: Preserve migration 019 logic.
-- Admin/founder can set any valid status.
-- Customer can update own row but status MUST NOT change.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS rls_update_customers ON public.customers;

CREATE POLICY rls_update_customers ON public.customers
    FOR UPDATE USING (
        id = auth.uid()
        OR public.get_user_role(auth.uid()) IN ('admin', 'founder')
    )
    WITH CHECK (
        CASE
            WHEN public.get_user_role(auth.uid()) IN ('admin', 'founder')
            THEN status IN ('active', 'suspended', 'blocked')
            ELSE status = (SELECT OLD.status FROM public.customers OLD WHERE OLD.id = id LIMIT 1)
        END
    );

-- -----------------------------------------------------------------------------
-- MERCHANTS UPDATE: Preserve migration 019 logic.
-- Admin/founder can change status freely.
-- Merchant can update own non-status fields only.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS rls_update_merchants ON public.merchants;

CREATE POLICY rls_update_merchants ON public.merchants
    FOR UPDATE USING (
        id = auth.uid()
        OR public.get_user_role(auth.uid()) IN ('admin', 'founder')
    )
    WITH CHECK (
        CASE
            WHEN public.get_user_role(auth.uid()) IN ('admin', 'founder')
            THEN status IN ('pending', 'active', 'suspended', 'rejected')
            ELSE status = (SELECT OLD.status FROM public.merchants OLD WHERE OLD.id = id LIMIT 1)
        END
    );

-- -----------------------------------------------------------------------------
-- STORES UPDATE: Preserve migration 019 logic.
-- Admin/founder can set any store status.
-- Merchant can only toggle active <-> paused for own stores.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS rls_update_stores ON public.stores;

CREATE POLICY rls_update_stores ON public.stores
    FOR UPDATE USING (
        merchant_id = auth.uid()
        OR public.get_user_role(auth.uid()) IN ('admin', 'founder')
    )
    WITH CHECK (
        CASE
            WHEN public.get_user_role(auth.uid()) IN ('admin', 'founder')
            THEN status IN ('pending', 'active', 'paused', 'suspended', 'closed')
            ELSE (
                (merchant_id = auth.uid())
                AND status IN ('active', 'paused')
                AND (status = 'active' OR status = 'paused')
            )
        END
    );

-- -----------------------------------------------------------------------------
-- PRODUCTS UPDATE: Preserve migration 019 logic.
-- Admin/founder can set any product status.
-- Merchant can manage all product statuses for own products.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS rls_update_products ON public.products;

CREATE POLICY rls_update_products ON public.products
    FOR UPDATE USING (
        store_id IN (SELECT id FROM public.stores WHERE merchant_id = auth.uid())
        OR public.get_user_role(auth.uid()) IN ('admin', 'founder')
    )
    WITH CHECK (
        CASE
            WHEN public.get_user_role(auth.uid()) IN ('admin', 'founder')
            THEN status IN ('draft', 'active', 'out_of_stock', 'hidden', 'archived')
            ELSE (
                store_id IN (SELECT id FROM public.stores WHERE merchant_id = auth.uid())
                AND status IN ('draft', 'active', 'out_of_stock', 'hidden', 'archived')
            )
        END
    );

-- -----------------------------------------------------------------------------
-- DRIVERS UPDATE: Preserve migration 019 logic.
-- Admin/founder can set any valid driver status.
-- Driver can update own row but status MUST NOT change.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS rls_update_drivers ON public.drivers;

CREATE POLICY rls_update_drivers ON public.drivers
    FOR UPDATE USING (
        id = auth.uid()
        OR public.get_user_role(auth.uid()) IN ('admin', 'founder')
    )
    WITH CHECK (
        CASE
            WHEN public.get_user_role(auth.uid()) IN ('admin', 'founder')
            THEN status IN ('pending', 'active', 'suspended')
            ELSE status = (SELECT OLD.status FROM public.drivers OLD WHERE OLD.id = id LIMIT 1)
        END
    );

-- =============================================================================
-- Part 3: Replace SELECT policies — add status visibility
-- =============================================================================

-- -----------------------------------------------------------------------------
-- CUSTOMERS SELECT: Preserve existing visibility.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS rls_select_customers ON public.customers;

CREATE POLICY rls_select_customers ON public.customers
    FOR SELECT USING (
        id = auth.uid()
        OR public.get_user_role(auth.uid()) IN ('admin', 'founder')
    );

-- -----------------------------------------------------------------------------
-- MERCHANTS SELECT: Preserve existing visibility.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS rls_select_merchants ON public.merchants;

CREATE POLICY rls_select_merchants ON public.merchants
    FOR SELECT USING (TRUE);

-- -----------------------------------------------------------------------------
-- STORES SELECT: Preserve existing visibility.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS rls_select_stores ON public.stores;

CREATE POLICY rls_select_stores ON public.stores
    FOR SELECT USING (TRUE);

-- -----------------------------------------------------------------------------
-- PRODUCTS SELECT: Preserve existing visibility.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS rls_select_products ON public.products;

CREATE POLICY rls_select_products ON public.products
    FOR SELECT USING (TRUE);

-- -----------------------------------------------------------------------------
-- DRIVERS SELECT: Preserve existing visibility.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS rls_select_drivers ON public.drivers;

CREATE POLICY rls_select_drivers ON public.drivers
    FOR SELECT USING (
        id = auth.uid()
        OR public.get_user_role(auth.uid()) IN ('admin', 'founder')
    );

-- =============================================================================
-- Part 4: Replace DELETE policies — status-based deletion guard
-- =============================================================================

-- -----------------------------------------------------------------------------
-- CUSTOMERS DELETE: Only admin/founder may delete customers.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS rls_delete_customers ON public.customers;

CREATE POLICY rls_delete_customers ON public.customers
    FOR DELETE USING (
        public.get_user_role(auth.uid()) IN ('admin', 'founder')
    );

-- -----------------------------------------------------------------------------
-- MERCHANTS DELETE: Only admin/founder may delete merchants.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS rls_delete_merchants ON public.merchants;

CREATE POLICY rls_delete_merchants ON public.merchants
    FOR DELETE USING (
        public.get_user_role(auth.uid()) IN ('admin', 'founder')
    );

-- -----------------------------------------------------------------------------
-- STORES DELETE: Merchant may delete own pending/closed stores.
-- Admin/founder may delete any store.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS rls_delete_stores ON public.stores;

CREATE POLICY rls_delete_stores ON public.stores
    FOR DELETE USING (
        public.get_user_role(auth.uid()) IN ('admin', 'founder')
        OR (merchant_id = auth.uid() AND status IN ('pending', 'closed'))
    );

-- -----------------------------------------------------------------------------
-- PRODUCTS DELETE: Merchant may delete own draft/archived products.
-- Admin/founder may delete any product.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS rls_delete_products ON public.products;

CREATE POLICY rls_delete_products ON public.products
    FOR DELETE USING (
        public.get_user_role(auth.uid()) IN ('admin', 'founder')
        OR (store_id IN (SELECT id FROM public.stores WHERE merchant_id = auth.uid())
            AND status IN ('draft', 'archived'))
    );

-- -----------------------------------------------------------------------------
-- DRIVERS DELETE: Only admin/founder may delete drivers.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS rls_delete_drivers ON public.drivers;

CREATE POLICY rls_delete_drivers ON public.drivers
    FOR DELETE USING (
        public.get_user_role(auth.uid()) IN ('admin', 'founder')
    );
