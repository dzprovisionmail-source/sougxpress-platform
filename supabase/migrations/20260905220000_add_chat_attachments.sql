-- Private chat attachments, limited to 2 MiB per object.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat_attachments',
  'chat_attachments',
  FALSE,
  2097152,
  ARRAY[
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf', 'text/plain', 'application/zip',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/octet-stream'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS message_type TEXT NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS attachment_path TEXT,
  ADD COLUMN IF NOT EXISTS attachment_name TEXT,
  ADD COLUMN IF NOT EXISTS attachment_size INTEGER,
  ADD COLUMN IF NOT EXISTS attachment_mime_type TEXT;

ALTER TABLE public.chat_messages
  DROP CONSTRAINT IF EXISTS chat_messages_attachment_metadata_check;
ALTER TABLE public.chat_messages
  ADD CONSTRAINT chat_messages_attachment_metadata_check
  CHECK (
    message_type <> 'attachment'
    OR (
      attachment_path IS NOT NULL
      AND attachment_name IS NOT NULL
      AND attachment_size IS NOT NULL
      AND attachment_size > 0
      AND attachment_size <= 2097152
    )
  );

DROP POLICY IF EXISTS "chat_attachments_insert_participant" ON storage.objects;
CREATE POLICY "chat_attachments_insert_participant" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'chat_attachments'
  AND split_part(name, '/', 1) = auth.uid()::text
  AND EXISTS (
    SELECT 1
    FROM public.chat_conversations c
    WHERE c.id::text = split_part(name, '/', 2)
      AND (c.participant_one = auth.uid() OR c.participant_two = auth.uid())
  )
);

DROP POLICY IF EXISTS "chat_attachments_select_participant" ON storage.objects;
CREATE POLICY "chat_attachments_select_participant" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'chat_attachments'
  AND EXISTS (
    SELECT 1
    FROM public.chat_conversations c
    WHERE c.id::text = split_part(name, '/', 2)
      AND (c.participant_one = auth.uid() OR c.participant_two = auth.uid())
  )
);

DROP POLICY IF EXISTS "chat_attachments_update_owner" ON storage.objects;
CREATE POLICY "chat_attachments_update_owner" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'chat_attachments' AND split_part(name, '/', 1) = auth.uid()::text)
WITH CHECK (bucket_id = 'chat_attachments' AND split_part(name, '/', 1) = auth.uid()::text);

DROP POLICY IF EXISTS "chat_attachments_delete_owner" ON storage.objects;
CREATE POLICY "chat_attachments_delete_owner" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'chat_attachments' AND split_part(name, '/', 1) = auth.uid()::text);

NOTIFY pgrst, 'reload schema';
