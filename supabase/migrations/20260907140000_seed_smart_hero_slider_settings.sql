-- Seed Smart Hero Slider settings so founder clients can update existing rows under RLS.
-- The application writes these rows with UPDATE only; no INSERT permission is granted.

INSERT INTO public.platform_financial_settings (key, value, description)
VALUES
  ('hero_smart_mode', 'false', 'Enable automatic Smart Hero Slider selection'),
  ('hero_source_products', 'true', 'Allow new products in Smart Hero Slider'),
  ('hero_source_new_stores', 'true', 'Allow new stores in Smart Hero Slider'),
  ('hero_source_featured_stores', 'true', 'Allow featured stores in Smart Hero Slider'),
  ('hero_source_promotions', 'true', 'Allow official Soug-XPRESS promotions in Smart Hero Slider'),
  ('hero_weight_products', '40', 'Smart Hero Slider product source weight'),
  ('hero_weight_new_stores', '25', 'Smart Hero Slider new-store source weight'),
  ('hero_weight_featured_stores', '20', 'Smart Hero Slider featured-store source weight'),
  ('hero_weight_promotions', '15', 'Smart Hero Slider official-promotion source weight'),
  ('hero_transition_ms', '350', 'Smart Hero Slider transition duration in milliseconds')
ON CONFLICT (key) DO NOTHING;
