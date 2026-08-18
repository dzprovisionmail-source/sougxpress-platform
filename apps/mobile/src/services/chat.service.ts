import { supabase } from "@/lib/supabase";

export type RelationshipType = 'customer_merchant' | 'customer_courier' | 'merchant_courier';

export interface Conversation {
  id: string;
  participant_one: string;
  participant_two: string;
  relationship_type: RelationshipType;
  reference_id: string | null;
  last_message_at: string;
  created_at: string;
  other_participant?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    role: string;
  };
  last_message?: {
    content: string;
    created_at: string;
  };
  unread_count?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

/**
 * Fetches all conversations for the current authenticated user.
 */
export const getConversations = async (): Promise<{ data: Conversation[] | null; error: any }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("chat_conversations")
      .select(`
        *,
        p1:participant_one(id, full_name, avatar_url, role),
        p2:participant_two(id, full_name, avatar_url, role)
      `)
      .or(`participant_one.eq.${user.id},participant_two.eq.${user.id}`)
      .order("last_message_at", { ascending: false });

    if (error) throw error;

    const formattedData = data.map((conv: any) => {
      const otherParticipant = conv.participant_one === user.id ? conv.p2 : conv.p1;
      return {
        ...conv,
        other_participant: otherParticipant,
      };
    });

    return { data: formattedData, error: null };
  } catch (err) {
    console.error("Error fetching conversations:", err);
    return { data: null, error: err };
  }
};

/**
 * Fetches messages for a specific conversation.
 */
export const getMessages = async (conversationId: string): Promise<{ data: Message[] | null; error: any }> => {
  try {
    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error("Error fetching messages:", err);
    return { data: null, error: err };
  }
};

/**
 * Sends a message in a conversation.
 */
export const sendMessage = async (conversationId: string, content: string): Promise<{ data: Message | null; error: any }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("chat_messages")
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: content,
      })
      .select()
      .single();

    if (error) throw error;

    // Update last_message_at in conversation
    await supabase
      .from("chat_conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", conversationId);

    return { data, error: null };
  } catch (err) {
    console.error("Error sending message:", err);
    return { data: null, error: err };
  }
};

/**
 * Gets or creates a conversation using the secure RPC.
 */
export const getOrCreateConversation = async (
  otherUserId: string,
  relationshipType: RelationshipType,
  referenceId: string | null = null
): Promise<{ data: string | null; error: any }> => {
  try {
    const { data, error } = await supabase.rpc("get_or_create_chat_conversation", {
      p_other_user: otherUserId,
      p_relationship_type: relationshipType,
      p_reference_id: referenceId,
    });

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error("Error getting/creating conversation:", err);
    return { data: null, error: err };
  }
};

/**
 * Subscribes to new messages in a conversation.
 */
export const subscribeToMessages = (
  conversationId: string,
  onNewMessage: (message: Message) => void
) => {
  const channel = supabase
    .channel(`chat:${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "chat_messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        onNewMessage(payload.new as Message);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

/**
 * Marks messages as read in a conversation.
 */
export const markAsRead = async (conversationId: string): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("chat_messages")
      .update({ is_read: true })
      .eq("conversation_id", conversationId)
      .neq("sender_id", user.id)
      .eq("is_read", false);
  } catch (err) {
    console.error("Error marking messages as read:", err);
  }
};

/**
 * Fetches order context for a conversation.
 */
export const getOrderContext = async (orderId: string): Promise<{ data: any | null; error: any }> => {
  try {
    const { data, error } = await supabase
      .from("v_chat_order_context")
      .select("*")
      .eq("order_id", orderId)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error("Error fetching order context:", err);
    return { data: null, error: err };
  }
};
