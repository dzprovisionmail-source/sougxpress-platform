-- Create merchant_favorites table
CREATE TABLE IF NOT EXISTS public.merchant_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
    target_id UUID NOT NULL,
    target_type TEXT NOT NULL CHECK (target_type IN ('customer')),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(merchant_id, target_id, target_type)
);

-- Enable RLS
ALTER TABLE public.merchant_favorites ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Merchants can view their own favorites"
    ON public.merchant_favorites
    FOR SELECT
    USING (auth.uid() = merchant_id);

CREATE POLICY "Merchants can insert their own favorites"
    ON public.merchant_favorites
    FOR INSERT
    WITH CHECK (auth.uid() = merchant_id);

CREATE POLICY "Merchants can delete their own favorites"
    ON public.merchant_favorites
    FOR DELETE
    USING (auth.uid() = merchant_id);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_merchant_favorites_merchant_id ON public.merchant_favorites(merchant_id);
CREATE INDEX IF NOT EXISTS idx_merchant_favorites_target ON public.merchant_favorites(target_id, target_type);

-- Grant permissions
GRANT ALL ON public.merchant_favorites TO authenticated;
GRANT ALL ON public.merchant_favorites TO service_role;
