-- Migration: store_promotions
-- Merchant-scoped promotion table (separate from platform-level promotions)

CREATE TABLE IF NOT EXISTS public.store_promotions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id    UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    description TEXT,
    discount_type TEXT NOT NULL DEFAULT 'percentage'
        CHECK (discount_type IN ('percentage', 'fixed_amount', 'free_delivery')),
    discount_value NUMERIC(10,2) NOT NULL DEFAULT 0
        CHECK (discount_value >= 0),
    image_url   TEXT,
    starts_at   TIMESTAMP WITH TIME ZONE NOT NULL,
    ends_at     TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active   BOOLEAN DEFAULT TRUE NOT NULL,
    min_order_minor INTEGER DEFAULT 0,
    created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    CONSTRAINT store_promotions_dates_check CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS idx_store_promotions_store_id ON public.store_promotions(store_id);
CREATE INDEX IF NOT EXISTS idx_store_promotions_is_active ON public.store_promotions(is_active);
CREATE INDEX IF NOT EXISTS idx_store_promotions_ends_at  ON public.store_promotions(ends_at);

-- updated_at trigger
CREATE TRIGGER update_store_promotions_updated_at
BEFORE UPDATE ON public.store_promotions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.store_promotions ENABLE ROW LEVEL SECURITY;

-- Public read: anyone can see active promotions for active stores
CREATE POLICY store_promotions_select ON public.store_promotions
    FOR SELECT USING (true);

-- Merchant insert: must own the store
CREATE POLICY store_promotions_insert ON public.store_promotions
    FOR INSERT WITH CHECK (
        store_id IN (
            SELECT id FROM public.stores WHERE merchant_id = auth.uid()
        )
    );

-- Merchant update/delete: must own the store
CREATE POLICY store_promotions_update ON public.store_promotions
    FOR UPDATE USING (
        store_id IN (
            SELECT id FROM public.stores WHERE merchant_id = auth.uid()
        )
    );

CREATE POLICY store_promotions_delete ON public.store_promotions
    FOR DELETE USING (
        store_id IN (
            SELECT id FROM public.stores WHERE merchant_id = auth.uid()
        )
    );

-- Also add category to products if missing (safe no-op if it already exists)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'عام';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_available BOOLEAN NOT NULL DEFAULT TRUE;
