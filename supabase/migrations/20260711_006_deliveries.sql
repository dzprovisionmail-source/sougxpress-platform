-- Migration: 006_deliveries.sql
-- Purpose: Delivery assignments and commission tracking

-- Create delivery_assignments table
CREATE TABLE IF NOT EXISTS public.delivery_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- e.g., 'pending', 'assigned', 'picked_up', 'delivered', 'failed'
    assigned_at TIMESTAMP WITH TIME ZONE,
    picked_up_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create delivery_commission_cycles table
CREATE TABLE IF NOT EXISTS public.delivery_commission_cycles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
    cycle_start_date TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    cycle_end_date TIMESTAMP WITH TIME ZONE,
    deliveries_count INTEGER DEFAULT 0 NOT NULL,
    commission_earned_minor INTEGER DEFAULT 0 NOT NULL, -- Total commission in minor units
    status TEXT NOT NULL DEFAULT 'active', -- e.g., 'active', 'payment_due', 'payment_confirmed', 'closed'
    payment_due_at TIMESTAMP WITH TIME ZONE,
    payment_confirmed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_delivery_assignments_order_id ON public.delivery_assignments(order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_assignments_driver_id ON public.delivery_assignments(driver_id);
CREATE INDEX IF NOT EXISTS idx_delivery_assignments_status ON public.delivery_assignments(status);
CREATE INDEX IF NOT EXISTS idx_delivery_commission_cycles_driver_id ON public.delivery_commission_cycles(driver_id);
CREATE INDEX IF NOT EXISTS idx_delivery_commission_cycles_status ON public.delivery_commission_cycles(status);

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_delivery_assignments_updated_at
BEFORE UPDATE ON public.delivery_assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_delivery_commission_cycles_updated_at
BEFORE UPDATE ON public.delivery_commission_cycles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
