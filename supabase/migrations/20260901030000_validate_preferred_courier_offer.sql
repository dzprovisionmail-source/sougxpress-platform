-- Validate customer preferred-courier offers without marking the order accepted.
-- Existing direct_driver_id is the preferred-courier field; driver_id remains the assigned driver field.

CREATE OR REPLACE FUNCTION public.customer_send_direct_delivery_offer(
  p_order_id UUID,
  p_driver_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_customer_id UUID := auth.uid();
  v_order_status TEXT;
  v_store_id UUID;
BEGIN
  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT customer_id, store_id, status
    INTO v_customer_id, v_store_id, v_order_status
  FROM public.orders
  WHERE id = p_order_id;

  IF NOT FOUND OR v_customer_id <> auth.uid() THEN
    RAISE EXCEPTION 'Order not found or unauthorized.';
  END IF;

  IF v_order_status IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'A preferred courier can only be requested while the order is pending.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.drivers d
    WHERE d.id = p_driver_id
      AND d.status = 'active'
      AND COALESCE(d.is_suspended_for_debt, false) = false
      AND d.deleted_at IS NULL
      AND (d.availability = 'online' OR d.is_available = true)
  ) THEN
    RAISE EXCEPTION 'The selected courier is not eligible or available.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.favorite_couriers
    WHERE user_id = auth.uid() AND courier_id = p_driver_id
  ) AND NOT EXISTS (
    SELECT 1 FROM public.courier_favorites
    WHERE courier_id = p_driver_id AND target_id = auth.uid() AND target_type = 'customer'
  ) AND NOT EXISTS (
    SELECT 1
    FROM public.delivery_assignments da
    JOIN public.orders o ON o.id = da.order_id
    WHERE da.driver_id = p_driver_id
      AND o.customer_id = auth.uid()
      AND da.status = 'delivered'
  ) THEN
    RAISE EXCEPTION 'Direct offers only allowed for connected customers (favorites or past delivery).';
  END IF;

  UPDATE public.orders
  SET direct_driver_id = p_driver_id,
      driver_id = NULL
  WHERE id = p_order_id;

  -- Pending assignment is an offer for the selected courier, not acceptance.
  IF EXISTS (SELECT 1 FROM public.delivery_assignments WHERE order_id = p_order_id) THEN
    UPDATE public.delivery_assignments
    SET driver_id = p_driver_id,
        status = 'pending',
        updated_at = now()
    WHERE order_id = p_order_id;
  ELSE
    INSERT INTO public.delivery_assignments (order_id, driver_id, status)
    VALUES (p_order_id, p_driver_id, 'pending');
  END IF;

  PERFORM public.log_audit_event(auth.uid(), 'DIRECT_ORDER_SENT', 'orders', p_order_id);
END;
$$;

REVOKE ALL ON FUNCTION public.customer_send_direct_delivery_offer(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.customer_send_direct_delivery_offer(UUID, UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
