-- Fix RLS policy for order_status_history INSERT
-- Enables customers, merchants, drivers, and admins/founders to insert status history entries for orders they participate in.

DROP POLICY IF EXISTS rls_insert_order_status_history ON public.order_status_history;

CREATE POLICY rls_insert_order_status_history ON public.order_status_history
FOR INSERT WITH CHECK (
  public.is_order_participant(order_id, auth.uid())
);

GRANT INSERT ON public.order_status_history TO authenticated;
