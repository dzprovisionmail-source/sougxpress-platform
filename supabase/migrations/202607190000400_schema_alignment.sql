-- Migration: 202607190000400_schema_alignment.sql
-- Purpose: Align database schema with documented v2 schema and application expectations.
--          Adds missing columns identified in static validation report.

-- =============================================================================
-- 1. orders — add missing columns
-- =============================================================================

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS subtotal_minor INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS total_minor INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancelled_reason TEXT;

-- Backfill total_minor from order_total_minor for existing rows
UPDATE public.orders SET total_minor = order_total_minor WHERE total_minor = 0;

-- =============================================================================
-- 2. order_items — add line_total_minor
-- =============================================================================

ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS line_total_minor INTEGER NOT NULL DEFAULT 0;

-- Backfill line_total_minor from price_at_order_minor * quantity
UPDATE public.order_items SET line_total_minor = price_at_order_minor * quantity WHERE line_total_minor = 0;

-- =============================================================================
-- 3. order_status_history — add changed_by_role
-- =============================================================================

ALTER TABLE public.order_status_history ADD COLUMN IF NOT EXISTS changed_by_role TEXT DEFAULT 'system';

-- =============================================================================
-- 4. Indexes for new columns
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_orders_driver_id ON public.orders(driver_id);
CREATE INDEX IF NOT EXISTS idx_orders_delivered_at ON public.orders(delivered_at);
CREATE INDEX IF NOT EXISTS idx_order_status_history_changed_by_role ON public.order_status_history(changed_by_role);
