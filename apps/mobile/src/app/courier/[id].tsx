import { useMarketPresence } from "@/hooks/useMarketPresence";
import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  I18nManager,
  Alert,
  Image,
  Linking,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Phone, Star, Heart, ClipboardList, TrendingUp, MessageCircle, ShoppingBag, MoreVertical } from "lucide-react-native";
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
import { getCourierById, toggleFavoriteCourier, getCourierReviews, getCourierReviewEligibility, submitCourierReview, deleteCourierReview, CourierReview } from "@/services/courierService";
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
      height: 220,
      borderRadius: TOKENS.radius.lg,
    },
    vehicleCard: {
      padding: TOKENS.spacing.md,
      borderRadius: TOKENS.radius.lg,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      backgroundColor: colors.bgElevated,
      gap: TOKENS.spacing.md,
    },
    vehicleMeta: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: TOKENS.spacing.sm,
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
    reviewForm: {
      gap: TOKENS.spacing.md,
      width: "100%",
    },
    starsRow: {
      flexDirection: "row-reverse",
      justifyContent: "center",
      gap: TOKENS.spacing.sm,
    },
    reviewInput: {
      minHeight: 96,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      borderRadius: TOKENS.radius.md,
      paddingHorizontal: TOKENS.spacing.md,
      paddingVertical: TOKENS.spacing.sm,
      color: colors.textPrimary,
      textAlign: "right",
      textAlignVertical: "top",
    },
    reviewCard: {
      padding: TOKENS.spacing.md,
      gap: TOKENS.spacing.sm,
    },
    reviewHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
  });

