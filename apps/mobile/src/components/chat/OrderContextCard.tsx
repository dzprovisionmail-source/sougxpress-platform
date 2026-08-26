import React from "react";
import { I18nManager, Image, StyleSheet, View } from "react-native";
import { ClipboardList, MapPin, Package, Truck } from "lucide-react-native";

import { useAppTheme } from "@/contexts/ThemeContext";
import { TOKENS } from "@/constants/tokens";
import { Typography } from "@/components/ui/Typography";

export type ChatOrderItem = {
  id: string;
  name?: string | null;
  image_url?: string | null;
  quantity: number;
  unit_price_minor: number;
  line_total_minor: number;
};

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
  special_instructions?: string | null;
  created_at?: string | null;
  address?: { address_text?: string | null } | null;
  items?: ChatOrderItem[];
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
  pending: "بانتظار قبول الموصل",
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

  const items = Array.isArray(context.items) ? context.items : [];
  const subtotalMinor = items.reduce(
    (sum, item) => sum + Number(item.line_total_minor || item.quantity * item.unit_price_minor || 0),
    0,
  );
  const deliveryFeeMinor = Number(context.delivery_fee_minor || 0) > 0
    ? Number(context.delivery_fee_minor)
    : 15000;
  const totalMinor = Number(context.total_minor || 0) >= subtotalMinor + deliveryFeeMinor
    ? Number(context.total_minor)
    : subtotalMinor + deliveryFeeMinor;
  const orderStatus = context.order_status
    ? ORDER_STATUS_LABEL[context.order_status] || context.order_status
    : "غير متوفر";
  const deliveryStatus = context.delivery_status
    ? DELIVERY_STATUS_LABEL[context.delivery_status] || context.delivery_status
    : null;
  const address = context.address?.address_text?.trim();

  return (
    <View style={[styles.card, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]}>
      <View style={[styles.header, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <View style={[styles.iconBadge, { backgroundColor: colors.primary + "18" }]}>
          <ClipboardList size={18} color={colors.primary} />
        </View>
        <View style={styles.headerText}>
          <Typography variant="caption" color="secondary">محادثة مرتبطة بطلب</Typography>
          <Typography variant="button" numberOfLines={1}>{context.store_name || "تفاصيل الطلب"}</Typography>
        </View>
        <View style={[styles.statusPill, { backgroundColor: colors.primary + "15" }]}>
          <Typography variant="caption" style={{ color: colors.primary, fontWeight: "700" }}>{orderStatus}</Typography>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={[styles.details, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <View style={styles.detailItem}>
          <Typography variant="caption" color="secondary">الإجمالي</Typography>
          <Typography variant="button">{formatDzd(totalMinor) || "غير محدد"}</Typography>
        </View>
        <View style={styles.detailItem}>
          <Typography variant="caption" color="secondary">رسوم التوصيل</Typography>
          <Typography variant="button" style={{ color: colors.primary }}>{formatDzd(deliveryFeeMinor)}</Typography>
        </View>
        {deliveryStatus ? (
          <View style={[styles.detailItem, styles.deliveryItem]}>
            <View style={styles.deliveryLabel}>
              <Truck size={13} color={colors.textSecondary} />
              <Typography variant="caption" color="secondary">الحالة</Typography>
            </View>
            <Typography variant="caption" numberOfLines={1}>{deliveryStatus}</Typography>
          </View>
        ) : null}
      </View>

      {address ? (
        <View style={[styles.addressRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <MapPin size={15} color={colors.primary} />
          <Typography variant="caption" numberOfLines={2} style={styles.addressText}>{address}</Typography>
        </View>
      ) : null}

      {items.length > 0 ? (
        <View style={[styles.itemsSection, { borderTopColor: colors.borderSubtle }]}>
          <View style={[styles.itemsTitle, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <Package size={15} color={colors.primary} />
            <Typography variant="caption" style={{ fontWeight: "700" }}>محتويات الطلب</Typography>
          </View>
          {items.map((item) => (
            <View key={item.id} style={[styles.itemRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              {item.image_url ? <Image source={{ uri: item.image_url }} style={styles.itemImage} /> : null}
              <View style={styles.itemText}>
                <Typography variant="caption" numberOfLines={1}>{item.name || "منتج"}</Typography>
                <Typography variant="caption" color="secondary">الكمية: {item.quantity} × {formatDzd(item.unit_price_minor)}</Typography>
              </View>
              <Typography variant="caption" style={{ color: colors.primary, fontWeight: "700" }}>{formatDzd(item.line_total_minor)}</Typography>
            </View>
          ))}
          <View style={[styles.subtotalRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <Typography variant="caption" color="secondary">مجموع المنتجات</Typography>
            <Typography variant="caption" style={{ fontWeight: "700" }}>{formatDzd(subtotalMinor)}</Typography>
          </View>
        </View>
      ) : null}

      {context.special_instructions ? (
        <Typography variant="caption" color="secondary" numberOfLines={2} style={styles.notes}>
          ملاحظات: {context.special_instructions}
        </Typography>
      ) : null}

      {(context.customer_name || context.driver_name) ? (
        <View style={[styles.participants, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <Typography variant="caption" color="secondary" numberOfLines={1} style={styles.participantText}>
            {context.driver_name ? `الموصل: ${context.driver_name}` : `الزبون: ${context.customer_name}`}
          </Typography>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: TOKENS.spacing.md, marginTop: TOKENS.spacing.sm, padding: TOKENS.spacing.md, borderWidth: 1, borderRadius: 16 },
  header: { alignItems: "center", gap: TOKENS.spacing.sm },
  iconBadge: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center" },
  headerText: { flex: 1, alignItems: "flex-end", minWidth: 0 },
  statusPill: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 5, maxWidth: 130 },
  divider: { height: 1, marginVertical: TOKENS.spacing.sm, backgroundColor: "rgba(128,128,128,0.18)" },
  details: { alignItems: "flex-start", gap: TOKENS.spacing.sm },
  detailItem: { flex: 1, alignItems: "flex-end", gap: 2, minWidth: 0 },
  deliveryItem: { flex: 1.35 },
  deliveryLabel: { flexDirection: "row-reverse", alignItems: "center", gap: 4 },
  addressRow: { alignItems: "flex-start", gap: 6, marginTop: TOKENS.spacing.sm },
  addressText: { flex: 1, textAlign: "right" },
  itemsSection: { borderTopWidth: 1, marginTop: TOKENS.spacing.sm, paddingTop: TOKENS.spacing.sm },
  itemsTitle: { alignItems: "center", gap: 6, marginBottom: 4 },
  itemRow: { alignItems: "center", gap: 6, paddingVertical: 4 },
  itemImage: { width: 28, height: 28, borderRadius: 6 },
  itemText: { flex: 1, minWidth: 0, alignItems: "flex-end" },
  subtotalRow: { justifyContent: "space-between", marginTop: 4 },
  notes: { marginTop: TOKENS.spacing.sm, textAlign: "right" },
  participants: { alignItems: "center", gap: 5, marginTop: TOKENS.spacing.sm },
  participantText: { flex: 1, textAlign: "right" },
});

export default OrderContextCard;
