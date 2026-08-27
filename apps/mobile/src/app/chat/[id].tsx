import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  I18nManager,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  View,
  Linking,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { KeyboardAwareView } from "@/components/ui/KeyboardAwareView";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowRight,
  Check,
  CheckCheck,
  Clock3,
  Info,
  MessageCircle,
  RefreshCw,
  Send,
  Wifi,
  WifiOff,
  X,
  Phone,
} from "lucide-react-native";

import { Typography, Header, Avatar, Button } from "@/components/ui";
import OrderContextCard, { ChatOrderContext } from "@/components/chat/OrderContextCard";
import { TOKENS } from "@/constants/tokens";
import { useAppTheme } from "@/contexts/ThemeContext";
import { getUserDisplayName } from "@/utils/user-display";
import { supabase } from "@/lib/supabase";
import {
  getMessages,
  sendMessage,
  subscribeToMessages,
  markAsRead,
  getOrderContext,
  getCommercialOrderDetails,
  getConversationById,
  getCommercialPhone,
  logCallPress,
  getChatProfileCard,
  Message,
  Conversation,
  ChatProfileCard,
} from "@/services/chat.service";
import BottomSheet from "@/components/ui/BottomSheet";

const AVAILABILITY_LABEL: Record<string, string> = {
  online: "متاح الآن",
  offline: "غير متصل",
  on_delivery: "في توصيلة",
};

const ROLE_LABEL: Record<string, string> = {
  merchant: "التاجر",
  driver: "الموصل",
  courier: "الموصل",
  customer: "الزبون",
};

const statusLabel = (status?: string | null) => {
  const labels: Record<string, string> = {
    pending: "جديد",
    accepted: "مقبول",
    preparing: "قيد التحضير",
    ready_for_pickup: "جاهز للاستلام",
    arrived_at_store: "في المتجر",
    picked_up: "تم الاستلام",
    out_for_delivery: "في الطريق",
    delivered: "تم التسليم",
    cancelled: "ملغى",
    rejected: "مرفوض",
  };
  return status ? labels[status] || status : "غير متوفر";
};

