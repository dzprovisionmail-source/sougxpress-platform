-- 20260812200000_hero_slider_targets.sql
-- Add explicit structured target columns for stores and products to market_hero_slides

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'market_hero_slides' 
    AND column_name = 'target_store_id'
  ) THEN
    ALTER TABLE public.market_hero_slides ADD COLUMN target_store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'market_hero_slides' 
    AND column_name = 'target_product_id'
  ) THEN
    ALTER TABLE public.market_hero_slides ADD COLUMN target_product_id UUID REFERENCES public.products(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes for performance on foreign keys
CREATE INDEX IF NOT EXISTS idx_market_hero_slides_target_store ON public.market_hero_slides(target_store_id);
CREATE INDEX IF NOT EXISTS idx_market_hero_slides_target_product ON public.market_hero_slides(target_product_id);
