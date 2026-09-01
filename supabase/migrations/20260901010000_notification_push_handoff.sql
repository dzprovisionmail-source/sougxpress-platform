-- Deliver every newly-created notification to the deployed push processor.
-- The existing business triggers correctly create rows in public.notifications,
-- but there was no INSERT handoff, leaving every row permanently pending.

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.enqueue_notification_push()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://pmxydehrctwvawjbhrhl.supabase.co/functions/v1/push-processor',
    body := jsonb_build_object('record', row_to_json(NEW)),
    headers := jsonb_build_object('Content-Type', 'application/json')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enqueue_notification_push ON public.notifications;
CREATE TRIGGER trg_enqueue_notification_push
AFTER INSERT ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.enqueue_notification_push();

COMMENT ON FUNCTION public.enqueue_notification_push() IS
  'Asynchronously forwards each notification row to push-processor via pg_net.';
