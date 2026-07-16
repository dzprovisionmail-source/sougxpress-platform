-- Migration: 024_schema_drift_reconciliation.sql
-- Purpose: Reconcile column-name drift between V1 migrations (001-023) and V2 spec.
--          All changes are incremental, reversible, and non-destructive.
--          Do NOT modify previous migrations (001-023).
--
-- Fixes applied:
--   customers  : add full_name, phone, address (backfill from first_name/last_name/phone_number)
--   merchants  : add owner_full_name, phone, email, address, commission_rate
--              : status constraint — add 'pending_review'; migrate 'pending' records
--   drivers    : add full_name, phone, address, availability (backfill from is_available)
--              : status constraint — add 'pending_review', 'offline'; migrate 'pending' records
--   customer_addresses : add label, address_text (backfill from address_line1)
--   stores     : add opens_at, closes_at; status constraint — add 'draft'
--   profiles   : add full_name, email, phone (needed by admin Edge Function)
--   get_user_role()    : reinforce profiles-based lookup, return NULL for anonymous
--   RLS INSERT policies: allow 'pending_review' initial status for merchants/drivers
--   find_available_driver(): new function — auto-assign only online+active+same-zone drivers
--   driver_set_availability(): new function — drivers toggle own availability safely
--   platform_financial_settings: guarantee canonical business-rule constants

BEGIN;

-- ============================================================================
-- 1. customers — add full_name, phone, address
-- ============================================================================

ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS phone       TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS address     TEXT;

-- Backfill full_name from first_name + last_name
UPDATE public.customers
SET full_name = TRIM(
    COALESCE(first_name, '') ||
    CASE WHEN COALESCE(last_name, '') <> '' THEN ' ' || last_name ELSE '' END
)
WHERE full_name IS NULL;

UPDATE public.customers
SET full_name = 'مستخدم'
WHERE full_name IS NULL OR full_name = '';

-- Backfill phone from phone_number
UPDATE public.customers
SET phone = phone_number
WHERE phone IS NULL AND phone_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_customers_phone     ON public.customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_full_name ON public.customers(full_name);

-- ============================================================================
-- 2. merchants — add owner_full_name, phone, email, address, commission_rate
-- ============================================================================

ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS owner_full_name  TEXT;
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS phone            TEXT;
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS email            TEXT;
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS address          TEXT;
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS commission_rate  NUMERIC DEFAULT 0;

-- Backfill owner_full_name from business_name (best available approximation)
UPDATE public.merchants
SET owner_full_name = business_name
WHERE owner_full_name IS NULL;

-- Backfill phone from contact_phone
UPDATE public.merchants
SET phone = contact_phone
WHERE phone IS NULL AND contact_phone IS NOT NULL;

-- Backfill email from contact_email
UPDATE public.merchants
SET email = contact_email
WHERE email IS NULL AND contact_email IS NOT NULL;

-- Fix status constraint — add pending_review
ALTER TABLE public.merchants DROP CONSTRAINT IF EXISTS merchants_status_check;
ALTER TABLE public.merchants
    ADD CONSTRAINT merchants_status_check
    CHECK (status IN ('pending', 'pending_review', 'active', 'suspended', 'rejected'));

-- Migrate existing 'pending' records to canonical V2 value
UPDATE public.merchants SET status = 'pending_review' WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_merchants_phone ON public.merchants(phone);
CREATE INDEX IF NOT EXISTS idx_merchants_email ON public.merchants(email);

-- ============================================================================
-- 3. drivers — add full_name, phone, address, availability
-- ============================================================================

ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS full_name    TEXT;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS phone        TEXT;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS address      TEXT;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS availability TEXT NOT NULL DEFAULT 'offline';

-- Backfill full_name
UPDATE public.drivers
SET full_name = TRIM(
    COALESCE(first_name, '') ||
    CASE WHEN COALESCE(last_name, '') <> '' THEN ' ' || last_name ELSE '' END
)
WHERE full_name IS NULL;

UPDATE public.drivers
SET full_name = 'موصل'
WHERE full_name IS NULL OR full_name = '';

-- Backfill phone
UPDATE public.drivers
SET phone = phone_number
WHERE phone IS NULL AND phone_number IS NOT NULL;

-- Backfill availability from is_available boolean.
-- Guard: only run if ALL rows currently have the DEFAULT value 'offline',
-- meaning the column was just created this migration run.
-- On a re-run, drivers may have mixed values (some online, some offline
-- via driver_set_availability()), so we must not overwrite live values.
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.drivers WHERE availability <> 'offline') THEN
        UPDATE public.drivers
        SET availability = CASE WHEN is_available IS TRUE THEN 'online' ELSE 'offline' END;
    END IF;
