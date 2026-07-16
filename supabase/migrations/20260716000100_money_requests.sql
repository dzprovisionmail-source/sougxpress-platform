-- Migration: 20260716000100_money_requests.sql
-- Purpose: Add money_requests table — allows customers, merchants, and drivers
--          to submit money requests that founders/admins can approve or reject.
--          Uses get_user_role(auth.uid()) as the single authorization source
--          (established in migration 016).

-- =============================================================================
-- Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.money_requests (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount       NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    reason       TEXT NOT NULL CHECK (char_length(reason) BETWEEN 3 AND 1000),
    status       TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_at  TIMESTAMP WITH TIME ZONE,
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_money_requests_user_id  ON public.money_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_money_requests_status   ON public.money_requests(status);
CREATE INDEX IF NOT EXISTS idx_money_requests_created  ON public.money_requests(created_at DESC);

-- =============================================================================
-- Row-Level Security
-- =============================================================================

ALTER TABLE public.money_requests ENABLE ROW LEVEL SECURITY;

-- Customers, merchants, and drivers can submit their own requests.
CREATE POLICY "money_requests: authenticated users can insert own"
    ON public.money_requests
    FOR INSERT
    WITH CHECK (
        auth.uid() = user_id
        AND get_user_role(auth.uid()) IN ('customer', 'merchant', 'driver', 'admin', 'founder')
    );

-- Users can read only their own requests.
CREATE POLICY "money_requests: users read own"
    ON public.money_requests
    FOR SELECT
    USING (
        auth.uid() = user_id
        OR get_user_role(auth.uid()) IN ('admin', 'founder')
    );

-- Only founders and admins can approve or reject (update status + review fields).
CREATE POLICY "money_requests: founder/admin can update"
    ON public.money_requests
    FOR UPDATE
    USING (
        get_user_role(auth.uid()) IN ('admin', 'founder')
    )
    WITH CHECK (
        get_user_role(auth.uid()) IN ('admin', 'founder')
    );

-- No DELETE — preserve audit trail.
-- (No DELETE policy means DELETE is denied for all roles.)
