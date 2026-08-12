import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useAppTheme } from "@/contexts/ThemeContext";
import { useCurrentUserId } from "@/features/workspace/useCurrentUserId";
import { getStoreByMerchantId } from "@/services/store.service";
import { useMerchantProducts } from "@/hooks/useProducts";
import { TOKENS } from "@/constants/tokens";
import { Package, LogIn } from "lucide-react-native";
import { Typography, Button } from "@/components/ui";
import { supabase } from "@/lib/supabase";

export default function MerchantProductsScreen() {
  const router = useRouter();
  const { colors, tokens } = useAppTheme();
  const { userId } = useCurrentUserId();
  const [storeId, setStoreId] = useState<string | null>(null);

  const { products, loading } = useMerchantProducts(storeId || "");
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) setIsGuest(true);
    });
  }, []);

  useEffect(() => {
    const loadStore = async () => {
      if (!userId) return;
      const store = await getStoreByMerchantId(userId);
      if (store) setStoreId(store.id);
    };
    loadStore();
  }, [userId]);

  if (loading && products.length === 0 && !isGuest) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bgBase }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isGuest) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bgBase }]}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>المنتجات</Text>
        <View style={styles.empty}>
          <View style={[styles.iconContainer, { backgroundColor: colors.primary + '10', width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: TOKENS.spacing.xl }]}>
            <Package size={50} color={colors.primary} />
          </View>
          <Typography variant="h2" align="center" style={{ marginBottom: TOKENS.spacing.md, fontWeight: '700' }}>
            مرحبًا بك في Soug-XPRESS
          </Typography>
          <Typography variant="body" color="secondary" align="center" style={{ marginBottom: TOKENS.spacing.xl, lineHeight: 24 }}>
            يجب عليك تسجيل الدخول كتاجر لإدارة منتجاتك وعروضك.
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

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bgBase }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>المنتجات</Text>

      {products.length === 0 ? (
        <View style={styles.empty}>
          <Package size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>لا توجد منتجات</Text>
        </View>
      ) : (
        products.map((product) => (
          <View
            key={product.id}
            style={[styles.productCard, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}
          >
            <Text style={[styles.productName, { color: colors.textPrimary }]}>{product.name}</Text>
            <Text style={[styles.productPrice, { color: colors.textSecondary }]}>
              {product.price_minor ? `${product.price_minor / 100} د.ج` : "بدون سعر"}
            </Text>
          </View>
        ))
      )}
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
  empty: {
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
  productCard: {
    padding: TOKENS.spacing.md,
    borderRadius: TOKENS.radius.md,
    borderWidth: 1,
    marginBottom: TOKENS.spacing.sm,
  },
  productName: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "right",
  },
  productPrice: {
    fontSize: 14,
    marginTop: TOKENS.spacing.xs,
    textAlign: "right",
  },
});
