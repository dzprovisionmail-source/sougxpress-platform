import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Linking,
  I18nManager,
} from "react-native";
import { useRouter } from "expo-router";
import {
  Typography,
  Card,
  Badge,
  Header,
  Button,
  EmptyState,
} from "@/components/ui";
import {
  Phone,
  Clock,
  MapPin,
  Store,
  User,
  MessageCircle,
} from "lucide-react-native";
import { TOKENS } from "@/constants/tokens";
import { useAppTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/lib/supabase";
import { getOrCreateConversation } from "@/services/chat.service";
import useCourierOrders from "@/hooks/useCourierOrders";
import { useCurrentUserId } from "@/features/workspace/useCurrentUserId";

export default function CourierOrdersTabScreen() {
  const router = useRouter();
  const { colors, tokens } = useAppTheme();
  const { userId } = useCurrentUserId();
  const isRTL = I18nManager.isRTL;

  const { activeDeliveries, loading, refreshOrders, updateDeliveryStatus } = useCourierOrders(userId || "");

  const handleStartChat = async (targetUserId: string, type: "customer_courier" | "merchant_courier", orderId?: string) => {
    if (!targetUserId) return;
    try {
      const { data: conversationId, error } = await getOrCreateConversation(
        targetUserId,
        type,
        orderId || null
      );
      if (error) throw error;
      if (conversationId) {
        router.push(`/chat/${conversationId}`);
      }
    } catch (err) {
      console.error("Error starting chat:", err);
      Alert.alert("خطأ", "فشل بدء المحادثة. يرجى المحاولة لاحقاً.");
    }
  };

  const getStatusBadgeVariant = (status: string): "warning" | "info" | "success" | "error" | "default" => {
    switch (status) {
      case "pending":
        return "warning";
      case "accepted":
      case "arrived_at_store":
      case "picked_up":
      case "out_for_delivery":
        return "info";
      case "delivered":
        return "success";
      case "cancelled":
        return "error";
      default:
        return "default";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "قيد الانتظار";
      case "accepted":
        return "مقبول";
      case "arrived_at_store":
        return "وصلت للمتجر";
      case "picked_up":
        return "تم الاستلام";
      case "out_for_delivery":
        return "في الطريق";
      case "delivered":
        return "تم التوصيل";
      case "cancelled":
        return "ملغى";
      default:
        return status;
    }
  };

  const renderDeliveryItem = ({ item }: { item: any }) => {
    return (
      <Card key={item.id} style={styles.deliveryCard}>
        <View style={[styles.headerRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <View style={styles.orderIdCol}>
            <Typography variant="h3">توصيلة #{item.order_id.slice(0, 8)}</Typography>
            <Typography variant="caption" color="secondary">
              {new Date(item.created_at).toLocaleTimeString("ar-DZ")}
            </Typography>
          </View>
          <Badge
            label={getStatusLabel(item.status)}
            variant={getStatusBadgeVariant(item.status)}
          />
        </View>

        <View style={[styles.infoSection, { borderLeftColor: colors.primary }]}>
          <View style={[styles.infoRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <Store size={16} color={colors.textSecondary} />
            <Typography variant="body" style={{ fontWeight: "600" }}>{item.store_name}</Typography>
          </View>
          <View style={[styles.infoRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <MapPin size={16} color={colors.textSecondary} />
            <Typography variant="caption" color="secondary">{item.store_address}</Typography>
          </View>
        </View>

        <View style={[styles.infoSection, { borderLeftColor: colors.success }]}>
          <View style={[styles.infoRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <User size={16} color={colors.textSecondary} />
            <Typography variant="body" style={{ fontWeight: "600" }}>{item.customer_name}</Typography>
          </View>
          <View style={[styles.infoRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <MapPin size={16} color={colors.textSecondary} />
            <Typography variant="caption" color="secondary">{item.address_text}</Typography>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

        <View style={[styles.actionsRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 8 }}>
            <Button
              variant="outline"
              size="sm"
              icon={<MessageCircle size={16} color={colors.primary} />}
              onPress={() => handleStartChat(item.merchant_id, "merchant_courier", item.order_id)}
              title="شات المتجر"
            />
            <Button
              variant="outline"
              size="sm"
              icon={<MessageCircle size={16} color={colors.primary} />}
              onPress={() => handleStartChat(item.customer_id, "customer_courier", item.order_id)}
              title="شات الزبون"
            />
          </View>
          
          <TouchableOpacity 
            onPress={() => Linking.openURL(`tel:${item.customer_phone}`)}
            style={[styles.callBtn, { backgroundColor: colors.primary }]}
          >
            <Phone size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  if (loading && activeDeliveries.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.bgBase }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bgBase }]}>
      <Header title="التوصيلات الحالية" leftContent={null} />

      <FlatList
        data={activeDeliveries}
        renderItem={renderDeliveryItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refreshOrders} colors={[colors.primary]} />
        }
        ListEmptyComponent={
          <EmptyState
            type="no-orders"
            message="لا توجد توصيلات نشطة حالياً"
            onAction={refreshOrders}
            actionLabel="تحديث"
          />
        }
      />
    </View>
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
    padding: TOKENS.spacing.md,
    paddingBottom: 40,
  },
  deliveryCard: {
    padding: TOKENS.spacing.md,
    marginBottom: TOKENS.spacing.md,
  },
  headerRow: {
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: TOKENS.spacing.md,
  },
  orderIdCol: {
    flex: 1,
  },
  infoSection: {
    borderLeftWidth: 3,
    paddingLeft: TOKENS.spacing.sm,
    marginBottom: TOKENS.spacing.md,
  },
  infoRow: {
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  divider: {
    height: 1,
    marginVertical: TOKENS.spacing.md,
  },
  actionsRow: {
    justifyContent: "space-between",
    alignItems: "center",
  },
  callBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
});
