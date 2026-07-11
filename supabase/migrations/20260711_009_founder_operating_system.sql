-- Migration: 009_founder_operating_system.sql
-- Purpose: Founder oversight and metrics

-- Create founder_overrides table
CREATE TABLE IF NOT EXISTS public.founder_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    founder_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    target_table TEXT NOT NULL,
    target_record_id UUID,
    override_field TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT NOT NULL,
    reason TEXT NOT NULL,
    overridden_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create platform_metrics_snapshots table
CREATE TABLE IF NOT EXISTS public.platform_metrics_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_time TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    total_orders INTEGER DEFAULT 0 NOT NULL,
    total_revenue_minor INTEGER DEFAULT 0 NOT NULL,
    active_customers INTEGER DEFAULT 0 NOT NULL,
    active_merchants INTEGER DEFAULT 0 NOT NULL,
    active_drivers INTEGER DEFAULT 0 NOT NULL,
    new_users_24h INTEGER DEFAULT 0 NOT NULL,
    completed_deliveries_24h INTEGER DEFAULT 0 NOT NULL,
    average_delivery_time_minutes INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create founder_alerts table
CREATE TABLE IF NOT EXISTS public.founder_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type TEXT NOT NULL, -- e.g., 'critical_metric_drop', 'security_incident', 'system_error'
    message TEXT NOT NULL,
    severity TEXT NOT NULL, -- 'low', 'medium', 'high', 'critical'
    is_resolved BOOLEAN DEFAULT FALSE NOT NULL,
    resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_founder_overrides_founder_id ON public.founder_overrides(founder_id);
CREATE INDEX IF NOT EXISTS idx_founder_overrides_target_table ON public.founder_overrides(target_table);
CREATE INDEX IF NOT EXISTS idx_platform_metrics_snapshots_time ON public.platform_metrics_snapshots(snapshot_time);
CREATE INDEX IF NOT EXISTS idx_founder_alerts_severity ON public.founder_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_founder_alerts_is_resolved ON public.founder_alerts(is_resolved);

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_platform_metrics_snapshots_updated_at
BEFORE UPDATE ON public.platform_metrics_snapshots
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_founder_alerts_updated_at
BEFORE UPDATE ON public.founder_alerts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
