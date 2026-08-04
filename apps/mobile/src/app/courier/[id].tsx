import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  I18nManager,
  Alert,
  Share,
  Image,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Phone, MessageCircle, Star, Share2, Heart, Bike, Car, Truck } from "lucide-react-native";
import {
  Typography,
  Avatar,
  Rating,
  Button,
  EmptyState,
  Badge,
} from "@/components/ui";
import { useAppTheme } from "@/contexts/ThemeContext";
import { TOKENS } from "@/constants/tokens";
import { getCourierById, toggleFavoriteCourier } from "@/services/courierService";
import { supabase } from "@/lib/supabase";

const mapVehicleType = (type: string) => {
  if (type === "car" || type === "van") return "car";
  if (type === "truck") return "truck";
  return "bike";
};

const getVehicleIcon = (type: string, iconColor: string) => {
  if (type === "car") return <Car size={20} color={iconColor} />;
  if (type === "truck") return <Truck size={20} color={iconColor} />;
  return <Bike size={20} color={iconColor} />;
};

const isRTL = I18nManager.isRTL;

const getStyles = (colors: ReturnType<typeof useAppTheme>["colors"]) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
    },
    center: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    scrollContent: {
      padding: TOKENS.spacing.lg,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: TOKENS.spacing.lg,
    },
    profileSection: {
      alignItems: "center",
      marginBottom: TOKENS.spacing.xl,
    },
    vehicleRow: {
      alignItems: "center",
      marginTop: TOKENS.spacing.sm,
    },
    badge: {
      marginTop: TOKENS.spacing.sm,
    },
    section: {
      marginBottom: TOKENS.spacing.lg,
    },
    bio: {
      lineHeight: 22,
    },
    vehiclePhoto: {
      width: "100%",
      height: 200,
      borderRadius: TOKENS.radius.lg,
    },
    row: {
      alignItems: "center",
    },
    actions: {
      flexDirection: "row",
      gap: TOKENS.spacing.md,
      marginTop: TOKENS.spacing.lg,
    },
    actionBtn: {
      flex: 1,
    },
  });

export default function CourierProfile() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useAppTheme();
  const styles = getStyles(colors);

  const [courier, setCourier] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | undefined>(undefined);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    };
    checkAuth();
  }, []);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      const { data, error } = await getCourierById(id);
      if (data) setCourier(data);
      else if (error) Alert.alert("خطأ", error);
      setLoading(false);
    };
    load();
  }, [id]);

  const handleCall = () => {
    if (courier?.phone_number) {
      Linking.openURL(`tel:${courier.phone_number}`).catch(() => {
        Alert.alert("خطأ", "لا يمكن فتح تطبيق الاتصال");
      });
    }
  };

  const handleMessage = () => {
    if (courier?.phone_number) {
      Alert.alert("مراسلة", `فتح محادثة مع ${courier.full_name}`);
    }
  };

  const handleToggleFavorite = async () => {
    if (!userId) {
      Alert.alert("تسجيل الدخول", "يرجى تسجيل الدخول لإضافة الموصل إلى المفضلة");
      return;
    }
    const previousIsFavorite = courier.is_favorite;
    setCourier((prev: any) => ({ ...prev, is_favorite: !prev.is_favorite }));
    try {
      const { data: userData } = await supabase.auth.getUser();
      const currentUserId = userData?.user?.id;
      if (!currentUserId) {
        Alert.alert("تسجيل الدخول", "يرجى تسجيل الدخول لإضافة الموصل إلى المفضلة");
        setCourier((prev: any) => ({ ...prev, is_favorite: previousIsFavorite }));
        return;
      }
      const { error } = await toggleFavoriteCourier(currentUserId, courier.id);
      if (error) {
        Alert.alert("خطأ", error);
        setCourier((prev: any) => ({ ...prev, is_favorite: previousIsFavorite }));
      }
    } catch (e) {
      console.error("toggleFavorite failed:", e);
      setCourier((prev: any) => ({ ...prev, is_favorite: previousIsFavorite }));
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `تحقق من ${courier?.full_name} على SougXPRESS!`,
        title: courier?.full_name,
      });
    } catch (e) {
      console.error("Share failed:", e);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bgBase }]}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!courier) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bgBase }]}>
        <View style={styles.center}>
          <EmptyState title="لم يتم العثور على الموصل" />
        </View>
      </SafeAreaView>
    );
  }

  const vehicleType = mapVehicleType(courier.vehicle_type);
  const isAvailable = courier.is_available || courier.is_mock;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bgBase }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            accessibilityLabel="رجوع"
          >
            <ArrowLeft size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Typography variant="h2" align="center">
            ملف الموصل
          </Typography>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.profileSection}>
          <Avatar uri={courier.avatar_url} name={courier.full_name} size="xl" />
          <Typography variant="h1" align="center" style={{ marginTop: TOKENS.spacing.md }}>
            {courier.full_name}
          </Typography>
          <View style={[styles.vehicleRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            {getVehicleIcon(vehicleType, colors.primary)}
            <Typography variant="body" color="secondary" style={{ marginHorizontal: TOKENS.spacing.sm }}>
              {courier.vehicle_type}
            </Typography>
          </View>
          <Rating rating={courier.rating} size="md" showBadge />
          <View style={styles.badge}>
            <Badge variant={isAvailable ? "success" : "error"} label={isAvailable ? "متاح" : "غير متاح"} />
          </View>
        </View>

        <View style={styles.section}>
          <Typography variant="h3" color="secondary" style={{ marginBottom: TOKENS.spacing.sm }}>
            نبذة
          </Typography>
          <Typography style={[styles.bio, { color: colors.textPrimary }]}>{courier.bio || "لا توجد نبذة"}</Typography>
        </View>

        {courier.vehicle_photo_url ? (
          <View style={styles.section}>
            <Typography variant="h3" color="secondary" style={{ marginBottom: TOKENS.spacing.sm }}>
              صورة المركبة
            </Typography>
            <Image
              source={{ uri: courier.vehicle_photo_url }}
              style={styles.vehiclePhoto}
              resizeMode="cover"
              onError={() => {}}
              accessibilityLabel="صورة المركبة"
            />
          </View>
        ) : null}

        <View style={styles.section}>
          <Typography variant="h3" color="secondary" style={{ marginBottom: TOKENS.spacing.sm }}>
            جهة الاتصال
          </Typography>
          <View style={[styles.row, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <Phone size={18} color={colors.primary} />
            <Typography style={{ marginHorizontal: TOKENS.spacing.sm }}>
              {courier.phone_number}
            </Typography>
          </View>
        </View>

        <View style={[styles.actions, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <Button
            title="اتصال"
            icon={<Phone size={18} color={colors.textOnBrand} />}
            onPress={handleCall}
            style={styles.actionBtn}
            accessibilityLabel="اتصال بالموصل"
          />
          <Button
            title={courier.is_favorite ? "إزالة من المفضلة" : "إضافة إلى المفضلة"}
            variant="outline"
            icon={<Heart size={18} color={colors.primary} />}
            onPress={handleToggleFavorite}
            style={styles.actionBtn}
            disabled={!userId}
            accessibilityLabel={courier.is_favorite ? "إزالة من المفضلة" : "إضافة إلى المفضلة"}
          />
          <Button
            title="مشاركة"
            variant="ghost"
            icon={<Share2 size={18} color={colors.primary} />}
            onPress={handleShare}
            style={styles.actionBtn}
            accessibilityLabel="مشاركة الملف"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
