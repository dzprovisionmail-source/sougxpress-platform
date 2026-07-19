import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Typography, Card, Avatar, Badge } from "@/components/ui";
import {
  MapPin,
  Heart,
  ClipboardList,
  Bell,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Star,
  Camera,
  X,
  User,
} from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { TOKENS } from "@/constants/tokens";
import { getThemeColors, DEFAULT_THEME } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { I18nManager } from "react-native";

export default function CustomerProfileScreen() {
  const router = useRouter();
  const colors = getThemeColors(DEFAULT_THEME);
  const isRTL = I18nManager.isRTL;
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [address, setAddress] = useState<any>(null);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ full_name: "", phone: "", email: "" });
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }

      setSessionEmail(user.email ?? null);

      const { data: customerData, error: customerError } = await supabase
        .from("customers")
        .select("id, full_name, first_name, last_name, phone, phone_number, email, avatar_url, zone_id, status, zones(name)")
        .eq("id", user.id)
        .single();

      if (customerError) throw customerError;
      setProfile(customerData);

      const { data: addressData } = await supabase
        .from("customer_addresses")
        .select("id, label, address_line1, address_text, city, is_default")
        .eq("customer_id", user.id)
        .eq("is_default", true)
        .maybeSingle();

      setAddress(addressData);
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
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
            router.replace("/login");
          },
        },
      ]
    );
  };

  const openEditModal = () => {
    if (!profile) return;
    setEditForm({
      full_name: profile.full_name || "",
      phone: profile.phone || profile.phone_number || "",
      email: profile.email || sessionEmail || "",
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("customers")
        .update({
          full_name: editForm.full_name.trim(),
          phone: editForm.phone.trim(),
          email: editForm.email.trim(),
        })
        .eq("id", profile.id);

      if (error) throw error;
      setProfile((prev: any) => ({ ...prev, ...editForm }));
      setShowEditModal(false);
    } catch (err) {
      Alert.alert("خطأ", "تعذّر حفظ التعديلات. حاول مرة أخرى.");
    } finally {
      setSaving(false);
    }
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
      const filePath = `customer_avatars/${profile.id}.${uri.split(".").pop() ?? "jpg"}`;
      const { error } = await supabase.storage.from("avatars").upload(filePath, blob, { contentType: blob.type, upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const { error: updateError } = await supabase.from("customers").update({ avatar_url: data.publicUrl }).eq("id", profile.id);
      if (updateError) throw updateError;
      setProfile((prev: any) => ({ ...prev, avatar_url: data.publicUrl }));
    } catch (err: any) {
      Alert.alert("خطأ", err.message || "تعذر رفع الصورة.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.bgBase }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const displayName =
    profile?.full_name ||
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
    "العميل";

  const displayPhone = profile?.phone || profile?.phone_number || "";
  const displayEmail = profile?.email || sessionEmail || "";
  const displayZone  = profile?.zones?.name || "";
  const displayAddress = address
    ? address.label || address.address_text || address.address_line1 || ""
    : "";

  const menuItems = [
    {
      id: "orders",
      title: "طلباتي",
      icon: <ClipboardList color={colors.primary} size={22} />,
      route: "/customer/orders",
    },
    {
      id: "favorites",
      title: "المفضلة",
      icon: <Heart color={colors.primary} size={22} />,
      route: "/customer/favorites",
    },
    {
      id: "addresses",
      title: "عناويني",
      icon: <MapPin color={colors.primary} size={22} />,
      route: "/customer/addresses",
    },
    {
      id: "notifications",
      title: "التنبيهات",
      icon: <Bell color={colors.primary} size={22} />,
      route: "/customer/notifications",
    },
    {
      id: "settings",
      title: "الإعدادات",
      icon: <Settings color={colors.primary} size={22} />,
      route: "/customer/settings",
    },
  ];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bgBase }]} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Typography variant="h1" align="right" style={styles.headerTitle}>حسابي</Typography>
        </View>

        {/* Profile Card */}
        <Card style={styles.profileCard}>
          <View style={[styles.profileInfo, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <TouchableOpacity onPress={handleAvatarUpload} disabled={uploadingAvatar}>
              <View
                style={{
                  width: 70,
                  height: 70,
                  borderRadius: 35,
                  backgroundColor: colors.bgElevated,
                  borderWidth: 2,
                  borderColor: colors.borderSubtle,
                  justifyContent: "center",
                  alignItems: "center",
                  overflow: "hidden",
                }}
              >
                {profile?.avatar_url ? (
                  <Image source={{ uri: profile.avatar_url }} style={{ width: 70, height: 70, borderRadius: 35 }} />
                ) : (
                  <User size={32} color={colors.textSecondary} />
                )}
                <View
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    backgroundColor: "rgba(0,0,0,0.45)",
                    paddingVertical: 2,
                    flexDirection: isRTL ? "row-reverse" : "row",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Camera size={12} color="#FFF" />
                </View>
              </View>
            </TouchableOpacity>
            <View style={[styles.profileText, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
              <View style={[styles.nameRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <Typography variant="h2">{displayName}</Typography>
                {profile?.is_golden && (
                  <Badge variant="warning" style={styles.goldenBadge}>
                    <Star size={10} color={colors.textOnBrand} fill={colors.textOnBrand} /> ذهبي
                  </Badge>
                )}
              </View>

              {displayPhone ? (
                <Typography variant="body" color="secondary">{displayPhone}</Typography>
              ) : null}

              {displayEmail ? (
                <Typography variant="caption" color="secondary">{displayEmail}</Typography>
              ) : null}

              {(displayZone || displayAddress) ? (
                <View style={[styles.locationRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                  <MapPin size={14} color={colors.textSecondary} />
                  <Typography variant="caption" color="secondary">
                    {[displayZone, displayAddress].filter(Boolean).join(" • ")}
                  </Typography>
                </View>
              ) : null}
            </View>
          </View>
          <TouchableOpacity
            onPress={openEditModal}
            style={{
              alignSelf: isRTL ? "flex-start" : "flex-end",
              flexDirection: isRTL ? "row-reverse" : "row",
              alignItems: "center",
              backgroundColor: colors.primary + "18",
              borderRadius: TOKENS.radius.sm,
              paddingHorizontal: TOKENS.spacing.sm,
              paddingVertical: 4,
              marginTop: TOKENS.spacing.sm,
            }}
          >
            <Typography color="brand" style={{ fontSize: TOKENS.typography?.sizes?.sm || 13, marginRight: 4, fontWeight: "600" }}>
              تعديل الملف
            </Typography>
          </TouchableOpacity>
        </Card>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.menuItem, { backgroundColor: colors.bgSurface }]}
              onPress={() => router.push(item.route as any)}
            >
              <View style={[styles.menuItemContent, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <View style={styles.menuIconWrapper}>{item.icon}</View>
                <Typography variant="body" style={styles.menuTitle}>{item.title}</Typography>
                {isRTL
                  ? <ChevronLeft color={colors.textDisabled} size={20} />
                  : <ChevronRight color={colors.textDisabled} size={20} />}
              </View>
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={[styles.menuItem, styles.logoutBtn, { backgroundColor: colors.bgSurface }]}
            onPress={handleLogout}
          >
            <View style={[styles.menuItemContent, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <View style={styles.menuIconWrapper}>
                <LogOut color={colors.error} size={22} />
              </View>
              <Typography variant="body" style={[styles.menuTitle, { color: colors.error }]}>
                تسجيل الخروج
              </Typography>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Typography variant="caption" color="disabled" align="center">
            سوق إكسبريس v1.0.0
          </Typography>
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowEditModal(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalSheet, { backgroundColor: colors.bgSurface }]}>
              <View style={[styles.modalHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <Typography variant="h2" style={{ color: colors.textPrimary }}>
                  تعديل الملف الشخصي
                </Typography>
                <TouchableOpacity onPress={() => setShowEditModal(false)} style={styles.closeBtn}>
                  <X size={22} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
                <View style={styles.fieldGroup}>
                  <Typography variant="caption" color="secondary" style={styles.fieldLabel}>
                    الاسم الكامل
                  </Typography>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle, color: colors.textPrimary, textAlign: isRTL ? "right" : "left" }]}
                    value={editForm.full_name}
                    onChangeText={(v) => setEditForm((f) => ({ ...f, full_name: v }))}
                    placeholder="الاسم الكامل"
                    placeholderTextColor={colors.textDisabled}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Typography variant="caption" color="secondary" style={styles.fieldLabel}>
                    رقم الهاتف
                  </Typography>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle, color: colors.textPrimary, textAlign: isRTL ? "right" : "left" }]}
                    value={editForm.phone}
                    onChangeText={(v) => setEditForm((f) => ({ ...f, phone: v }))}
                    placeholder="06XXXXXXXX"
                    placeholderTextColor={colors.textDisabled}
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Typography variant="caption" color="secondary" style={styles.fieldLabel}>
                    البريد الإلكتروني
                  </Typography>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle, color: colors.textPrimary, textAlign: isRTL ? "right" : "left" }]}
                    value={editForm.email}
                    onChangeText={(v) => setEditForm((f) => ({ ...f, email: v }))}
                    placeholder="example@email.com"
                    placeholderTextColor={colors.textDisabled}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </ScrollView>

              <TouchableOpacity
                style={[
                  styles.saveBtn,
                  { backgroundColor: saving ? colors.textDisabled : colors.primary },
                ]}
                onPress={handleSaveEdit}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Typography variant="body" style={{ color: "#fff", fontWeight: "700" }}>
                    حفظ التعديلات
                  </Typography>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { padding: TOKENS.spacing.lg },
  header: { marginBottom: TOKENS.spacing.xl, paddingTop: TOKENS.spacing.md },
  headerTitle: { color: TOKENS.colors.brandPrimary },
  profileCard: { padding: TOKENS.spacing.lg, marginBottom: TOKENS.spacing.xl },
  profileInfo: { alignItems: "center", gap: TOKENS.spacing.lg },
  profileText: { flex: 1, gap: 2 },
  nameRow: { alignItems: "center", gap: TOKENS.spacing.xs },
  goldenBadge: { flexDirection: "row", alignItems: "center", gap: 2, paddingHorizontal: 6, paddingVertical: 2 },
  locationRow: { alignItems: "center", gap: 4, marginTop: 4 },
  menuContainer: { gap: TOKENS.spacing.sm },
  menuItem: {
    padding: TOKENS.spacing.md,
    borderRadius: TOKENS.radius.md,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  menuItemContent: { alignItems: "center", gap: TOKENS.spacing.md },
  menuIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 138, 0, 0.05)",
    justifyContent: "center",
    alignItems: "center",
  },
  menuTitle: { flex: 1, fontWeight: "600" },
  logoutBtn: { marginTop: TOKENS.spacing.lg, borderColor: "rgba(255, 0, 0, 0.1)" },
  footer: { marginTop: TOKENS.spacing["3xl"], paddingBottom: TOKENS.spacing.xl },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "85%",
  },
  modalHeader: {
    padding: TOKENS.spacing.lg,
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.07)",
  },
  closeBtn: { padding: 4 },
  modalBody: { padding: TOKENS.spacing.lg, gap: TOKENS.spacing.md },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderRadius: TOKENS.radius.sm,
    padding: TOKENS.spacing.md,
    fontSize: 15,
    minHeight: 44,
  },
  saveBtn: {
    margin: TOKENS.spacing.lg,
    marginTop: TOKENS.spacing.sm,
    paddingVertical: TOKENS.spacing.md,
    borderRadius: TOKENS.radius.md,
    alignItems: "center",
  },
});
