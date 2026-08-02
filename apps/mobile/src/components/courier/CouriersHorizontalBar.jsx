import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  I18nManager,
  ActivityIndicator,
} from "react-native";
import { Motorcycle, Car, Truck, Bike, Warehouse } from "lucide-react-native";
import { Avatar, Rating, Typography } from "@/components/ui";
import { useAppTheme } from "@/contexts/ThemeContext";
import { TOKENS } from "@/constants/tokens";
import { getAvailableCouriers } from "@/services/courierService";

const VEHICLE_ICONS = {
  motorcycle: Motorcycle,
  car: Car,
  van: Warehouse,
  bicycle: Bike,
  truck: Truck,
};

const isRTL = I18nManager.isRTL;

function CourierCard({ courier, onPress }) {
  const { colors } = useAppTheme();
  const name = courier.full_name || courier.name || "موصل";
  const vehicle = courier.vehicle_type || "motorcycle";
  const Icon = VEHICLE_ICONS[vehicle] || Motorcycle;
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onPress(courier)}
      style={[
        styles.card,
        {
          backgroundColor: colors.bgElevated,
          borderColor: colors.borderSubtle,
        },
      ]}
    >
      <View style={[styles.cardInner, isRTL && { flexDirection: "row-reverse" }]}>
        <Avatar uri={courier.avatar_url || null} name={name} size="lg" />
        <View style={isRTL ? styles.infoRTL : styles.info}>
          <Typography variant="h2" numberOfLines={1}>
            {name}
          </Typography>
          <View style={[styles.row, isRTL && { flexDirection: "row-reverse" }]}>
            <Icon color={colors.primary} size={14} />
            <Typography color="secondary" variant="caption">
              {vehicleLabel(vehicle)}
            </Typography>
          </View>
          <Rating rating={courier.rating ?? 0} size="sm" showBadge />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const vehicleLabel = (type) => {
  const labels = {
    motorcycle: "دراجة نارية",
    car: "سيارة",
    van: "شاح نصف نقل",
    bicycle: "دراجة",
    truck: "شاح تركتويل",
  };
  return labels[type] || type;
};

export default function CouriersHorizontalBar({
  onCourierPress,
  title = "الموصلين المتاحين",
  excludeMock = false,
}) {
  const { colors } = useAppTheme();
  const [couriers, setCouriers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: err } = await getAvailableCouriers();
    if (err) setError(err);
    else setCouriers(excludeMock ? data.filter((c) => !c.is_mock) : data || []);
    setLoading(false);
  }, [excludeMock]);

  useEffect(() => {
    load();
    const unsub = () => {};
    return unsub;
  }, [load]);

  const keyExtractor = (item) => item.id;

  const renderItem = ({ item }) => (
    <CourierCard courier={item} onPress={onCourierPress} />
  );

  return (
    <View style={styles.container}>
      {title ? (
        <Typography variant="h3" style={{ marginHorizontal: TOKENS.spacing.lg }}>
          {title}
        </Typography>
      ) : null}

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : error ? (
        <Typography color="error" style={{ marginHorizontal: TOKENS.spacing.lg }}>
          {error}
        </Typography>
      ) : couriers.length === 0 ? (
        <Typography color="secondary" style={{ marginHorizontal: TOKENS.spacing.lg }}>
          لا يوجد موصلون متاحون حالياً
        </Typography>
      ) : (
        <FlatList
          data={couriers}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: TOKENS.spacing.lg,
            paddingVertical: TOKENS.spacing.sm,
            gap: TOKENS.spacing.sm,
          }}
          ItemSeparatorComponent={() => <View style={{ width: TOKENS.spacing.sm }} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginVertical: TOKENS.spacing.xs,
  },
  card: {
    width: 160,
    borderRadius: TOKENS.radius.lg,
    borderWidth: 1,
    padding: TOKENS.spacing.sm,
    ...TOKENS.shadows.small,
  },
  cardInner: {
    alignItems: "center",
    gap: TOKENS.spacing.xs,
  },
  info: {
    flex: 1,
    alignItems: "flex-start",
  },
  infoRTL: {
    flex: 1,
    alignItems: "flex-end",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  loader: {
    height: 120,
    alignItems: "center",
    justifyContent: "center",
  },
});
