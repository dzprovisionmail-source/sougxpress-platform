-- Migration: 20260822120000_promotional_views_system.sql
-- Description: Implements Promotional Views Counter system for Stores and Couriers with Founder control and audit trail.

-- 1. Promotional Views Table
CREATE TABLE IF NOT EXISTS public.promotional_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL CHECK (entity_type IN ('store', 'courier')),
    entity_id UUID NOT NULL,
    base_views INTEGER NOT NULL DEFAULT 74,
    daily_increment INTEGER NOT NULL DEFAULT 30,
    manual_views INTEGER NOT NULL DEFAULT 0,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_entity_views UNIQUE (entity_type, entity_id)
);

-- 2. Promotional Views Audit Trail
CREATE TABLE IF NOT EXISTS public.promotional_views_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    view_record_id UUID REFERENCES public.promotional_views(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    founder_id UUID REFERENCES auth.users(id),
    previous_manual_views INTEGER NOT NULL,
    added_views INTEGER NOT NULL,
    new_manual_views INTEGER NOT NULL,
    previous_daily_increment INTEGER,
    new_daily_increment INTEGER,
    previous_enabled BOOLEAN,
    new_enabled BOOLEAN,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE public.promotional_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotional_views_audit ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies (Read for all authenticated, Write for Founder/Admin only)
CREATE POLICY "Allow public read promotional views"
    ON public.promotional_views
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow founder write promotional views"
    ON public.promotional_views
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'founder')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'founder')
        )
    );

CREATE POLICY "Allow founder read audit trail"
    ON public.promotional_views_audit
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'founder')
        )
    );

CREATE POLICY "Allow founder insert audit trail"
    ON public.promotional_views_audit
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'founder')
        )
    );

-- 5. Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_promotional_views_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_promotional_views_updated_at
    BEFORE UPDATE ON public.promotional_views
    FOR EACH ROW
    EXECUTE FUNCTION public.update_promotional_views_timestamp();
