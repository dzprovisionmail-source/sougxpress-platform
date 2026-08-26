-- Replace per-delivery commission with role subscriptions.
-- Historical commission columns remain for compatibility but are no longer operational.

CREATE TABLE IF NOT EXISTS public.account_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('merchant', 'driver')),
  status TEXT NOT NULL DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'past_due', 'canceled')),
  monthly_price_minor INTEGER NOT NULL CHECK (monthly_price_minor >= 0),
  subscription_start TIMESTAMPTZ NOT NULL,
  trial_start TIMESTAMPTZ NOT NULL,
  trial_end TIMESTAMPTZ NOT NULL,
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (account_id, role)
);

CREATE INDEX IF NOT EXISTS idx_account_subscriptions_account
  ON public.account_subscriptions(account_id);
CREATE INDEX IF NOT EXISTS idx_account_subscriptions_status
  ON public.account_subscriptions(status);

CREATE OR REPLACE FUNCTION public.fn_subscription_price_for_role(p_role TEXT)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_role
    WHEN 'driver' THEN 50000
    WHEN 'merchant' THEN 100000
    ELSE 0
  END;
$$;

CREATE OR REPLACE FUNCTION public.fn_provision_account_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_start TIMESTAMPTZ := COALESCE(NEW.created_at, now());
  v_trial_end TIMESTAMPTZ := v_start + interval '1 month';
BEGIN
  v_role := TG_ARGV[0];
  INSERT INTO public.account_subscriptions (
    account_id, role, status, monthly_price_minor,
    subscription_start, trial_start, trial_end,
    current_period_start, current_period_end
  ) VALUES (
    NEW.id, v_role,
    CASE WHEN v_trial_end > now() THEN 'trial' ELSE 'active' END,
    public.fn_subscription_price_for_role(v_role),
    v_start, v_start, v_trial_end, v_start, v_trial_end
  )
  ON CONFLICT (account_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_provision_merchant_subscription ON public.merchants;
CREATE TRIGGER trg_provision_merchant_subscription
  AFTER INSERT ON public.merchants
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_provision_account_subscription('merchant');

DROP TRIGGER IF EXISTS trg_provision_driver_subscription ON public.drivers;
CREATE TRIGGER trg_provision_driver_subscription
  AFTER INSERT ON public.drivers
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_provision_account_subscription('driver');

INSERT INTO public.account_subscriptions (
  account_id, role, status, monthly_price_minor,
  subscription_start, trial_start, trial_end,
  current_period_start, current_period_end
)
SELECT id, 'merchant',
  CASE WHEN created_at + interval '1 month' > now() THEN 'trial' ELSE 'active' END,
  100000, created_at, created_at, created_at + interval '1 month',
  created_at, created_at + interval '1 month'
FROM public.merchants
ON CONFLICT (account_id, role) DO NOTHING;

INSERT INTO public.account_subscriptions (
  account_id, role, status, monthly_price_minor,
  subscription_start, trial_start, trial_end,
  current_period_start, current_period_end
)
SELECT id, 'driver',
  CASE WHEN created_at + interval '1 month' > now() THEN 'trial' ELSE 'active' END,
  50000, created_at, created_at, created_at + interval '1 month',
  created_at, created_at + interval '1 month'
FROM public.drivers
ON CONFLICT (account_id, role) DO NOTHING;

-- Stop old operational enforcement and commission accrual. Keep historical columns.
DROP TRIGGER IF EXISTS trg_driver_delivery_completion ON public.delivery_assignments;
DROP TRIGGER IF EXISTS trg_block_suspended_driver_assignments ON public.delivery_assignments;
DROP FUNCTION IF EXISTS public.fn_handle_driver_delivery_completion();
DROP FUNCTION IF EXISTS public.fn_block_suspended_driver_assignments();

-- Preserve order audit logging, but remove commission-cycle and commission-transaction side effects.
CREATE OR REPLACE FUNCTION public.handle_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM public.log_audit_event(
    NEW.customer_id,
    'order_status_change',
    'orders',
    NEW.id,
    jsonb_build_object('status', OLD.status),
    jsonb_build_object('status', NEW.status)
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_apply_current_delivery_policy()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.delivery_fee_minor := 15000;
  NEW.platform_commission_minor := 0;
  NEW.order_total_minor := COALESCE(NEW.order_total_minor, 0);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_current_delivery_policy ON public.orders;
CREATE TRIGGER trg_apply_current_delivery_policy
  BEFORE INSERT OR UPDATE OF delivery_fee_minor, platform_commission_minor ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_apply_current_delivery_policy();

UPDATE public.orders
SET delivery_fee_minor = 15000,
    platform_commission_minor = 0,
    order_total_minor = order_total_minor - COALESCE(delivery_fee_minor, 0) + 15000
WHERE delivery_fee_minor IS DISTINCT FROM 15000
   OR platform_commission_minor IS DISTINCT FROM 0;

-- New policy settings: fixed delivery fee and monthly subscriptions. Legacy keys remain readable for compatibility.
INSERT INTO public.platform_financial_settings (key, value, description)
VALUES
  ('base_delivery_fee_minor', '15000', 'Fixed delivery fee: 150 DZD; fully payable to the driver.'),
  ('merchant_subscription_fee_minor', '100000', 'Merchant monthly subscription: 1000 DZD; first month free.'),
  ('driver_subscription_fee_minor', '50000', 'Driver monthly subscription: 500 DZD; first month free.'),
  ('delivery_platform_share_percent', '0', 'Legacy setting retained for compatibility; no per-order platform share.'),
  ('default_merchant_commission_rate', '0', 'Legacy setting retained for compatibility; no merchant commission.'),
  ('commission_cycle_threshold', '0', 'Legacy setting retained for compatibility; no commission settlement cycle.')
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value,
    description = EXCLUDED.description,
    updated_at = now();

-- Keep legacy merchant commission fields readable for old rows, but make the default operational rate zero.
UPDATE public.merchants
SET commission_rate = 0
WHERE commission_rate IS DISTINCT FROM 0;

ALTER TABLE public.account_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS account_subscriptions_select_self_or_admin ON public.account_subscriptions;
CREATE POLICY account_subscriptions_select_self_or_admin
ON public.account_subscriptions
FOR SELECT TO public
USING (
  account_id = auth.uid()
  OR public.get_user_role(auth.uid()) IN ('founder', 'admin')
);

CREATE OR REPLACE FUNCTION public.fn_refresh_subscription_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'trial' AND NEW.trial_end <= now() THEN
    NEW.status := 'active';
    NEW.current_period_start := NEW.trial_end;
    NEW.current_period_end := NEW.trial_end + interval '1 month';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_refresh_subscription_status ON public.account_subscriptions;
CREATE TRIGGER trg_refresh_subscription_status
  BEFORE UPDATE ON public.account_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_refresh_subscription_status();

COMMENT ON TABLE public.account_subscriptions IS 'Monthly merchant/driver subscriptions. First month is free; no per-order commission.';
COMMENT ON COLUMN public.account_subscriptions.trial_end IS 'One month after the account subscription start; no fixed global date.';
