import React, { useEffect, useState } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  I18nManager,
  Alert,
  Switch,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, Save, Upload, MapPin, Clock } from "lucide-react-native";
import { Avatar, Typography, Input, Button, SimpleSelect } from "@/components/ui";
import { useAppTheme } from "@/contexts/ThemeContext";
import { TOKENS } from "@/constants/tokens";
import * as ImagePicker from "expo-image-picker";
import { useCurrentUserId } from "@/features/workspace/useCurrentUserId";
import useCourier from "@/hooks/useCourier";
import { updateCourierProfile, uploadCourierImage } from "@/services/courierService";
import { vehicleLabel, VEHICLE_LABELS } from "@/utils/courier.utils";

const isRTL = I18nManager.isRTL;

const VEHICLE_OPTIONS = Object.entries(VEHICLE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export default function CourierProfileEditScreen() {
  const router = useRouter();
  const { userId } = useCurrentUserId();
  const { courier, loading, updateCourier: updateLocalCourier } = useCourier(userId || "");
  const { colors } = useAppTheme();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    phone_number: "",
    bio: "",
    vehicle_type: "motorcycle" as string,
    rating: 5.0,
    is_available: true,
    avatar_url: null as string | null,
    vehicle_photo_url: null as string | null,
    cover_url: null as string | null,
    zone_id: null as string | null,
    working_hours: null as string | null,
  });

  useEffect(() => {
    if (!courier) return;
    setForm({
      full_name: courier.full_name,
      phone_number: courier.phone_number,
      bio: courier.bio,
      vehicle_type: courier.vehicle_type,
      rating: courier.rating,
      is_available: courier.is_available,
      avatar_url: courier.avatar_url,
      vehicle_photo_url: courier.vehicle_photo_url,
      cover_url: (courier as any).cover_url || null,
      zone_id: (courier as any).zone_id || null,
      working_hours: (courier as any).working_hours || null,
    });
  }, [courier]);

  const setField = (field: string, value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleUpload = async (field: "avatar_url" | "vehicle_photo_url" | "cover_url", label: string) => {
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
    const folder = `courier-images/${userId || "new"}`;

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
      vehicle_type: form.vehicle_type,
      is_available: form.is_available,
      avatar_url: form.avatar_url,
      vehicle_photo_url: form.vehicle_photo_url,
      cover_url: form.cover_url,
      zone_id: form.zone_id,
      working_hours: form.working_hours,
    };

    const result = await updateCourierProfile(courier?.id || "", payload);
    if (result.error) {
      Alert.alert("خطأ", result.error);
    } else {
      Alert.alert("تم الحفظ", "تم تحديث ملفك بنجاح");
      router.back();
    }
    setSaving(false);
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
            تعديل الملف الشخصي
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
              title="صورة الغلاف"
              variant="outline"
              size="sm"
              icon={<Upload size={16} color={colors.primary} />}
              onPress={() => handleUpload("cover_url", "صورة الغلاف")}
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

        <Input
          label="منطقة التوصيل"
          value={form.zone_id || ""}
          onChangeText={(v) => setField("zone_id", v)}
          placeholder="مثال: وسط المدينة"
        />

        <Input
          label="ساعات العمل"
          value={form.working_hours || ""}
          onChangeText={(v) => setField("working_hours", v)}
          placeholder="مثال: 08:00 - 22:00"
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
