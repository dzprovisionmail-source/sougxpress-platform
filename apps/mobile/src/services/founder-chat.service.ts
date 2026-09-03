/**
 * Founder Chat Control Service
 * Reads existing chat conversations/messages in read-only mode.
 */

import { supabase } from "@/lib/supabase";
import type { Conversation, Message, ParticipantIdentity } from "./chat.service";

export type FounderConversationType = "commercial" | "support";

export type FounderMessage = Message & {
  sender_full_name: string | null;
  sender_role: string;
  sender_avatar_url: string | null;
  sender_store_name: string | null;
};

export async function getFounderConversations(
  search?: string,
  relationshipType?: string,
  conversationType: FounderConversationType = "commercial",
): Promise<Conversation[]> {
  try {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    let data: unknown[] | null = null;
    let error: { message?: string } | null = null;

    if (conversationType === "commercial") {
      const result = await supabase.rpc("get_founder_commercial_conversations", {
        p_relationship_type: relationshipType && relationshipType !== "all" ? relationshipType : null,
      });
      data = result.data as unknown[] | null;
      error = result.error;
    } else {
      const result = await supabase
        .from("v_chat_conversations_list")
        .select("*")
        .eq("conversation_type", conversationType)
        .order("last_message_at", { ascending: false, nullsFirst: false });
      data = result.data as unknown[] | null;
      error = result.error;
    }

    if (error) {
      console.error("getFounderConversations error:", error.message);
      return [];
    }

    return ((data ?? []) as Record<string, unknown>[]).map((conv) => {
      const p1Role = conv.p1_role ? String(conv.p1_role) : "";
      const p2Role = conv.p2_role ? String(conv.p2_role) : "";
      const p1IsStaff = p1Role === "founder" || p1Role === "admin";
      const p2IsStaff = p2Role === "founder" || p2Role === "admin";
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
      const other: ParticipantIdentity = {
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
        relationship_type: (conv.relationship_type as Conversation["relationship_type"]) ?? null,
        conversation_type: (conv.conversation_type as FounderConversationType | undefined) ?? conversationType,
        reference_id: conv.reference_id ? String(conv.reference_id) : null,
        last_message_at: String(conv.last_message_at ?? conv.created_at),
        created_at: String(conv.created_at),
        other_participant: other,
        participant_one_identity: participantOne,
        participant_two_identity: participantTwo,
        last_message: conv.last_message_content
          ? { content: String(conv.last_message_content), created_at: String(conv.last_message_time ?? conv.created_at) }
          : undefined,
      };
    });
  } catch (err) {
    console.error("getFounderConversations exception:", err);
    return [];
  }
}

export function subscribeToFounderConversations(onChange: () => void): () => void {
  const channel = supabase
    .channel("founder-commercial-conversations")
    .on("postgres_changes", { event: "*", schema: "public", table: "chat_conversations" }, onChange)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, onChange);
  channel.subscribe();
  return () => { void channel.unsubscribe(); };
}

export function subscribeToFounderSupportConversations(onChange: () => void): () => void {
  const channel = supabase
    .channel("founder-support-conversations")
    .on("postgres_changes", { event: "*", schema: "public", table: "chat_conversations", filter: "conversation_type=eq.support" }, onChange)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, onChange);
  channel.subscribe();
  return () => { void channel.unsubscribe(); };
}

export function subscribeToFounderConversationMessages(conversationId: string, onChange: () => void): () => void {
  const channel = supabase
    .channel(`founder-commercial-messages-${conversationId}`)
    .on("postgres_changes", {
      event: "INSERT",
      schema: "public",
      table: "chat_messages",
      filter: `conversation_id=eq.${conversationId}`,
    }, onChange);
  channel.subscribe();
  return () => { void channel.unsubscribe(); };
}

export async function getFounderConversationMessages(conversationId: string): Promise<FounderMessage[]> {
  try {
    const { data, error } = await supabase.rpc("get_founder_commercial_messages", {
      p_conversation_id: conversationId,
    });
    if (error) {
      console.error("getFounderConversationMessages error:", error.message);
      return [];
    }
    return ((data ?? []) as Record<string, unknown>[]).map((m) => ({
      id: String(m.id),
      conversation_id: String(m.conversation_id),
      sender_id: String(m.sender_id),
      content: String(m.content),
      is_read: Boolean(m.is_read),
      created_at: String(m.created_at),
      sender_full_name: m.sender_full_name ? String(m.sender_full_name) : null,
      sender_role: m.sender_role ? String(m.sender_role) : "",
      sender_avatar_url: m.sender_avatar_url ? String(m.sender_avatar_url) : null,
      sender_store_name: m.sender_store_name ? String(m.sender_store_name) : null,
    }));
  } catch (err) {
    console.error("getFounderConversationMessages exception:", err);
    return [];
  }
}
