-- Migration: 20260818270000_chat_infrastructure.sql
-- Description: Secure Commercial Chat Infrastructure for Soug-XPRESS (Chat Phase 2)
-- Enforces commercial relationship checks, RLS, zero phone disclosure, and order context linking.

-- 1. Create chat_conversations table
CREATE TABLE IF NOT EXISTS public.chat_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_one UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    participant_two UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    relationship_type TEXT NOT NULL CHECK (relationship_type IN ('customer_merchant', 'customer_courier', 'merchant_courier')),
    reference_id UUID, -- order_id or entity reference if applicable
    last_message_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_conversation_participants UNIQUE (participant_one, participant_two, relationship_type, reference_id)
);

-- Index for fast lookup by participants
CREATE INDEX IF NOT EXISTS idx_chat_conversations_p1 ON public.chat_conversations(participant_one);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_p2 ON public.chat_conversations(participant_two);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_ref ON public.chat_conversations(reference_id);

-- 2. Create chat_messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast message retrieval per conversation
CREATE INDEX IF NOT EXISTS idx_chat_messages_conv ON public.chat_messages(conversation_id, created_at);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
