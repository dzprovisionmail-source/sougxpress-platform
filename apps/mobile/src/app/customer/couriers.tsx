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
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, Bike, Car, Truck, Star, Share2, Heart } from "lucide-react-native";
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
import { getAvailableCouriers, toggleFavoriteCourier } from "@/services/courierService";
import { supabase } from "@/lib/supabase";

const mapVehicleType = (type: string) => {
  if (type === "car" || type === "van") return "car";
  if (type === "truck") return "truck";
  return "bike";
};

const getVehicleIcon = (type: string, iconColor: string) => {
  if (type === "car") return <Car size={18} color={iconColor} />;
  if (type === "truck") return <Truck size={18} color={iconColor} />;
  return <Bike size={18} color={iconColor} />;
};

export default function CouriersDirectoryScreen() {
  const router = useRouter();
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
      const { data, error } = await getAvailableCouriers();
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
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchCouriers();
  }, [fetchCouriers]);

  useEffect(() => {
    fetchCouriers();
  }, [fetchCouriers]);

  const handleViewProfile = (courierId: string) => {
    router.push({ pathname: "/courier/[id]", params: { id: courierId } });
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

  const renderCourierCard = (courier: any) => {
    const vehicleType = mapVehicleType(courier.vehicle_type);
    const isAvailable = courier.is_available || courier.is_mock;

    return (
      <Card variant="elevated" style={styles.card}>
        <View style={[styles.cardHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <Avatar uri={courier.avatar_url} name={courier.full_name} size="lg" />
          <View style={styles.cardHeaderInfo}>
            <View style={[styles.cardHeaderTextRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <View style={styles.cardHeaderText}>
                <Typography variant="h3" align="right" numberOfLines={1}>
                  {courier.full_name}
                </Typography>
                <View style={[styles.vehicleRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                  {getVehicleIcon(vehicleType, colors.primary)}
                  <Typography variant="caption" color="secondary" style={{ marginHorizontal: TOKENS.spacing.xs }}>
                    {courier.vehicle_type}
                  </Typography>
                </View>
              </View>
              <Badge variant={isAvailable ? "success" : "error"} label={isAvailable ? "متاح" : "غير متاح"} />
            </View>
          </View>
        </View>

        <View style={styles.cardBody}>
          <Rating rating={courier.rating} size="sm" />
          <Typography variant="body" color="secondary" numberOfLines={2} style={{ marginTop: TOKENS.spacing.xs }}>
            {courier.bio || "لا توجد نبذة"}
          </Typography>
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
        </View>

        <View style={[styles.cardActions, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <Button
            title="عرض الملف"
            size="sm"
            onPress={() => handleViewProfile(courier.id)}
            style={styles.actionBtn}
          />
          {userId && (
            <Button
              title={courier.is_favorite ? "إزالة من المفضلة" : "إضافة إلى المفضلة"}
              variant="outline"
              size="sm"
              icon={<Heart size={16} color={colors.primary} />}
              onPress={() => handleToggleFavorite(courier.id)}
              style={styles.actionBtn}
              accessibilityLabel={courier.is_favorite ? "إزالة من المفضلة" : "إضافة إلى المفضلة"}
            />
          )}
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
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            accessibilityLabel="رجوع"
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: TOKENS.spacing.lg,
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
    gap: TOKENS.spacing.sm,
  },
  cardHeader: {
    alignItems: "center",
    gap: TOKENS.spacing.md,
  },
  cardHeaderInfo: {
    flex: 1,
  },
  cardHeaderTextRow: {
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardHeaderText: {
    flex: 1,
  },
  vehicleRow: {
    alignItems: "center",
    marginTop: 2,
  },
  cardBody: {
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
