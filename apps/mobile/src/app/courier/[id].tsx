import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  I18nManager,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Phone, MessageCircle, ArrowLeft, Star } from "lucide-native";
import {
  Typography,
  Avatar,
  Rating,
  Button,
} from "@/components/ui";
import { useAppTheme } from "@/contexts/ThemeContext";
import { TOKENS } from "@/constants/tokens";
import { getCourierById } from "@/services/courierService";

const isRTL = I18nManager.isRTL;

export default function CourierDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useAppTheme();

  const [courier, setCourier] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
          <Typography>لم يتم العثور على الموصل</Typography>
        </View>
      </SafeAreaView>
    );
  }

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
          <Rating rating={courier.rating} size="md" count={99} showBadge />
        </View>

        <View style={styles.section}>
          <Typography variant="h3" color="secondary" style={{ marginBottom: TOKENS.spacing.sm }}>
            نبذة
          </Typography>
          <Typography style={styles.bio}>{courier.bio || "لا توجد نبذة"}</Typography>
        </View>

        <View style={styles.section}>
          <Typography variant="h3" color="secondary" style={{ marginBottom: TOKENS.spacing.sm }}>
            وسيلة النقل
          </Typography>
          <View style={[styles.row, isRTL && { flexDirection: "row-reverse" }]}>
            <Star size={18} color={colors.primary} />
            <Typography style={{ marginHorizontal: TOKENS.spacing.sm }}>
              {courier.vehicle_type}
            </Typography>
          </View>
        </View>

        <View style={styles.section}>
          <Typography variant="h3" color="secondary" style={{ marginBottom: TOKENS.spacing.sm }}>
            جهة الاتصال
          </Typography>
          <View style={[styles.row, isRTL && { flexDirection: "row-reverse" }]}>
            <Phone size={18} color={colors.primary} />
            <Typography style={{ marginHorizontal: TOKENS.spacing.sm }}>
              {courier.phone_number}
            </Typography>
          </View>
        </View>

        <View style={styles.actions}>
          <Button
            title="اتصال"
            icon={<Phone size={18} color={colors.textOnBrand} />}
            onPress={handleCall}
            style={styles.actionBtn}
          />
          <Button
            title="مراسلة"
            variant="outline"
            icon={<MessageCircle size={18} color={colors.primary} />}
            onPress={handleMessage}
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
  section: {
    marginBottom: TOKENS.spacing.lg,
  },
  bio: {
    lineHeight: 22,
    color: "#FFFFFF",
  },
  row: {
    flexDirection: "row",
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
