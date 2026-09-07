-- Per-slide timing controls for Founder-managed hero slides.
ALTER TABLE public.market_hero_slides
  ADD COLUMN IF NOT EXISTS display_duration_seconds integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS transition_duration_ms integer NOT NULL DEFAULT 350,
  ADD COLUMN IF NOT EXISTS transition_type text NOT NULL DEFAULT 'slide';
