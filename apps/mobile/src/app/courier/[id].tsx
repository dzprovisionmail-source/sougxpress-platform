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
import { ArrowLeft, Phone, Star, Share2, Heart, Image as ImageIcon, ClipboardList, TrendingUp, MessageCircle, ShoppingBag } from "lucide-react-native";
import {
  Typography,
  Avatar,
  Rating,
  Button,
  EmptyState,
  Badge,
  SectionHeader,
  Card,
} from "@/components/ui";
import { useAppTheme } from "@/contexts/ThemeContext";
import { TOKENS } from "@/constants/tokens";
import { getCourierById, toggleFavoriteCourier } from "@/services/courierService";
import { supabase } from "@/lib/supabase";
import { getVehicleIcon, isCourierAvailable, vehicleLabel } from "@/utils/courier.utils";
import { getCommercialPhone, logCallPress, getOrCreateConversation } from "@/services/chat.service";

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
    profileHero: {
      alignItems: "center",
      marginBottom: TOKENS.spacing.xl,
      position: "relative",
    },
    avatarRing: {
      padding: 4,
      borderRadius: TOKENS.radius.full,
      borderWidth: 3,
      borderColor: colors.primary,
    },
    badgeRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: TOKENS.spacing.sm,
      marginTop: TOKENS.spacing.sm,
      flexWrap: "wrap",
      justifyContent: "center",
    },
    section: {
      marginBottom: TOKENS.spacing.xl,
    },
    sectionHeader: {
      marginBottom: TOKENS.spacing.sm,
    },
    bio: {
      lineHeight: 24,
    },
    vehiclePhoto: {
      width: "100%",
      height: 200,
      borderRadius: TOKENS.radius.lg,
    },
    contactRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: TOKENS.spacing.sm,
      paddingVertical: TOKENS.spacing.sm,
      paddingHorizontal: TOKENS.spacing.md,
      borderRadius: TOKENS.radius.md,
      backgroundColor: `${colors.primary}08`,
      borderWidth: 1,
      borderColor: `${colors.primary}18`,
    },
    actions: {
      flexDirection: "row",
      gap: TOKENS.spacing.md,
      marginTop: TOKENS.spacing.lg,
      flexWrap: "wrap",
    },
    actionBtn: {
      flex: 1,
      minWidth: "45%",
    },
    futureSection: {
      padding: TOKENS.spacing.lg,
      borderRadius: TOKENS.radius.lg,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      backgroundColor: colors.bgElevated,
      alignItems: "center",
      gap: TOKENS.spacing.sm,
    },
    futureIcon: {
      opacity: 0.4,
    },
    futureLabel: {
      opacity: 0.5,
    },
    vehicleChip: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: `${TOKENS.colors.brandPrimary}12`,
      paddingHorizontal: TOKENS.spacing.sm,
      paddingVertical: TOKENS.spacing.xs,
      borderRadius: TOKENS.radius.full,
    },
    statsCard: {
      padding: TOKENS.spacing.md,
    },
    statsGrid: {
      flexDirection: "row",
      justifyContent: "space-around",
      gap: TOKENS.spacing.md,
    },
    statBox: {
      alignItems: "center",
      gap: TOKENS.spacing.xs,
      padding: TOKENS.spacing.sm,
      borderRadius: TOKENS.radius.md,
      backgroundColor: `${colors.primary}08`,
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
  const [userRole, setUserRole] = useState<string | null>(null);
  const [startingChat, setStartingChat] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();
        setUserRole(profile?.role || null);
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      const { data, error } = await getCourierById(id);
      if (data) {
        setCourier(data);
      }
      else if (error) Alert.alert("خطأ", error);
      setLoading(false);
    };
    load();
  }, [id]);

  const handleStartChat = async () => {
    if (!userId) {
      Alert.alert("تسجيل الدخول", "يرجى تسجيل الدخول لبدء محادثة");
      return;
    }
    
    if (userId === courier.id) {
      Alert.alert("تنبيه", "لا يمكنك بدء محادثة مع نفسك");
      return;
    }

    try {
      setStartingChat(true);
      const relationshipType = userRole === "merchant" ? "merchant_courier" : "customer_courier";
      
      const { data: conversationId, error } = await getOrCreateConversation(
        courier.id,
        relationshipType,
        null // Permanent chat for favorites
      );
      
      if (error) {
        Alert.alert("تنبيه", "المحادثة متاحة فقط للمفضلين أو أثناء وجود طلب نشط.");
        return;
      }
      
      if (conversationId) {
        router.push(`/chat/${conversationId}`);
      }
    } catch (err) {
      console.error("Error starting chat:", err);
      Alert.alert("خطأ", "فشل بدء المحادثة");
    } finally {
      setStartingChat(false);
    }
  };

  const handleCall = async () => {
    if (!userId) {
      Alert.alert("تسجيل الدخول", "يرجى تسجيل الدخول لبدء اتصال");
      return;
    }
    try {
      const { data: phone, error } = await getCommercialPhone("FAVORITE", "courier", courier.id);
      if (error || !phone) {
        Alert.alert("تنبيه", "رقم الهاتف متاح فقط للمفضلين أو أثناء وجود طلب نشط.");
        return;
      }
      
      const rel = userRole === "merchant" ? "merchant_courier" : "customer_courier";
      await logCallPress("00000000-0000-0000-0000-000000000000", courier.id, rel);
      Linking.openURL(`tel:${phone}`);
    } catch (err) {
      Alert.alert("خطأ", "فشل بدء الاتصال.");
    }
  };

  const handleDirectOrder = () => {
    if (!userId) {
      Alert.alert("تسجيل الدخول", "يرجى تسجيل الدخول لإرسال طلب مباشر");
      return;
    }
    router.push({ pathname: "/checkout", params: { id: courier.id } });
  };

  const handleToggleFavorite = async () => {
    if (!userId) {
      Alert.alert("تسجيل الدخول", "يرجى تسجيل الدخول لإضافة الموصل إلى المفضلة");
      return;
    }
    const previousIsFavorite = courier.is_favorite;
    setCourier((prev: any) => ({ ...prev, is_favorite: !prev.is_favorite }));
    try {
      const { error } = await toggleFavoriteCourier(userId, courier.id);
      if (error) {
        Alert.alert("خطأ", error);
        setCourier((prev: any) => ({ ...prev, is_favorite: previousIsFavorite }));
        return;
      }
      const { data: updatedCourier } = await getCourierById(courier.id);
      if (updatedCourier) {
        setCourier((prev: any) => ({ ...prev, is_favorite: updatedCourier.is_favorite }));
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

  const vehicleType = vehicleLabel(courier.vehicle_type);
  const available = isCourierAvailable(courier);

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

        <View style={styles.profileHero}>
          <View style={styles.avatarRing}>
            <Avatar uri={courier.avatar_url} name={courier.full_name} size="xl" />
          </View>
          <Typography variant="h1" align="center" style={{ marginTop: TOKENS.spacing.md }}>
            {courier.full_name}
          </Typography>
          <View style={styles.badgeRow}>
            <Badge variant={available ? "success" : "error"} label={available ? "متاح" : "غير متاح"} />
            {courier.is_mock && <Badge variant="accent" label="تجريبي" />}
            <View style={[styles.vehicleChip, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              {getVehicleIcon(courier.vehicle_type, colors.primary, 16)}
              <Typography variant="caption" color="secondary" style={{ marginHorizontal: TOKENS.spacing.xs }}>
                {vehicleType}
              </Typography>
            </View>
          </View>
          <Rating rating={courier.rating} size="md" showBadge style={{ marginTop: TOKENS.spacing.sm }} />
        </View>

        <View style={styles.section}>
          <SectionHeader title="الإحصائيات" icon={<TrendingUp size={18} color={colors.primary} />} />
          <Card variant="outlined" style={styles.statsCard}>
            <View style={styles.statsGrid}>
              <View style={[styles.statBox, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <Star size={18} color="#FFD700" fill="#FFD700" />
                <View style={{ marginEnd: TOKENS.spacing.sm }}>
                  <Typography variant="h3">{typeof courier.rating === "number" ? courier.rating.toFixed(1) : courier.rating}</Typography>
                  <Typography variant="caption" color="secondary">التقييم</Typography>
                </View>
              </View>
              <View style={[styles.statBox, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <ClipboardList size={18} color={colors.primary} />
                <View style={{ marginEnd: TOKENS.spacing.sm }}>
                  {typeof courier.delivery_count === "number" && Number.isFinite(courier.delivery_count) ? (
                    <Typography variant="h3">{courier.delivery_count.toLocaleString("ar-DZ")}</Typography>
                  ) : (
                    <Typography variant="caption" color="secondary">غير متاح</Typography>
                  )}
                  <Typography variant="caption" color="secondary">توصيلات</Typography>
                </View>
              </View>
            </View>
          </Card>
        </View>

        <View style={styles.section}>
          <SectionHeader title="نبذة" />
          <Typography style={[styles.bio, { color: colors.textPrimary }]}>{courier.bio || "لا توجد نبذة"}</Typography>
        </View>

        {courier.vehicle_photo_url ? (
          <View style={styles.section}>
            <SectionHeader title="صورة المركبة" />
            <Image
              source={{ uri: courier.vehicle_photo_url }}
              style={styles.vehiclePhoto}
              resizeMode="cover"
              onError={() => {}}
              accessibilityLabel="صورة المركبة"
            />
          </View>
        ) : null}

        {/* Contact Info - Phone Hidden as per Privacy Rules */}
        <View style={styles.section}>
          <SectionHeader title="جهة الاتصال" />
          <View style={styles.contactRow}>
            <MessageCircle size={18} color={colors.primary} />
            <Typography style={{ flex: 1, textAlign: isRTL ? "right" : "left" }}>
              تواصل مع الموصل عبر الدردشة الآمنة
            </Typography>
            <Badge variant="accent" label="آمن" />
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeader title="آراء العملاء" icon={<Star size={18} color={colors.primary} />} />
          <Card variant="outlined" style={styles.futureSection}>
            <Star size={32} color={colors.textDisabled} />
            <Typography variant="body" color="secondary" align="center">
              ستظهر آراء العملاء هنا
            </Typography>
            <Typography variant="caption" color="secondary" align="center">
              قريباً
            </Typography>
          </Card>
        </View>

        <View style={styles.section}>
          <SectionHeader title="معرض الصور" icon={<ImageIcon size={18} color={colors.primary} />} />
          <Card variant="outlined" style={styles.futureSection}>
            <ImageIcon size={32} color={colors.textDisabled} />
            <Typography variant="body" color="secondary" align="center">
              ستظهر معرض الصور هنا
            </Typography>
            <Typography variant="caption" color="secondary" align="center">
              قريباً
            </Typography>
          </Card>
        </View>

        <View style={[styles.actions, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <Button
            title="مراسلة"
            loading={startingChat}
            icon={<MessageCircle size={18} color={colors.textOnBrand} />}
            onPress={handleStartChat}
            style={styles.actionBtn}
          />
          <Button
            title="اتصال"
            variant="outline"
            icon={<Phone size={18} color={colors.success} />}
            onPress={handleCall}
            style={styles.actionBtn}
          />
        </View>

        <View style={[styles.actions, { marginTop: TOKENS.spacing.md, flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <Button
            title="طلب توصيل مباشر"
            variant="primary"
            icon={<ShoppingBag size={18} color="#fff" />}
            onPress={handleDirectOrder}
            style={{ flex: 1 }}
          />
          <Button
            title={courier.is_favorite ? "مفضل" : "إضافة للمفضلة"}
            variant="outline"
            icon={<Heart size={18} color={courier.is_favorite ? colors.error : colors.primary} fill={courier.is_favorite ? colors.error : "none"} />}
            onPress={handleToggleFavorite}
            style={{ width: 140 }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
