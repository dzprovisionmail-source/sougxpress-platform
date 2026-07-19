-- Migration: 202607110002800_founder_user_management.sql
-- Purpose: Add columns and storage needed by Founder User Management (Phase 2).
--          All changes are incremental and non-destructive.
--          Do NOT modify previous migrations (001-027).

BEGIN;

-- ============================================================================
-- 1. customers — soft delete + admin notes + ensure V2 columns exist
-- ============================================================================

ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS deleted_at   TIMESTAMPTZ;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS admin_notes  TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS status       TEXT DEFAULT 'active';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS zone_id      UUID REFERENCES public.zones(id) ON DELETE SET NULL;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS is_gold_member BOOLEAN NOT NULL DEFAULT FALSE;

-- Status constraint (idempotent)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'customers_status_check'
          AND conrelid = 'public.customers'::regclass
    ) THEN
        ALTER TABLE public.customers
            ADD CONSTRAINT customers_status_check
            CHECK (status IN ('active', 'suspended', 'banned'));
    END IF;
END $$;

-- ============================================================================
-- 2. merchants — soft delete + admin notes + ensure zone_id exists
-- ============================================================================

ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS deleted_at   TIMESTAMPTZ;
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS admin_notes  TEXT;
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS zone_id      UUID REFERENCES public.zones(id) ON DELETE SET NULL;
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS status       TEXT DEFAULT 'pending_review';

-- Drop & recreate merchants status constraint to include all states
ALTER TABLE public.merchants DROP CONSTRAINT IF EXISTS merchants_status_check;
ALTER TABLE public.merchants
    ADD CONSTRAINT merchants_status_check
    CHECK (status IN ('pending', 'pending_review', 'active', 'suspended', 'rejected'));

-- ============================================================================
-- 3. drivers — soft delete + admin notes + V2 columns
-- ============================================================================

ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS deleted_at      TIMESTAMPTZ;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS admin_notes     TEXT;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS zone_id         UUID REFERENCES public.zones(id) ON DELETE SET NULL;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS vehicle_number  TEXT;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS delivered_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS status          TEXT DEFAULT 'pending_review';

-- Drop & recreate drivers status constraint
ALTER TABLE public.drivers DROP CONSTRAINT IF EXISTS drivers_status_check;
ALTER TABLE public.drivers
    ADD CONSTRAINT drivers_status_check
    CHECK (status IN ('pending', 'pending_review', 'active', 'suspended', 'offline'));

-- ============================================================================
-- 4. Storage — avatars bucket (public, 5 MB limit)
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars',
    'avatars',
    TRUE,
    5242880,
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: public read
DROP POLICY IF EXISTS "avatars_public_select" ON storage.objects;
CREATE POLICY "avatars_public_select" ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars');

-- Storage RLS: only admin/founder can upload/update/delete
DROP POLICY IF EXISTS "avatars_admin_insert" ON storage.objects;
CREATE POLICY "avatars_admin_insert" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'avatars'
        AND (
            SELECT role FROM public.profiles WHERE id = auth.uid()
        ) IN ('admin', 'founder')
    );

DROP POLICY IF EXISTS "avatars_admin_update" ON storage.objects;
CREATE POLICY "avatars_admin_update" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'avatars'
        AND (
            SELECT role FROM public.profiles WHERE id = auth.uid()
        ) IN ('admin', 'founder')
    );

DROP POLICY IF EXISTS "avatars_admin_delete" ON storage.objects;
CREATE POLICY "avatars_admin_delete" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'avatars'
        AND (
            SELECT role FROM public.profiles WHERE id = auth.uid()
        ) IN ('admin', 'founder')
    );

-- ============================================================================
-- 5. Indexes for common founder queries
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_customers_deleted_at  ON public.customers(deleted_at);
CREATE INDEX IF NOT EXISTS idx_merchants_deleted_at  ON public.merchants(deleted_at);
CREATE INDEX IF NOT EXISTS idx_drivers_deleted_at    ON public.drivers(deleted_at);

COMMIT;
