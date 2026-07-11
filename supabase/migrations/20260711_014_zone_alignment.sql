-- Migration: 014_zone_alignment.sql
-- Purpose: Zone Alignment — seed all official Ain Sefra neighborhoods,
--          add required zone fields, and add nullable zone_id FKs to core tables.
--          This is an incremental, non-destructive migration.

-- =============================================================================
-- Part 1: Add required fields to zones table
-- =============================================================================

-- Add boundary column (jsonb, nullable — implementation detail deferred)
ALTER TABLE public.zones ADD COLUMN IF NOT EXISTS boundary jsonb;

-- Add status column with lifecycle states
ALTER TABLE public.zones ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';
ALTER TABLE public.zones ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.zones ADD CONSTRAINT chk_zones_status
    CHECK (status IN ('active', 'inactive', 'planned'));

-- Add index on status for operational filtering
CREATE INDEX IF NOT EXISTS idx_zones_status ON public.zones(status);

-- =============================================================================
-- Part 2: Seed all official Ain Sefra neighborhoods as individual zone records
-- Source: apps/mobile/src/constants/ain-sefra-zones.ts (official neighborhood list)
-- Duplicate prevention: INSERT ... SELECT ... WHERE NOT EXISTS pattern
-- =============================================================================

INSERT INTO public.zones (name, city, country, status)
SELECT v, 'Ain Sefra', 'Algeria', 'active'
FROM (
    VALUES
        ('حي وسط المدينة (الفيلاج)'),
        ('حي بني الجديد (طريق بشار)'),
        ('شارع بوعرفة عبد الرحمن (لوطوروت)'),
        ('حي برج الحمام'),
        ('حي الكاسطور'),
        ('حي 19 مارس'),
        ('حي امزي (بومريفق)'),
        ('حي الوئام'),
        ('حي السلام (المويلح)'),
        ('حي عمارات الصين (شناوا)'),
        ('حي 17 أكتوبر (الحمار)'),
        ('حي الاشتراك'),
        ('حي الحرارة'),
        ('عمارات مقابل المستشفى'),
        ('حي بني بالڤرع'),
        ('حي بني وهراني'),
        ('حي القصر'),
        ('حي حيدرة (حضري)'),
        ('حي الرمال (غزة)'),
        ('حي النصر (المناكيب)'),
        ('حي مولاي الهاشمي (القرابة)'),
        ('عين الرشاڤ'),
        ('عين الصفراء الجديدة'),
        ('حي 52 مسكن'),
        ('الظلعة 1'),
        ('الظلعة 2'),
        ('الظلعة 3'),
        ('الظلعة 4')
) AS t(v)
WHERE NOT EXISTS (SELECT 1 FROM public.zones z WHERE z.name = v);

-- =============================================================================
-- Part 3: Add nullable zone_id FKs and indexes to core tables
-- =============================================================================

-- customers: add zone_id for home/primary zone scoping
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS zone_id uuid;
ALTER TABLE public.customers ADD CONSTRAINT fk_customers_zone
    FOREIGN KEY (zone_id) REFERENCES public.zones(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_customers_zone_id ON public.customers(zone_id);

-- customer_addresses: add zone_id for address-level zone scoping
ALTER TABLE public.customer_addresses ADD COLUMN IF NOT EXISTS zone_id uuid;
ALTER TABLE public.customer_addresses ADD CONSTRAINT fk_customer_addresses_zone
    FOREIGN KEY (zone_id) REFERENCES public.zones(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_customer_addresses_zone_id ON public.customer_addresses(zone_id);

-- merchants: add zone_id for merchant operating zone
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS zone_id uuid;
ALTER TABLE public.merchants ADD CONSTRAINT fk_merchants_zone
    FOREIGN KEY (zone_id) REFERENCES public.zones(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_merchants_zone_id ON public.merchants(zone_id);

-- stores: add zone_id for store zone assignment
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS zone_id uuid;
ALTER TABLE public.stores ADD CONSTRAINT fk_stores_zone
    FOREIGN KEY (zone_id) REFERENCES public.zones(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_stores_zone_id ON public.stores(zone_id);

-- drivers: add zone_id for primary operating zone
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS zone_id uuid;
ALTER TABLE public.drivers ADD CONSTRAINT fk_drivers_zone
    FOREIGN KEY (zone_id) REFERENCES public.zones(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_drivers_zone_id ON public.drivers(zone_id);

-- orders: add zone_id as delivery-zone snapshot (denormalized at creation)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS zone_id uuid;
ALTER TABLE public.orders ADD CONSTRAINT fk_orders_zone
    FOREIGN KEY (zone_id) REFERENCES public.zones(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_orders_zone_id ON public.orders(zone_id);

-- =============================================================================
-- Part 4: Add RLS policies for zones (admin/founder management)
-- The zones table already has RLS enabled from migration 012.
-- Add INSERT, UPDATE, DELETE policies for admin/founder.
-- =============================================================================

-- Allow admin/founder to insert zones
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'zones' AND policyname = 'rls_insert_zones'
    ) THEN
        CREATE POLICY rls_insert_zones ON public.zones FOR INSERT
            WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['admin'::text, 'founder'::text]));
    END IF;
END $$;

-- Allow admin/founder to update zones
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'zones' AND policyname = 'rls_update_zones'
    ) THEN
        CREATE POLICY rls_update_zones ON public.zones FOR UPDATE
            USING (get_user_role(auth.uid()) = ANY (ARRAY['admin'::text, 'founder'::text]))
            WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['admin'::text, 'founder'::text]));
    END IF;
END $$;

-- Allow admin/founder to delete zones
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'zones' AND policyname = 'rls_delete_zones'
    ) THEN
        CREATE POLICY rls_delete_zones ON public.zones FOR DELETE
            USING (get_user_role(auth.uid()) = ANY (ARRAY['admin'::text, 'founder'::text]));
    END IF;
END $$;
