-- Migration: 202607190000600_metrics_schema_fix.sql
-- Purpose: Align platform_metrics_snapshots table with documented v2 schema.

-- Add missing columns
ALTER TABLE public.platform_metrics_snapshots ADD COLUMN IF NOT EXISTS zone_id UUID REFERENCES public.zones(id) ON DELETE SET NULL;
ALTER TABLE public.platform_metrics_snapshots ADD COLUMN IF NOT EXISTS metric_period TEXT DEFAULT 'daily';
ALTER TABLE public.platform_metrics_snapshots ADD COLUMN IF NOT EXISTS period_start TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.platform_metrics_snapshots ADD COLUMN IF NOT EXISTS period_end TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.platform_metrics_snapshots ADD COLUMN IF NOT EXISTS total_gmv_minor INTEGER DEFAULT 0;
ALTER TABLE public.platform_metrics_snapshots ADD COLUMN IF NOT EXISTS total_commission_minor INTEGER DEFAULT 0;
ALTER TABLE public.platform_metrics_snapshots ADD COLUMN IF NOT EXISTS total_delivery_fees_minor INTEGER DEFAULT 0;
ALTER TABLE public.platform_metrics_snapshots ADD COLUMN IF NOT EXISTS dispute_count INTEGER DEFAULT 0;

-- Backfill metric_period and period dates from snapshot_time
UPDATE public.platform_metrics_snapshots 
SET 
  metric_period = 'daily',
  period_start = snapshot_time,
  period_end = snapshot_time,
  total_gmv_minor = total_revenue_minor,
  total_commission_minor = 0,
  total_delivery_fees_minor = 0,
  dispute_count = 0
WHERE metric_period IS NULL;

-- Drop columns not in documented schema
ALTER TABLE public.platform_metrics_snapshots DROP COLUMN IF EXISTS snapshot_time;
ALTER TABLE public.platform_metrics_snapshots DROP COLUMN IF EXISTS total_revenue_minor;
ALTER TABLE public.platform_metrics_snapshots DROP COLUMN IF EXISTS new_users_24h;
ALTER TABLE public.platform_metrics_snapshots DROP COLUMN IF EXISTS completed_deliveries_24h;
ALTER TABLE public.platform_metrics_snapshots DROP COLUMN IF EXISTS average_delivery_time_minutes;
