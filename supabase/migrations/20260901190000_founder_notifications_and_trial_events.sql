-- Founder monitoring notifications and trial registration events.
-- Uses the existing notifications columns: user_id is the recipient,
-- related_entity_* identifies the source, and data carries priority/deep_link.

CREATE OR REPLACE FUNCTION public.notify_founders_for_event(
  p_type TEXT,
  p_title TEXT,
  p_body TEXT,
  p_source_type TEXT,
  p_source_id UUID,
  p_deep_link TEXT,
  p_event_key TEXT,
  p_priority TEXT DEFAULT 'normal'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_founder RECORD;
BEGIN
  FOR v_founder IN
    SELECT id
    FROM public.profiles
    WHERE role IN ('founder', 'admin')
  LOOP
    PERFORM public.create_notification(
      v_founder.id,
      p_type,
      p_title,
      p_body,
      jsonb_build_object(
        'source_type', p_source_type,
        'source_id', p_source_id,
        'deep_link', p_deep_link,
        'priority', p_priority,
        'event_key', p_event_key
      ),
      p_source_type,
      p_source_id,
      p_event_key || ':' || v_founder.id::text
    );
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_founder_monitoring_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_name TEXT;
  v_status TEXT;
  v_customer_id UUID;
  v_order_id UUID;
BEGIN
  IF TG_TABLE_NAME = 'profiles' THEN
    IF TG_OP = 'INSERT' AND NEW.role NOT IN ('founder', 'admin') THEN
      PERFORM public.notify_founders_for_event(
        'account_registered', 'حساب جديد',
        'تم تسجيل حساب جديد من نوع ' || COALESCE(NEW.role, 'غير محدد'),
        'profiles', NEW.id, '/founder/users',
        'profile_registered:' || NEW.id::text, 'normal'
      );
    END IF;
  ELSIF TG_TABLE_NAME = 'customers' AND TG_OP = 'INSERT' THEN
    PERFORM public.notify_founders_for_event(
      'customer_registered', 'عميل جديد',
      'تم تسجيل عميل جديد في المنصة',
      'customers', NEW.id, '/founder/customers-control',
      'customer_registered:' || NEW.id::text, 'normal'
    );
  ELSIF TG_TABLE_NAME = 'merchants' AND TG_OP = 'INSERT' THEN
    v_status := COALESCE(NEW.status, 'pending_review');
    PERFORM public.notify_founders_for_event(
      'merchant_registered', 'تاجر جديد',
      CASE WHEN v_status = 'active'
        THEN 'تم تسجيل تاجر جديد وتفعيله تلقائيًا خلال الفترة التجريبية'
        ELSE 'تم تسجيل تاجر جديد ويحتاج إلى المراجعة'
      END,
      'merchants', NEW.id, '/founder/merchants-control',
      'merchant_registered:' || NEW.id::text, 'high'
    );
  ELSIF TG_TABLE_NAME = 'merchants' AND TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.notify_founders_for_event(
      'merchant_status_changed', 'تغير حالة تاجر',
      'تغيرت حالة التاجر إلى ' || COALESCE(NEW.status, 'غير محدد'),
      'merchants', NEW.id, '/founder/merchants-control',
      'merchant_status:' || NEW.id::text || ':' || COALESCE(NEW.status, 'none'), 'high'
    );
  ELSIF TG_TABLE_NAME = 'drivers' AND TG_OP = 'INSERT' THEN
    v_status := COALESCE(NEW.status, 'pending_review');
    PERFORM public.notify_founders_for_event(
      'driver_registered', 'موصل جديد',
      CASE WHEN v_status = 'active'
        THEN 'تم تسجيل موصل جديد وتفعيله تلقائيًا خلال الفترة التجريبية'
        ELSE 'تم تسجيل موصل جديد ويحتاج إلى المراجعة'
      END,
      'drivers', NEW.id, '/founder/couriers-control',
      'driver_registered:' || NEW.id::text, 'high'
    );
  ELSIF TG_TABLE_NAME = 'drivers' AND TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.notify_founders_for_event(
      'driver_status_changed', 'تغير حالة موصل',
      'تغيرت حالة الموصل إلى ' || COALESCE(NEW.status, 'غير محدد'),
      'drivers', NEW.id, '/founder/couriers-control',
      'driver_status:' || NEW.id::text || ':' || COALESCE(NEW.status, 'none'), 'high'
    );
  ELSIF TG_TABLE_NAME = 'stores' AND TG_OP = 'INSERT' THEN
    PERFORM public.notify_founders_for_event(
      'store_created', 'متجر جديد',
      'تم إنشاء متجر جديد: ' || COALESCE(NEW.name, 'بدون اسم'),
      'stores', NEW.id, '/founder/stores',
      'store_created:' || NEW.id::text, 'normal'
    );
  ELSIF TG_TABLE_NAME = 'stores' AND TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.notify_founders_for_event(
      'store_status_changed', 'تغير حالة متجر',
      'تغيرت حالة المتجر ' || COALESCE(NEW.name, 'بدون اسم') || ' إلى ' || COALESCE(NEW.status, 'غير محدد'),
      'stores', NEW.id, '/founder/stores',
      'store_status:' || NEW.id::text || ':' || COALESCE(NEW.status, 'none'), 'normal'
    );
  ELSIF TG_TABLE_NAME = 'orders' AND TG_OP = 'INSERT' THEN
    v_customer_id := NEW.customer_id;
    PERFORM public.notify_founders_for_event(
      'order_created', 'طلب جديد',
      'تم إنشاء طلب جديد يحتاج إلى المتابعة',
      'orders', NEW.id, '/founder/orders',
      'order_created:' || NEW.id::text, 'high'
    );
  ELSIF TG_TABLE_NAME = 'orders' AND TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.notify_founders_for_event(
      'order_status_changed', 'تغير حالة طلب',
      'تغيرت حالة الطلب إلى ' || COALESCE(NEW.status, 'غير محدد'),
      'orders', NEW.id, '/founder/orders',
      'order_status:' || NEW.id::text || ':' || COALESCE(NEW.status, 'none'), 'normal'
    );
  ELSIF TG_TABLE_NAME = 'delivery_assignments' AND TG_OP = 'INSERT' THEN
    PERFORM public.notify_founders_for_event(
      'delivery_assigned', 'تعيين توصيل',
      'تم إنشاء تعيين توصيل جديد',
      'delivery_assignments', NEW.id, '/founder/deliveries',
      'delivery_created:' || NEW.id::text, 'high'
    );
  ELSIF TG_TABLE_NAME = 'delivery_assignments' AND TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.notify_founders_for_event(
      'delivery_status_changed', 'تغير حالة التوصيل',
      'تغيرت حالة التوصيل إلى ' || COALESCE(NEW.status, 'غير محدد'),
      'delivery_assignments', NEW.id, '/founder/deliveries',
      'delivery_status:' || NEW.id::text || ':' || COALESCE(NEW.status, 'none'), 'normal'
    );
  ELSIF TG_TABLE_NAME = 'transactions' AND TG_OP = 'INSERT' THEN
    PERFORM public.notify_founders_for_event(
      'transaction_created', 'عملية مالية جديدة',
      'تم تسجيل عملية مالية جديدة وتحتاج إلى المتابعة',
      'transactions', NEW.id, '/founder/finance',
      'transaction_created:' || NEW.id::text, 'high'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_founder_profiles ON public.profiles;
CREATE TRIGGER trg_founder_profiles
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_founder_monitoring_event();

DROP TRIGGER IF EXISTS trg_founder_customers ON public.customers;
CREATE TRIGGER trg_founder_customers
AFTER INSERT ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.handle_founder_monitoring_event();

DROP TRIGGER IF EXISTS trg_founder_merchants ON public.merchants;
CREATE TRIGGER trg_founder_merchants
AFTER INSERT OR UPDATE OF status ON public.merchants
FOR EACH ROW EXECUTE FUNCTION public.handle_founder_monitoring_event();

DROP TRIGGER IF EXISTS trg_founder_drivers ON public.drivers;
CREATE TRIGGER trg_founder_drivers
AFTER INSERT OR UPDATE OF status ON public.drivers
FOR EACH ROW EXECUTE FUNCTION public.handle_founder_monitoring_event();

DROP TRIGGER IF EXISTS trg_founder_stores ON public.stores;
CREATE TRIGGER trg_founder_stores
AFTER INSERT OR UPDATE OF status ON public.stores
FOR EACH ROW EXECUTE FUNCTION public.handle_founder_monitoring_event();

DROP TRIGGER IF EXISTS trg_founder_orders ON public.orders;
CREATE TRIGGER trg_founder_orders
AFTER INSERT OR UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.handle_founder_monitoring_event();

DROP TRIGGER IF EXISTS trg_founder_deliveries ON public.delivery_assignments;
CREATE TRIGGER trg_founder_deliveries
AFTER INSERT OR UPDATE OF status ON public.delivery_assignments
FOR EACH ROW EXECUTE FUNCTION public.handle_founder_monitoring_event();

DROP TRIGGER IF EXISTS trg_founder_transactions ON public.transactions;
CREATE TRIGGER trg_founder_transactions
AFTER INSERT ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.handle_founder_monitoring_event();

-- Realtime is required for founder-specific notifications.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;
