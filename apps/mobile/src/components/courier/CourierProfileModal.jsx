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
  Image,
} from "react-native";
import {
  Heart,
  Phone,
  Edit3,
  X,
} from "lucide-react-native";
import { Avatar, Rating, Typography, Button, Badge } from "@/components/ui";
import { useAppTheme } from "@/contexts/ThemeContext";
import { TOKENS } from "@/constants/tokens";
import { supabase } from "@/lib/supabase";
import {
  getCourierById,
  toggleFavoriteCourier,
} from "@/services/courierService";
import { getVehicleIcon, isCourierAvailable, vehicleLabel } from "@/utils/courier.utils";

const isRTL = I18nManager.isRTL;

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

    const available = isCourierAvailable(courier);

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
            <Rating rating={courier.rating} size="md" showBadge />
            <View
              style={[styles.row, isRTL && { flexDirection: "row-reverse" }]}
            >
              {getVehicleIcon(courier.vehicle_type, colors.primary, 16)}
              <Typography color="secondary" variant="caption" style={{ marginHorizontal: TOKENS.spacing.xs }}>
                {vehicleLabel(courier.vehicle_type)}
              </Typography>
            </View>
          </View>
        </View>

        <View style={[styles.badgeRow, isRTL && { flexDirection: "row-reverse" }]}>
          <Badge variant={available ? "success" : "error"} label={available ? "متاح" : "غير متاح"} />
          {courier.is_mock && <Badge variant="accent" label="تجريبي" />}
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
            {getVehicleIcon(courier.vehicle_type, colors.primary, 22)}
            <Typography style={{ marginTop: 2, marginHorizontal: TOKENS.spacing.sm }}>
              {vehicleLabel(courier.vehicle_type)}
            </Typography>
          </View>
          {courier.vehicle_photo_url ? (
            <Image
              source={{ uri: courier.vehicle_photo_url }}
              style={styles.vehiclePhoto}
              resizeMode="cover"
              onError={() => {}}
              accessibilityLabel="صورة المركبة"
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

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: TOKENS.spacing.lg,
    paddingBottom: 36,
    maxHeight: "90%",
    borderTopWidth: 1,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: TOKENS.spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: TOKENS.spacing.lg,
  },
  scrollContent: {
    paddingBottom: TOKENS.spacing.xl,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: TOKENS.spacing.xl,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: TOKENS.spacing.md,
    marginBottom: TOKENS.spacing.md,
  },
  nameCol: {
    flex: 1,
    gap: TOKENS.spacing.xs,
  },
  row: {
    alignItems: "center",
    gap: TOKENS.spacing.sm,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: TOKENS.spacing.sm,
    marginBottom: TOKENS.spacing.md,
    flexWrap: "wrap",
  },
  section: {
    marginBottom: TOKENS.spacing.lg,
  },
  bio: {
    lineHeight: 22,
    color: TOKENS.colors.light.textPrimary,
  },
  vehiclePhoto: {
    width: "100%",
    height: 180,
    borderRadius: TOKENS.radius.lg,
    marginTop: TOKENS.spacing.sm,
  },
  editBtn: {
    marginTop: TOKENS.spacing.md,
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    ...TOKENS.shadows.medium,
  },
});
