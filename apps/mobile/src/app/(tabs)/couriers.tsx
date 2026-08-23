import React, { useEffect, useState, useCallback } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  I18nManager,
  Alert,
  Share,
  RefreshControl,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useGlobalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Star, Share2, Heart, Truck, Bike, Car, Eye } from "lucide-react-native";
import { getPromotionalViews } from "@/services/promotional-views.service";
import {
  Typography,
  Avatar,
  Rating,
  Button,
  EmptyState,
  Badge,
  Card,
} from "@/components/ui";
import { useAppTheme } from "@/contexts/ThemeContext";
import { TOKENS } from "@/constants/tokens";
import { getAvailableCouriers, toggleFavoriteCourier, getCourierById } from "@/services/courierService";
import { supabase } from "@/lib/supabase";
import { getVehicleIcon, isCourierAvailable, vehicleLabel } from "@/utils/courier.utils";

export default function CouriersDirectoryScreen() {
  const router = useRouter();
  const params = useGlobalSearchParams<{ preview?: string; identity?: string }>();
  const marketContextParams = params.identity === "soug-admin" && (params.preview === "1" || params.preview === undefined)
    ? { preview: "1", identity: "soug-admin" }
    : {};
  const { colors } = useAppTheme();
  const isRTL = I18nManager.isRTL;

  const [couriers, setCouriers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | undefined>(undefined);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    };
    checkAuth();
  }, []);

  const fetchCouriers = useCallback(async () => {
    try {
      const { data, error } = await getAvailableCouriers(userId);
      if (error || !data) {
        Alert.alert("خطأ", error || "فشل جلب قائمة الموصلين");
        return;
      }
      setCouriers(data);
    } catch (e) {
      console.error("fetchCouriers failed:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchCouriers();
  }, [fetchCouriers]);

  useEffect(() => {
    fetchCouriers();
  }, [fetchCouriers]);

  const handleViewProfile = (courierId: string) => {
    router.push({ pathname: "/courier/[id]", params: { id: courierId, ...marketContextParams } });
  };

  const handleToggleFavorite = async (courierId: string) => {
    if (!userId) {
      Alert.alert("تسجيل الدخول", "يرجى تسجيل الدخول لإضافة الموصل إلى المفضلة");
      return;
    }
    const previousCouriers = couriers;
    setCouriers((prev) =>
      prev.map((c) =>
        c.id === courierId ? { ...c, is_favorite: !c.is_favorite } : c
      )
    );
    try {
      const { data: userData } = await supabase.auth.getUser();
      const currentUserId = userData?.user?.id;
      if (!currentUserId) {
        Alert.alert("تسجيل الدخول", "يرجى تسجيل الدخول لإضافة الموصل إلى المفضلة");
        setCouriers(previousCouriers);
        return;
      }
      const { error } = await toggleFavoriteCourier(currentUserId, courierId);
      if (error) {
        Alert.alert("خطأ", error);
        setCouriers(previousCouriers);
        return;
      }
      const { data: updatedCourier } = await getCourierById(courierId);
      if (updatedCourier) {
        setCouriers((prev) =>
          prev.map((c) => (c.id === courierId ? { ...c, is_favorite: updatedCourier.is_favorite } : c))
        );
      }
    } catch (e) {
      console.error("toggleFavorite failed:", e);
      setCouriers(previousCouriers);
    }
  };

  const handleShare = async (courier: any) => {
    try {
      await Share.share({
        message: `تحقق من ${courier.full_name} على SougXPRESS!`,
        title: courier.full_name,
      });
    } catch (e) {
      console.error("Share failed:", e);
    }
  };

  const [promoViewsMap, setPromoViewsMap] = useState<Record<string, number | null>>({});

  useEffect(() => {
    if (couriers.length > 0) {
      const fetchAllPromoViews = async () => {
        const newMap: Record<string, number | null> = {};
        for (const courier of couriers) {
          try {
            const promoData = await getPromotionalViews("courier", courier.id);
            newMap[courier.id] = promoData?.currentViews ?? null;
          } catch (e) {
            console.error(`Error fetching promo views for courier ${courier.id}:`, e);
          }
        }
        setPromoViewsMap(newMap);
      };
      fetchAllPromoViews();
    }
  }, [couriers]);

  const renderCourierCard = (courier: any) => {
    const available = isCourierAvailable(courier);
    const vehicleType = vehicleLabel(courier.vehicle_type);
    const promoViews = promoViewsMap[courier.id];

    return (
      <Card key={courier.id} variant="elevated" style={styles.card}>
        <View style={[styles.cardTopRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <View style={styles.avatarCol}>
            <Avatar uri={courier.avatar_url} name={courier.full_name} size="xl" />
            {courier.is_mock && (
              <Badge variant="accent" label="تجريبي" style={styles.mockBadge} />
            )}
          </View>
          <View style={styles.cardTopInfo}>
            <View style={[styles.nameRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <Typography variant="h3" align="right" numberOfLines={1} style={{ flex: 1 }}>
                {courier.full_name}
              </Typography>
              {userId && (
                <TouchableOpacity
                  onPress={() => handleToggleFavorite(courier.id)}
                  style={styles.favoriteBtn}
                  accessibilityLabel={courier.is_favorite ? "إزالة من المفضلة" : "إضافة إلى المفضلة"}
                >
                  <Heart
                    size={20}
                    color={courier.is_favorite ? colors.error : colors.textSecondary}
                    fill={courier.is_favorite ? colors.error : "none"}
                  />
                </TouchableOpacity>
              )}
            </View>
            <View style={[styles.metaRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <View style={styles.vehicleChip}>
                {getVehicleIcon(courier.vehicle_type, colors.primary, 16)}
                <Typography variant="caption" color="secondary" style={{ marginHorizontal: TOKENS.spacing.xs }}>
                  {vehicleType}
                </Typography>
              </View>
              <Badge variant={available ? "success" : "error"} label={available ? "متاح" : "غير متاح"} />
            </View>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statItem, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <Star size={16} color="#FFD700" fill="#FFD700" />
            <Typography variant="body" style={{ marginHorizontal: TOKENS.spacing.xs }}>
              {typeof courier.rating === "number" ? courier.rating.toFixed(1) : courier.rating}
            </Typography>
          </View>
          {typeof courier.delivery_count === "number" && Number.isFinite(courier.delivery_count) ? (
            <View style={[styles.statItem, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <Truck size={16} color={colors.textSecondary} />
              <Typography variant="caption" color="secondary">
                {courier.delivery_count.toLocaleString("ar-DZ")} توصيل
              </Typography>
            </View>
          ) : null}
          {typeof promoViews === "number" && Number.isFinite(promoViews) ? (
            <View style={[styles.statItem, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <Eye size={16} color={colors.textSecondary} />
              <Typography variant="caption" color="secondary">
                {promoViews.toLocaleString("ar-DZ")} مشاهدة
              </Typography>
            </View>
          ) : null}
        </View>

        <View style={styles.bioRow}>
          <Typography variant="body" color="secondary" numberOfLines={2}>
            {courier.bio || "لا توجد نبذة"}
          </Typography>
        </View>

        {courier.vehicle_photo_url ? (
          <View style={styles.vehiclePhotoWrapper}>
            <Image
              source={{ uri: courier.vehicle_photo_url }}
              style={styles.vehiclePhoto}
              resizeMode="cover"
              onError={() => {}}
              accessibilityLabel="صورة المركبة"
            />
          </View>
        ) : null}

        <View style={[styles.cardActions, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <Button
            title="عرض الملف"
            size="sm"
            onPress={() => handleViewProfile(courier.id)}
            style={styles.actionBtn}
            icon={<ArrowLeft size={16} color={colors.textOnBrand} />}
          />
          <Button
            title="مشاركة"
            variant="outline"
            size="sm"
            icon={<Share2 size={16} color={colors.primary} />}
            onPress={() => handleShare(courier)}
            style={styles.actionBtn}
          />
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bgBase }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <View style={[styles.header, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            accessibilityLabel="رجوع"
            style={styles.backBtn}
          >
            <ArrowLeft size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Typography variant="h2" align="center">
              الموصلون المتاحون
            </Typography>
            <Typography variant="caption" color="secondary" align="center">
              اختر الموصل المناسب لك
            </Typography>
          </View>
          <View style={{ width: 24 }} />
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Typography variant="caption" color="secondary" style={{ marginTop: TOKENS.spacing.md }}>
              جاري تحميل الموصلين...
            </Typography>
          </View>
        ) : couriers.length === 0 ? (
          <EmptyState
            title="لا يوجد موصلون متاحون حالياً"
            description="يرجى المحاولة مرة أخرى لاحقاً"
          />
        ) : (
          <View style={styles.list}>
            {couriers.map(renderCourierCard)}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: TOKENS.spacing.lg,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: TOKENS.spacing.xl,
  },
  header: {
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: TOKENS.spacing.lg,
  },
  backBtn: {
    padding: TOKENS.spacing.xs,
  },
  headerText: {
    alignItems: "center",
    flex: 1,
  },
  list: {
    gap: TOKENS.spacing.md,
  },
  card: {
    borderRadius: TOKENS.radius.lg,
    borderWidth: 1,
    padding: TOKENS.spacing.md,
    gap: TOKENS.spacing.md,
  },
  cardTopRow: {
    alignItems: "flex-start",
    gap: TOKENS.spacing.md,
  },
  avatarCol: {
    position: "relative",
  },
  mockBadge: {
    position: "absolute",
    bottom: -4,
    left: -4,
  },
  cardTopInfo: {
    flex: 1,
  },
  nameRow: {
    alignItems: "center",
    justifyContent: "space-between",
    gap: TOKENS.spacing.sm,
  },
  favoriteBtn: {
    padding: TOKENS.spacing.xs,
  },
  metaRow: {
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: TOKENS.spacing.sm,
    gap: TOKENS.spacing.sm,
  },
  vehicleChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${TOKENS.colors.brandPrimary}12`,
    paddingHorizontal: TOKENS.spacing.sm,
    paddingVertical: TOKENS.spacing.xs,
    borderRadius: TOKENS.radius.full,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: TOKENS.spacing.lg,
    paddingVertical: TOKENS.spacing.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: `${TOKENS.colors.brandPrimary}12`,
  },
  statItem: {
    alignItems: "center",
    gap: TOKENS.spacing.xs,
  },
  bioRow: {
    marginTop: TOKENS.spacing.xs,
  },
  vehiclePhotoWrapper: {
    marginTop: TOKENS.spacing.sm,
  },
  vehiclePhoto: {
    width: "100%",
    height: 160,
    borderRadius: TOKENS.radius.md,
  },
  cardActions: {
    flexDirection: "row",
    gap: TOKENS.spacing.sm,
    marginTop: TOKENS.spacing.sm,
  },
  actionBtn: {
    flex: 1,
  },
});
