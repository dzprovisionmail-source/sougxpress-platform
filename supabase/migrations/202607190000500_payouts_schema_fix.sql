-- Migration: 202607190000500_payouts_schema_fix.sql
-- Purpose: Align payouts table with documented v2 schema.

-- Add missing columns
ALTER TABLE public.payouts ADD COLUMN IF NOT EXISTS recipient_type TEXT;
ALTER TABLE public.payouts ADD COLUMN IF NOT EXISTS recipient_id UUID;
ALTER TABLE public.payouts ADD COLUMN IF NOT EXISTS period_start DATE;
ALTER TABLE public.payouts ADD COLUMN IF NOT EXISTS period_end DATE;
ALTER TABLE public.payouts ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE;

-- Backfill recipient_type/recipient_id from entity_type/entity_id
UPDATE public.payouts SET recipient_type = entity_type, recipient_id = entity_id WHERE recipient_type IS NULL;

-- Backfill paid_at from processed_at
UPDATE public.payouts SET paid_at = processed_at WHERE paid_at IS NULL AND processed_at IS NOT NULL;

-- Drop old columns that are not in the documented schema
ALTER TABLE public.payouts DROP COLUMN IF EXISTS entity_type;
ALTER TABLE public.payouts DROP COLUMN IF EXISTS entity_id;
ALTER TABLE public.payouts DROP COLUMN IF EXISTS processed_at;
ALTER TABLE public.payouts DROP COLUMN IF EXISTS currency;

-- Update status constraint to match documented values
ALTER TABLE public.payouts DROP CONSTRAINT IF EXISTS payouts_status_check;
ALTER TABLE public.payouts ADD CONSTRAINT payouts_status_check CHECK (status IN ('pending', 'processing', 'paid', 'failed'));
