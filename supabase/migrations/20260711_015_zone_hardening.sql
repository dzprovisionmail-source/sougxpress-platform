-- Migration: 015_zone_hardening.sql
-- Purpose: Zone Hardening — mark legacy zone inactive, restore DEFAULT 'active',
--          add composite unique index on (name, city, country).
--          This is an incremental, non-destructive migration.

-- =============================================================================
-- Part 1: Mark the legacy zone "Ain Sefra Zone 1" as inactive
-- This zone was created by migration 013 as a placeholder. It is superseded
-- by the 28 official neighborhoods seeded in migration 014.
-- =============================================================================

UPDATE public.zones
SET status = 'inactive',
    updated_at = now()
WHERE name = 'Ain Sefra Zone 1';

-- =============================================================================
-- Part 2: Restore DEFAULT 'active' on zones.status
-- Migration 014 added the status column WITHOUT a default to ensure only
-- intentionally-seeded neighborhoods were active. Now that the alignment is
-- complete, restore the default for future zone creation.
-- =============================================================================

ALTER TABLE public.zones ALTER COLUMN status SET DEFAULT 'active';

-- =============================================================================
-- Part 3: Add idempotent unique index preventing duplicate zone names within
-- the same city and country.
-- This protects against accidental re-seeding of neighborhoods and ensures
-- no two zones can share the same (name, city, country) triple.
-- =============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_zones_unique_name_city_country
    ON public.zones (name, city, country);
