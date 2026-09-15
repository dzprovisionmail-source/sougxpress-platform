-- Smart Hero Slider controls: additive only; no existing rows are deleted or rewritten.
ALTER TABLE public.market_hero_slides
  ADD COLUMN IF NOT EXISTS pin_to_top BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_market_hero_slides_pin_priority
  ON public.market_hero_slides (pin_to_top DESC, priority DESC, display_order ASC);

INSERT INTO public.platform_financial_settings (key, value, description)
VALUES ('hero_auto_mode', 'true', 'Enable the shared automatic Hero Slider resolver; founder manual overrides remain supported.')
ON CONFLICT (key) DO NOTHING;
