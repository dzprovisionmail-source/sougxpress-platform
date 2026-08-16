-- ============================================================================
-- Update Stalled Orders View: Soug-XPRESS
-- Change cancellation eligibility threshold from 48 hours to 24 hours.
-- ============================================================================

CREATE OR REPLACE VIEW public.v_stalled_orders AS
SELECT 
    id,
    customer_id,
    store_id,
    status,
    created_at,
    last_progress_at,
    EXTRACT(EPOCH FROM (now() - COALESCE(last_progress_at, created_at))) / 3600 as hours_inactive,
    CASE 
        WHEN EXTRACT(EPOCH FROM (now() - COALESCE(last_progress_at, created_at))) / 3600 >= 24 THEN 'cancellation_eligible'
        ELSE 'normal'
    END as stalled_state
FROM public.orders
WHERE status NOT IN ('delivered', 'cancelled', 'rejected');
