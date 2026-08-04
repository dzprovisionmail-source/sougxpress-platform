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

const getVehicleIcon = (type: string) => {
  if (type === "car") return <Car size={20} color="#FF9500" />;
  if (type === "truck") return <Truck size={20} color="#FF9500" />;
  return <Bike size={20} color="#FF9500" />;
};

const isRTL = I18nManager.isRTL;

export default function CourierDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useAppTheme();

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
      Alert.alert("اتصال", `هل تريد الاتصال بـ ${courier.phone_number}؟`);
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
    try {
      const { data: userData } = await supabase.auth.getUser();
      const currentUserId = userData?.user?.id;
      if (!currentUserId) {
        Alert.alert("تسجيل الدخول", "يرجى تسجيل الدخول لإضافة الموصل إلى المفضلة");
        return;
      }
      const { error } = await toggleFavoriteCourier(currentUserId, courier.id);
      if (error) {
        Alert.alert("خطأ", error);
        return;
      }
      setCourier((prev: any) => ({ ...prev, is_favorite: !prev.is_favorite }));
    } catch (e) {
      console.error("toggleFavorite failed:", e);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `تحقق من ${courier?.full_name} على SougXPRESS!`,
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
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
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
            {getVehicleIcon(vehicleType)}
            <Typography variant="body" color="secondary" style={{ marginHorizontal: TOKENS.spacing.sm }}>
              {courier.vehicle_type}
            </Typography>
          </View>
          <Rating rating={courier.rating} size="md" count={99} showBadge />
          <View style={[styles.badge, { backgroundColor: isAvailable ? "#34C75920" : "#FF3B3020" }]}>
            <Typography variant="caption" style={{ color: isAvailable ? "#34C759" : "#FF3B30" }}>
              {isAvailable ? "متاح" : "غير متاح"}
            </Typography>
          </View>
        </View>

        <View style={styles.section}>
          <Typography variant="h3" color="secondary" style={{ marginBottom: TOKENS.spacing.sm }}>
            نبذة
          </Typography>
          <Typography style={styles.bio}>{courier.bio || "لا توجد نبذة"}</Typography>
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
          />
          <Button
            title={courier.is_favorite ? "إزالة من المفضلة" : "إضافة إلى المفضلة"}
            variant="outline"
            icon={<Heart size={18} color={colors.primary} />}
            onPress={handleToggleFavorite}
            style={styles.actionBtn}
            disabled={!userId}
          />
          <Button
            title="مشاركة"
            variant="ghost"
            icon={<Share2 size={18} color={colors.primary} />}
            onPress={handleShare}
            style={styles.actionBtn}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
    paddingHorizontal: TOKENS.spacing.md,
    paddingVertical: 4,
    borderRadius: TOKENS.radius.full,
  },
  section: {
    marginBottom: TOKENS.spacing.lg,
  },
  bio: {
    lineHeight: 22,
    color: colors.textPrimary,
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
