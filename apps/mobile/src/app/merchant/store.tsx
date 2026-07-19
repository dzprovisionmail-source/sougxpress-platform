import React, { useEffect, useState } from "react";
import {
  ScrollView,
  View,
  Switch,
  Modal,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from "react-native";
import {
  Store as StoreIcon,
  Clock3,
  Images,
  ShoppingBag,
  Pencil,
  X,
  Tag,
  ImagePlus,
} from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";

import { useAppTheme } from "@/contexts/ThemeContext";
import { useCurrentUserId } from "@/features/workspace/useCurrentUserId";
import { getStoreByMerchantId, updateStore, createStore } from "@/services/store.service";
import useStore from "@/hooks/useStore";
import { useMerchantProducts } from "@/hooks/useProducts";
import { Store } from "@/types/schema-03-core";
import StoreImageGallery from "@/components/profile/StoreImageGallery";
import StoreProductManagement from "@/components/profile/StoreProductManagement";
import { supabase } from "@/lib/supabase";
import {
  WorkspaceScreen,
  SectionCard,
  SectionTitle,
  WorkspaceRow,
  WorkspaceText,
  WorkspaceButton,
  LoadingState,
} from "@/features/workspace/ui";

/* ─── Store edit form ─────────────────────────────────────────── */
interface StoreFormValues {
  name: string;
  category: string;
  description: string;
  phone_number: string;
  address_line1: string;
  city: string;
  opens_at: string;
  closes_at: string;
}

function buildForm(s: Store): StoreFormValues {
  return {
    name: s.name ?? "",
    category: s.category ?? "",
    description: s.description ?? "",
    phone_number: s.phone_number ?? "",
    address_line1: s.address_line1 ?? "",
    city: s.city ?? "",
    opens_at: s.opens_at ? String(s.opens_at).slice(0, 5) : "09:00",
    closes_at: s.closes_at ? String(s.closes_at).slice(0, 5) : "21:00",
  };
}

/* ─── Create store form values ────────────────────────────────── */
interface CreateFormValues {
  name: string;
  category: string;
  address_line1: string;
  city: string;
  latitude: string;
  longitude: string;
}

const EMPTY_CREATE_FORM: CreateFormValues = {
  name: "",
  category: "",
  address_line1: "",
  city: "عين الصفراء",
  latitude: "",
  longitude: "",
};

/* ─── Image uploader helper ───────────────────────────────────── */
async function uploadStoreAsset(
  storeId: string,
  path: "logos" | "covers",
  uri: string
): Promise<string | null> {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    const ext = uri.split(".").pop() ?? "jpg";
    const filePath = `${path}/${storeId}.${ext}`;
    const { error } = await supabase.storage
      .from("store_images")
      .upload(filePath, blob, { contentType: blob.type, upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from("store_images").getPublicUrl(filePath);
    return data.publicUrl;
  } catch (err: any) {
    console.error(`[store] upload ${path} error:`, err);
    return null;
  }
}

/* ─── Screen ──────────────────────────────────────────────────── */
export default function MerchantStoreScreen() {
  const { colors, tokens } = useAppTheme();
  const { userId } = useCurrentUserId();

  const [storeId, setStoreId] = useState<string>("");
  const [resolving, setResolving] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [form, setForm] = useState<StoreFormValues | null>(null);
  const [saving, setSaving] = useState(false);
  const [togglingOpen, setTogglingOpen] = useState(false);

  // Create store state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState<CreateFormValues>(EMPTY_CREATE_FORM);
  const [creating, setCreating] = useState(false);

  // Logo / cover upload state
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  useEffect(() => {
    if (!userId) return;
    getStoreByMerchantId(userId).then((s) => {
      if (s?.id) {
        setStoreId(s.id);
      } else {
        // No store yet — auto-open the create form
        setShowCreateForm(true);
      }
      setResolving(false);
    });
  }, [userId]);

  const { store, galleryImages, loading, updateStore: updateStoreHook, handleImageUpload, handleImageDelete } =
    useStore(storeId);

  const {
    products,
    loading: productsLoading,
    addProduct,
    editProduct,
    removeProduct,
    setVisibility,
  } = useMerchantProducts(storeId);

  /* ── Create store ──────────────────────────────────────────── */
  const handleCreateStore = async () => {
    if (!userId) return;
    if (!createForm.name.trim()) {
      Alert.alert("خطأ", "اسم المتجر مطلوب");
      return;
    }
    if (!createForm.category.trim()) {
      Alert.alert("خطأ", "فئة المتجر مطلوبة");
      return;
    }
    if (!createForm.address_line1.trim()) {
      Alert.alert("خطأ", "عنوان المتجر مطلوب");
      return;
    }
    setCreating(true);
    const lat = parseFloat(createForm.latitude);
    const lng = parseFloat(createForm.longitude);
    const created = await createStore(userId, {
      name: createForm.name.trim(),
      category: createForm.category.trim(),
      address_line1: createForm.address_line1.trim(),
      city: createForm.city.trim() || "عين الصفراء",
      country: "Algeria",
      latitude: !isNaN(lat) ? lat : undefined,
      longitude: !isNaN(lng) ? lng : undefined,
    });
    setCreating(false);
    if (created) {
      setStoreId(created.id);
      setShowCreateForm(false);
    } else {
      Alert.alert("خطأ", "تعذر إنشاء المتجر. يرجى المحاولة لاحقاً.");
    }
  };

  /* ── Open/Close toggle ─────────────────────────────────────── */
  const handleToggleOpen = async (value: boolean) => {
    if (!store) return;
    setTogglingOpen(true);
    const updated = await updateStore(store.id, { is_open: value });
    if (updated) {
      await updateStoreHook({ is_open: value });
    }
    setTogglingOpen(false);
  };

  /* ── Edit modal ────────────────────────────────────────────── */
  const openEditModal = () => {
    if (!store) return;
    setForm(buildForm(store));
    setEditModalOpen(true);
  };

  const handleSave = async () => {
    if (!form || !store) return;
    if (!form.name.trim()) {
      Alert.alert("خطأ", "اسم المتجر مطلوب");
      return;
    }
    setSaving(true);
    const updates: Partial<Store> = {
      name: form.name.trim(),
      category: form.category.trim(),
      description: form.description.trim() || undefined,
      phone_number: form.phone_number.trim() || undefined,
      address_line1: form.address_line1.trim() || undefined,
      city: form.city.trim() || undefined,
      opens_at: form.opens_at || undefined,
      closes_at: form.closes_at || undefined,
    };
    const ok = await updateStoreHook(updates);
    setSaving(false);
    if (ok !== undefined) {
      setEditModalOpen(false);
    } else {
      Alert.alert("خطأ", "تعذر حفظ التعديلات. حاول مرة أخرى.");
    }
  };

  /* ── Logo / Cover upload ───────────────────────────────────── */
  const pickAndUpload = async (asset: "logos" | "covers") => {
    if (!store) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("إذن مطلوب", "يجب السماح بالوصول إلى المعرض لرفع الصورة.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: asset === "logos" ? [1, 1] : [16, 9],
      quality: 0.85,
    });
    if (result.canceled) return;
    const uri = result.assets[0].uri;
    if (asset === "logos") setUploadingLogo(true);
    else setUploadingCover(true);
    const url = await uploadStoreAsset(store.id, asset, uri);
    if (asset === "logos") setUploadingLogo(false);
    else setUploadingCover(false);
    if (url) {
      const field = asset === "logos" ? { logo_url: url } : { cover_url: url };
      await updateStoreHook(field as Partial<Store>);
    } else {
      Alert.alert("خطأ", "تعذر رفع الصورة. حاول مرة أخرى.");
    }
  };

  /* ── Loading guard ─────────────────────────────────────────── */
  if (resolving) {
    return (
      <WorkspaceScreen>
        <LoadingState message="جاري تحميل المتجر..." />
      </WorkspaceScreen>
    );
  }

  /* ── No store → Create Store form ─────────────────────────── */
  if (showCreateForm || (!storeId && !resolving)) {
    return (
      <WorkspaceScreen>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={{
              paddingTop: tokens.spacing.xl,
              paddingBottom: tokens.spacing["3xl"],
            }}
          >
            <SectionCard>
              <WorkspaceText
                variant="title"
                style={{ textAlign: "right", marginBottom: tokens.spacing.md }}
              >
                إنشاء متجرك
              </WorkspaceText>
              <WorkspaceText
                color="secondary"
                style={{
                  textAlign: "right",
                  fontSize: tokens.typography.sizes.sm,
                  marginBottom: tokens.spacing.lg,
                }}
              >
                أدخل بيانات متجرك الأساسية. سيتم مراجعة طلبك من قِبل الإدارة قبل التفعيل.
              </WorkspaceText>

              {(
                [
                  { key: "name", label: "اسم المتجر *", placeholder: "مثال: متجر العائلة" },
                  { key: "category", label: "الفئة *", placeholder: "مثال: بقالة، مطعم..." },
                  { key: "address_line1", label: "عنوان المتجر *", placeholder: "الشارع أو الحي" },
                  { key: "city", label: "المدينة", placeholder: "عين الصفراء" },
                  { key: "latitude", label: "خط العرض (اختياري)", placeholder: "مثال: 32.7490", keyboardType: "decimal-pad" },
                  { key: "longitude", label: "خط الطول (اختياري)", placeholder: "مثال: -0.5860", keyboardType: "decimal-pad" },
                ] as Array<{
                  key: keyof CreateFormValues;
                  label: string;
                  placeholder: string;
                  keyboardType?: "default" | "decimal-pad";
                }>
              ).map((field) => (
                <View key={field.key} style={{ marginBottom: tokens.spacing.md }}>
                  <WorkspaceText
                    color="secondary"
                    style={{ fontSize: tokens.typography.sizes.sm, marginBottom: 4 }}
                  >
                    {field.label}
                  </WorkspaceText>
                  <TextInput
                    value={createForm[field.key]}
                    onChangeText={(text) =>
                      setCreateForm((prev) => ({ ...prev, [field.key]: text }))
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
                  />
                </View>
              ))}

              <WorkspaceButton
                title={creating ? "جاري الإنشاء..." : "إنشاء المتجر"}
                onPress={handleCreateStore}
                isLoading={creating}
                style={{ marginTop: tokens.spacing.sm }}
              />
            </SectionCard>
          </ScrollView>
        </KeyboardAvoidingView>
      </WorkspaceScreen>
    );
  }

  /* ── Store loading ─────────────────────────────────────────── */
  if (storeId && loading && !store) {
    return (
      <WorkspaceScreen>
        <LoadingState message="جاري تحميل المتجر..." />
      </WorkspaceScreen>
    );
  }

  if (!store) return null;

  const isOpen = store.is_open ?? false;
  const statusLabel =
    store.status === "active"
      ? "نشط"
      : store.status === "paused"
      ? "موقوف مؤقتاً"
      : store.status;

  /* ── Render ────────────────────────────────────────────────── */
  return (
    <WorkspaceScreen>
      <ScrollView
        contentContainerStyle={{
          paddingTop: tokens.spacing.xl,
          paddingBottom: tokens.spacing["3xl"],
        }}
      >
        {/* Open / Close toggle card */}
        <SectionCard>
          <View
            style={{
              flexDirection: "row-reverse",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View>
              <WorkspaceText
                color={isOpen ? "success" : "error"}
                style={{ fontWeight: "700", fontSize: tokens.typography.sizes.md }}
              >
                {isOpen ? "🟢 المتجر مفتوح" : "🔴 المتجر مغلق"}
              </WorkspaceText>
              <WorkspaceText color="secondary" style={{ fontSize: tokens.typography.sizes.sm }}>
                اضغط للتبديل
              </WorkspaceText>
            </View>
            <Switch
              value={isOpen}
              onValueChange={handleToggleOpen}
              disabled={togglingOpen}
              trackColor={{ false: colors.borderSubtle, true: colors.success }}
              thumbColor={colors.textOnBrand}
            />
          </View>
        </SectionCard>

        {/* Store profile */}
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
              icon={<StoreIcon color={colors.primary} size={tokens.spacing.lg} />}
            >
              ملف المتجر
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

          <WorkspaceRow label="اسم المتجر" value={store.name} />
          <WorkspaceRow label="الفئة" value={store.category} />
          {store.description ? (
            <WorkspaceRow label="الوصف" value={store.description} />
          ) : null}
          {store.phone_number ? (
            <WorkspaceRow label="رقم الهاتف" value={store.phone_number} />
          ) : null}
          {store.address_line1 ? (
            <WorkspaceRow label="العنوان" value={store.address_line1} />
          ) : null}
          {store.city ? (
            <WorkspaceRow label="المدينة" value={store.city} />
          ) : null}
          {store.latitude != null && store.longitude != null ? (
            <WorkspaceRow
              label="الموقع الجغرافي"
              value={`${store.latitude.toFixed(5)}, ${store.longitude.toFixed(5)}`}
            />
          ) : null}
          <WorkspaceRow label="حالة المتجر" value={statusLabel} isLast />
        </SectionCard>

        {/* Logo & Cover */}
        <SectionCard>
          <SectionTitle
            icon={<ImagePlus color={colors.primary} size={tokens.spacing.lg} />}
          >
            الشعار والغلاف
          </SectionTitle>

          {/* Logo */}
          <View style={{ marginBottom: tokens.spacing.md }}>
            <WorkspaceText
              color="secondary"
              style={{ fontSize: tokens.typography.sizes.sm, marginBottom: tokens.spacing.xs, textAlign: "right" }}
            >
              شعار المتجر
            </WorkspaceText>
            {store.logo_url ? (
              <Image
                source={{ uri: store.logo_url }}
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: tokens.radius.md,
                  alignSelf: "flex-end",
                  marginBottom: tokens.spacing.xs,
                  borderWidth: 1,
                  borderColor: colors.borderSubtle,
                }}
              />
            ) : null}
            <WorkspaceButton
              title={uploadingLogo ? "جاري الرفع..." : "رفع الشعار"}
              variant="outline"
              onPress={() => pickAndUpload("logos")}
              isLoading={uploadingLogo}
            />
          </View>

          {/* Cover */}
          <View>
            <WorkspaceText
              color="secondary"
              style={{ fontSize: tokens.typography.sizes.sm, marginBottom: tokens.spacing.xs, textAlign: "right" }}
            >
              صورة الغلاف
            </WorkspaceText>
            {store.cover_url ? (
              <Image
                source={{ uri: store.cover_url }}
                style={{
                  width: "100%",
                  height: 120,
                  borderRadius: tokens.radius.md,
                  marginBottom: tokens.spacing.xs,
                  borderWidth: 1,
                  borderColor: colors.borderSubtle,
                }}
                resizeMode="cover"
              />
            ) : null}
            <WorkspaceButton
              title={uploadingCover ? "جاري الرفع..." : "رفع صورة الغلاف"}
              variant="outline"
              onPress={() => pickAndUpload("covers")}
              isLoading={uploadingCover}
            />
          </View>
        </SectionCard>

        {/* Opening hours */}
        <SectionCard>
          <SectionTitle
            icon={<Clock3 color={colors.primary} size={tokens.spacing.lg} />}
          >
            أوقات العمل
          </SectionTitle>
          <WorkspaceRow
            label="وقت الفتح"
            value={store.opens_at ? String(store.opens_at).slice(0, 5) : "--"}
          />
          <WorkspaceRow
            label="وقت الغلق"
            value={store.closes_at ? String(store.closes_at).slice(0, 5) : "--"}
            isLast
          />
        </SectionCard>

        {/* Promotions info */}
        <SectionCard>
          <SectionTitle
            icon={<Tag color={colors.primary} size={tokens.spacing.lg} />}
          >
            العروض والترقيات
          </SectionTitle>
          <WorkspaceText color="secondary" style={{ textAlign: "center", paddingVertical: tokens.spacing.sm }}>
            العروض الخاصة بمتجرك تُدار من قِبل فريق المنصة.{"\n"}تواصل معنا لإضافة عروض ترويجية مخصصة.
          </WorkspaceText>
        </SectionCard>

        {/* Gallery */}
        <SectionCard>
          <SectionTitle
            icon={<Images color={colors.primary} size={tokens.spacing.lg} />}
          >
            معرض الصور
          </SectionTitle>
          <StoreImageGallery
            storeId={store.id}
            images={galleryImages}
            isMerchantView
            onImageUpload={handleImageUpload}
            onImageDelete={handleImageDelete}
          />
        </SectionCard>

        {/* Products */}
        <SectionCard>
          <StoreProductManagement
            isMerchantView
            products={products}
            loading={productsLoading}
            onAddProduct={addProduct}
            onEditProduct={editProduct}
            onDeleteProduct={removeProduct}
            onToggleVisibility={setVisibility}
          />
        </SectionCard>
      </ScrollView>

      {/* ── Edit Store Modal ──────────────────────────────────── */}
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
                maxHeight: "90%",
              }}
            >
              {/* Modal header */}
              <View
                style={{
                  flexDirection: "row-reverse",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: tokens.spacing.lg,
                }}
              >
                <WorkspaceText variant="title">تعديل ملف المتجر</WorkspaceText>
                <TouchableOpacity onPress={() => setEditModalOpen(false)}>
                  <X color={colors.textSecondary} size={22} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {form &&
                  (
                    [
                      { key: "name", label: "اسم المتجر *", placeholder: "مثال: متجر العائلة" },
                      { key: "category", label: "الفئة", placeholder: "مثال: بقالة، مطعم..." },
                      { key: "description", label: "الوصف", placeholder: "وصف مختصر للمتجر", multiline: true },
                      { key: "phone_number", label: "رقم الهاتف", placeholder: "0555 000 000", keyboardType: "phone-pad" },
                      { key: "address_line1", label: "العنوان", placeholder: "الشارع أو الحي" },
                      { key: "city", label: "المدينة", placeholder: "مثال: عين الصفراء" },
                      { key: "opens_at", label: "وقت الفتح (HH:MM)", placeholder: "09:00" },
                      { key: "closes_at", label: "وقت الغلق (HH:MM)", placeholder: "21:00" },
                    ] as Array<{
                      key: keyof StoreFormValues;
                      label: string;
                      placeholder: string;
                      multiline?: boolean;
                      keyboardType?: "default" | "phone-pad";
                    }>
                  ).map((field) => (
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
                          setForm((prev) =>
                            prev ? { ...prev, [field.key]: text } : prev
                          )
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
                          minHeight: field.multiline ? 72 : undefined,
                          textAlignVertical: field.multiline ? "top" : "center",
                        }}
                        placeholder={field.placeholder}
                        placeholderTextColor={colors.textDisabled}
                        multiline={field.multiline}
                        keyboardType={field.keyboardType ?? "default"}
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
