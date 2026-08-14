-- Market section visibility settings.
-- These values are intentionally stored in the existing platform settings table
-- so Founder can control the Marketplace without exposing financial settings.

INSERT INTO public.platform_financial_settings (key, value, description)
VALUES
  ('market_show_special_offers', 'true', 'Show the special offers section in the Marketplace'),
  ('market_show_new_stores', 'true', 'Show the new stores section in the Marketplace'),
  ('market_show_all_stores', 'true', 'Show the all/nearby stores sections in the Marketplace')
ON CONFLICT (key) DO NOTHING;

-- Customers and guests must be able to read only these non-sensitive Marketplace
-- visibility flags. Existing financial settings remain protected by their
-- existing Founder/Admin policy.
DROP POLICY IF EXISTS "public_read_market_section_settings" ON public.platform_financial_settings;

CREATE POLICY "public_read_market_section_settings"
ON public.platform_financial_settings
FOR SELECT
TO anon, authenticated
USING (
  key IN (
    'market_show_special_offers',
    'market_show_new_stores',
    'market_show_all_stores'
  )
);

COMMENT ON POLICY "public_read_market_section_settings" ON public.platform_financial_settings
IS 'Allows public Marketplace clients to read only non-sensitive section visibility settings.';

COMMENT ON COLUMN public.platform_financial_settings.key IS 'Unique platform setting key; Marketplace visibility keys are public-readable.';
GRANT SELECT ON public.platform_financial_settings TO anon, authenticated;

-- Keep the application-level policy as the actual protection boundary for writes;
-- the existing RLS update policy still limits updates to Founder.
ALTER TABLE public.platform_financial_settings ENABLE ROW LEVEL SECURITY;

SELECT key, value, description
FROM public.platform_financial_settings
WHERE key IN (
  'market_show_special_offers',
  'market_show_new_stores',
  'market_show_all_stores'
)
ORDER BY key;

SELECT policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'platform_financial_settings'
  AND policyname = 'public_read_market_section_settings';

-- End of migration.
