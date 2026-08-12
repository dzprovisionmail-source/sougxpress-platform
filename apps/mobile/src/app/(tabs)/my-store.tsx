import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useAppTheme } from "@/contexts/ThemeContext";
import { useCurrentUserId } from "@/features/workspace/useCurrentUserId";
import { getStoreByMerchantId } from "@/services/store.service";
import { Store } from "@/types/schema-03-core";
import { TOKENS } from "@/constants/tokens";
import { Store as StoreIcon, LogIn } from "lucide-react-native";
import { Typography, Button } from "@/components/ui";
import { supabase } from "@/lib/supabase";

export default function MyStoreScreen() {
  const router = useRouter();
  const { colors, tokens } = useAppTheme();
  const { userId } = useCurrentUserId();
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) setIsGuest(true);
    });
  }, []);

  useEffect(() => {
    const loadStore = async () => {
      if (!userId) return;
      setLoading(true);
      const data = await getStoreByMerchantId(userId);
      setStore(data);
      setLoading(false);
    };
    loadStore();
  }, [userId]);

  if (loading && !isGuest) {
    return (
      <ScrollView style={[styles.container, { backgroundColor: colors.bgBase }]}>
        <ActivityIndicator size="large" color={colors.primary} style={styles.center} />
      </ScrollView>
    );
  }

  if (isGuest) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bgBase }]}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>متجري</Text>
        <View style={styles.center}>
          <View style={[styles.iconContainer, { backgroundColor: colors.primary + '10', width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: TOKENS.spacing.xl }]}>
            <StoreIcon size={50} color={colors.primary} />
          </View>
          <Typography variant="h2" align="center" style={{ marginBottom: TOKENS.spacing.md, fontWeight: '700' }}>
            مرحبًا بك في Soug-XPRESS
          </Typography>
          <Typography variant="body" color="secondary" align="center" style={{ marginBottom: TOKENS.spacing.xl, lineHeight: 24 }}>
            يجب عليك تسجيل الدخول كتاجر لإدارة متجرك وإعدادات البيع.
          </Typography>
          <Button
            title="التسجيل / الدخول"
            onPress={() => router.push("/login")}
            variant="primary"
            size="lg"
            icon={<LogIn size={20} color={colors.textOnBrand} />}
            style={{ width: '100%' }}
          />
        </View>
      </View>
    );
  }

  if (!store) {
    return (
      <ScrollView style={[styles.container, { backgroundColor: colors.bgBase }]}>
        <View style={styles.center}>
          <StoreIcon size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>لم يتم إنشاء متجر بعد</Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bgBase }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>متجري</Text>

      <View style={[styles.card, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>اسم المتجر</Text>
        <Text style={[styles.value, { color: colors.textPrimary }]}>{store.name}</Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>المدينة</Text>
        <Text style={[styles.value, { color: colors.textPrimary }]}>{store.city}</Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>التصنيف</Text>
        <Text style={[styles.value, { color: colors.textPrimary }]}>{store.category}</Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>الحالة</Text>
        <Text style={[styles.value, { color: store.is_open ? colors.success : colors.error }]}>
          {store.is_open ? "مفتوح" : "مغلق"}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: TOKENS.spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: TOKENS.spacing.lg,
    textAlign: "right",
  },
  center: {
    alignItems: "center",
    marginTop: TOKENS.spacing.xl,
  },
  emptyText: {
    marginTop: TOKENS.spacing.md,
    fontSize: 16,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    padding: TOKENS.spacing.md,
    borderRadius: TOKENS.radius.md,
    borderWidth: 1,
    marginBottom: TOKENS.spacing.sm,
  },
  label: {
    fontSize: 14,
    marginBottom: TOKENS.spacing.xs,
  },
  value: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "right",
  },
});