END $$;

-- Availability constraint (idempotent)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'drivers_availability_check'
          AND conrelid = 'public.drivers'::regclass
    ) THEN
        ALTER TABLE public.drivers
            ADD CONSTRAINT drivers_availability_check
            CHECK (availability IN ('online', 'offline', 'on_delivery'));
    END IF;
END $$;

-- Fix status constraint — add pending_review, offline
ALTER TABLE public.drivers DROP CONSTRAINT IF EXISTS drivers_status_check;
ALTER TABLE public.drivers
    ADD CONSTRAINT drivers_status_check
    CHECK (status IN ('pending', 'pending_review', 'active', 'suspended', 'offline'));

-- Migrate existing 'pending' records to canonical V2 value
UPDATE public.drivers SET status = 'pending_review' WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_drivers_full_name    ON public.drivers(full_name);
CREATE INDEX IF NOT EXISTS idx_drivers_phone        ON public.drivers(phone);
CREATE INDEX IF NOT EXISTS idx_drivers_availability ON public.drivers(availability);

-- ============================================================================
-- 4. customer_addresses — add label, address_text
-- ============================================================================

ALTER TABLE public.customer_addresses ADD COLUMN IF NOT EXISTS label        TEXT DEFAULT 'Home';
ALTER TABLE public.customer_addresses ADD COLUMN IF NOT EXISTS address_text TEXT;

-- Backfill address_text from address_line1
UPDATE public.customer_addresses
SET address_text = NULLIF(TRIM(address_line1), '')
WHERE address_text IS NULL AND address_line1 IS NOT NULL;

-- ============================================================================
-- 5. stores — add opens_at, closes_at; fix status constraint
-- ============================================================================

ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS opens_at  TIME;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS closes_at TIME;

-- Default business hours for any pre-existing rows
UPDATE public.stores
SET opens_at = '09:00:00', closes_at = '21:00:00'
WHERE opens_at IS NULL;

-- Fix status constraint — add 'draft' (V2 spec initial status)
ALTER TABLE public.stores DROP CONSTRAINT IF EXISTS stores_status_check;
ALTER TABLE public.stores
    ADD CONSTRAINT stores_status_check
    CHECK (status IN ('draft', 'pending', 'active', 'paused', 'suspended', 'closed'));

-- ============================================================================
-- 6. profiles — add full_name, email, phone (needed by admin Edge Function)
-- ============================================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email     TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone     TEXT;

-- ============================================================================
-- 7. get_user_role() — read from profiles, return NULL for anonymous/missing
--    (replaces the auth.users raw_app_meta_data fallback from migration 012)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_role TEXT;
BEGIN
    -- Anonymous session: auth.uid() is NULL
    IF user_id IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT p.role INTO v_role
    FROM public.profiles p
    WHERE p.id = user_id;

    -- No profile row means unregistered user; return NULL
    -- (not 'customer' — returning 'customer' as a default would grant
    --  unregistered users customer-level access, a privilege-escalation risk)
    RETURN v_role;
END;
$$;

-- ============================================================================
-- 8. RLS INSERT policies — allow 'pending_review' initial status
-- ============================================================================

-- MERCHANTS: self-registration must start as pending_review (or pending)
DROP POLICY IF EXISTS rls_insert_merchants ON public.merchants;

CREATE POLICY rls_insert_merchants ON public.merchants
    FOR INSERT WITH CHECK (
        CASE
            WHEN public.get_user_role(auth.uid()) IN ('admin', 'founder')
            THEN status IN ('pending', 'pending_review', 'active', 'suspended', 'rejected')
            ELSE (
                status IN ('pending', 'pending_review')
                AND id = auth.uid()
                AND auth.uid() IS NOT NULL
            )
        END
    );

-- DRIVERS: self-registration must start as pending_review (or pending)
DROP POLICY IF EXISTS rls_insert_drivers ON public.drivers;

CREATE POLICY rls_insert_drivers ON public.drivers
    FOR INSERT WITH CHECK (
        CASE
            WHEN public.get_user_role(auth.uid()) IN ('admin', 'founder')
            THEN status IN ('pending', 'pending_review', 'active', 'suspended', 'offline')
            ELSE (
                status IN ('pending', 'pending_review')
                AND id = auth.uid()
                AND auth.uid() IS NOT NULL
            )
        END
    );

