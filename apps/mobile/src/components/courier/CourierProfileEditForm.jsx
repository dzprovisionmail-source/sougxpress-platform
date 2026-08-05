import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  I18nManager,
  Alert,
  Switch,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Avatar, Typography, Input, Button, SimpleSelect } from "@/components/ui";
import { useAppTheme } from "@/contexts/ThemeContext";
import { TOKENS } from "@/constants/tokens";
import {
  updateCourierProfile,
  uploadCourierImage,
} from "@/services/courierService";
import { VEHICLE_LABELS } from "@/utils/courier.utils";

const isRTL = I18nManager.isRTL;

const VEHICLE_OPTIONS = Object.entries(VEHICLE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export default function CourierProfileEditForm({ courier, userId, onSave, onCancel }) {
  const { colors } = useAppTheme();
  const [form, setForm] = useState({
    full_name: courier?.full_name ?? "",
    phone_number: courier?.phone_number ?? "",
    bio: courier?.bio ?? "",
    vehicle_type: courier?.vehicle_type ?? "motorcycle",
    is_available: courier?.is_available ?? true,
    avatar_url: courier?.avatar_url ?? null,
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const setField = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleUploadAvatar = async () => {
    if (!courier?.id) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("إذن مرفوض", "نحتاج إذن للوصول إلى المعرض");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled) return;

    const asset = result.assets[0];
    const folder = `courier-images/${courier.id}`;

    let blob;
    try {
      const response = await fetch(asset.uri);
      blob = await response.blob();
    } catch (e) {
      Alert.alert("خطأ", "فشل تحميل الصورة");
      return;
    }

    setUploading(true);
    const { data, error } = await uploadCourierImage(blob, folder);
    setUploading(false);

    if (error) {
      Alert.alert("خطأ", error);
      return;
    }
    if (data?.publicUrl) {
      setField("avatar_url", data.publicUrl);
    }
  };

  const handleSave = async () => {
    const bioLength = (form.bio ?? "").length;
    if (bioLength > 160) {
      Alert.alert("السيرة الذاتية طويلة", "السيرة الذاتية يجب أن تكون 160 حرفًا أو أقل");
      return;
    }
    if (!form.full_name.trim()) {
      Alert.alert("الاسم مطلوب", "يرجى إدخال اسم الموصل");
      return;
    }
    if (!form.phone_number.trim()) {
      Alert.alert("الهاتف مطلوب", "يرجى إدخال رقم الهاتف");
      return;
    }

    setSaving(true);
    const { data, error } = await updateCourierProfile(courier.id, {
      full_name: form.full_name.trim(),
      phone_number: form.phone_number.trim(),
      bio: form.bio.trim(),
      avatar_url: form.avatar_url,
      vehicle_type: form.vehicle_type,
      is_available: form.is_available,
    });
    setSaving(false);

    if (error) {
      Alert.alert("خطأ", error);
      return;
    }
    if (data && onSave) {
      onSave(data);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.avatarRow, isRTL && { flexDirection: "row-reverse" }]}>
        <Avatar
          uri={form.avatar_url}
          name={form.full_name}
          size="lg"
          style={styles.avatar}
        />
        <TouchableOpacity
          onPress={handleUploadAvatar}
          disabled={uploading}
          activeOpacity={0.8}
          style={[
            styles.uploadBtn,
            {
              backgroundColor: `${colors.primary}0D`,
              borderColor: colors.borderSubtle,
            },
          ]}
        >
          {uploading ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : (
            <Typography color="brand" variant="caption">
              {"تغيير الصورة"}
            </Typography>
          )}
        </TouchableOpacity>
      </View>

      <Input
        label="الاسم الكامل"
        placeholder="مثال: أحمد التوصيل السريع"
        value={form.full_name}
        onChangeText={(v) => setField("full_name", v)}
      />

      <Input
        label="رقم الهاتف"
        placeholder="+213 5 12 34 56 78"
        value={form.phone_number}
        onChangeText={(v) => setField("phone_number", v)}
        keyboardType="phone-pad"
      />

      <Input
        label="السيرة الذاتية"
        placeholder="سيرة مختصرة (حد أقصى 160 حرفًا)"
        value={form.bio}
        onChangeText={(v) => setField("bio", v.slice(0, 160))}
        maxLength={160}
      />
      <View style={[styles.counterRow, isRTL && { flexDirection: "row-reverse" }]}>
        <View style={styles.spacer} />
        <Typography
          color={form.bio.length > 160 ? "error" : "secondary"}
          variant="caption"
        >
          {`${form.bio.length}/160`}
        </Typography>
      </View>

      <SimpleSelect
        label="نوع المركبة"
        options={VEHICLE_OPTIONS}
        value={form.vehicle_type}
        onChange={(v) => setField("vehicle_type", v)}
        placeholder="اختر نوع المركبة"
      />

      <View
        style={[
          styles.switchRow,
          isRTL && { flexDirection: "row-reverse" },
        ]}
      >
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

      <View
        style={[
          styles.actionsRow,
          isRTL && { flexDirection: "row-reverse" },
        ]}
      >
        <Button
          title="إلغاء"
          variant="ghost"
          onPress={onCancel}
          style={styles.actionBtn}
          disabled={saving}
        />
        <Button
          title="حفظ"
          onPress={handleSave}
          loading={saving}
          style={styles.actionBtn}
          disabled={saving || uploading}
        />
      </View>
    </View>
  );
}
