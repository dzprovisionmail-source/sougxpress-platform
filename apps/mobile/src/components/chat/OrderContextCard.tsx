import React from "react";
import { I18nManager, StyleSheet, View } from "react-native";
import { ClipboardList, MapPin, Truck } from "lucide-react-native";

import { useAppTheme } from "@/contexts/ThemeContext";
import { TOKENS } from "@/constants/tokens";
import { Typography } from "@/components/ui/Typography";

export type ChatOrderContext = {
  order_id: string;
  customer_id?: string | null;
  customer_name?: string | null;
  store_id?: string | null;
  store_name?: string | null;
  merchant_id?: string | null;
  driver_id?: string | null;
  driver_name?: string | null;
  order_status?: string | null;
  delivery_status?: string | null;
  total_minor?: number | null;
  delivery_fee_minor?: number | null;
  created_at?: string | null;
};

const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: "في انتظار المعالجة",
  confirmed: "تم تأكيد الطلب",
  accepted: "تم قبول الطلب",
  preparing: "قيد التحضير",
  ready_for_pickup: "جاهز للاستلام",
  picked_up: "تم الاستلام",
  out_for_delivery: "في الطريق",
  delivered: "تم التسليم",
  cancelled: "ملغى",
  rejected: "مرفوض",
};

const DELIVERY_STATUS_LABEL: Record<string, string> = {
  accepted: "قبل الموصل التوصيلة",
  arrived_at_store: "وصل إلى المتجر",
  picked_up: "استلم الطلب",
  out_for_delivery: "في الطريق إلى الزبون",
  delivered: "تم التسليم",
  cancelled: "ملغاة",
};

const formatDzd = (minor?: number | null) => {
  if (minor === null || minor === undefined) return null;
  return `${Math.round(Number(minor) / 100)} د.ج`;
};

export function OrderContextCard({ context }: { context: ChatOrderContext | null }) {
  const { colors } = useAppTheme();
  const isRTL = I18nManager.isRTL;

  if (!context) return null;

  const total = formatDzd(context.total_minor);
  const deliveryFee = formatDzd(context.delivery_fee_minor);
  const orderStatus = context.order_status
    ? ORDER_STATUS_LABEL[context.order_status] || context.order_status
    : "غير متوفر";
  const deliveryStatus = context.delivery_status
    ? DELIVERY_STATUS_LABEL[context.delivery_status] || context.delivery_status
    : null;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.bgElevated,
          borderColor: colors.borderSubtle,
        },
      ]}
    >
      <View style={[styles.header, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <View style={[styles.iconBadge, { backgroundColor: colors.primary + "18" }]}>
          <ClipboardList size={18} color={colors.primary} />
        </View>
        <View style={styles.headerText}>
          <Typography variant="caption" color="secondary">
            محادثة مرتبطة بطلب
          </Typography>
          <Typography variant="button" numberOfLines={1}>
            {context.store_name || "تفاصيل الطلب"}
          </Typography>
        </View>
        <View style={[styles.statusPill, { backgroundColor: colors.primary + "15" }]}>
          <Typography variant="caption" style={{ color: colors.primary, fontWeight: "700" }}>
            {orderStatus}
          </Typography>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={[styles.details, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <View style={styles.detailItem}>
          <Typography variant="caption" color="secondary">
            الإجمالي
          </Typography>
          <Typography variant="button">{total || "غير محدد"}</Typography>
        </View>
        {deliveryFee ? (
          <View style={styles.detailItem}>
            <Typography variant="caption" color="secondary">
              التوصيل
            </Typography>
            <Typography variant="button">{deliveryFee}</Typography>
          </View>
        ) : null}
        {deliveryStatus ? (
          <View style={[styles.detailItem, styles.deliveryItem]}>
            <View style={styles.deliveryLabel}>
              <Truck size={13} color={colors.textSecondary} />
              <Typography variant="caption" color="secondary">
                الحالة
              </Typography>
            </View>
            <Typography variant="caption" numberOfLines={1}>
              {deliveryStatus}
            </Typography>
          </View>
        ) : null}
      </View>

      {(context.customer_name || context.driver_name) ? (
        <View style={[styles.participants, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <MapPin size={14} color={colors.textSecondary} />
          <Typography variant="caption" color="secondary" numberOfLines={1} style={styles.participantText}>
            {context.driver_name
              ? `الموصل: ${context.driver_name}`
              : context.customer_name
                ? `الزبون: ${context.customer_name}`
                : ""}
          </Typography>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: TOKENS.spacing.md,
    marginTop: TOKENS.spacing.sm,
    padding: TOKENS.spacing.md,
    borderWidth: 1,
    borderRadius: 16,
  },
  header: {
    alignItems: "center",
    gap: TOKENS.spacing.sm,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  headerText: {
    flex: 1,
    alignItems: "flex-end",
  },
  statusPill: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 5,
    maxWidth: 130,
  },
  divider: {
    height: 1,
    marginVertical: TOKENS.spacing.sm,
    backgroundColor: "rgba(128,128,128,0.18)",
  },
  details: {
    alignItems: "flex-start",
    gap: TOKENS.spacing.md,
  },
  detailItem: {
    flex: 1,
    alignItems: "flex-end",
    gap: 2,
  },
  deliveryItem: {
    flex: 1.35,
  },
  deliveryLabel: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
  },
  participants: {
    alignItems: "center",
    gap: 5,
    marginTop: TOKENS.spacing.sm,
  },
  participantText: {
    flex: 1,
    textAlign: "right",
  },
});

export default OrderContextCard;
