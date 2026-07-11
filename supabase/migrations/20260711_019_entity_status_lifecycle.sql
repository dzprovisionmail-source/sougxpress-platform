-- Migration: 019_entity_status_lifecycle.sql
-- Purpose: Entity Status Lifecycle — add controlled status fields to
--          customers, merchants, stores, products, and drivers.
--          Prevent unauthorized status changes through RLS.
--          This is an incremental, non-destructive migration.
--          Do NOT modify previous migrations (001-018).

-- =============================================================================
-- Part 1: Add status columns with defaults and CHECK constraints
-- =============================================================================

-- Customers: active, suspended, blocked
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE public.customers ADD CONSTRAINT customers_status_check
    CHECK (status IN ('active', 'suspended', 'blocked'));

-- Merchants: pending, active, suspended, rejected
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE public.merchants ADD CONSTRAINT merchants_status_check
    CHECK (status IN ('pending', 'active', 'suspended', 'rejected'));

-- Stores: pending, active, paused, suspended, closed
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE public.stores ADD CONSTRAINT stores_status_check
    CHECK (status IN ('pending', 'active', 'paused', 'suspended', 'closed'));

-- Products: draft, active, out_of_stock, hidden, archived
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE public.products ADD CONSTRAINT products_status_check
    CHECK (status IN ('draft', 'active', 'out_of_stock', 'hidden', 'archived'));

-- Drivers: pending, active, suspended
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE public.drivers ADD CONSTRAINT drivers_status_check
    CHECK (status IN ('pending', 'active', 'suspended'));

-- =============================================================================
-- Part 2: Add indexes on status columns
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_customers_status ON public.customers(status);
CREATE INDEX IF NOT EXISTS idx_merchants_status ON public.merchants(status);
CREATE INDEX IF NOT EXISTS idx_stores_status ON public.stores(status);
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(status);
CREATE INDEX IF NOT EXISTS idx_drivers_status ON public.drivers(status);

-- =============================================================================
-- Part 3: Status change trigger — log all status transitions to audit_logs
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_entity_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status <> OLD.status THEN
        INSERT INTO public.audit_logs (user_id, event_type, table_name, record_id, old_data, new_data)
        VALUES (
            auth.uid(),
            'status_change',
            TG_TABLE_NAME,
            NEW.id,
            jsonb_build_object('status', OLD.status),
            jsonb_build_object('status', NEW.status)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_customers_status_change
    AFTER UPDATE ON public.customers
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION public.handle_entity_status_change();

CREATE TRIGGER trg_merchants_status_change
    AFTER UPDATE ON public.merchants
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION public.handle_entity_status_change();

CREATE TRIGGER trg_stores_status_change
    AFTER UPDATE ON public.stores
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION public.handle_entity_status_change();

CREATE TRIGGER trg_products_status_change
    AFTER UPDATE ON public.products
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION public.handle_entity_status_change();

CREATE TRIGGER trg_drivers_status_change
    AFTER UPDATE ON public.drivers
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION public.handle_entity_status_change();

-- =============================================================================
-- Part 4: Replace UPDATE policies — enforce controlled status changes
-- =============================================================================

-- -----------------------------------------------------------------------------
-- CUSTOMERS: Only admin/founder may change customer administrative status.
-- Customers can update their own non-status profile fields.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS rls_update_customers ON public.customers;

CREATE POLICY rls_update_customers ON public.customers
    FOR UPDATE USING (
        -- Owner can update their own row
        id = auth.uid()
        -- Admin/founder can update any row
        OR public.get_user_role(auth.uid()) IN ('admin', 'founder')
    )
    WITH CHECK (
        -- Admin/founder can set any status
        -- Non-admin/founder: status MUST NOT change from current value
        CASE
            WHEN public.get_user_role(auth.uid()) IN ('admin', 'founder')
            THEN status IN ('active', 'suspended', 'blocked')
            ELSE status = (SELECT OLD.status FROM public.customers OLD WHERE OLD.id = id LIMIT 1)
        END
    );

-- -----------------------------------------------------------------------------
-- MERCHANTS: Only admin/founder may change merchant administrative status.
-- Merchants can update their own non-status business fields.
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
-- STORES: Merchants may pause/reactivate their own stores (active <-> paused).
-- Admin/founder retain full status control.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS rls_update_stores ON public.stores;

CREATE POLICY rls_update_stores ON public.stores
    FOR UPDATE USING (
        merchant_id = auth.uid()
        OR public.get_user_role(auth.uid()) IN ('admin', 'founder')
    )
    WITH CHECK (
        CASE
            -- Admin/founder can set any store status
            WHEN public.get_user_role(auth.uid()) IN ('admin', 'founder')
            THEN status IN ('pending', 'active', 'paused', 'suspended', 'closed')
            -- Merchant can only toggle between active and paused for their own stores
            ELSE (
                (merchant_id = auth.uid())
                AND status IN ('active', 'paused')
                AND (status = 'active' OR status = 'paused')
            )
        END
    );

-- -----------------------------------------------------------------------------
-- PRODUCTS: Merchants may manage their own product status (draft, active,
-- out_of_stock, hidden, archived). Admin/founder retain full control.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS rls_update_products ON public.products;

CREATE POLICY rls_update_products ON public.products
    FOR UPDATE USING (
        store_id IN (SELECT id FROM public.stores WHERE merchant_id = auth.uid())
        OR public.get_user_role(auth.uid()) IN ('admin', 'founder')
    )
    WITH CHECK (
        CASE
            -- Admin/founder can set any product status
            WHEN public.get_user_role(auth.uid()) IN ('admin', 'founder')
            THEN status IN ('draft', 'active', 'out_of_stock', 'hidden', 'archived')
            -- Merchant can manage all product statuses for their own products
            ELSE (
                store_id IN (SELECT id FROM public.stores WHERE merchant_id = auth.uid())
                AND status IN ('draft', 'active', 'out_of_stock', 'hidden', 'archived')
            )
        END
    );

-- -----------------------------------------------------------------------------
-- DRIVERS: Only admin/founder may change driver administrative status.
-- Drivers can update their own non-status fields (location, vehicle, etc.).
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
