-- Migration: 20260818273000_enhanced_chat_views.sql
-- Description: Provides an enhanced view for chat conversations including last message and store names for merchants.

CREATE OR REPLACE VIEW public.v_chat_conversations_list AS
WITH last_messages AS (
    SELECT DISTINCT ON (conversation_id)
        conversation_id,
        content,
        created_at
    FROM public.chat_messages
    ORDER BY conversation_id, created_at DESC
),
participant_details AS (
    SELECT 
        p.id,
        p.full_name,
        p.avatar_url,
        p.role,
        s.name AS store_name,
        s.logo_url AS store_logo
    FROM public.profiles p
    LEFT JOIN public.stores s ON p.id = s.merchant_id AND p.role = 'merchant'
)
SELECT 
    c.id,
    c.participant_one,
    c.participant_two,
    c.relationship_type,
    c.reference_id,
    c.last_message_at,
    c.created_at,
    -- Participant One Details
    p1.full_name AS p1_full_name,
    p1.avatar_url AS p1_avatar_url,
    p1.role AS p1_role,
    p1.store_name AS p1_store_name,
    p1.store_logo AS p1_store_logo,
    -- Participant Two Details
    p2.full_name AS p2_full_name,
    p2.avatar_url AS p2_avatar_url,
    p2.role AS p2_role,
    p2.store_name AS p2_store_name,
    p2.store_logo AS p2_store_logo,
    -- Last Message
    lm.content AS last_message_content,
    lm.created_at AS last_message_time
FROM public.chat_conversations c
LEFT JOIN participant_details p1 ON c.participant_one = p1.id
LEFT JOIN participant_details p2 ON c.participant_two = p2.id
LEFT JOIN last_messages lm ON c.id = lm.conversation_id;

GRANT SELECT ON public.v_chat_conversations_list TO authenticated;
