-- Adds optional location message metadata without changing existing text messages.
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS message_type TEXT NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Existing rows remain text messages. Location rows require both coordinates.
ALTER TABLE public.chat_messages
  DROP CONSTRAINT IF EXISTS chat_messages_location_coordinates_check;
ALTER TABLE public.chat_messages
  ADD CONSTRAINT chat_messages_location_coordinates_check
  CHECK (
    message_type <> 'location'
    OR (latitude IS NOT NULL AND longitude IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS idx_chat_messages_message_type
  ON public.chat_messages (message_type);

NOTIFY pgrst, 'reload schema';
