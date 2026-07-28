import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { ScrollText } from "lucide-react-native";
import { AdminPageShell } from "@/components/admin";
import { useAppTheme } from "@/contexts/ThemeContext";
import {
  getAdminAuditLogs,
  type AdminAuditLogEntry,
} from "@/services/founder.service";

const ACTION_LABELS: Record<string, string> = {
  view_founder_dashboard: "عرض لوحة المؤسس",
  create_store: "إنشاء متجر",
  create_store_failed: "فشل إنشاء متجر",
  update_store_status: "تحديث حالة متجر",
  update_merchant_status: "تحديث حالة تاجر",
  update_driver_status: "تحديث حالة موصل",
  update_customer_status: "تحديث حالة زبون",
  provision_account: "إنشاء حساب",
};

const ENTITY_LABELS: Record<string, string> = {
  system: "النظام",
  store: "المتجر",
  merchant: "التاجر",
  driver: "الموصل",
  customer: "الزبون",
  order: "الطلب",
};

function actionLabel(action: string) {
  return ACTION_LABELS[action] ?? action;
}

function entityLabel(type: string) {
  return ENTITY_LABELS[type] ?? type;
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("ar-DZ") +
    "  " +
    d.toLocaleTimeString("ar-DZ", { hour: "2-digit", minute: "2-digit" })
  );
}

function LogEntryCard({ item }: { item: AdminAuditLogEntry }) {
  const { colors, tokens } = useAppTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.bgElevated,
          borderColor: colors.borderSubtle,
          borderRadius: tokens.radius.md,
          padding: tokens.spacing.md,
        },
      ]}
    >
      <View style={styles.cardHeader}>
        <Text
          style={{
            color: colors.textPrimary,
            fontSize: tokens.typography.sizes.base,
            fontWeight: "700",
            textAlign: "right",
            flex: 1,
            fontFamily: tokens.typography.families.arabic,
          }}
          numberOfLines={1}
        >
          {actionLabel(item.action)}
        </Text>
        <View
          style={[
            styles.entityBadge,
            { backgroundColor: colors.primary + "18" },
          ]}
        >
          <Text
            style={{
              color: colors.primary,
              fontSize: 11,
              fontWeight: "700",
              fontFamily: tokens.typography.families.arabic,
            }}
          >
            {entityLabel(item.entity_type)}
          </Text>
        </View>
      </View>

      {item.entity_id && (
        <Text
          style={{
            color: colors.textDisabled,
            fontSize: 11,
            textAlign: "right",
            marginTop: 2,
          }}
          numberOfLines={1}
        >
          #{item.entity_id}
        </Text>
      )}

      <Text
        style={{
          color: colors.textSecondary,
          fontSize: 12,
          textAlign: "right",
          marginTop: 6,
          fontFamily: tokens.typography.families.arabic,
        }}
      >
        {formatDateTime(item.created_at)}
      </Text>
    </View>
  );
}

export default function FounderActivityScreen() {
  const { colors, tokens } = useAppTheme();
  const [entries, setEntries] = useState<AdminAuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await getAdminAuditLogs(100);
      setEntries(data);
    } catch (err) {
      setError("تعذّر تحميل نشاط المنصة");
      console.error("Founder activity load error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <AdminPageShell showLogout title="نشاط المنصة والسجل" showBack scrollable={false}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <ScrollText size={48} color={colors.textDisabled} />
          <Text
            style={{
              color: colors.error,
              marginTop: 16,
              textAlign: "center",
              fontSize: tokens.typography.sizes.base,
              fontFamily: tokens.typography.families.arabic,
            }}
          >
            {error}
          </Text>
          <TouchableOpacity onPress={() => load()} style={{ marginTop: 16 }}>
            <Text style={{ color: colors.primary, fontSize: 14, fontFamily: tokens.typography.families.arabic }}>
              إعادة المحاولة
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <LogEntryCard item={item} />}
          contentContainerStyle={{
            padding: tokens.spacing.lg,
            gap: tokens.spacing.sm,
            flexGrow: 1,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <ScrollText size={56} color={colors.textDisabled} />
              <Text
                style={{
                  color: colors.textSecondary,
                  marginTop: 16,
                  textAlign: "center",
                  fontSize: tokens.typography.sizes.base,
                  fontWeight: "600",
                  fontFamily: tokens.typography.families.arabic,
                }}
              >
                لا توجد نشاطات مسجّلة بعد
              </Text>
              <Text
                style={{
                  color: colors.textDisabled,
                  marginTop: 8,
                  textAlign: "center",
                  fontSize: 13,
                  fontFamily: tokens.typography.families.arabic,
                }}
              >
                ستظهر هنا جميع إجراءات المنصة والمؤسس الحية
              </Text>
            </View>
          }
        />
      )}
    </AdminPageShell>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  card: {
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
  },
  entityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
});
