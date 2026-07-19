import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { router } from "expo-router";
import { Users, ShoppingBag, Truck, Plus } from "lucide-react-native";
import { AdminPageShell } from "@/components/admin";
import { useAppTheme } from "@/contexts/ThemeContext";
import { getFounderCustomers, getFounderMerchants, getFounderDrivers } from "@/services/founder-users.service";

interface Counts { customers: number; merchants: number; drivers: number }

function HubCard({
  icon,
  title,
  subtitle,
  count,
  accent,
  onPress,
  onAdd,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  count: number | null;
  accent: string;
  onPress: () => void;
  onAdd: () => void;
}) {
  const { colors, tokens } = useAppTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        styles.card,
        {
          backgroundColor: colors.bgElevated,
          borderColor: colors.borderSubtle,
          borderRadius: tokens.radius.lg,
          padding: tokens.spacing.xl,
        },
      ]}
    >
      <View style={styles.cardTop}>
        <View style={[styles.iconWrap, { backgroundColor: accent + "18" }]}>
          {icon}
        </View>
        <TouchableOpacity
          onPress={onAdd}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={[styles.addBtn, { backgroundColor: accent + "18", borderColor: accent + "44" }]}
        >
          <Plus size={14} color={accent} />
        </TouchableOpacity>
      </View>
      <View style={styles.cardBottom}>
        <Text style={{ color: colors.textPrimary, fontSize: 20, fontWeight: "700", textAlign: "right" }}>
          {title}
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: "right", marginTop: 2 }}>
          {subtitle}
        </Text>
        {count !== null && (
          <Text style={{ color: accent, fontSize: 28, fontWeight: "800", textAlign: "right", marginTop: 8 }}>
            {count}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function FounderUsersHubScreen() {
  const { colors } = useAppTheme();
  const [counts, setCounts] = useState<Counts | null>(null);

  const loadCounts = useCallback(async () => {
    const [customers, merchants, drivers] = await Promise.all([
      getFounderCustomers(),
      getFounderMerchants(),
      getFounderDrivers(),
    ]);
    setCounts({
      customers: customers.length,
      merchants: merchants.length,
      drivers: drivers.length,
    });
  }, []);

  useEffect(() => { loadCounts(); }, [loadCounts]);

  const navigateTo = (path: string) =>
    router.push(path as Parameters<typeof router.push>[0]);

  return (
    <AdminPageShell title="إدارة المستخدمين" showBack>
      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
        <View style={styles.grid}>
          <HubCard
            icon={<Users size={24} color={colors.secondary} />}
            title="الزبائن"
            subtitle="إنشاء وإدارة حسابات الزبائن"
            count={counts?.customers ?? null}
            accent={colors.secondary}
            onPress={() => navigateTo("/founder/users/customers")}
            onAdd={() => navigateTo("/founder/users/create?role=customer")}
          />
          <HubCard
            icon={<ShoppingBag size={24} color={colors.primary} />}
            title="التجار"
            subtitle="الموافقة وإدارة حسابات التجار"
            count={counts?.merchants ?? null}
            accent={colors.primary}
            onPress={() => navigateTo("/founder/users/merchants")}
            onAdd={() => navigateTo("/founder/users/create?role=merchant")}
          />
          <HubCard
            icon={<Truck size={24} color={colors.success} />}
            title="الموصلون"
            subtitle="إدارة أسطول الموصلين والتسويات"
            count={counts?.drivers ?? null}
            accent={colors.success}
            onPress={() => navigateTo("/founder/users/drivers")}
            onAdd={() => navigateTo("/founder/users/create?role=driver")}
          />
        </View>
      </ScrollView>
    </AdminPageShell>
  );
}

const styles = StyleSheet.create({
  grid: { gap: 12 },
  card: { borderWidth: 1, gap: 16 },
  cardTop: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" },
  cardBottom: { alignItems: "flex-end" },
  iconWrap: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  addBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" },
});
