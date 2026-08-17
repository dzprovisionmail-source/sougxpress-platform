-- Courier Favorites Hub: driver-owned preferred store/customer relationships.
-- This table is intentionally separate from customer_favorites and merchant_favorites.

BEGIN;

CREATE TABLE IF NOT EXISTS public.courier_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    courier_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL CHECK (target_type IN ('store', 'customer')),
    target_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT courier_favorites_unique_target UNIQUE (courier_id, target_type, target_id)
);

CREATE INDEX IF NOT EXISTS idx_courier_favorites_courier
    ON public.courier_favorites (courier_id, target_type, created_at DESC);

ALTER TABLE public.courier_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS courier_favorites_select_own ON public.courier_favorites;
CREATE POLICY courier_favorites_select_own
    ON public.courier_favorites
    FOR SELECT
    TO authenticated
    USING (
        courier_id = auth.uid()
        AND public.get_user_role(auth.uid()) = 'driver'
    );

DROP POLICY IF EXISTS courier_favorites_insert_own ON public.courier_favorites;
CREATE POLICY courier_favorites_insert_own
    ON public.courier_favorites
    FOR INSERT
    TO authenticated
    WITH CHECK (
        courier_id = auth.uid()
        AND public.get_user_role(auth.uid()) = 'driver'
    );

DROP POLICY IF EXISTS courier_favorites_delete_own ON public.courier_favorites;
CREATE POLICY courier_favorites_delete_own
    ON public.courier_favorites
    FOR DELETE
    TO authenticated
    USING (
        courier_id = auth.uid()
        AND public.get_user_role(auth.uid()) = 'driver'
    );

COMMIT;
