import React, { useEffect, useState } from "react";
import {
  ScrollView,
  Alert,
  Modal,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import {
  BadgeInfo,
  Palette,
  LogOut,
  Pencil,
  X,
  Shield,
  Bell,
} from "lucide-react-native";

import { useAppTheme } from "@/contexts/ThemeContext";
import { useCurrentUserId } from "@/features/workspace/useCurrentUserId";
import { getMerchant, updateMerchant } from "@/services/merchant.service";
import { Merchant } from "@/types/schema-03-core";
import { supabase } from "@/lib/supabase";
import {
  WorkspaceScreen,
  SectionCard,
  SectionTitle,
  WorkspaceRow,
  WorkspaceButton,
  WorkspaceText,
  ThemeSwitcher,
  LoadingState,
} from "@/features/workspace/ui";

interface MerchantFormValues {
  business_name: string;
  owner_full_name: string;
  phone: string;
  email: string;
  address: string;
}

const STATUS_LABELS: Record<string, string> = {
  active: "نشط ✅",
  pending_review: "قيد المراجعة ⏳",
  suspended: "موقوف ⛔",
  rejected: "مرفوض ❌",
};

export default function MerchantProfileScreen() {
  const router = useRouter();
  const { colors, tokens } = useAppTheme();
  const { userId } = useCurrentUserId();

  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [form, setForm] = useState<MerchantFormValues>({
    business_name: "",
    owner_full_name: "",
    phone: "",
    email: "",
    address: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!userId) return;
    getMerchant(userId).then((data) => {
      setMerchant(data);
      if (data) {
        setForm({
          business_name: data.business_name ?? "",
          owner_full_name: data.owner_full_name ?? "",
          phone: data.phone ?? "",
          email: data.email ?? "",
          address: data.address ?? "",
        });
      }
      setLoading(false);
    });
  }, [userId]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert("خطأ في تسجيل الخروج", error.message);
    } else {
      router.replace("/");
    }
  };

  const handleSave = async () => {
    if (!userId || !merchant) return;
    if (!form.business_name.trim()) {
      Alert.alert("خطأ", "اسم النشاط التجاري مطلوب");
      return;
    }
    setSaving(true);
    const updated = await updateMerchant(userId, {
      business_name: form.business_name.trim(),
      owner_full_name: form.owner_full_name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || undefined,
      address: form.address.trim() || undefined,
    } as Partial<Merchant>);
    setSaving(false);
    if (updated) {
      setMerchant(updated);
      setEditModalOpen(false);
    } else {
      Alert.alert("خطأ", "تعذر حفظ التعديلات. حاول مرة أخرى.");
    }
  };

  if (loading) {
    return (
      <WorkspaceScreen>
        <LoadingState message="جاري تحميل حسابك..." />
      </WorkspaceScreen>
    );
  }

  const profileFields: Array<{
    key: keyof MerchantFormValues;
    label: string;
    placeholder: string;
    keyboardType?: "default" | "phone-pad" | "email-address";
  }> = [
    { key: "business_name", label: "اسم النشاط التجاري *", placeholder: "متجر العائلة" },
    { key: "owner_full_name", label: "اسم صاحب النشاط", placeholder: "محمد علي" },
    { key: "phone", label: "رقم الهاتف", placeholder: "0555 000 000", keyboardType: "phone-pad" },
    { key: "email", label: "البريد الإلكتروني", placeholder: "info@store.com", keyboardType: "email-address" },
    { key: "address", label: "العنوان", placeholder: "الحي، الشارع..." },
  ];

  return (
    <WorkspaceScreen>
      <ScrollView
        contentContainerStyle={{
          paddingTop: tokens.spacing.xl,
          paddingBottom: tokens.spacing["3xl"],
        }}
      >
        {/* ── Store name header ────────────────────────────────── */}
        <SectionCard>
          <View style={{ alignItems: "center", paddingVertical: tokens.spacing.sm }}>
            <WorkspaceText
              variant="title"
              style={{ fontSize: tokens.typography.sizes.xl, fontWeight: "700", textAlign: "center" }}
            >
              {merchant?.business_name || "—"}
            </WorkspaceText>
            <WorkspaceText
              color="secondary"
              style={{ fontSize: tokens.typography.sizes.sm, marginTop: 4, textAlign: "center" }}
            >
              {merchant?.owner_full_name || ""}
            </WorkspaceText>
          </View>
        </SectionCard>

        {/* Business info */}
        <SectionCard>
          <View
            style={{
              flexDirection: "row-reverse",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: tokens.spacing.md,
            }}
          >
            <SectionTitle
              icon={<BadgeInfo color={colors.primary} size={tokens.spacing.lg} />}
            >
              بيانات النشاط التجاري
            </SectionTitle>
            <TouchableOpacity
              onPress={() => setEditModalOpen(true)}
              style={{
                flexDirection: "row-reverse",
                alignItems: "center",
                backgroundColor: colors.primary + "18",
                borderRadius: tokens.radius.sm,
                paddingHorizontal: tokens.spacing.sm,
                paddingVertical: 4,
              }}
            >
              <Pencil color={colors.primary} size={14} />
              <WorkspaceText
                color="brand"
                style={{
                  fontSize: tokens.typography.sizes.sm,
                  marginRight: 4,
                  fontWeight: "600",
                }}
              >
                تعديل
              </WorkspaceText>
            </TouchableOpacity>
          </View>

          <WorkspaceRow label="اسم النشاط" value={merchant?.business_name ?? "—"} />
          <WorkspaceRow label="اسم المالك" value={merchant?.owner_full_name ?? "—"} />
          <WorkspaceRow label="الهاتف" value={merchant?.phone ?? "—"} />
          {merchant?.email ? (
            <WorkspaceRow label="البريد الإلكتروني" value={merchant.email} />
          ) : null}
          {merchant?.address ? (
            <WorkspaceRow label="العنوان" value={merchant.address} />
          ) : null}
          <WorkspaceRow
            label="حالة الحساب"
            value={STATUS_LABELS[merchant?.status ?? ""] ?? (merchant?.status ?? "—")}
            isLast
          />
        </SectionCard>

        {/* Account & billing */}
        <SectionCard>
          <SectionTitle
            icon={<Shield color={colors.primary} size={tokens.spacing.lg} />}
          >
            الحساب والاشتراك
          </SectionTitle>
          <WorkspaceRow
            label="نوع الاشتراك"
            value="الباقة الأساسية"
          />
          <WorkspaceRow
            label="نسبة العمولة"
            value={`${merchant?.commission_rate ?? 0}%`}
            isLast
          />
        </SectionCard>

        {/* Notifications shortcut */}
        <SectionCard>
          <SectionTitle
            icon={<Bell color={colors.primary} size={tokens.spacing.lg} />}
          >
            الإشعارات
          </SectionTitle>
          <WorkspaceButton
            title="عرض جميع الإشعارات"
            variant="outline"
            onPress={() => router.push("/merchant/notifications")}
          />
        </SectionCard>

        {/* Theme */}
        <SectionCard>
          <SectionTitle
            icon={<Palette color={colors.primary} size={tokens.spacing.lg} />}
          >
            مظهر التطبيق
          </SectionTitle>
          <ThemeSwitcher />
        </SectionCard>

        {/* Logout */}
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
        visible={editModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setEditModalOpen(false)}
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
                <WorkspaceText variant="title">تعديل بيانات الحساب</WorkspaceText>
                <TouchableOpacity onPress={() => setEditModalOpen(false)}>
                  <X color={colors.textSecondary} size={22} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {profileFields.map((field) => (
                  <View key={field.key} style={{ marginBottom: tokens.spacing.md }}>
                    <WorkspaceText
                      color="secondary"
                      style={{
                        fontSize: tokens.typography.sizes.sm,
                        marginBottom: 4,
                      }}
                    >
                      {field.label}
                    </WorkspaceText>
                    <TextInput
                      value={form[field.key]}
                      onChangeText={(text) =>
                        setForm((prev) => ({ ...prev, [field.key]: text }))
                      }
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
                      keyboardType={field.keyboardType ?? "default"}
                      autoCapitalize="none"
                    />
                  </View>
                ))}

                <WorkspaceButton
                  title={saving ? "جاري الحفظ..." : "حفظ التعديلات"}
                  onPress={handleSave}
                  isLoading={saving}
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
