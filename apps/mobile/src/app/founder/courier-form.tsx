import React, { useEffect, useState } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  I18nManager,
  Alert,
  Switch,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Save, Upload } from "lucide-react-native";
import { Avatar, Typography, Input, Button, SimpleSelect } from "@/components/ui";
import { useAppTheme } from "@/contexts/ThemeContext";
import { TOKENS } from "@/constants/tokens";
import * as ImagePicker from "expo-image-picker";
import {
  createFounderCourier,
  updateFounderCourier,
  getCourierById,
} from "@/services/founder-courier.service";
import { vehicleLabel, VEHICLE_LABELS } from "@/utils/courier.utils";
import { VehicleType } from "@/types/schema-04-couriers";
import { uploadCourierImage } from "@/services/courierService";

const isRTL = I18nManager.isRTL;

const VEHICLE_OPTIONS = Object.entries(VEHICLE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export default function FounderCourierFormScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { colors } = useAppTheme();
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    phone_number: "",
    bio: "",
    vehicle_type: "motorcycle" as string,
    rating: 5.0,
    is_available: true,
    is_mock: false,
    is_verified: false,
    is_pinned: false,
    display_order: 0,
    show_on_home: true,
    avatar_url: null as string | null,
    vehicle_photo_url: null as string | null,
  });

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      const { data, error } = await getCourierById(id);
      if (data) {
        setForm({
          full_name: data.full_name,
          phone_number: data.phone_number,
          bio: data.bio,
          vehicle_type: data.vehicle_type,
          rating: data.rating,
          is_available: data.is_available,
          is_mock: data.is_mock,
          is_verified: data.is_verified,
          is_pinned: data.is_pinned,
          display_order: data.display_order,
          show_on_home: data.show_on_home,
          avatar_url: data.avatar_url,
          vehicle_photo_url: data.vehicle_photo_url,
        });
      } else if (error) {
        Alert.alert("خطأ", error);
      }
      setLoading(false);
    };
    load();
  }, [id]);

  const setField = (field: string, value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleUpload = async (
    field: "avatar_url" | "vehicle_photo_url",
    label: string
  ) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("إذن مرفوض", "نحتاج إذن للوصول إلى المعرض");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: field === "avatar_url" ? [1, 1] : [16, 9],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    const folder = `courier-images/${id || "new"}`;

    setUploading(true);
    const blob = await fetch(asset.uri).then((r) => r.blob());
    const { data, error } = await uploadCourierImage(blob, folder);
    setUploading(false);

    if (error) {
      Alert.alert("خطأ", error);
      return;
    }
    if (data?.publicUrl) {
      setField(field, data.publicUrl);
    }
  };

  const handleSave = async () => {
    if (!form.full_name.trim()) {
      Alert.alert("الاسم مطلوب", "يرجى إدخال اسم الموصل");
      return;
    }
    if (!form.phone_number.trim()) {
      Alert.alert("الهاتف مطلوب", "يرجى إدخال رقم الهاتف");
      return;
    }
    if ((form.bio ?? "").length > 160) {
      Alert.alert("السيرة الذاتية طويلة", "يجب أن تكون 160 حرفًا أو أقل");
      return;
    }

    setSaving(true);
    const payload = {
      full_name: form.full_name.trim(),
      phone_number: form.phone_number.trim(),
      bio: form.bio.trim(),
      vehicle_type: form.vehicle_type as VehicleType,
      rating: Number(form.rating) || 5.0,
      is_available: form.is_available,
      is_mock: form.is_mock,
      is_verified: form.is_verified,
      is_pinned: form.is_pinned,
      display_order: Number(form.display_order) || 0,
      show_on_home: form.show_on_home,
      avatar_url: form.avatar_url,
      vehicle_photo_url: form.vehicle_photo_url,
    };

    let result;
    if (id) {
      result = await updateFounderCourier(id, payload);
    } else {
      result = await createFounderCourier({ ...payload, create_auth_account: false });
    }

    setSaving(false);
    if (result.error) {
      Alert.alert("خطأ", result.error);
      return;
    }
    router.back();
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

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bgBase }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.header, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Typography variant="h2" align="center">
            {id ? "تعديل الموصل" : "إضافة موصل"}
          </Typography>
          <View style={{ width: 24 }} />
        </View>

        <View style={[styles.avatarRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <Avatar uri={form.avatar_url} name={form.full_name} size="lg" />
          <View style={{ gap: 8 }}>
            <Button
              title="صورة الملف"
              variant="outline"
              size="sm"
              icon={<Upload size={16} color={colors.primary} />}
              onPress={() => handleUpload("avatar_url", "صورة الملف")}
              loading={uploading}
            />
            <Button
              title="صورة المركبة"
              variant="outline"
              size="sm"
              icon={<Upload size={16} color={colors.primary} />}
              onPress={() => handleUpload("vehicle_photo_url", "صورة المركبة")}
              loading={uploading}
            />
          </View>
        </View>

        <Input
          label="الاسم الكامل"
          value={form.full_name}
          onChangeText={(v) => setField("full_name", v)}
          placeholder="مثال: أحمد التوصيل السريع"
        />

        <Input
          label="رقم الهاتف"
          value={form.phone_number}
          onChangeText={(v) => setField("phone_number", v)}
          placeholder="+213 5 12 34 56 78"
          keyboardType="phone-pad"
        />

        <Input
          label="السيرة الذاتية"
          value={form.bio}
          onChangeText={(v) => setField("bio", v.slice(0, 160))}
          placeholder="سيرة مختصرة (حد أقصى 160 حرفًا)"
          maxLength={160}
        />
        <View style={[styles.counterRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <View style={{ flex: 1 }} />
          <Typography color={form.bio.length > 160 ? "error" : "secondary"} variant="caption">
            {form.bio.length}/160
          </Typography>
        </View>

        <SimpleSelect
          label="نوع المركبة"
          options={VEHICLE_OPTIONS}
          value={form.vehicle_type}
          onChange={(v) => setField("vehicle_type", v)}
          placeholder="اختر نوع المركبة"
        />

        <View style={[styles.switchRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <Switch
            value={form.is_available}
            onValueChange={(v) => setField("is_available", v)}
            trackColor={{ false: `${colors.textDisabled}55`, true: `${colors.success}88` }}
            thumbColor={form.is_available ? colors.success : colors.textSecondary}
          />
          <Typography color="secondary" variant="body">
            {form.is_available ? "متاح الآن" : "غير متاح"}
          </Typography>
        </View>

        <View style={[styles.switchRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <Switch
            value={form.is_verified}
            onValueChange={(v) => setField("is_verified", v)}
            trackColor={{ false: `${colors.textDisabled}55`, true: `${colors.success}88` }}
            thumbColor={form.is_verified ? colors.success : colors.textSecondary}
          />
          <Typography color="secondary" variant="body">
            موثق
          </Typography>
        </View>

        <View style={[styles.switchRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <Switch
            value={form.is_mock}
            onValueChange={(v) => setField("is_mock", v)}
            trackColor={{ false: `${colors.textDisabled}55`, true: `${colors.warning}88` }}
            thumbColor={form.is_mock ? colors.warning : colors.textSecondary}
          />
          <Typography color="secondary" variant="body">
            وضع تجربة
          </Typography>
        </View>

        <View style={[styles.switchRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <Switch
            value={form.is_pinned}
            onValueChange={(v) => setField("is_pinned", v)}
            trackColor={{ false: `${colors.textDisabled}55`, true: `${colors.primary}88` }}
            thumbColor={form.is_pinned ? colors.primary : colors.textSecondary}
          />
          <Typography color="secondary" variant="body">
            مثبت في القوائم
          </Typography>
        </View>

        <View style={[styles.switchRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <Switch
            value={form.show_on_home}
            onValueChange={(v) => setField("show_on_home", v)}
            trackColor={{ false: `${colors.textDisabled}55`, true: `${colors.info}88` }}
            thumbColor={form.show_on_home ? colors.info : colors.textSecondary}
          />
          <Typography color="secondary" variant="body">
            يظهر على الصفحة الرئيسية
          </Typography>
        </View>

        <Input
          label="ترتيب العرض"
          value={String(form.display_order)}
          onChangeText={(v) => setField("display_order", parseInt(v) || 0)}
          keyboardType="number-pad"
          placeholder="0"
        />

        <Input
          label="التقييم"
          value={String(form.rating)}
          onChangeText={(v) => setField("rating", parseFloat(v) || 5)}
          keyboardType="decimal-pad"
          placeholder="5.0"
        />

        <View style={[styles.actionsRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <Button
            title="إلغاء"
            variant="ghost"
            onPress={() => router.back()}
            style={styles.actionBtn}
            disabled={saving}
          />
          <Button
            title="حفظ"
            onPress={handleSave}
            loading={saving}
            style={styles.actionBtn}
            disabled={saving || uploading}
            icon={<Save size={18} color={colors.textOnBrand} />}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  scrollContent: { padding: TOKENS.spacing.lg, paddingBottom: TOKENS.spacing["3xl"] },
  header: { alignItems: "center", justifyContent: "space-between", marginBottom: TOKENS.spacing.lg },
  backBtn: { padding: TOKENS.spacing.xs },
  avatarRow: { alignItems: "center", justifyContent: "space-between", marginBottom: TOKENS.spacing.lg, gap: TOKENS.spacing.md },
  counterRow: { alignItems: "center", justifyContent: "flex-end", marginTop: -TOKENS.spacing.sm, marginBottom: TOKENS.spacing.md },
  switchRow: { alignItems: "center", gap: TOKENS.spacing.sm, marginBottom: TOKENS.spacing.md },
  actionsRow: { flexDirection: "row", gap: TOKENS.spacing.md, marginTop: TOKENS.spacing.lg },
  actionBtn: { flex: 1 },
});
