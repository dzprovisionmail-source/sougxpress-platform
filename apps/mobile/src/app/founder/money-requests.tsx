/**
 * Founder / Admin — Money Requests Review Screen.
 * Lists all platform money requests. Founder can approve or reject each one.
 * Arabic RTL. Uses the raw StyleSheet + inline dark palette matching the
 * existing founder/index.tsx style (Stack navigator, no ThemeContext wrapper
 * in founder workspace yet).
 */
import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
  I18nManager,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { ChevronRight, CheckCircle, XCircle, Clock } from "lucide-react-native";

import { useAllMoneyRequests } from "@/hooks/useMoneyRequests";
import { useCurrentUserId } from "@/features/workspace/useCurrentUserId";
import { MoneyRequest, MoneyRequestStatus } from "@/types/schema-03b-addendum";

// ── Palette (matches founder/index.tsx dark palette) ──────────────────────
const P = {
  bg: "#0B1220",
  surface: "#111827",
  border: "#1F2937",
  text: "#E2E8F0",
  muted: "#94A3B8",
  primary: "#FF8A00",
  success: "#22C55E",
  error: "#EF4444",
  warning: "#FBBF24",
};

const STATUS_LABEL: Record<MoneyRequestStatus, string> = {
  pending: "قيد المراجعة",
  approved: "موافق عليه",
  rejected: "مرفوض",
};

function statusColor(s: MoneyRequestStatus) {
  if (s === "approved") return P.success;
  if (s === "rejected") return P.error;
  return P.warning;
}

function StatusIcon({ status }: { status: MoneyRequestStatus }) {
  const color = statusColor(status);
  if (status === "approved") return <CheckCircle size={14} color={color} />;
  if (status === "rejected") return <XCircle size={14} color={color} />;
  return <Clock size={14} color={color} />;
}

// ── Request card ────────────────────────────────────────────────────────────
function RequestCard({
  item,
  onApprove,
  onReject,
}: {
  item: MoneyRequest;
  onApprove: () => void;
  onReject: () => void;
}) {
  const sc = statusColor(item.status);
  return (
    <View style={styles.card}>
      {/* Amount + status */}
      <View style={styles.cardHeader}>
        <Text style={styles.amount}>
          {Number(item.amount).toLocaleString("ar-DZ")} د.ج
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: sc + "22" }]}>
          <StatusIcon status={item.status} />
          <Text style={[styles.statusText, { color: sc }]}>
            {STATUS_LABEL[item.status]}
          </Text>
        </View>
      </View>

      {/* Reason */}
      <Text style={styles.reason}>{item.reason}</Text>

      {/* Meta */}
      <Text style={styles.meta}>
        {new Date(item.created_at).toLocaleString("ar-DZ")}
      </Text>
      {item.reviewed_at && (
        <Text style={styles.meta}>
          مراجعة: {new Date(item.reviewed_at).toLocaleString("ar-DZ")}
        </Text>
      )}

      {/* Actions — only for pending requests */}
      {item.status === "pending" && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: P.success + "22", borderColor: P.success }]}
            onPress={onApprove}
          >
            <CheckCircle size={16} color={P.success} />
            <Text style={[styles.actionText, { color: P.success }]}>موافقة</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: P.error + "22", borderColor: P.error }]}
            onPress={onReject}
          >
            <XCircle size={16} color={P.error} />
            <Text style={[styles.actionText, { color: P.error }]}>رفض</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ── Screen ──────────────────────────────────────────────────────────────────
export default function FounderMoneyRequestsScreen() {
  const router = useRouter();
  const { userId } = useCurrentUserId();
  const { requests, loading, refresh, review } = useAllMoneyRequests();
  const [busyId, setBusyId] = useState<string | null>(null);

  const [filter, setFilter] = useState<MoneyRequestStatus | "all">("all");

  const visible =
    filter === "all" ? requests : requests.filter((r) => r.status === filter);

  const handleReview = async (id: string, status: "approved" | "rejected") => {
    if (!userId) return;
    const label = status === "approved" ? "الموافقة على" : "رفض";
    Alert.alert(`تأكيد ${label} الطلب`, `هل أنت متأكد من ${label} هذا الطلب؟`, [
      { text: "إلغاء", style: "cancel" },
      {
        text: "تأكيد",
        style: status === "rejected" ? "destructive" : "default",
        onPress: async () => {
          try {
            setBusyId(id);
            await review(id, status, userId);
          } catch (err: any) {
            Alert.alert("خطأ", err?.message ?? "حدث خطأ");
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  };

  const FILTERS: { key: MoneyRequestStatus | "all"; label: string }[] = [
    { key: "all", label: "الكل" },
    { key: "pending", label: "قيد المراجعة" },
    { key: "approved", label: "موافق عليه" },
    { key: "rejected", label: "مرفوض" },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>الطلبات المالية</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <ChevronRight color={P.text} size={24} />
        </TouchableOpacity>
      </View>

      {/* Filter bar */}
      <View style={styles.filterBar}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            onPress={() => setFilter(f.key)}
            style={[
              styles.filterBtn,
              filter === f.key && { backgroundColor: P.primary, borderColor: P.primary },
            ]}
          >
            <Text
              style={[
                styles.filterText,
                filter === f.key && { color: "#000" },
              ]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && requests.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator color={P.primary} size="large" />
        </View>
      ) : visible.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.empty}>لا توجد طلبات في هذا القسم.</Text>
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={refresh}
              tintColor={P.primary}
            />
          }
          renderItem={({ item }) => (
            <View style={{ opacity: busyId === item.id ? 0.5 : 1 }}>
              <RequestCard
                item={item}
                onApprove={() => handleReview(item.id, "approved")}
                onReject={() => handleReview(item.id, "rejected")}
              />
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: P.bg,
    direction: I18nManager.isRTL ? "rtl" : "ltr",
  },
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 52,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: P.border,
  },
  title: {
    color: P.text,
    fontSize: 20,
    fontWeight: "700",
    textAlign: "right",
  },
  filterBar: {
    flexDirection: "row-reverse",
    gap: 8,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: P.border,
  },
  filterBtn: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: P.border,
  },
  filterText: {
    color: P.muted,
    fontSize: 12,
    fontWeight: "600",
  },
  card: {
    backgroundColor: P.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: P.border,
  },
  cardHeader: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  amount: {
    color: P.text,
    fontSize: 18,
    fontWeight: "700",
  },
  statusBadge: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    marginRight: 4,
  },
  reason: {
    color: P.muted,
    fontSize: 13,
    textAlign: "right",
    marginBottom: 6,
    lineHeight: 20,
  },
  meta: {
    color: "#4B5563",
    fontSize: 11,
    textAlign: "right",
  },
  actions: {
    flexDirection: "row-reverse",
    gap: 8,
    marginTop: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionText: {
    fontSize: 13,
    fontWeight: "600",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  empty: {
    color: P.muted,
    fontSize: 15,
    textAlign: "center",
  },
});
