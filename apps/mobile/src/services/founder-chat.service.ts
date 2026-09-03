/**
 * Founder Chat Control Service
 * Reads real chat conversations and messages using calling user's JWT and existing RLS.
 */

import { supabase } from "@/lib/supabase";
import type { Conversation, Message, ParticipantIdentity } from "./chat.service";

export type FounderConversationType = "commercial" | "support";

export async function getFounderConversations(
  search?: string,
  relationshipType?: string,
  conversationType: FounderConversationType = "commercial",
): Promise<Conversation[]> {
  try {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    let query = supabase
      .from("v_chat_conversations_list")
      .select("*")
      .order("last_message_at", { ascending: false, nullsFirst: false });

    query = query.eq("conversation_type", conversationType);
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
      const p1Role = conv.p1_role ? String(conv.p1_role) : "";
      const p2Role = conv.p2_role ? String(conv.p2_role) : "";
      const p1IsStaff = p1Role === "founder" || p1Role === "admin";
      const p2IsStaff = p2Role === "founder" || p2Role === "admin";
      // Support conversations pair a customer/merchant/courier with staff.
      // Prefer the non-staff participant even if the auth user is not returned
      // by getUser yet, preventing Founder from being shown as the caller.
      const supportOtherIsP1 = conversationType === "support"
        ? (p2IsStaff && !p1IsStaff ? true : p1IsStaff && !p2IsStaff ? false : currentUser?.id === String(conv.participant_two ?? ""))
        : false;
      const otherPrefix = supportOtherIsP1 ? "p1" : "p2";
      const participantOne: ParticipantIdentity = {
        id: String(conv.participant_one ?? ""),
        full_name: conv.p1_full_name ? String(conv.p1_full_name) : null,
        avatar_url: conv.p1_avatar_url ? String(conv.p1_avatar_url) : null,
        role: conv.p1_role ? String(conv.p1_role) : "",
        store_name: conv.p1_store_name ? String(conv.p1_store_name) : null,
        store_logo: conv.p1_store_logo ? String(conv.p1_store_logo) : null,
      };
      const participantTwo: ParticipantIdentity = {
        id: String(conv.participant_two ?? ""),
        full_name: conv.p2_full_name ? String(conv.p2_full_name) : null,
        avatar_url: conv.p2_avatar_url ? String(conv.p2_avatar_url) : null,
        role: conv.p2_role ? String(conv.p2_role) : "",
        store_name: conv.p2_store_name ? String(conv.p2_store_name) : null,
        store_logo: conv.p2_store_logo ? String(conv.p2_store_logo) : null,
      };
      const other = {
        id: String(supportOtherIsP1 ? conv.participant_one : conv.participant_two ?? ""),
        full_name: conv[`${otherPrefix}_full_name`] ? String(conv[`${otherPrefix}_full_name`]) : null,
        avatar_url: conv[`${otherPrefix}_avatar_url`] ? String(conv[`${otherPrefix}_avatar_url`]) : null,
        role: conv[`${otherPrefix}_role`] ? String(conv[`${otherPrefix}_role`]) : "",
        store_name: conv[`${otherPrefix}_store_name`] ? String(conv[`${otherPrefix}_store_name`]) : null,
        store_logo: conv[`${otherPrefix}_store_logo`] ? String(conv[`${otherPrefix}_store_logo`]) : null,
      };

      return {
        id: String(conv.id),
        participant_one: String(conv.participant_one),
        participant_two: String(conv.participant_two),
        relationship_type: (conv.relationship_type as any) ?? null,
        conversation_type: (conv.conversation_type as "commercial" | "support" | undefined) ?? conversationType,
        reference_id: conv.reference_id ? String(conv.reference_id) : null,
        last_message_at: String(conv.last_message_at ?? conv.created_at),
        created_at: String(conv.created_at),
        other_participant: other,
        participant_one_identity: participantOne,
        participant_two_identity: participantTwo,
        last_message: conv.last_message_content
          ? {
              content: String(conv.last_message_content),
              created_at: String(conv.last_message_time ?? conv.created_at),
            }
          : undefined,
      };
    });
  } catch (err) {
    console.error("getFounderConversations exception:", err);
    return [];
  }
}

export function subscribeToFounderSupportConversations(onChange: () => void): () => void {
  const channel = supabase
    .channel("founder-support-conversations")
    .on("postgres_changes", { event: "*", schema: "public", table: "chat_conversations", filter: "conversation_type=eq.support" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, onChange);
  channel.subscribe();
  return () => { void channel.unsubscribe(); };
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
