-- Additional Smart Slider behavior settings. Existing founder-only UPDATE policy remains unchanged.
INSERT INTO public.platform_financial_settings (key, value, description)
VALUES
  ('hero_mode', 'manual', 'Hero Slider mode: manual, smart, or hybrid'),
  ('hero_transition_type', 'slide', 'Hero Slider transition type'),
  ('hero_pause_on_touch', 'true', 'Pause auto-play while the user interacts'),
  ('hero_resume_delay_seconds', '4', 'Seconds before auto-play resumes after interaction'),
  ('hero_max_repeat_count', '1', 'Maximum recent repeat count for Smart Slider')
ON CONFLICT (key) DO NOTHING;
