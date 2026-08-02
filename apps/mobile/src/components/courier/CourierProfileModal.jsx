import React, { useEffect, useState, useCallback } from "react";
import {
  Modal,
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  I18nManager,
  ActivityIndicator,
  Alert,
} from "react-native";
import {
  Heart,
  Phone,
  MapPin,
  Edit3,
  X,
  Motorcycle,
  Car,
  Warehouse,
  Bike,
  Truck,
} from "lucide-react-native";
import { Avatar, Rating, Typography, Button } from "@/components/ui";
import { useAppTheme } from "@/contexts/ThemeContext";
import { TOKENS } from "@/constants/tokens";
import { supabase } from "@/lib/supabase";
import {
  getCourierById,
  toggleFavoriteCourier,
} from "@/services/courierService";

const isRTL = I18nManager.isRTL;

const VEHICLE_ICONS = {
  motorcycle: Motorcycle,
  car: Car,
  van: Warehouse,
  bicycle: Bike,
  truck: Truck,
};

function FavoriteButton({ pressed, onPress, disabled }) {
  const { colors } = useAppTheme();
  return (
    <TouchableOpacity
      disabled={disabled}
      activeOpacity={0.8}
      onPress={onPress}
      style={[
        styles.fab,
        {
          backgroundColor: pressed ? `${colors.primary}1A` : `${colors.primary}0D`,
          borderColor: `${colors.primary}40`,
        },
      ]}
    >
      <Heart
        size={22}
        color={pressed ? colors.primary : colors.textSecondary}
        fill={pressed ? colors.primary : "none"}
      />
    </TouchableOpacity>
  );
}

export default function CourierProfileModal({
  visible,
  courierId,
  userId,
  onClose,
  onRequestEdit,
}) {
  const { colors } = useAppTheme();
  const [courier, setCourier] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [resolvedUserId, setResolvedUserId] = useState(userId);

  useEffect(() => {
    if (!resolvedUserId) {
      supabase.auth.getUser().then(({ data }) => {
        setResolvedUserId(data?.user?.id);
      });
    }
  }, [resolvedUserId]);

  const loadCourier = useCallback(async () => {
    if (!courierId) return;
    setLoading(true);
    const { data, error } = await getCourierById(courierId);
    if (data) {
      setCourier(data);
      setIsFavorite(!!data.is_favorite);
    } else if (error) {
      Alert.alert("خطأ", error);
    }
    setLoading(false);
  }, [courierId]);

  useEffect(() => {
    if (visible && courierId) {
      loadCourier();
    } else if (!visible) {
      setCourier(null);
    }
  }, [visible, courierId, loadCourier]);

  const handleFavorite = async () => {
    if (!resolvedUserId || !courierId) return;
    setToggling(true);
    const { data, error } = await toggleFavoriteCourier(
      resolvedUserId,
      courierId
    );
    if (data) {
      setIsFavorite(data.is_favorite);
    } else if (error) {
      Alert.alert("خطأ", error);
    }
    setToggling(false);
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      );
    }
    if (!courier) return null;

    const VehicleIcon = VEHICLE_ICONS[courier.vehicle_type] || Motorcycle;

    return (
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileHeader}>
          <Avatar uri={courier.avatar_url} name={courier.full_name} size="xl" />
          <View style={[styles.nameCol, isRTL && { alignItems: "flex-end" }]}>
            <Typography variant="h1" numberOfLines={1}>
              {courier.full_name}
            </Typography>
            <Rating rating={courier.rating} size="md" count={99} showBadge />
            <View
              style={[styles.row, isRTL && { flexDirection: "row-reverse" }]}
            >
              <MapPin size={14} color={colors.textSecondary} />
              <Typography color="secondary" variant="caption">
                {vehicleLabel(courier.vehicle_type)}
              </Typography>
            </View>
          </View>
        </View>

        {courier.bio ? (
          <View style={styles.section}>
            <Typography variant="h3" color="secondary">
              {"نبذة"}
            </Typography>
            <Typography style={styles.bio}>{courier.bio}</Typography>
          </View>
        ) : null}

        <View style={styles.section}>
          <Typography variant="h3" color="secondary">
            {"وسيلة النقل"}
          </Typography>
          <View style={[styles.row, isRTL && { flexDirection: "row-reverse" }]}>
            <VehicleIcon size={22} color={colors.primary} />
            <Typography style={{ marginTop: 2 }}>
              {vehicleLabel(courier.vehicle_type)}
            </Typography>
          </View>
          {courier.vehicle_photo_url ? (
            <Avatar
              uri={courier.vehicle_photo_url}
              name={courier.full_name}
              size="md"
              type="store"
            />
          ) : null}
        </View>

        <View style={styles.section}>
          <Typography variant="h3" color="secondary">
            {"جهة الاتصال"}
          </Typography>
          <View style={[styles.row, isRTL && { flexDirection: "row-reverse" }]}>
            <Phone size={16} color={colors.primary} />
            <Typography>{courier.phone_number}</Typography>
          </View>
        </View>

        {onRequestEdit ? (
          <Button
            title="تعديل الملف"
            icon={<Edit3 size={18} color={colors.textOnBrand} />}
            onPress={onRequestEdit}
            style={styles.editBtn}
          />
        ) : null}
      </ScrollView>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={[styles.backdrop, { backgroundColor: colors.bgBase }]}>
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.bgElevated,
              borderTopColor: colors.borderSubtle,
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.borderSubtle }]} />
          <View style={styles.header}>
            <Typography variant="h2">{"ملف الموصل"}</Typography>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <X size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {renderContent()}

          {courier ? (
            <FavoriteButton
              pressed={isFavorite}
              onPress={handleFavorite}
              disabled={toggling}
            />
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

function vehicleLabel(type) {
  const labels = {
    motorcycle: "دراجة نارية",
    car: "سيارة",
    van: "شاح نصف نقل",
    bicycle: "دراجة",
    truck: "شاح تركتويل",
  };
  return labels[type] || type;
}
