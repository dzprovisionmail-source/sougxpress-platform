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
    store_name?: string | null;
    store_logo?: string | null;
  };
  last_message?: {
    content: string;
    created_at: string;
  };
  unread_count?: number;
}

export type MessageDeliveryState = "sending" | "sent" | "failed";

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  /** Client-only metadata used by optimistic UI; never sent to Supabase. */
  client_id?: string;
  delivery_state?: MessageDeliveryState;
  delivery_error?: string;
}

/**
 * Fetches all conversations for the current authenticated user.
 */
export const getConversations = async (): Promise<{ data: Conversation[] | null; error: any }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("v_chat_conversations_list")
      .select("*")
      .or(`participant_one.eq.${user.id},participant_two.eq.${user.id}`)
      .order("last_message_at", { ascending: false, nullsFirst: false });

    if (error) throw error;

    const formattedData = data.map((conv: any) => {
      const isP1 = conv.participant_one === user.id;
      const other = {
        id: isP1 ? conv.participant_two : conv.participant_one,
        full_name: isP1 ? conv.p2_full_name : conv.p1_full_name,
        avatar_url: isP1 ? conv.p2_avatar_url : conv.p1_avatar_url,
        role: isP1 ? conv.p2_role : conv.p1_role,
        store_name: isP1 ? conv.p2_store_name : conv.p1_store_name,
        store_logo: isP1 ? conv.p2_store_logo : conv.p1_store_logo,
      };

      return {
        id: conv.id,
        participant_one: conv.participant_one,
        participant_two: conv.participant_two,
        relationship_type: conv.relationship_type,
        reference_id: conv.reference_id,
        last_message_at: conv.last_message_at,
        created_at: conv.created_at,
        other_participant: other,
        last_message: conv.last_message_content ? {
          content: conv.last_message_content,
          created_at: conv.last_message_time
        } : undefined
      };
    });

    return { data: formattedData, error: null };
    } catch (err) {
    console.error("Error fetching conversations:", err);
    return { data: null, error: err };
  }
};

/**
 * Fetches a single conversation by ID with enhanced identity mapping.
 */
export const getConversationById = async (id: string): Promise<{ data: Conversation | null; error: any }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("v_chat_conversations_list")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;

    const isP1 = data.participant_one === user.id;
    const other = {
      id: isP1 ? data.participant_two : data.participant_one,
      full_name: isP1 ? data.p2_full_name : data.p1_full_name,
      avatar_url: isP1 ? data.p2_avatar_url : data.p1_avatar_url,
      role: isP1 ? data.p2_role : data.p1_role,
      store_name: isP1 ? data.p2_store_name : data.p1_store_name,
      store_logo: isP1 ? data.p2_store_logo : data.p1_store_logo,
    };

    const formatted: Conversation = {
      id: data.id,
      participant_one: data.participant_one,
      participant_two: data.participant_two,
      relationship_type: data.relationship_type as RelationshipType,
      reference_id: data.reference_id,
      last_message_at: data.last_message_at,
      created_at: data.created_at,
      other_participant: other,
      last_message: data.last_message_content ? {
        content: data.last_message_content,
        created_at: data.last_message_time
      } : undefined
    };

    return { data: formatted, error: null };
  } catch (err) {
    console.error("Error fetching conversation by ID:", err);
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
 * One dispatcher is registered per conversation channel. This is important in
 * React Strict Mode and during Expo Fast Refresh: registering `.on()` on a
 * channel after `.subscribe()` causes the Realtime client to throw.
 */
type MessageListener = (message: Message) => void;
type ManagedMessageChannel = {
  channel: ReturnType<typeof supabase.channel>;
  listeners: Set<MessageListener>;
};

const messageChannels = new Map<string, ManagedMessageChannel>();

const getMessageTopic = (conversationId: string) => `chat:${conversationId}`;

/**
 * Subscribes to new messages in a conversation with duplicate-channel
 * protection and deterministic cleanup.
 */
export const subscribeToMessages = (
  conversationId: string,
  onNewMessage: MessageListener
) => {
  const topic = getMessageTopic(conversationId);
  let managed = messageChannels.get(conversationId);

  if (!managed) {
    // Fast Refresh can preserve Supabase channels while this module is
    // re-evaluated. Remove a stale channel before creating the managed one.
    const staleChannel = supabase
      .getChannels()
      .find((candidate) => candidate.topic === `realtime:${topic}`);
    if (staleChannel) {
      void supabase.removeChannel(staleChannel);
    }

    const listeners = new Set<MessageListener>();
    const channel = supabase
      .channel(topic)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const message = payload.new as Message;
          listeners.forEach((listener) => listener(message));
        }
      );

    managed = { channel, listeners };
    messageChannels.set(conversationId, managed);
    // All listeners are configured before subscribe() and only one subscribe
    // call is ever made for this conversation in this module instance.
    managed.channel.subscribe((status) => {
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        console.warn(`Chat realtime channel ${conversationId}: ${status}`);
      }
    });
  }

  managed.listeners.add(onNewMessage);
  let active = true;

  return () => {
    if (!active) return;
    active = false;

    const current = messageChannels.get(conversationId);
    if (!current) return;
    current.listeners.delete(onNewMessage);

    if (current.listeners.size === 0) {
      messageChannels.delete(conversationId);
      void supabase.removeChannel(current.channel);
    }
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
