-- Migration: 025_customer_registration_not_null_fix.sql
-- Purpose: Fix NOT NULL constraint violations that block customer self-registration.
--
-- Root cause: Migration 001 created customers with first_name NOT NULL,
--   last_name NOT NULL, and phone_number NOT NULL. Migration 024 added the V2
--   columns (full_name, phone, address) that the app now uses. The app inserts
--   using the V2 column set only — omitting the V1 columns — which causes
--   NOT NULL violations on every new customer registration.
--
-- Scope: customer registration and customer entry flow only.
--   Merchants, drivers, admin, and founder flows are NOT modified.
-- Do NOT edit this migration once applied.

BEGIN;

-- ============================================================================
-- 1. Relax V1 legacy NOT NULL columns so V2-style inserts succeed
-- ============================================================================

-- first_name / last_name: set empty-string default so INSERTs that omit
-- them (the V2 app) get '' rather than a NOT NULL violation.
-- Existing rows with real names are unaffected.
ALTER TABLE public.customers ALTER COLUMN first_name SET DEFAULT '';
ALTER TABLE public.customers ALTER COLUMN last_name  SET DEFAULT '';

-- phone_number: V2 inserts supply `phone` (added by migration 024) but not
-- `phone_number`. Drop NOT NULL so the column is optional.
-- The UNIQUE constraint is preserved — PostgreSQL treats multiple NULLs as
-- distinct values, so uniqueness is still enforced for non-NULL entries.
ALTER TABLE public.customers ALTER COLUMN phone_number DROP NOT NULL;

-- ============================================================================
-- 2. Backfill existing rows: keep phone_number in sync with phone
-- ============================================================================
UPDATE public.customers
SET    phone_number = phone
WHERE  phone_number IS NULL
  AND  phone IS NOT NULL
  AND  phone <> '';

-- ============================================================================
-- 3. Add optional customer columns present in TypeScript types but absent
--    from the live schema. All columns are nullable; no existing data changes.
-- ============================================================================
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS avatar_url   TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS city         TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS neighborhood TEXT;

COMMIT;
