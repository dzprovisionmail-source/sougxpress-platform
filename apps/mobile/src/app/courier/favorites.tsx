import React, { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  I18nManager,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Heart, Store, Package } from "lucide-react-native";

import { Typography, EmptyState, Card, SectionHeader } from "@/components/ui";
import { useAppTheme } from "@/contexts/ThemeContext";
import { TOKENS } from "@/constants/tokens";
import { useCurrentUserId } from "@/features/workspace/useCurrentUserId";
import { supabase } from "@/lib/supabase";
import { getAvailableCouriers, toggleFavoriteCourier } from "@/services/courierService";

const isRTL = I18nManager.isRTL;

type TabKey = "couriers" | "stores" | "products";

export default function CourierFavoritesScreen() {
  const router = useRouter();
  const { colors, tokens } = useAppTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("couriers");
  const [couriers, setCouriers] = useState<any[]>([]);
  const { userId } = useCurrentUserId();

  const fetchFavorites = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const { data, error } = await getAvailableCouriers(userId);
      if (!error && data) {
        const favs = data.filter((c) => c.is_favorite);
        setCouriers(favs);
      }
    } catch (e) {
      console.error("fetchFavorites failed:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFavorites();
  }, [userId]);

  const handleToggleFavorite = async (courierId: string) => {
    if (!userId) return;
    await toggleFavoriteCourier(userId, courierId);
    fetchFavorites();
  };

  const renderCouriers = () => {
    if (loading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      );
    }
    if (couriers.length === 0) {
      return <EmptyState message="لا يوجد موصلون في المفضلة" />;
    }
    return (
      <View style={{ gap: tokens.spacing.md }}>
        {couriers.map((courier) => (
          <Card key={courier.id} variant="elevated" style={styles.card}>
            <View style={[styles.cardRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <View style={{ flex: 1 }}>
                <Typography variant="h3" align="right" numberOfLines={1}>
                  {courier.full_name}
                </Typography>
                <Typography variant="caption" color="secondary" align="right">
                  ⭐ {courier.rating} • {courier.vehicle_type}
                </Typography>
              </View>
              <TouchableOpacity
                onPress={() => handleToggleFavorite(courier.id)}
                style={styles.favBtn}
              >
                <Heart size={20} color={colors.error} fill={colors.error} />
              </TouchableOpacity>
            </View>
          </Card>
        ))}
      </View>
    );
  };

  const renderPlaceholder = (title: string, description: string) => (
    <EmptyState title={title} message={description} />
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bgBase }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchFavorites(); }} tintColor={colors.primary} />
        }
      >
        <SectionHeader title="المفضلة" />

        <View style={[styles.tabRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          {[
            { key: "couriers" as TabKey, label: "الموصلون", icon: <Heart size={16} color={colors.primary} /> },
            { key: "stores" as TabKey, label: "المتاجر", icon: <Store size={16} color={colors.primary} /> },
            { key: "products" as TabKey, label: "المنتجات", icon: <Package size={16} color={colors.primary} /> },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={[
                styles.tab,
                {
                  backgroundColor: activeTab === tab.key ? colors.primary : colors.bgElevated,
                  borderColor: activeTab === tab.key ? colors.primary : colors.borderSubtle,
                },
              ]}
            >
              {tab.icon}
              <Typography
                variant="caption"
                color={activeTab === tab.key ? "brand" : "secondary"}
                style={{ marginHorizontal: tokens.spacing.xs }}
              >
                {tab.label}
              </Typography>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === "couriers" && renderCouriers()}
        {activeTab === "stores" && renderPlaceholder("المتاجر المفضلة", "ستظهر متاجرك المفضلة هنا قريباً")}
        {activeTab === "products" && renderPlaceholder("المنتجات المفضلة", "ستظهر منتجاتك المفضلة هنا قريباً")}
      </ScrollView>
    </SafeAreaView>
  );
}
