-- Migration: 202607250000400_cleanup_broken_store_videos.sql
-- Purpose: Remove store_videos rows that are missing embed data.
--           Only embeddable, resolved videos should remain in store_videos.
--           Broken rows (from legacy inserts or failed resolution) are deleted.

BEGIN;

-- Delete rows that cannot be embedded or are missing required fields.
-- Per architecture: store_videos must contain only embeddable rows.
DELETE FROM public.store_videos
WHERE can_embed = false
   OR embed_url IS NULL
   OR trim(embed_url) = '';

COMMIT;