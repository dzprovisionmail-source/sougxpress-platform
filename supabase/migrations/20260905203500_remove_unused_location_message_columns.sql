-- Roll back the unused GPS message columns added for the removed chat location feature.
-- Verified before applying: chat_messages contains text rows only and no coordinates.
ALTER TABLE public.chat_messages
  DROP CONSTRAINT IF EXISTS chat_messages_location_coordinates_check;

DROP INDEX IF EXISTS public.idx_chat_messages_message_type;

ALTER TABLE public.chat_messages
  DROP COLUMN IF EXISTS message_type,
  DROP COLUMN IF EXISTS latitude,
  DROP COLUMN IF EXISTS longitude;

NOTIFY pgrst, 'reload schema';
