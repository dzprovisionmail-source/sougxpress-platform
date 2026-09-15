-- Smart Hero runtime settings: additive only; no existing rows are deleted or rewritten.
INSERT INTO public.platform_financial_settings (key, value, description)
VALUES
  ('hero_slide_duration_seconds', '3', 'Seconds each Hero slide remains visible during autoplay.'),
  ('hero_rotation_interval_hours', '6', 'Hours between Smart Hero candidate-set recomputations.'),
  ('hero_slide_count', '5', 'Maximum number of slides selected for Market and Founder Preview.')
ON CONFLICT (key) DO NOTHING;
