-- ============================================================================
-- Seed Active & Online Drivers for Testing: Soug-XPRESS
-- Ensures test drivers are active and online so they appear in cooperative couriers
-- and can be assigned to orders.
-- ============================================================================

UPDATE public.drivers
SET status = 'active', availability = 'online', is_available = true, is_suspended_for_debt = false
WHERE status IS NOT NULL;
