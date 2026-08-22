/**
 * Founder Chat Control Service
 * Reads real chat conversations and messages using calling user's JWT and existing RLS.
 */

import { supabase } from "@/lib/supabase";
import type { Conversation, Message } from "./chat.service";

export async function getFounderConversations(search?: string, relationshipType?: string): Promise<Conversation[]> {
  try {
    let query = supabase
      .from("v_chat_conversations_list")
      .select("*")
      .order("last_message_at", { ascending: false, nullsFirst: false });

    if (relationshipType && relationshipType !== "all") {
      query = query.eq("relationship_type", relationshipType);
    }

    const { data, error } = await query;
    if (error) {
      console.error("getFounderConversations error:", error.message);
      return [];
    }

    const rows = (data ?? []) as Record<string, unknown>[];
    return rows.map((conv) => {
      const other = {
        id: String(conv.participant_two ?? ""),
        full_name: conv.p2_full_name ? String(conv.p2_full_name) : null,
        avatar_url: conv.p2_avatar_url ? String(conv.p2_avatar_url) : null,
        role: conv.p2_role ? String(conv.p2_role) : "",
        store_name: conv.p2_store_name ? String(conv.p2_store_name) : null,
        store_logo: conv.p2_store_logo ? String(conv.p2_store_logo) : null,
      };

      return {
        id: String(conv.id),
        participant_one: String(conv.participant_one),
        participant_two: String(conv.participant_two),
        relationship_type: (conv.relationship_type as any) ?? "customer_merchant",
        reference_id: conv.reference_id ? String(conv.reference_id) : null,
        last_message_at: String(conv.last_message_at ?? conv.created_at),
        created_at: String(conv.created_at),
        other_participant: other,
        last_message: conv.last_message_content
          ? {
              content: String(conv.last_message_content),
              create_at: String(conv.last_message_time ?? conv.created_at),
            }
          : undefined,
      };
    });
  } catch (err) {
    console.error("getFounderConversations exception:", err);
    return [];
  }
}

export async function getFounderConversationMessages(conversationId: string): Promise<Message[]> {
  try {
    const { data, error } = await supabase
      .from("chat_messages")
      .select("id, conversation_id, sender_id, content, is_read, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("getFounderConversationMessages error:", error.message);
      return [];
    }

    return (data ?? []).map((m: any) => ({
      id: String(m.id),
      conversation_id: String(m.conversation_id),
      sender_id: String(m.sender_id),
      content: String(m.content),
      is_read: Boolean(m.is_read),
      created_at: String(m.created_at),
    }));
  } catch (err) {
    console.error("getFounderConversationMessages exception:", err);
    return [];
  }
}
