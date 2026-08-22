-- Store order-count display overrides are separate from orders and cannot mutate order data.
CREATE TABLE IF NOT EXISTS public.store_order_count_overrides (
    store_id UUID PRIMARY KEY REFERENCES public.stores(id) ON DELETE CASCADE,
    order_count_override INTEGER CHECK (order_count_override IS NULL OR order_count_override >= 0),
    updated_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.store_order_count_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read store order count overrides" ON public.store_order_count_overrides;
CREATE POLICY "Allow authenticated read store order count overrides"
    ON public.store_order_count_overrides
    FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow founder manage store order count overrides" ON public.store_order_count_overrides;
CREATE POLICY "Allow founder manage store order count overrides"
    ON public.store_order_count_overrides
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
        AND (order_count_override IS NULL OR order_count_override >= 0)
    );

CREATE OR REPLACE FUNCTION public.update_store_order_count_override_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.updated_by = auth.uid();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

DROP TRIGGER IF EXISTS tr_store_order_count_override_updated_at ON public.store_order_count_overrides;
CREATE TRIGGER tr_store_order_count_override_updated_at
    BEFORE INSERT OR UPDATE ON public.store_order_count_overrides
    FOR EACH ROW
    EXECUTE FUNCTION public.update_store_order_count_override_timestamp();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_order_count_overrides TO authenticated;