export default function CourierProfile() {
  const router = useRouter();
  const { id, preview, identity } = useLocalSearchParams<{
    id: string;
    preview?: string;
    identity?: string;
  }>();
  const marketContextParams = identity === "soug-admin" && (preview === "1" || preview === undefined)
    ? { preview: "1", identity: "soug-admin" }
    : {};
  useMarketPresence("courier");
  const { colors } = useAppTheme();
  const styles = getStyles(colors);

  const [courier, setCourier] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [startingChat, setStartingChat] = useState(false);
  const [reviews, setReviews] = useState<CourierReview[]>([]);
  const [eligibleOrders, setEligibleOrders] = useState<{ order_id: string; already_reviewed: boolean }[]>([]);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

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

  const loadReviews = async () => {
    if (!id) return;
    const [{ data: reviewRows }, { data: eligibleRows }, { data: refreshedCourier }] = await Promise.all([
      getCourierReviews(id),
      getCourierReviewEligibility(id),
      getCourierById(id),
    ]);
    setReviews(reviewRows ?? []);
    setEligibleOrders((eligibleRows ?? []).filter((row) => !row.already_reviewed));
    if (refreshedCourier) {
      setCourier((previous: any) => ({
        ...previous,
        rating: refreshedCourier.rating,
        delivery_count: refreshedCourier.delivery_count,
      }));
    }
  };

  useEffect(() => {
    loadReviews();
  }, [id, userId]);

  const handleSubmitReview = async () => {
    const order = eligibleOrders[0];
    if (!order || reviewRating < 1 || submittingReview) return;
    setSubmittingReview(true);
    const { error } = await submitCourierReview({
      courierId: id,
      orderId: order.order_id,
      rating: reviewRating,
      comment: reviewComment,
    });
    setSubmittingReview(false);
    if (error) {
      Alert.alert("تعذر إرسال التقييم", error);
      return;
    }
    setReviewRating(0);
    setReviewComment("");
    await loadReviews();
    Alert.alert("تم إرسال التقييم", "شكرًا لمشاركتك تقييمك.");
  };

  const handleDeleteReview = (reviewId: string) => {
    Alert.alert("حذف التقييم", "هل أنت متأكد من حذف هذا التقييم؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "حذف",
        style: "destructive",
        onPress: async () => {
          const { error } = await deleteCourierReview(reviewId);
          if (error) {
            Alert.alert("تعذر حذف التقييم", error);
            return;
          }
          await loadReviews();
          Alert.alert("تم الحذف", "تم حذف التقييم وتحديث الملخص.");
        },
      },
    ]);
  };

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
        Alert.alert("تنبيه", "ضع قلبًا أولًا لفتح قناة التواصل مع هذا الموصل.");
        return;
      }

      if (conversationId) {
        router.push({
          pathname: "/chat/[id]",
          params: { id: conversationId, ...marketContextParams },
        });
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
      const { data: favoriteResult, error } = await toggleFavoriteCourier(userId, courier.id);
      if (error) {
        Alert.alert("خطأ", error);
        setCourier((prev: any) => ({ ...prev, is_favorite: previousIsFavorite }));
        return;
      }

      const nextFavorite = favoriteResult?.is_favorite ?? true;
      setCourier((prev: any) => ({ ...prev, is_favorite: nextFavorite }));
      if (!nextFavorite) return;

      const relationshipType = userRole === "merchant" ? "merchant_courier" : "customer_courier";
      const { data: conversationId, error: chatError } = await getOrCreateConversation(
        courier.id,
        relationshipType,
      );
      if (chatError || !conversationId) {
        console.error("Heart chat error:", chatError);
        Alert.alert("تنبيه", "تم حفظ القلب، لكن تعذر فتح المحادثة الآن.");
        return;
      }

      router.push({
        pathname: "/chat/[id]",
        params: { id: conversationId, ...marketContextParams },
      });
    } catch (e) {
      console.error("toggleFavorite failed:", e);
      setCourier((prev: any) => ({ ...prev, is_favorite: previousIsFavorite }));
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

        <View style={styles.section}>
          <SectionHeader title="مركبة التوصيل" />
          <Card variant="outlined" style={styles.vehicleCard}>
            <View style={[styles.vehicleMeta, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <View style={[styles.vehicleChip, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                {getVehicleIcon(courier.vehicle_type, colors.primary, 18)}
                <Typography variant="body" style={{ marginHorizontal: TOKENS.spacing.xs }}>
                  {vehicleType}
                </Typography>
              </View>
              <Badge variant="accent" label="معلومات المركبة" />
            </View>
            {courier.vehicle_photo_url ? (
              <Image
                source={{ uri: courier.vehicle_photo_url }}
                style={styles.vehiclePhoto}
                resizeMode="cover"
                onError={() => {}}
                accessibilityLabel="صورة مركبة التوصيل"
              />
            ) : (
              <Typography variant="caption" color="secondary" align="center">
                لم تتم إضافة صورة للمركبة بعد
              </Typography>
            )}
          </Card>
        </View>

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
          <SectionHeader title="التقييمات والتعليقات" icon={<Star size={18} color={colors.primary} />} />
          {reviews.length === 0 ? (
            <Card variant="outlined" style={styles.futureSection}>
              <Star size={32} color={colors.textDisabled} />
              <Typography variant="body" color="secondary" align="center">لا توجد تقييمات بعد</Typography>
            </Card>
          ) : (
            <View style={{ gap: TOKENS.spacing.sm }}>
              <Card variant="outlined" style={styles.reviewCard}>
                <Typography variant="h3" align="center">{courier.rating.toFixed(1)} / 5</Typography>
                <Typography variant="caption" color="secondary" align="center">{reviews.length} تقييم موثق</Typography>
              </Card>
              {reviews.map((review) => (
                <Card key={review.id} variant="outlined" style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <Typography variant="body">{review.reviewer_name}</Typography>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star key={star} size={14} color="#F5B301" fill={star <= review.rating ? "#F5B301" : "none"} />
                      ))}
                      {(userRole === "founder" || userRole === "admin") && (
                        <TouchableOpacity onPress={() => handleDeleteReview(review.id)} style={{ marginStart: TOKENS.spacing.sm }} accessibilityLabel="إدارة التقييم">
                          <MoreVertical size={18} color={colors.textSecondary} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                  {review.comment ? <Typography color="secondary">{review.comment}</Typography> : null}
                  <Typography variant="caption" color="secondary">{new Date(review.created_at).toLocaleDateString("ar-DZ")}</Typography>
                </Card>
              ))}
            </View>
          )}

          {eligibleOrders.length > 0 && (userRole === "customer" || userRole === "merchant") && (
            <Card variant="outlined" style={[styles.reviewCard, { marginTop: TOKENS.spacing.md }]}>
              <Typography variant="h3" align="right">قيّم هذا الموصل</Typography>
              <View style={styles.reviewForm}>
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity key={star} onPress={() => setReviewRating(star)} accessibilityLabel={`تقييم ${star} نجوم`}>
                      <Star size={30} color="#F5B301" fill={star <= reviewRating ? "#F5B301" : "none"} />
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  value={reviewComment}
                  onChangeText={setReviewComment}
                  placeholder="اكتب تعليقك (اختياري)"
                  placeholderTextColor={colors.textDisabled}
                  multiline
                  maxLength={1000}
                  style={styles.reviewInput}
                />
                <Button title="إرسال التقييم" onPress={handleSubmitReview} loading={submittingReview} disabled={reviewRating === 0 || submittingReview} />
              </View>
            </Card>
          )}
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
