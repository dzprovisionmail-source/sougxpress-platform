-- Add latitude / longitude to stores table for Store Location picker
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS latitude  DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
