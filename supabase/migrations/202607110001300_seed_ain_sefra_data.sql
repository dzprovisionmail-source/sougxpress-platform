-- Migration: 013_seed_ain_sefra_data.sql
-- Purpose: Initial data for Ain Sefra launch zone

-- Insert Ain Sefra zone if it doesn't exist
INSERT INTO public.zones (name, city, country)
SELECT 'Ain Sefra Zone 1', 'Ain Sefra', 'Algeria'
WHERE NOT EXISTS (SELECT 1 FROM public.zones WHERE city = 'Ain Sefra');

-- Insert initial platform financial settings if they don't exist
INSERT INTO public.platform_financial_settings (key, value, description)
SELECT 'base_delivery_fee_minor', '15000', 'Base delivery fee (150 DZD)'
WHERE NOT EXISTS (SELECT 1 FROM public.platform_financial_settings WHERE key = 'base_delivery_fee_minor');

INSERT INTO public.platform_financial_settings (key, value, description)
SELECT 'delivery_platform_share_percent', '20', 'Platform''s share of delivery fee (%)'
WHERE NOT EXISTS (SELECT 1 FROM public.platform_financial_settings WHERE key = 'delivery_platform_share_percent');

INSERT INTO public.platform_financial_settings (key, value, description)
SELECT 'default_merchant_commission_rate', '0', 'Default merchant commission (%)'
WHERE NOT EXISTS (SELECT 1 FROM public.platform_financial_settings WHERE key = 'default_merchant_commission_rate');

INSERT INTO public.platform_financial_settings (key, value, description)
SELECT 'commission_cycle_threshold', '50', 'Deliveries before payment due'
WHERE NOT EXISTS (SELECT 1 FROM public.platform_financial_settings WHERE key = 'commission_cycle_threshold');
