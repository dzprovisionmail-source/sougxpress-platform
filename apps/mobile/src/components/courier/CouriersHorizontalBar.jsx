import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Star, Bike, Car, Truck } from "lucide-react-native";
import { getAvailableCouriers } from "@/services/courierService";
import { useAppTheme } from "@/contexts/ThemeContext";
import { TOKENS } from "@/constants/tokens";
import { VEHICLE_ICONS, mapVehicleType, vehicleLabel } from "@/utils/courier.utils";

export default function CouriersHorizontalBar({ couriers = [], onCourierPress = undefined, onPress = undefined }) {
  const router = useRouter();
  const { colors } = useAppTheme();
  const [liveCouriers, setLiveCouriers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchCouriers = async () => {
      try {
        const res = await getAvailableCouriers();
        if (!cancelled && res.data && res.data.length > 0) {
          setLiveCouriers(res.data);
        }
      } catch (e) {
        console.warn("CouriersHorizontalBar fetch failed:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchCouriers();
    return () => { cancelled = true; };
  }, []);

  const list = (couriers && couriers.length > 0) ? couriers : liveCouriers;

  const getIcon = (type, size = 13) => {
    const vehicleType = mapVehicleType(type);
    const Icon = VEHICLE_ICONS[vehicleType] || Bike;
    return <Icon size={size} color={colors.primary} />;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>الموصلون المتاحون</Text>
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.primary} size="small" />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>جاري التحميل...</Text>
        </View>
      </View>
    );
  }

  if (list.length === 0) {
    return null;
  }

  const handlePress = onCourierPress || onPress;

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>الموصلون المتاحون</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {list.map((item) => {
          const isAvailable = item.is_available || item.is_mock;
          return (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.8}
              onPress={() => {
                if (typeof handlePress === "function") {
                  handlePress(item);
                } else {
                  router.push({ pathname: "/courier/[id]", params: { id: item.id } });
                }
              }}
              style={[styles.card, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]}
            >
              <View style={[styles.avatarContainer, { backgroundColor: `${colors.primary}18` }]}>
                {item.avatar_url ? (
                  <View style={styles.avatarInner}>
                    <Text style={[styles.avatarInitial, { color: colors.primary }]}>
                      {item.full_name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.avatarInner}>
                    <Bike size={22} color={colors.primary} />
                  </View>
                )}
                <View style={[styles.vehicleBadge, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]}>
                  {getIcon(item.vehicle_type, 12)}
                </View>
              </View>
              <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>{item.full_name}</Text>
              <View style={styles.metaRow}>
                <Star size={11} color="#FFD700" fill="#FFD700" />
                <Text style={[styles.rating, { color: colors.textPrimary }]}>{typeof item.rating === "number" ? item.rating.toFixed(1) : item.rating || "4.8"}</Text>
                <View style={[styles.statusDot, { backgroundColor: isAvailable ? colors.success : colors.textDisabled }]} />
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: TOKENS.spacing.md,
  },
  title: {
    fontSize: TOKENS.typography.sizes.base,
    fontWeight: "700",
    textAlign: "right",
    paddingHorizontal: TOKENS.spacing.lg,
    marginBottom: TOKENS.spacing.sm,
    fontFamily: TOKENS.typography.families.arabic,
  },
  scroll: {
    paddingHorizontal: TOKENS.spacing.lg,
    gap: TOKENS.spacing.md,
    flexDirection: "row-reverse",
  },
  card: {
    width: 120,
    borderRadius: TOKENS.radius.lg,
    padding: TOKENS.spacing.sm,
    alignItems: "center",
    borderWidth: 1,
    ...TOKENS.shadows.small,
  },
  avatarContainer: {
    width: 52,
    height: 52,
    borderRadius: TOKENS.radius.full,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: TOKENS.spacing.sm,
    position: "relative",
    borderWidth: 2,
    borderColor: "transparent",
  },
  avatarInner: {
    width: "100%",
    height: "100%",
    borderRadius: TOKENS.radius.full,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: "800",
    fontFamily: TOKENS.typography.families.arabic,
  },
  vehicleBadge: {
    position: "absolute",
    bottom: -3,
    right: -3,
    borderRadius: TOKENS.radius.full,
    padding: 3,
    borderWidth: 1.5,
  },
  name: {
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: "600",
    marginBottom: TOKENS.spacing.xs,
    textAlign: "center",
    fontFamily: TOKENS.typography.families.arabic,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  rating: {
    fontSize: TOKENS.typography.sizes.xs,
    fontWeight: "700",
    fontFamily: TOKENS.typography.families.arabic,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: TOKENS.spacing.sm,
    paddingVertical: TOKENS.spacing.lg,
    paddingHorizontal: TOKENS.spacing.lg,
  },
  loadingText: {
    fontSize: TOKENS.typography.sizes.sm,
    fontFamily: TOKENS.typography.families.arabic,
  },
});