-- MERCHANTS UPDATE: include pending_review in the admin-allowed status set.
-- Inherited from migration 019/020 as ('pending','active','suspended','rejected');
-- admins need 'pending_review' to approve freshly registered merchants.
DROP POLICY IF EXISTS rls_update_merchants ON public.merchants;

CREATE POLICY rls_update_merchants ON public.merchants
    FOR UPDATE USING (
        id = auth.uid()
        OR public.get_user_role(auth.uid()) IN ('admin', 'founder')
    )
    WITH CHECK (
        CASE
            WHEN public.get_user_role(auth.uid()) IN ('admin', 'founder')
            THEN status IN ('pending', 'pending_review', 'active', 'suspended', 'rejected')
            ELSE status = (
                SELECT m2.status FROM public.merchants m2 WHERE m2.id = id LIMIT 1
            )
        END
    );

-- DRIVERS UPDATE: admin/founder control status; drivers keep own status immutable
-- but can update availability and other profile fields
DROP POLICY IF EXISTS rls_update_drivers ON public.drivers;

CREATE POLICY rls_update_drivers ON public.drivers
    FOR UPDATE USING (
        id = auth.uid()
        OR public.get_user_role(auth.uid()) IN ('admin', 'founder')
    )
    WITH CHECK (
        CASE
            WHEN public.get_user_role(auth.uid()) IN ('admin', 'founder')
            THEN status IN ('pending', 'pending_review', 'active', 'suspended', 'offline')
            -- Drivers may update their own row but the administrative status
            -- must remain unchanged (availability is a separate column, not status)
            ELSE status = (
                SELECT d2.status FROM public.drivers d2
                WHERE d2.id = id LIMIT 1
            )
        END
    );

-- ============================================================================
-- 9. find_available_driver() — auto-assign respecting approved business rules:
--    online + active + same zone + not currently busy
-- ============================================================================

CREATE OR REPLACE FUNCTION public.find_available_driver(p_zone_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_driver_id UUID;
BEGIN
    SELECT d.id INTO v_driver_id
    FROM public.drivers d
    WHERE d.availability = 'online'        -- Rule: only online drivers
      AND d.status = 'active'              -- Rule: not suspended / pending_review
      AND (                                -- Rule: same zone (or driver has no zone set)
          d.zone_id = p_zone_id
          OR d.zone_id IS NULL
      )
      AND NOT EXISTS (                     -- Rule: not currently on a delivery
          SELECT 1
          FROM public.delivery_assignments da
          WHERE da.driver_id = d.id
            AND da.status IN (
                'pending', 'accepted', 'arrived_at_store',
                'picked_up', 'out_for_delivery'
            )
      )
    ORDER BY RANDOM()
    LIMIT 1;

    RETURN v_driver_id;
END;
$$;

-- ============================================================================
-- 10. driver_set_availability() — safe function for drivers to go online/offline
-- ============================================================================

CREATE OR REPLACE FUNCTION public.driver_set_availability(p_availability TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_driver_id UUID := auth.uid();
    v_status    TEXT;
BEGIN
    IF p_availability NOT IN ('online', 'offline', 'on_delivery') THEN
        RAISE EXCEPTION 'Invalid availability: %. Must be online | offline | on_delivery', p_availability;
    END IF;

    SELECT status INTO v_status
    FROM public.drivers
    WHERE id = v_driver_id;

    IF v_status IS NULL THEN
        RAISE EXCEPTION 'Driver profile not found for user %', v_driver_id;
    END IF;

    -- Only active drivers may go online
    IF p_availability = 'online' AND v_status <> 'active' THEN
        RAISE EXCEPTION 'Driver must be active to go online. Current status: %', v_status;
    END IF;

    UPDATE public.drivers
    SET availability = p_availability,
        updated_at   = now()
    WHERE id = v_driver_id;
END;
$$;

-- ============================================================================
-- 11. Guarantee approved financial constants (idempotent via ON CONFLICT)
-- ============================================================================

INSERT INTO public.platform_financial_settings (key, value, description)
VALUES
    ('base_delivery_fee_minor',         '15000', 'Delivery fee: 150 DZD (15 000 centimes)'),
    ('delivery_platform_share_percent', '20',    'Platform share of delivery fee: 20%'),
    ('default_merchant_commission_rate','0',     'Default merchant commission: 0%'),
    ('commission_cycle_threshold',      '50',    'Driver settlement threshold: 50 completed deliveries')
ON CONFLICT (key) DO UPDATE
    SET value       = EXCLUDED.value,
        description = EXCLUDED.description,
        updated_at  = now();

COMMIT;
