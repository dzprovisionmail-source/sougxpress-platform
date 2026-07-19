import React, { useMemo, useState } from "react";
import { ScrollView, Alert, Switch, View, TouchableOpacity, Image, Modal, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { Camera, BadgeInfo, Bike, FolderClosed, LogOut, Palette, TrendingUp, User, X } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";

import { useAppTheme } from "@/contexts/ThemeContext";
import { useCurrentUserId } from "@/features/workspace/useCurrentUserId";
import useDriver from "@/hooks/useDriver";
import useDriverOrders from "@/hooks/useDriverOrders";
import { supabase } from "@/lib/supabase";
import { computeEarningsSplit, formatCurrency } from "@/constants/earnings";
import {
  WorkspaceScreen,
  SectionCard,
  SectionTitle,
  WorkspaceRow,
  WorkspaceText,
  WorkspaceButton,
  ThemeSwitcher,
  LoadingState,
} from "@/features/workspace/ui";

const AVAILABILITY_LABEL: Record<string, string> = {
  online: "متصل",
  offline: "غير متصل",
  on_delivery: "في توصيلة",
};

const VEHICLE_TYPE_LABEL: Record<string, string> = {
  motorcycle: "دراجة نارية",
  car: "سيارة",
  lcv: "مركبة تجارية خفيفة",
};

export default function DriverProfileScreen() {
  const router = useRouter();
  const { colors, tokens } = useAppTheme();
  const { userId } = useCurrentUserId();
  const { driver, loading, updateDriver } = useDriver(userId || "");
  const { orders } = useDriverOrders(userId || "", driver?.zone_id);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ full_name: "", phone: "", vehicle_type: "", vehicle_make: "", vehicle_color: "", license_plate: "" });

  const stats = useMemo(() => {
    const delivered = orders.filter((o) => o.status === "delivered");
    const cancelled = orders.filter((o) => o.status === "cancelled");
    const totalHandled = delivered.length + cancelled.length;
    const completionRate = totalHandled > 0 ? Math.round((delivered.length / totalHandled) * 100) : 100;
    const totalEarnings = computeEarningsSplit(delivered.length).driverShareMinor;
    return { totalDeliveries: delivered.length, completionRate, totalEarnings };
  }, [orders]);

  const isOnline = driver?.availability === "online";
  const handleToggleAvailability = async (value: boolean) => {
    await updateDriver({ availability: value ? "online" : "offline" });
  };

  const handleLogout = async () => {
    Alert.alert(
      "تسجيل الخروج",
      "هل أنت متأكد أنك تريد تسجيل الخروج؟",
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "خروج",
          style: "destructive",
          onPress: async () => {
            await supabase.auth.signOut();
            router.replace("/");
          },
        },
      ]
    );
  };

  const handleAvatarUpload = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("إذن مطلوب", "يجب السماح بالوصول إلى المعرض لرفع الصورة.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled) return;
    setUploadingAvatar(true);
    const uri = result.assets[0].uri;
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const filePath = `driver_avatars/${userId}.${uri.split(".").pop() ?? "jpg"}`;
      const { error } = await supabase.storage.from("avatars").upload(filePath, blob, { contentType: blob.type, upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      await updateDriver({ avatar_url: data.publicUrl });
    } catch (err: any) {
      Alert.alert("خطأ", err.message || "تعذر رفع الصورة.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const openEditModal = () => {
    if (!driver) return;
    setEditForm({
      full_name: driver.full_name || "",
      phone: driver.phone || "",
      vehicle_type: driver.vehicle_type || "",
      vehicle_make: driver.vehicle_make || "",
      vehicle_color: driver.vehicle_color || "",
      license_plate: driver.license_plate || "",
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!driver) return;
    setShowEditModal(false);
    await updateDriver({
      full_name: editForm.full_name.trim(),
      phone: editForm.phone.trim(),
      vehicle_type: editForm.vehicle_type.trim(),
      vehicle_make: editForm.vehicle_make.trim(),
      vehicle_color: editForm.vehicle_color.trim(),
      license_plate: editForm.license_plate.trim(),
    });
  };

  if (loading && !driver) {
    return (
      <WorkspaceScreen>
        <LoadingState message="جاري تحميل ملفك..." />
      </WorkspaceScreen>
    );
  }

  return (
    <WorkspaceScreen>
      <ScrollView contentContainerStyle={{ paddingTop: tokens.spacing.xl, paddingBottom: tokens.spacing["3xl"] }}>
        <SectionCard>
          <View style={{ alignItems: "center", paddingVertical: tokens.spacing.sm }}>
            <TouchableOpacity onPress={handleAvatarUpload} disabled={uploadingAvatar}>
              <View
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: 48,
                  backgroundColor: colors.bgElevated,
                  borderWidth: 2,
                  borderColor: colors.borderSubtle,
                  justifyContent: "center",
                  alignItems: "center",
                  overflow: "hidden",
                  marginBottom: tokens.spacing.sm,
                }}
              >
                {driver?.avatar_url ? (
                  <Image source={{ uri: driver.avatar_url }} style={{ width: 96, height: 96, borderRadius: 48 }} />
                ) : (
                  <User size={40} color={colors.textSecondary} />
                )}
                <View
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    backgroundColor: "rgba(0,0,0,0.45)",
                    paddingVertical: 4,
                    flexDirection: "row-reverse",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Camera size={16} color="#FFF" />
                  <WorkspaceText color="brand" variant="caption" style={{ marginRight: 4, color: "#FFF" }}>
                    {uploadingAvatar ? "جاري الرفع..." : "تغيير"}
                  </WorkspaceText>
                </View>
              </View>
            </TouchableOpacity>
            <WorkspaceText
              variant="title"
              style={{ fontSize: tokens.typography.sizes.xl, fontWeight: "700", textAlign: "center" }}
            >
              {driver?.full_name || "—"}
            </WorkspaceText>
            <WorkspaceText
              color="secondary"
              style={{ fontSize: tokens.typography.sizes.sm, marginTop: 4, textAlign: "center" }}
            >
              {driver?.phone || ""}
            </WorkspaceText>
          </View>
        </SectionCard>

        <SectionCard>
          <View
            style={{
              flexDirection: "row-reverse",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: tokens.spacing.md,
            }}
          >
            <SectionTitle icon={<BadgeInfo color={colors.primary} size={tokens.spacing.lg} />}>
              بياناتي
            </SectionTitle>
            <TouchableOpacity
              onPress={openEditModal}
              style={{
                flexDirection: "row-reverse",
                alignItems: "center",
                backgroundColor: colors.primary + "18",
                borderRadius: tokens.radius.sm,
                paddingHorizontal: tokens.spacing.sm,
                paddingVertical: 4,
              }}
            >
              <WorkspaceText color="brand" style={{ fontSize: tokens.typography.sizes.sm, marginRight: 4, fontWeight: "600" }}>
                تعديل
              </WorkspaceText>
            </TouchableOpacity>
          </View>
          <WorkspaceRow label="الاسم" value={driver?.full_name || ""} />
          <WorkspaceRow label="الهاتف" value={driver?.phone || ""} />
          <WorkspaceRow label="المدينة" value={driver?.city || ""} isLast />
        </SectionCard>

        <SectionCard>
          <SectionTitle icon={<Bike color={colors.primary} size={tokens.spacing.lg} />}>
            مركبتي
          </SectionTitle>
          <WorkspaceRow label="نوع المركبة" value={VEHICLE_TYPE_LABEL[driver?.vehicle_type || ""] || driver?.vehicle_type || ""} />
          <WorkspaceRow label="العلامة" value={driver?.vehicle_make || ""} />
          <WorkspaceRow label="اللون" value={driver?.vehicle_color || ""} />
          <WorkspaceRow label="رقم التسجيل" value={driver?.license_plate || ""} isLast />
        </SectionCard>

        <SectionCard>
          <SectionTitle icon={<FolderClosed color={colors.primary} size={tokens.spacing.lg} />}>
            حالة التحقق والتوفر
          </SectionTitle>
          <WorkspaceRow
            label="حالة الحساب"
            value={driver?.status === "active" ? "موثق ✅" : driver?.status || ""}
          />
          <View
            style={{
              flexDirection: "row-reverse",
              alignItems: "center",
              justifyContent: "space-between",
              paddingVertical: tokens.spacing.sm,
            }}
          >
            <WorkspaceText color="secondary" variant="caption">
              حالة التوفر: {AVAILABILITY_LABEL[driver?.availability || "offline"]}
            </WorkspaceText>
            <Switch
              value={isOnline}
              onValueChange={handleToggleAvailability}
              trackColor={{ false: colors.borderSubtle, true: colors.primary }}
              thumbColor={colors.textOnBrand}
            />
          </View>
        </SectionCard>

        <SectionCard>
          <SectionTitle icon={<TrendingUp color={colors.primary} size={tokens.spacing.lg} />}>
            إحصائيات الأداء
          </SectionTitle>
          <WorkspaceRow label="إجمالي التوصيلات المكتملة" value={String(stats.totalDeliveries)} />
          <WorkspaceRow label="نسبة إتمام التوصيلات" value={`${stats.completionRate}%`} />
          <WorkspaceRow label="إجمالي الأرباح" value={formatCurrency(stats.totalEarnings)} isLast />
        </SectionCard>

        <SectionCard>
          <SectionTitle icon={<Palette color={colors.primary} size={tokens.spacing.lg} />}>
            مظهر التطبيق
          </SectionTitle>
          <ThemeSwitcher />
        </SectionCard>

        <SectionCard>
          <WorkspaceButton
            title="تسجيل الخروج"
            variant="danger"
            icon={<LogOut color={colors.textOnBrand} size={18} />}
            onPress={handleLogout}
          />
        </SectionCard>
      </ScrollView>

      {/* ── Edit Profile Modal ──────────────────────────────── */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowEditModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <View
            style={{
              flex: 1,
              justifyContent: "flex-end",
              backgroundColor: "rgba(0,0,0,0.55)",
            }}
          >
            <View
              style={{
                backgroundColor: colors.bgElevated,
                borderTopLeftRadius: tokens.radius.lg,
                borderTopRightRadius: tokens.radius.lg,
                padding: tokens.spacing.lg,
                maxHeight: "85%",
              }}
            >
              <View
                style={{
                  flexDirection: "row-reverse",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: tokens.spacing.lg,
                }}
              >
                <WorkspaceText variant="title">تعديل الملف الشخصي</WorkspaceText>
                <TouchableOpacity onPress={() => setShowEditModal(false)}>
                  <X color={colors.textSecondary} size={22} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {[
                  { key: "full_name", label: "الاسم الكامل", placeholder: "الاسم" },
                  { key: "phone", label: "رقم الهاتف", placeholder: "06XXXXXXXX", keyboardType: "phone-pad" },
                  { key: "vehicle_type", label: "نوع المركبة", placeholder: "دراجة نارية / سيارة..." },
                  { key: "vehicle_make", label: "العلامة", placeholder: "مثال: Toyota" },
                  { key: "vehicle_color", label: "اللون", placeholder: "مثال: أبيض" },
                  { key: "license_plate", label: "رقم التسجيل", placeholder: "000-000-00" },
                ].map((field) => (
                  <View key={field.key} style={{ marginBottom: tokens.spacing.md }}>
                    <WorkspaceText
                      color="secondary"
                      style={{ fontSize: tokens.typography.sizes.sm, marginBottom: 4 }}
                    >
                      {field.label}
                    </WorkspaceText>
                    <TextInput
                      value={editForm[field.key as keyof typeof editForm]}
                      onChangeText={(text) => setEditForm((prev) => ({ ...prev, [field.key]: text }))}
                      style={{
                        borderWidth: 1,
                        borderColor: colors.borderSubtle,
                        borderRadius: tokens.radius.sm,
                        paddingHorizontal: tokens.spacing.md,
                        paddingVertical: tokens.spacing.sm,
                        color: colors.textPrimary,
                        fontFamily: tokens.typography.families.arabic,
                        fontSize: tokens.typography.sizes.base,
                        textAlign: "right",
                      }}
                      placeholder={field.placeholder}
                      placeholderTextColor={colors.textDisabled}
                      keyboardType={field.keyboardType as any}
                    />
                  </View>
                ))}

                <WorkspaceButton
                  title="حفظ التعديلات"
                  onPress={handleSaveEdit}
                  style={{ marginTop: tokens.spacing.sm, marginBottom: tokens.spacing.xl }}
                />
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </WorkspaceScreen>
  );
}
