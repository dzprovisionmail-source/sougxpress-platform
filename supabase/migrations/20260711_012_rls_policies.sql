-- Migration: 012_rls_policies.sql
-- Purpose: Row Level Security policies for all roles

-- Enable RLS on tables
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_commission_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.founder_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_metrics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.founder_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_financial_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create a function to get the user's role (placeholder, assuming roles are managed via auth.users metadata or a separate table)
-- In a real Supabase setup, you might use auth.jwt() ->> 'user_role' or a custom function that queries a user_roles table.
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS TEXT AS $$
BEGIN
    -- Placeholder: In a real application, this would query a user_roles table or extract from JWT
    -- For now, we'll assume a simple mapping or direct role assignment for policy testing
    -- This function needs to be properly implemented based on how roles are stored in auth.users metadata or a separate table.
    -- For demonstration, let's assume a 'user_roles' table exists or roles are in auth.users app_metadata
    -- Example: SELECT (auth.jwt() ->> 'app_metadata')::jsonb ->> 'user_role';
    RETURN (SELECT raw_app_meta_data ->> 'user_role' FROM auth.users WHERE id = user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policies for public.zones
CREATE POLICY 
rls_select_zones ON public.zones
FOR SELECT USING (TRUE);

-- Policies for public.customers
CREATE POLICY rls_select_customers ON public.customers
FOR SELECT USING (id = auth.uid() OR public.get_user_role(auth.uid()) IN (
    'admin', 'founder'
));
CREATE POLICY rls_insert_customers ON public.customers
FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY rls_update_customers ON public.customers
FOR UPDATE USING (id = auth.uid());

-- Policies for public.customer_addresses
CREATE POLICY rls_select_customer_addresses ON public.customer_addresses
FOR SELECT USING (customer_id = auth.uid() OR public.get_user_role(auth.uid()) IN (
    'admin', 'founder'
));
CREATE POLICY rls_insert_customer_addresses ON public.customer_addresses
FOR INSERT WITH CHECK (customer_id = auth.uid());
CREATE POLICY rls_update_customer_addresses ON public.customer_addresses
FOR UPDATE USING (customer_id = auth.uid());
CREATE POLICY rls_delete_customer_addresses ON public.customer_addresses
FOR DELETE USING (customer_id = auth.uid());

-- Policies for public.merchants
CREATE POLICY rls_select_merchants ON public.merchants
FOR SELECT USING (id = auth.uid() OR public.get_user_role(auth.uid()) IN (
    'admin', 'founder'
));
CREATE POLICY rls_insert_merchants ON public.merchants
FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY rls_update_merchants ON public.merchants
FOR UPDATE USING (id = auth.uid());

-- Policies for public.stores
CREATE POLICY rls_select_stores ON public.stores
FOR SELECT USING (TRUE);
CREATE POLICY rls_insert_stores ON public.stores
FOR INSERT WITH CHECK (merchant_id = auth.uid());
CREATE POLICY rls_update_stores ON public.stores
FOR UPDATE USING (merchant_id = auth.uid());
CREATE POLICY rls_delete_stores ON public.stores
FOR DELETE USING (merchant_id = auth.uid());

-- Policies for public.products
CREATE POLICY rls_select_products ON public.products
FOR SELECT USING (TRUE);
CREATE POLICY rls_insert_products ON public.products
FOR INSERT WITH CHECK (store_id IN (SELECT id FROM public.stores WHERE merchant_id = auth.uid()));
CREATE POLICY rls_update_products ON public.products
FOR UPDATE USING (store_id IN (SELECT id FROM public.stores WHERE merchant_id = auth.uid()));
CREATE POLICY rls_delete_products ON public.products
FOR DELETE USING (store_id IN (SELECT id FROM public.stores WHERE merchant_id = auth.uid()));

-- Policies for public.product_images
CREATE POLICY rls_select_product_images ON public.product_images
FOR SELECT USING (TRUE);
CREATE POLICY rls_insert_product_images ON public.product_images
FOR INSERT WITH CHECK (product_id IN (SELECT id FROM public.products WHERE store_id IN (SELECT id FROM public.stores WHERE merchant_id = auth.uid())));
CREATE POLICY rls_update_product_images ON public.product_images
FOR UPDATE USING (product_id IN (SELECT id FROM public.products WHERE store_id IN (SELECT id FROM public.stores WHERE merchant_id = auth.uid())));
CREATE POLICY rls_delete_product_images ON public.product_images
FOR DELETE USING (product_id IN (SELECT id FROM public.products WHERE store_id IN (SELECT id FROM public.stores WHERE merchant_id = auth.uid())));

-- Policies for public.orders
CREATE POLICY rls_select_orders ON public.orders
FOR SELECT USING (customer_id = auth.uid() OR store_id IN (SELECT id FROM public.stores WHERE merchant_id = auth.uid()) OR id IN (SELECT order_id FROM public.delivery_assignments WHERE driver_id = auth.uid()) OR public.get_user_role(auth.uid()) IN (
    'admin', 'founder'
));
CREATE POLICY rls_insert_orders ON public.orders
FOR INSERT WITH CHECK (customer_id = auth.uid());
CREATE POLICY rls_update_orders ON public.orders
FOR UPDATE USING (customer_id = auth.uid() OR store_id IN (SELECT id FROM public.stores WHERE merchant_id = auth.uid()) OR id IN (SELECT order_id FROM public.delivery_assignments WHERE driver_id = auth.uid()) OR public.get_user_role(auth.uid()) IN (
    'admin', 'founder'
));

-- Policies for public.order_items
CREATE POLICY rls_select_order_items ON public.order_items
FOR SELECT USING (order_id IN (SELECT id FROM public.orders WHERE customer_id = auth.uid() OR store_id IN (SELECT id FROM public.stores WHERE merchant_id = auth.uid()) OR id IN (SELECT order_id FROM public.delivery_assignments WHERE driver_id = auth.uid()) OR public.get_user_role(auth.uid()) IN (
    'admin', 'founder'
)));
CREATE POLICY rls_insert_order_items ON public.order_items
FOR INSERT WITH CHECK (order_id IN (SELECT id FROM public.orders WHERE customer_id = auth.uid()));

-- Policies for public.order_status_history
CREATE POLICY rls_select_order_status_history ON public.order_status_history
FOR SELECT USING (order_id IN (SELECT id FROM public.orders WHERE customer_id = auth.uid() OR store_id IN (SELECT id FROM public.stores WHERE merchant_id = auth.uid()) OR id IN (SELECT order_id FROM public.delivery_assignments WHERE driver_id = auth.uid()) OR public.get_user_role(auth.uid()) IN (
    'admin', 'founder'
)));

-- Policies for public.drivers
CREATE POLICY rls_select_drivers ON public.drivers
FOR SELECT USING (id = auth.uid() OR public.get_user_role(auth.uid()) IN (
    'admin', 'founder'
));
CREATE POLICY rls_insert_drivers ON public.drivers
FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY rls_update_drivers ON public.drivers
FOR UPDATE USING (id = auth.uid());

-- Policies for public.driver_locations
CREATE POLICY rls_select_driver_locations ON public.driver_locations
FOR SELECT USING (driver_id = auth.uid() OR public.get_user_role(auth.uid()) IN (
    'admin', 'founder'
));
CREATE POLICY rls_insert_driver_locations ON public.driver_locations
FOR INSERT WITH CHECK (driver_id = auth.uid());
CREATE POLICY rls_update_driver_locations ON public.driver_locations
FOR UPDATE USING (driver_id = auth.uid());

-- Policies for public.delivery_assignments
CREATE POLICY rls_select_delivery_assignments ON public.delivery_assignments
FOR SELECT USING (driver_id = auth.uid() OR order_id IN (SELECT id FROM public.orders WHERE customer_id = auth.uid() OR store_id IN (SELECT id FROM public.stores WHERE merchant_id = auth.uid())) OR public.get_user_role(auth.uid()) IN (
    'admin', 'founder'
));
CREATE POLICY rls_insert_delivery_assignments ON public.delivery_assignments
FOR INSERT WITH CHECK (public.get_user_role(auth.uid()) IN (
    'admin', 'founder'
));
CREATE POLICY rls_update_delivery_assignments ON public.delivery_assignments
FOR UPDATE USING (driver_id = auth.uid() OR public.get_user_role(auth.uid()) IN (
    'admin', 'founder'
));

-- Policies for public.delivery_commission_cycles
CREATE POLICY rls_select_delivery_commission_cycles ON public.delivery_commission_cycles
FOR SELECT USING (driver_id = auth.uid() OR public.get_user_role(auth.uid()) IN (
    'admin', 'founder'
));
CREATE POLICY rls_update_delivery_commission_cycles ON public.delivery_commission_cycles
FOR UPDATE USING (public.get_user_role(auth.uid()) IN (
    'admin', 'founder'
));

-- Policies for public.payouts
CREATE POLICY rls_select_payouts ON public.payouts
FOR SELECT USING (entity_id = auth.uid() OR public.get_user_role(auth.uid()) IN (
    'admin', 'founder'
));
CREATE POLICY rls_update_payouts ON public.payouts
FOR UPDATE USING (public.get_user_role(auth.uid()) IN (
    'admin', 'founder'
));

-- Policies for public.transactions
CREATE POLICY rls_select_transactions ON public.transactions
FOR SELECT USING (customer_id = auth.uid() OR merchant_id = auth.uid() OR driver_id = auth.uid() OR public.get_user_role(auth.uid()) IN (
    'admin', 'founder'
));

-- Policies for public.notifications
CREATE POLICY rls_select_notifications ON public.notifications
FOR SELECT USING (user_id = auth.uid() OR public.get_user_role(auth.uid()) IN (
    'admin', 'founder'
));
CREATE POLICY rls_update_notifications ON public.notifications
FOR UPDATE USING (user_id = auth.uid() OR public.get_user_role(auth.uid()) IN (
    'admin', 'founder'
));

-- Policies for public.promotions
CREATE POLICY rls_select_promotions ON public.promotions
FOR SELECT USING (TRUE);
CREATE POLICY rls_insert_promotions ON public.promotions
FOR INSERT WITH CHECK (public.get_user_role(auth.uid()) IN (
    'admin', 'founder'
));
CREATE POLICY rls_update_promotions ON public.promotions
FOR UPDATE USING (public.get_user_role(auth.uid()) IN (
    'admin', 'founder'
));
CREATE POLICY rls_delete_promotions ON public.promotions
FOR DELETE USING (public.get_user_role(auth.uid()) IN (
    'admin', 'founder'
));

-- Policies for public.promotion_redemptions
CREATE POLICY rls_select_promotion_redemptions ON public.promotion_redemptions
FOR SELECT USING (user_id = auth.uid() OR public.get_user_role(auth.uid()) IN (
    'admin', 'founder'
));
CREATE POLICY rls_insert_promotion_redemptions ON public.promotion_redemptions
FOR INSERT WITH CHECK (user_id = auth.uid());

-- Policies for public.disputes
CREATE POLICY rls_select_disputes ON public.disputes
FOR SELECT USING (customer_id = auth.uid() OR merchant_id = auth.uid() OR driver_id = auth.uid() OR public.get_user_role(auth.uid()) IN (
    'admin', 'founder'
));
CREATE POLICY rls_insert_disputes ON public.disputes
FOR INSERT WITH CHECK (customer_id = auth.uid());
CREATE POLICY rls_update_disputes ON public.disputes
FOR UPDATE USING (customer_id = auth.uid() OR public.get_user_role(auth.uid()) IN (
    'admin', 'founder'
));

-- Policies for public.founder_overrides
CREATE POLICY rls_select_founder_overrides ON public.founder_overrides
FOR SELECT USING (public.get_user_role(auth.uid()) IN (
    'founder'
));
CREATE POLICY rls_insert_founder_overrides ON public.founder_overrides
FOR INSERT WITH CHECK (public.get_user_role(auth.uid()) IN (
    'founder'
));

-- Policies for public.platform_metrics_snapshots
CREATE POLICY rls_select_platform_metrics_snapshots ON public.platform_metrics_snapshots
FOR SELECT USING (public.get_user_role(auth.uid()) IN (
    'admin', 'founder'
));

-- Policies for public.founder_alerts
CREATE POLICY rls_select_founder_alerts ON public.founder_alerts
FOR SELECT USING (public.get_user_role(auth.uid()) IN (
    'founder'
));
CREATE POLICY rls_update_founder_alerts ON public.founder_alerts
FOR UPDATE USING (public.get_user_role(auth.uid()) IN (
    'founder'
));

-- Policies for public.platform_financial_settings
CREATE POLICY rls_select_platform_financial_settings ON public.platform_financial_settings
FOR SELECT USING (public.get_user_role(auth.uid()) IN (
    'admin', 'founder'
));
CREATE POLICY rls_update_platform_financial_settings ON public.platform_financial_settings
FOR UPDATE USING (public.get_user_role(auth.uid()) IN (
    'founder'
));

-- Policies for public.audit_logs
CREATE POLICY rls_select_audit_logs ON public.audit_logs
FOR SELECT USING (public.get_user_role(auth.uid()) IN (
    'admin', 'founder'
));
