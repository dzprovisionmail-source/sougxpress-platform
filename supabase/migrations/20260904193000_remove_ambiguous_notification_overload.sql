-- Remove the legacy overload whose defaulted arguments make order-trigger
-- calls to create_notification(...) ambiguous (PostgreSQL 42725).
-- The canonical idempotent 8-argument function remains in place.
DROP FUNCTION IF EXISTS public.create_notification(uuid, text, text, text, jsonb, text, uuid);
