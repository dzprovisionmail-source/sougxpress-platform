-- Enable Realtime for core commercial cycle tables
-- This ensures that orders, assignments, and profiles update instantly across all parties.

DO $$
BEGIN
    -- Check if the publication exists, if not create it
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END $$;

-- Add tables to the publication
-- We use ALTER PUBLICATION ... ADD TABLE ... 
-- Note: If a table is already in the publication, this might fail, so we check first.

DO $$
DECLARE
    t text;
    tables_to_add text[] := ARRAY['drivers', 'delivery_assignments', 'orders', 'profiles', 'conversations', 'messages', 'customer_addresses', 'stores'];
BEGIN
    FOREACH t IN ARRAY tables_to_add LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' AND tablename = t
        ) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
        END IF;
    END LOOP;
END $$;
