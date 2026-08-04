-- Phase 4.2: Founder Courier Management
-- Adds visibility, ordering, and verification fields to the couriers table.
-- These fields are managed exclusively by the Founder via the admin-manage-couriers Edge Function.

ALTER TABLE public.couriers
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS show_on_home BOOLEAN NOT NULL DEFAULT true;

-- Index for ordering couriers by display_order + pinned + rating
CREATE INDEX IF NOT EXISTS idx_couriers_display_order
  ON public.couriers (display_order ASC, is_pinned DESC, rating DESC);

-- Index for founder list queries (filter by availability + home visibility)
CREATE INDEX IF NOT EXISTS idx_couriers_visibility
  ON public.couriers (is_available, show_on_home, is_mock);

COMMENT ON COLUMN public.couriers.is_verified IS 'Founder-verified courier badge';
COMMENT ON COLUMN public.couriers.is_pinned IS 'Pinned to top of marketplace lists';
COMMENT ON COLUMN public.couriers.display_order IS 'Manual sort order for founder-managed listing';
COMMENT ON COLUMN public.couriers.show_on_home IS 'Visible on marketplace homepage horizontal bar';