const createClientId = () => `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export default function ChatScreen() {
  const { id: conversationId, support } = useLocalSearchParams<{ id: string; support?: string }>();
  const router = useRouter();
  const { colors } = useAppTheme();
  const isRTL = I18nManager.isRTL;

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [inputText, setInputText] = useState("");
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [orderContext, setOrderContext] = useState<ChatOrderContext | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [otherAvailability, setOtherAvailability] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showCommercialActions, setShowCommercialActions] = useState(true);
  const [calling, setCalling] = useState(false);
  const [profileCard, setProfileCard] = useState<ChatProfileCard | null>(null);
  const [profileCardLoading, setProfileCardLoading] = useState(false);
  const [profileCardVisible, setProfileCardVisible] = useState(false);
  const isSupportChat = support === "1";

  const currentUserIdRef = useRef<string | null>(null);
  const flatListRef = useRef<FlatList<Message>>(null);

  const mergeServerMessage = useCallback((serverMessage: Message) => {
    setMessages((previous) => {
      const serverRow = { ...serverMessage, delivery_state: "sent" as const };
      const exactIndex = previous.findIndex((message) => message.id === serverMessage.id);
      if (exactIndex >= 0) {
        const next = [...previous];
        next[exactIndex] = { ...next[exactIndex], ...serverRow };
        return next;
      }

      // Realtime may arrive before the INSERT request resolves. Replace the
      // matching local bubble instead of rendering the same message twice.
      const optimisticIndex = previous.findIndex(
        (message) =>
          message.delivery_state === "sending" &&
          message.sender_id === serverMessage.sender_id &&
          message.content === serverMessage.content
      );
      if (optimisticIndex >= 0) {
        const next = [...previous];
        next[optimisticIndex] = serverRow;
        return next;
      }

      return [...previous, serverRow];
    });
  }, []);

  const fetchCourierAvailability = useCallback(async (participant: Conversation["other_participant"]) => {
    if (!participant || (participant.role !== "driver" && participant.role !== "courier")) {
      setOtherAvailability(null);
      return;
    }

    const { data } = await supabase
      .from("drivers")
      .select("availability")
      .eq("id", participant.id)
      .maybeSingle();

    setOtherAvailability(data?.availability || null);
  }, []);

  const fetchInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || !conversationId) return;

      currentUserIdRef.current = user.id;
      setCurrentUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      setCurrentUserRole(profile?.role || null);

      const { data: conv, error: conversationError } = await getConversationById(conversationId);
      if (conversationError) throw conversationError;

      if (conv) {
        setConversation(conv);
        await fetchCourierAvailability(conv.other_participant);
        if (conv.reference_id) {
          const { data: order } = await getOrderContext(conv.reference_id);
          const { data: details } = await getCommercialOrderDetails(conv.reference_id);
          setOrderContext({
            ...((order as ChatOrderContext | null) || {}),
            ...(details || {}),
          } as ChatOrderContext);
        } else {
          setOrderContext(null);
        }
      }

      const { data: loadedMessages, error: messagesError } = await getMessages(conversationId);
      if (messagesError) throw messagesError;
      setMessages((loadedMessages || []).map((message) => ({ ...message, delivery_state: "sent" as const })));
      await markAsRead(conversationId);
    } catch (error) {
      console.error("Error loading chat:", error);
    } finally {
      setLoading(false);
    }
  }, [conversationId, fetchCourierAvailability]);

  useEffect(() => {
    if (!conversationId) return;
    void fetchInitialData();

    const unsubscribe = subscribeToMessages(conversationId, (newMessage) => {
      mergeServerMessage(newMessage);
      if (newMessage.sender_id !== currentUserIdRef.current) {
        void markAsRead(conversationId);
      }
    });

    return unsubscribe;
  }, [conversationId, fetchInitialData, mergeServerMessage]);

  const persistMessage = async (clientId: string, text: string) => {
    const { data, error } = await sendMessage(conversationId, text);
    if (error || !data) {
      setMessages((previous) =>
        previous.map((message) =>
          message.client_id === clientId
            ? {
                ...message,
                delivery_state: "failed" as const,
                delivery_error: "تعذر إرسال الرسالة. اضغط لإعادة المحاولة.",
              }
            : message
        )
      );
      return;
    }

    mergeServerMessage({ ...data, client_id: clientId });
  };

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || sending || !currentUserId || !conversationId) return;

    const clientId = createClientId();
    const optimisticMessage: Message = {
      id: clientId,
      client_id: clientId,
      conversation_id: conversationId,
      sender_id: currentUserId,
      content: text,
      is_read: true,
      created_at: new Date().toISOString(),
      delivery_state: "sending",
    };

    setMessages((previous) => [...previous, optimisticMessage]);
    setInputText("");
    Keyboard.dismiss();
    setSending(true);
    try {
      await persistMessage(clientId, text);
    } finally {
      setSending(false);
    }
  };

  const handleRetry = async (message: Message) => {
    const clientId = message.client_id || message.id;
    setMessages((previous) =>
      previous.map((item) =>
        item.id === message.id ? { ...item, delivery_state: "sending", delivery_error: undefined } : item
      )
    );
    await persistMessage(clientId, message.content);
  };

  const updateOrderContext = async () => {
    if (!conversation?.reference_id) return;
    const { data } = await getOrderContext(conversation.reference_id);
    if (data) setOrderContext(data as ChatOrderContext);
  };

  const handleMerchantUpdate = async (newStatus: string) => {
    if (!orderContext || updatingStatus) return;
    setUpdatingStatus(true);
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", orderContext.order_id);
      if (error) throw error;
      await updateOrderContext();
    } catch (error) {
      console.error("Error updating order status from chat:", error);
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
      await updateOrderContext();
    } catch (error) {
      console.error("Error updating delivery status from chat:", error);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleOpenProfileCard = async (profileId: string) => {
    if (!conversationId || profileCardLoading) return;
    setProfileCardVisible(true);
    setProfileCardLoading(true);
    try {
      const { data, error } = await getChatProfileCard(conversationId, profileId);
      if (error) throw error;
      setProfileCard(data);
    } catch (error) {
      console.error("Error loading chat profile card:", error);
      setProfileCard(null);
    } finally {
      setProfileCardLoading(false);
    }
  };

  const handleCall = async () => {
    if (!orderContext?.order_id || !conversation?.other_participant?.id || calling) return;
    
    setCalling(true);
    try {
      let targetRole: 'customer' | 'merchant' | 'courier' = 'customer';
      const otherRole = conversation.other_participant.role;
      if (otherRole === 'merchant') targetRole = 'merchant';
      else if (otherRole === 'driver' || otherRole === 'courier') targetRole = 'courier';
      
      const { data: phone, error } = await getCommercialPhone(orderContext.order_id, targetRole);
      
      if (error || !phone) {
        Alert.alert("تنبيه", "لا يمكن استرجاع رقم الهاتف في هذه المرحلة أو أن العلاقة التجارية غير نشطة.");
        return;
      }

      await logCallPress(
        orderContext.order_id, 
        conversation.other_participant.id, 
        conversation.relationship_type
      );

      Linking.openURL(`tel:${phone}`);
    } catch (err) {
      console.error("Error handling call:", err);
      Alert.alert("خطأ", "حدث خطأ أثناء محاولة الاتصال.");
    } finally {
      setCalling(false);
    }
  };

  const renderOrderActions = () => {
    if (!orderContext || isSupportChat || conversation?.conversation_type === "support" || !showCommercialActions) return null;

    if (currentUserRole === "merchant") {
      if (orderContext.order_status === "pending") {
        return (
          <View style={styles.orderActions}>
            <Button title="قبول الطلب" onPress={() => handleMerchantUpdate("accepted")} size="sm" style={styles.flexButton} loading={updatingStatus} />
            <Button title="رفض" variant="danger" onPress={() => handleMerchantUpdate("cancelled")} size="sm" style={styles.flexButton} disabled={updatingStatus} />
          </View>
        );
      }
      if (orderContext.order_status === "accepted") {
        return <Button title="بدء التحضير" onPress={() => handleMerchantUpdate("preparing")} size="sm" style={styles.actionButton} loading={updatingStatus} />;
      }
      if (orderContext.order_status === "preparing") {
        return <Button title="جاهز للاستلام" onPress={() => handleMerchantUpdate("ready_for_pickup")} size="sm" style={styles.actionButton} loading={updatingStatus} />;
      }
    }

    if (currentUserRole === "driver" || currentUserRole === "courier") {
      const deliveryStatus = orderContext.delivery_status;
      if (deliveryStatus === "accepted") {
        return <Button title="وصلت للمتجر" onPress={() => handleCourierUpdate("arrived_at_store")} size="sm" style={styles.actionButton} loading={updatingStatus} />;
      }
      if (deliveryStatus === "arrived_at_store") {
        return <Button title="تم الاستلام" onPress={() => handleCourierUpdate("picked_up")} size="sm" style={styles.actionButton} loading={updatingStatus} />;
      }
      if (deliveryStatus === "picked_up") {
        return <Button title="بدء التوصيل" onPress={() => handleCourierUpdate("out_for_delivery")} size="sm" style={styles.actionButton} loading={updatingStatus} />;
      }
      if (deliveryStatus === "out_for_delivery") {
        return <Button title="تم التسليم" onPress={() => handleCourierUpdate("delivered")} size="sm" style={styles.actionButton} loading={updatingStatus} />;
      }
    }

    return null;
  };

  const renderMessageItem = ({ item }: { item: Message }) => {
    const isMine = item.sender_id === currentUserId;
    const time = new Date(item.created_at).toLocaleTimeString("ar-DZ", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const failed = item.delivery_state === "failed";
    const sendingMessage = item.delivery_state === "sending";

    return (
      <View
        style={[
          styles.messageWrapper,
          isMine ? styles.myMessageWrapper : styles.theirMessageWrapper,
          { alignItems: isMine ? "flex-start" : "flex-end" },
        ]}
      >
        <View style={!isMine ? styles.messageWithAvatar : undefined}>
          {!isMine && conversation?.other_participant ? (
            <TouchableOpacity
              onPress={() => handleOpenProfileCard(conversation.other_participant!.id)}
              accessibilityLabel={`فتح ملف ${displayName}`}
            >
              <Avatar uri={displayAvatar || undefined} name={displayName} size={30} />
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
          activeOpacity={failed ? 0.75 : 1}
          onPress={() => failed && handleRetry(item)}
          style={[
            styles.messageBubble,
            isMine
              ? { backgroundColor: colors.primary, borderBottomRightRadius: 3 }
              : { backgroundColor: colors.bgSurface, borderBottomLeftRadius: 3, borderColor: colors.borderSubtle, borderWidth: 1 },
            failed && { borderColor: colors.error, borderWidth: 1 },
          ]}
        >
          <Typography variant="body" style={{ color: isMine ? "#FFFFFF" : colors.textPrimary }}>
            {item.content}
          </Typography>
          <View style={[styles.messageMeta, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <Typography
              variant="caption"
              style={{ color: isMine ? "rgba(255,255,255,0.72)" : colors.textSecondary }}
            >
              {failed ? "فشل الإرسال · إعادة المحاولة" : time}
            </Typography>
            {isMine && !failed ? (
              sendingMessage ? (
                <Clock3 size={12} color="rgba(255,255,255,0.72)" />
              ) : item.is_read ? (
                <CheckCheck size={13} color="rgba(255,255,255,0.82)" />
              ) : (
                <Check size={13} color="rgba(255,255,255,0.72)" />
              )
            ) : null}
          </View>
          </TouchableOpacity>
        </View>
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

  const other = conversation?.other_participant;
  const displayName = other?.role === "merchant" && other.store_name
    ? other.store_name
    : getUserDisplayName(other, other?.role);
  const displayAvatar = other?.role === "merchant" && other.store_logo
    ? other.store_logo
    : other?.avatar_url;
  const availabilityLabel = otherAvailability ? AVAILABILITY_LABEL[otherAvailability] || otherAvailability : null;
  const isCourierConversation = other?.role === "driver" || other?.role === "courier";
  const relationshipType = conversation?.relationship_type || "";

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgBase }]} edges={["top", "bottom"]}>
      <KeyboardAwareView
        style={styles.keyboardAvoiding}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
      <Header
        title={displayName}
        subtitle={
          isCourierConversation && availabilityLabel
            ? availabilityLabel
            : isSupportChat ? "فريق دعم Soug-XPRESS" : ROLE_LABEL[other?.role || ""] || "تواصل تجاري آمن"
        }
        leftContent={
          <TouchableOpacity onPress={() => router.back()} style={styles.headerAction} accessibilityLabel="رجوع">
            <ArrowRight size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        }
        rightContent={
          <View style={styles.headerIdentity}>
            {orderContext?.order_id && (
              <TouchableOpacity 
                onPress={handleCall} 
                style={[styles.callHeaderButton, { backgroundColor: colors.primary + '15' }]}
                disabled={calling}
              >
                {calling ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Phone size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            )}
            {isCourierConversation ? (
              otherAvailability === "online" ? <Wifi size={16} color={colors.success} /> : <WifiOff size={16} color={colors.textSecondary} />
            ) : null}
            <TouchableOpacity
              onPress={() => other?.id && handleOpenProfileCard(other.id)}
              accessibilityLabel={`فتح ملف ${displayName}`}
            >
              <Avatar uri={displayAvatar || undefined} name={displayName} size={38} />
            </TouchableOpacity>
          </View>
        }
      />

      {isCourierConversation && availabilityLabel ? (
        <View style={[styles.availabilityBanner, { backgroundColor: colors.bgElevated, borderBottomColor: colors.borderSubtle }]}>
          {otherAvailability === "online" ? <Wifi size={15} color={colors.success} /> : <WifiOff size={15} color={colors.textSecondary} />}
          <Typography variant="caption" style={{ color: otherAvailability === "online" ? colors.success : colors.textSecondary }}>
            حالة الموصل: {availabilityLabel}
          </Typography>
        </View>
      ) : null}

      <OrderContextCard context={orderContext} />
      {renderOrderActions()}

      <View style={[styles.commercialHint, { backgroundColor: colors.primary + "0B" }]}>
        <Info size={15} color={colors.primary} />
        <Typography variant="caption" style={{ color: colors.textSecondary, flex: 1, textAlign: "right" }}>
          {isSupportChat ? "هذه محادثة دعم مباشرة مع Soug-XPRESS. لا تشارك كلمات المرور أو رموز التحقق." : "هذه محادثة مرتبطة بعلاقة تجارية. لا تشارك أرقام الهاتف أو بيانات الدفع."}
        </Typography>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessageItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messageList}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <View style={styles.emptyMessages}>
            <MessageCircle size={34} color={colors.textDisabled} />
            <Typography variant="body" color="secondary" align="center" style={{ marginTop: 8 }}>
              ابدأ المحادثة برسالة واضحة حول الطلب أو المنتج.
            </Typography>
          </View>
        }
      />

      {relationshipType === "customer_merchant" ? (
        <View style={[styles.quickActions, { borderTopColor: colors.borderSubtle, backgroundColor: colors.bgSurface }]}>
          <TouchableOpacity
            onPress={() => setInputText("هل يمكن تأكيد توفر المنتج والسعر من فضلك؟")}
            style={[styles.quickAction, { borderColor: colors.borderSubtle }]}
          >
            <Typography variant="caption">استفسار عن المنتج</Typography>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setInputText("أرجو تأكيد تفاصيل الطلب ووقت التجهيز.")}
            style={[styles.quickAction, { borderColor: colors.borderSubtle }]}
          >
            <Typography variant="caption">تأكيد الطلب</Typography>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={[styles.inputContainer, { backgroundColor: colors.bgSurface, borderTopColor: colors.borderSubtle }]}>
          <TextInput
            style={[styles.input, { color: colors.textPrimary, textAlign: isRTL ? "right" : "left" }]}
            placeholder="اكتب رسالة آمنة..."
            placeholderTextColor={colors.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[styles.sendButton, { backgroundColor: colors.primary, opacity: inputText.trim() && !sending ? 1 : 0.55 }]}
            onPress={handleSend}
            disabled={!inputText.trim() || sending}
            accessibilityLabel="إرسال الرسالة"
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Send size={20} color="#FFFFFF" style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }} />
            )}
          </TouchableOpacity>
      </View>

      <BottomSheet
        visible={profileCardVisible}
        onClose={() => {
          setProfileCardVisible(false);
          setProfileCard(null);
        }}
        title={profileCard ? getUserDisplayName(profileCard, profileCard.role) : displayName}

      >
        {profileCardLoading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : profileCard ? (
          <View style={styles.profileCardBody}>
            <Avatar uri={profileCard.avatar_url || undefined} name={getUserDisplayName(profileCard, profileCard.role)} size={72} />
            <Typography variant="h3" align="center" style={{ color: colors.textPrimary, marginTop: TOKENS.spacing.sm }}>
              {getUserDisplayName(profileCard, profileCard.role)}
            </Typography>
            <Typography variant="body" align="center" style={{ color: colors.textSecondary, marginTop: 4 }}>
              {ROLE_LABEL[profileCard.role] || profileCard.role}
            </Typography>
            {profileCard.address ? (
              <Typography variant="body" align="center" style={{ color: colors.textSecondary, marginTop: TOKENS.spacing.sm }}>
                {profileCard.address}
              </Typography>
            ) : null}
            {profileCard.role === "customer" ? (
              <Typography variant="body" align="center" style={{ color: colors.textPrimary, marginTop: TOKENS.spacing.md }}>
                عدد الطلبات: {profileCard.activity_count}
              </Typography>
            ) : null}
            {profileCard.role === "merchant" ? (
              <Typography variant="body" align="center" style={{ color: colors.textPrimary, marginTop: TOKENS.spacing.md }}>
                عدد المبيعات: {profileCard.activity_count}
              </Typography>
            ) : null}
            {(profileCard.role === "driver" || profileCard.role === "courier") ? (
              <Typography variant="body" align="center" style={{ color: colors.textPrimary, marginTop: TOKENS.spacing.md }}>
                عمليات التوصيل المكتملة: {profileCard.activity_count}
              </Typography>
            ) : null}
          </View>
        ) : (
          <Typography variant="body" align="center" color="secondary">
            تعذر تحميل معلومات الملف.
          </Typography>
        )}
      </BottomSheet>
      </KeyboardAwareView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoiding: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  headerAction: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerIdentity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  callHeaderButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  availabilityBanner: {
    minHeight: 34,
    borderBottomWidth: 1,
    flexDirection: "row-reverse",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  commercialHint: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 7,
    marginHorizontal: TOKENS.spacing.md,
    marginTop: TOKENS.spacing.sm,
    padding: TOKENS.spacing.sm,
    borderRadius: 12,
  },
  messageList: {
    padding: TOKENS.spacing.md,
    paddingBottom: TOKENS.spacing.xl,
    flexGrow: 1,
  },
  messageWrapper: {
    marginBottom: TOKENS.spacing.sm,
    width: "100%",
  },
  messageWithAvatar: {
    flexDirection: "row-reverse",
    alignItems: "flex-end",
    gap: TOKENS.spacing.xs,
  },
  myMessageWrapper: {
    justifyContent: "flex-start",
  },
  theirMessageWrapper: {
    justifyContent: "flex-end",
  },
  profileCardBody: {
    alignItems: "center",
    paddingVertical: TOKENS.spacing.md,
  },
  messageBubble: {
    maxWidth: "82%",
    padding: TOKENS.spacing.sm,
    paddingHorizontal: TOKENS.spacing.md,
    borderRadius: 16,
  },
  messageMeta: {
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    marginTop: 4,
  },
  emptyMessages: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: TOKENS.spacing.xl,
    paddingTop: TOKENS.spacing.xl,
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
    minHeight: 42,
    paddingTop: 9,
    paddingBottom: 9,
    fontSize: 16,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: TOKENS.spacing.sm,
  },
  quickActions: {
    flexDirection: "row-reverse",
    gap: 8,
    paddingHorizontal: TOKENS.spacing.md,
    paddingTop: 8,
  },
  quickAction: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  orderActions: {
    flexDirection: "row-reverse",
    gap: 8,
    marginHorizontal: TOKENS.spacing.md,
    marginTop: TOKENS.spacing.sm,
  },
  flexButton: {
    flex: 1,
  },
  actionButton: {
    marginHorizontal: TOKENS.spacing.md,
    marginTop: TOKENS.spacing.sm,
  },
});
