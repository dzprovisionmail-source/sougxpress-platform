CREATE OR REPLACE FUNCTION public.get_my_commercial_stats()
RETURNS TABLE (
    customer_purchases_completed BIGINT,
    customer_deliveries_completed BIGINT,
    merchant_orders_completed BIGINT,
    merchant_sales_completed_minor BIGINT,
    driver_deliveries_completed BIGINT,
    driver_delivery_gross_minor BIGINT,
    driver_commission_owed_minor BIGINT,
    driver_net_minor BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_customer_purchases BIGINT := 0;
    v_merchant_orders BIGINT := 0;
    v_merchant_sales BIGINT := 0;
    v_driver_deliveries BIGINT := 0;
    v_driver_commission BIGINT := 0;
BEGIN
    SELECT COUNT(*)
      INTO v_customer_purchases
    FROM public.orders AS o
    WHERE o.customer_id = auth.uid()
      AND o.status = 'delivered';

    SELECT COUNT(*), COALESCE(SUM(o.total_minor), 0)
      INTO v_merchant_orders, v_merchant_sales
    FROM public.orders AS o
    INNER JOIN public.stores AS s ON s.id = o.store_id
    WHERE s.merchant_id = auth.uid()
      AND o.status = 'delivered';

    SELECT
      COALESCE((SELECT d.delivery_count FROM public.drivers AS d WHERE d.id = auth.uid()), 0),
      COALESCE((SELECT d.commission_owed_minor FROM public.drivers AS d WHERE d.id = auth.uid()), 0)
      INTO v_driver_deliveries, v_driver_commission;

    RETURN QUERY
    SELECT
        v_customer_purchases,
        v_customer_purchases,
        v_merchant_orders,
        v_merchant_sales,
        v_driver_deliveries,
        v_driver_deliveries * 20000,
        v_driver_commission,
        (v_driver_deliveries * 20000) - v_driver_commission;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_commercial_stats() TO authenticated;
