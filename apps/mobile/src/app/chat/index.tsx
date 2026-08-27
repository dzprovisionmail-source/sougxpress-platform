import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  I18nManager,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useGlobalSearchParams, useRouter } from "expo-router";
import { MessageSquare, ChevronRight, ChevronLeft, Package } from "lucide-react-native";
import {
  Typography,
  Header,
  Avatar,
  EmptyState,
} from "@/components/ui";
import { TOKENS } from "@/constants/tokens";
import { useAppTheme } from "@/contexts/ThemeContext";
import { getConversations, Conversation } from "@/services/chat.service";
import { getUserDisplayName } from "@/utils/user-display";
// Remove date-fns imports to avoid dependency issues

export default function ChatListScreen() {
  const router = useRouter();
  const params = useGlobalSearchParams<{ preview?: string; identity?: string }>();
  const marketContextParams = params.identity === "soug-admin" && (params.preview === "1" || params.preview === undefined)
    ? { preview: "1", identity: "soug-admin" }
    : {};
  const { colors } = useAppTheme();
  const isRTL = I18nManager.isRTL;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchConversations = useCallback(async () => {
    const { data, error } = await getConversations();
    if (!error && data) {
      setConversations(data);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchConversations();
  };

  const renderConversationItem = ({ item }: { item: Conversation }) => {
    const other = item.other_participant;
    const lastMessageTime = item.last_message?.created_at || item.last_message_at;
    const timeStr = lastMessageTime 
      ? new Date(lastMessageTime).toLocaleTimeString("ar-DZ", { hour: '2-digit', minute: '2-digit' })
      : "";

    // Identity Mapping: Use Store Name for Merchants
    const displayName = other?.role === 'merchant' && other.store_name
      ? other.store_name
      : getUserDisplayName(other, other?.role);
      
    const displayAvatar = other?.role === 'merchant' && other.store_logo
      ? other.store_logo
      : other?.avatar_url;

    return (
      <TouchableOpacity
        style={[styles.convItem, { borderBottomColor: colors.borderSubtle }]}
        onPress={() => router.push({
          pathname: "/chat/[id]",
          params: { id: item.id, ...(item.conversation_type === "support" ? { support: "1" } : {}), ...marketContextParams },
        })}
      >
        <Avatar
          uri={displayAvatar || undefined}
          name={displayName}
          size={50}
        />
        <View style={styles.convInfo}>
          <View style={styles.convHeader}>
            <Typography variant="h3" style={{ color: colors.textPrimary }}>
              {displayName}
            </Typography>
            <Typography variant="caption" style={{ color: colors.textSecondary }}>
              {timeStr}
            </Typography>
          </View>
          
          <View style={styles.convFooter}>
            <Typography 
              variant="body" 
              numberOfLines={1} 
              style={{ color: colors.textSecondary, flex: 1, textAlign: isRTL ? "right" : "left" }}
            >
              {item.last_message?.content || (
                item.conversation_type === "support" ? "دعم Soug-XPRESS" :
                item.relationship_type === 'customer_merchant' ? "متجر" : 
                item.relationship_type === 'customer_courier' ? "موصل" : "تنسيق توصيل"
              )}
            </Typography>
            
            {item.reference_id && (
              <View style={[styles.orderBadge, { backgroundColor: colors.primary + "20" }]}>
                <Package size={12} color={colors.primary} />
                <Typography variant="caption" style={{ color: colors.primary, marginLeft: 4 }}>
                  طلب
                </Typography>
              </View>
            )}
          </View>
        </View>
        {isRTL ? <ChevronLeft size={20} color={colors.textSecondary} /> : <ChevronRight size={20} color={colors.textSecondary} />}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgBase }]} edges={["top"]}>
      <Header title="المحادثات" />
      
      {loading && !refreshing ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={conversations}
          renderItem={renderConversationItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
          ListEmptyComponent={
            <EmptyState
              icon={<MessageSquare size={48} color={colors.textSecondary} />}
              title="لا توجد محادثات بعد"
              description="ابدأ محادثة مع المتاجر أو الموصلين المفضلين لديك."
            />
          }
        />
      )}
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
  listContent: {
    flexGrow: 1,
  },
  convItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: TOKENS.spacing.md,
    borderBottomWidth: 1,
  },
  convInfo: {
    flex: 1,
    marginHorizontal: TOKENS.spacing.md,
  },
  convHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  convFooter: {
    flexDirection: "row",
    alignItems: "center",
  },
  orderBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
});
