import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  StyleSheet,
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  I18nManager,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Send, Package, Info } from "lucide-react-native";
import {
  Typography,
  Header,
  Avatar,
  Button,
} from "@/components/ui";
import { TOKENS } from "@/constants/tokens";
import { useAppTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/lib/supabase";
import {
  getMessages,
  sendMessage,
  subscribeToMessages,
  markAsRead,
  getOrderContext,
  Message,
} from "@/services/chat.service";
// Remove date-fns imports to avoid dependency issues

export default function ChatScreen() {
  const { id: conversationId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useAppTheme();
  const isRTL = I18nManager.isRTL;
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [inputText, setInputText] = useState("");
  const [otherUser, setOtherUser] = useState<any>(null);
  const [orderContext, setOrderContext] = useState<any>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  
  const flatListRef = useRef<FlatList>(null);

  const fetchInitialData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setCurrentUserId(user.id);

    // Get current user role from profiles
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile) setCurrentUserRole(profile.role);

    // Fetch conversation details to get other participant
    const { data: conv } = await supabase
      .from("chat_conversations")
      .select(`
        *,
        p1:participant_one(id, full_name, avatar_url, role),
        p2:participant_two(id, full_name, avatar_url, role)
      `)
      .eq("id", conversationId)
      .single();

    if (conv) {
      setOtherUser(conv.participant_one === user.id ? conv.p2 : conv.p1);
      if (conv.reference_id) {
        const { data: order } = await getOrderContext(conv.reference_id);
        setOrderContext(order);
      }
    }

    // Fetch messages
    const { data: msgs } = await getMessages(conversationId);
    if (msgs) setMessages(msgs);
    
    setLoading(false);
    markAsRead(conversationId);
  }, [conversationId]);

  useEffect(() => {
    fetchInitialData();
    
    const unsubscribe = subscribeToMessages(conversationId, (newMsg) => {
      setMessages((prev) => {
        if (prev.find(m => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
      if (newMsg.sender_id !== currentUserId) {
        markAsRead(conversationId);
      }
    });

    return () => unsubscribe();
  }, [conversationId, fetchInitialData, currentUserId]);

  const handleSend = async () => {
    if (!inputText.trim() || sending) return;
    
    const text = inputText.trim();
    setInputText("");
    setSending(true);
    
    const { data, error } = await sendMessage(conversationId, text);
    if (error) {
      console.error("Error sending message:", error);
      // Optional: Show error to user
    }
    setSending(false);
  };

  const renderMessageItem = ({ item }: { item: Message }) => {
    const isMine = item.sender_id === currentUserId;
    const time = new Date(item.created_at).toLocaleTimeString("ar-DZ", { 
      hour: "2-digit", 
      minute: "2-digit",
      hour12: false 
    });

    return (
      <View style={[
        styles.messageWrapper,
        isMine ? styles.myMessageWrapper : styles.theirMessageWrapper,
        { flexDirection: isRTL ? (isMine ? "row-reverse" : "row") : (isMine ? "row" : "row-reverse") }
      ]}>
        <View style={[
          styles.messageBubble,
          isMine ? 
            { backgroundColor: colors.primary, borderBottomRightRadius: 2 } : 
            { backgroundColor: colors.bgSurface, borderBottomLeftRadius: 2, borderColor: colors.borderSubtle, borderWidth: 1 }
        ]}>
          <Typography variant="body" style={{ color: isMine ? "#FFFFFF" : colors.textPrimary }}>
            {item.content}
          </Typography>
          <Typography variant="caption" style={{ 
            color: isMine ? "rgba(255,255,255,0.7)" : colors.textSecondary,
            alignSelf: "flex-end",
            marginTop: 4
          }}>
            {time}
          </Typography>
        </View>
      </View>
    );
  };

  const OrderContextCard = () => {
    if (!orderContext) return null;

    const handleMerchantUpdate = async (newStatus: string) => {
      if (!orderContext || updatingStatus) return;
      setUpdatingStatus(true);
      try {
        const { error } = await supabase
          .from("orders")
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq("id", orderContext.order_id);
        if (error) throw error;
        // Refresh context
        const { data: updated } = await getOrderContext(orderContext.order_id);
        if (updated) setOrderContext(updated);
      } catch (err) {
        console.error("Error updating order status from chat:", err);
      } finally {
        setUpdatingStatus(false);
      }
    };

    const handleCourierUpdate = async (newStatus: string) => {
      if (!orderContext || updatingStatus) return;
      setUpdatingStatus(true);
      try {
        const { error } = await supabase
          .from("delivery_assignments")
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq("order_id", orderContext.order_id);
        if (error) throw error;
        // Refresh context
        const { data: updated } = await getOrderContext(orderContext.order_id);
        if (updated) setOrderContext(updated);
      } catch (err) {
        console.error("Error updating delivery status from chat:", err);
      } finally {
        setUpdatingStatus(false);
      }
    };

    const renderActionButtons = () => {
      if (currentUserRole === "merchant") {
        if (orderContext.order_status === "pending") {
          return (
            <View style={styles.orderActions}>
              <Button title="قبول الطلب" onPress={() => handleMerchantUpdate("accepted")} size="sm" style={{ flex: 1 }} />
              <Button title="رفض" variant="danger" onPress={() => handleMerchantUpdate("cancelled")} size="sm" style={{ flex: 1 }} />
            </View>
          );
        }
        if (orderContext.order_status === "accepted") {
          return <Button title="بدء التحضير" onPress={() => handleMerchantUpdate("preparing")} size="sm" style={{ marginTop: 8 }} />;
        }
        if (orderContext.order_status === "preparing") {
          return <Button title="جاهز للاستلام" onPress={() => handleMerchantUpdate("ready_for_pickup")} size="sm" style={{ marginTop: 8 }} />;
        }
      }

      if (currentUserRole === "driver") {
        const dStatus = orderContext.delivery_status;
        if (dStatus === "accepted") {
          return <Button title="وصلت للمتجر" onPress={() => handleCourierUpdate("arrived_at_store")} size="sm" style={{ marginTop: 8 }} />;
        }
        if (dStatus === "arrived_at_store") {
          return <Button title="تم الاستلام" onPress={() => handleCourierUpdate("picked_up")} size="sm" style={{ marginTop: 8 }} />;
        }
        if (dStatus === "picked_up") {
          return <Button title="بدء التوصيل" onPress={() => handleCourierUpdate("out_for_delivery")} size="sm" style={{ marginTop: 8 }} />;
        }
        if (dStatus === "out_for_delivery") {
          return <Button title="تم التسليم" onPress={() => handleCourierUpdate("delivered")} size="sm" style={{ marginTop: 8 }} />;
        }
      }
      return null;
    };

    const getStatusLabel = (status: string) => {
      const map: any = {
        pending: "جديد",
        accepted: "مقبول",
        preparing: "قيد التحضير",
        ready_for_pickup: "جاهز للاستلام",
        picked_up: "تم الاستلام",
        delivered: "تم التوصيل",
        cancelled: "مرفوض",
        arrived_at_store: "في المتجر",
        out_for_delivery: "في الطريق"
      };
      return map[status] || status;
    };

    return (
      <View style={[styles.orderCard, { backgroundColor: colors.bgSurface, borderBottomColor: colors.borderSubtle }]}>
        <View style={styles.orderCardHeader}>
          <Package size={20} color={colors.primary} />
          <Typography variant="h3" style={{ color: colors.textPrimary, marginHorizontal: 8 }}>
            طلب من {orderContext.store_name}
          </Typography>
        </View>
        <View style={styles.orderCardBody}>
          <View style={styles.orderStatusItem}>
            <Typography variant="caption" style={{ color: colors.textSecondary }}>حالة الطلب:</Typography>
            <Typography variant="body" style={{ color: colors.primary, fontWeight: "600", marginLeft: 4 }}>{getStatusLabel(orderContext.order_status)}</Typography>
          </View>
          <View style={styles.orderStatusItem}>
            <Typography variant="caption" style={{ color: colors.textSecondary }}>حالة التوصيل:</Typography>
            <Typography variant="body" style={{ color: colors.accent || colors.primary, marginLeft: 4 }}>{getStatusLabel(orderContext.delivery_status || "pending")}</Typography>
          </View>
        </View>
        {renderActionButtons()}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.bgBase }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgBase }]} edges={["top", "bottom"]}>
      <Header 
        title={otherUser?.full_name || "محادثة"} 
        rightContent={
          <Avatar 
            uri={otherUser?.avatar_url} 
            name={otherUser?.full_name || "?"} 
            size={36} 
          />
        }
      />
      
      <OrderContextCard />

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessageItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <View style={[styles.inputContainer, { backgroundColor: colors.bgSurface, borderTopColor: colors.borderSubtle }]}>
          <TextInput
            style={[styles.input, { color: colors.textPrimary, textAlign: isRTL ? "right" : "left" }]}
            placeholder="اكتب رسالة..."
            placeholderTextColor={colors.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <TouchableOpacity 
            style={[styles.sendButton, { backgroundColor: colors.primary }]} 
            onPress={handleSend}
            disabled={!inputText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Send size={20} color="#FFFFFF" style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  messageList: {
    padding: TOKENS.spacing.md,
    paddingBottom: TOKENS.spacing.xl,
  },
  messageWrapper: {
    marginBottom: TOKENS.spacing.sm,
    width: "100%",
  },
  myMessageWrapper: {
    justifyContent: "flex-end",
  },
  theirMessageWrapper: {
    justifyContent: "flex-start",
  },
  messageBubble: {
    maxWidth: "80%",
    padding: TOKENS.spacing.sm,
    paddingHorizontal: TOKENS.spacing.md,
    borderRadius: 12,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: TOKENS.spacing.sm,
    paddingHorizontal: TOKENS.spacing.md,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    minHeight: 40,
    paddingTop: 8,
    paddingBottom: 8,
    fontSize: 16,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: TOKENS.spacing.sm,
  },
  orderCard: {
    padding: TOKENS.spacing.sm,
    paddingHorizontal: TOKENS.spacing.md,
    borderBottomWidth: 1,
  },
  orderCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  orderCardBody: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  orderStatusItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  orderActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
});
