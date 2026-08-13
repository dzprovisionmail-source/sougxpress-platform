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
  Text,
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
  Eye,
} from "lucide-react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";

import { useAppTheme } from "@/contexts/ThemeContext";
import { useCurrentUserId } from "@/features/workspace/useCurrentUserId";
import { getStoreByMerchantId, getStoresByMerchantId, updateStore, createStore } from "@/services/store.service";
import useStore from "@/hooks/useStore";
import { useMerchantProducts } from "@/hooks/useProducts";
import { Store } from "@/types/schema-03-core";
import StoreImageGallery from "@/components/profile/StoreImageGallery";
import StoreProductManagement from "@/components/profile/StoreProductManagement";
import { supabase } from "@/lib/supabase";
import { ImageOptimizerModal } from "@/components/ui";
import { ImageType } from "@/utils/imageOptimizer";
import { getActiveCategories, getActiveSubcategories } from "@/services/category.service";
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
  category_id?: string;
  subcategory_id?: string;
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
    category_id: s.category_id ?? undefined,
    subcategory_id: s.subcategory_id ?? undefined,
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
  category_id?: string;
  subcategory_id?: string;
  address_line1: string;
  city: string;
  description: string;
  phone_number: string;
  opens_at: string;
  closes_at: string;
  latitude: string;
  longitude: string;
}

const EMPTY_CREATE_FORM: CreateFormValues = {
  name: "",
  category: "",
  category_id: undefined,
  subcategory_id: undefined,
  address_line1: "",
  city: "عين الصفراء",
  description: "",
  phone_number: "",
  opens_at: "09:00",
  closes_at: "21:00",
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
    const assetName = path === "logos" ? "logo" : "cover";
    const filePath = `${storeId}/${assetName}.${ext}`;
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
  const [stores, setStores] = useState<Store[]>([]);
  const [merchant, setMerchant] = useState<any>(null);
  const [resolving, setResolving] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [form, setForm] = useState<StoreFormValues | null>(null);
  const [saving, setSaving] = useState(false);
  const [togglingOpen, setTogglingOpen] = useState(false);

  // Create store state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState<CreateFormValues>(EMPTY_CREATE_FORM);
  const [creating, setCreating] = useState(false);

  // Category/subcategory state
  const [categories, setCategories] = useState<Array<{ id: string; name_ar: string; icon?: string }>>([]);
  const [subcategories, setSubcategories] = useState<Array<{ id: string; name_ar: string }>>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  // Logo / cover upload state
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [optimizerVisible, setOptimizerVisible] = useState(false);
  const [optimizerType, setOptimizerType] = useState<ImageType>("logo");
  const [pendingAssetType, setPendingAssetType] = useState<"logos" | "covers" | null>(null);
  const [pendingImageUri, setPendingImageUri] = useState<string | null>(null);

  const loadMerchantStores = async () => {
    if (!userId) return;
    
    // Fetch merchant details
    const { data: merchantData } = await supabase
      .from("merchants")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    setMerchant(merchantData);

    let list = await getStoresByMerchantId(userId);
    
    // Auto-repair: If merchant exists but has no stores, create the first one
    if (list.length === 0 && merchantData) {
      const created = await createStore(userId, {
        name: merchantData.business_name || "متجري",
        category: "عام",
        address_line1: merchantData.address || "العنوان الرئيسي",
        city: "عين الصفراء",
        country: "Algeria",
      });
      if (created) {
        list = [created];
      }
    }

    setStores(list);
    if (list.length > 0) {
      if (!storeId || !list.some(s => s.id === storeId)) {
        setStoreId(list[0].id);
      }
      setShowCreateForm(false);
    } else {
      setShowCreateForm(true);
    }
    setResolving(false);
  };

  useEffect(() => {
    if (!userId) return;
    loadMerchantStores();
    loadCategories();
  }, [userId]);

  useEffect(() => {
    if (editModalOpen && categories.length === 0 && !loadingCategories) {
      loadCategories();
    }
  }, [editModalOpen]);

  const loadCategories = async () => {
    setLoadingCategories(true);
    const cats = await getActiveCategories();
    setCategories(cats);
    setLoadingCategories(false);
  };

  const handleCategoryChange = async (categoryId: string) => {
    setCreateForm((prev) => ({ ...prev, category_id: categoryId, subcategory_id: undefined }));
    const subs = await getActiveSubcategories(categoryId);
    setSubcategories(subs);
  };

  const handleEditCategoryChange = async (categoryId: string) => {
    if (!form) return;
    const subs = await getActiveSubcategories(categoryId);
    setSubcategories(subs);
    setForm((prev) => prev ? { ...prev, category_id: categoryId, subcategory_id: undefined } : prev);
  };

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
    if (stores.length >= 5) {
      Alert.alert("تنبيه", "لقد وصلت إلى الحد الأقصى وهو 5 متاجر.");
      return;
    }
    if (!createForm.name.trim()) {
      Alert.alert("خطأ", "اسم المتجر مطلوب");
      return;
    }
    if (!createForm.category.trim() && !createForm.category_id) {
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
      category: createForm.category.trim() || "عام",
      category_id: createForm.category_id,
      subcategory_id: createForm.subcategory_id,
      description: createForm.description.trim() || undefined,
      phone_number: createForm.phone_number.trim() || undefined,
      address_line1: createForm.address_line1.trim(),
      city: createForm.city.trim() || "عين الصفراء",
      country: "Algeria",
      opens_at: createForm.opens_at || "09:00",
      closes_at: createForm.closes_at || "21:00",
      latitude: !isNaN(lat) ? lat : undefined,
      longitude: !isNaN(lng) ? lng : undefined,
    });
    setCreating(false);
    if (created) {
      setStoreId(created.id);
      setCreateForm(EMPTY_CREATE_FORM);
      await loadMerchantStores();
    } else {
      Alert.alert("خطأ", "تعذر إنشاء المتجر (قد تكون وصلت للحد الأقصى 5 متاجر).");
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
    if (store.category_id) {
      handleEditCategoryChange(store.category_id);
    } else {
      setSubcategories([]);
    }
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
    if (form.category_id) updates.category_id = form.category_id;
    if (form.subcategory_id !== undefined) updates.subcategory_id = form.subcategory_id;
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
      quality: 1,
    });
    if (result.canceled) return;
    setPendingImageUri(result.assets[0].uri);
    setPendingAssetType(asset);
    setOptimizerType(asset === "logos" ? "logo" : "cover");
    setOptimizerVisible(true);
  };

  const handleOptimizerComplete = async (processedUri: string) => {
    if (!store || !pendingAssetType) return;
    const asset = pendingAssetType;
    setOptimizerVisible(false);

    if (asset === "logos") setUploadingLogo(true);
    else setUploadingCover(true);

    const url = await uploadStoreAsset(store.id, asset, processedUri);

    if (asset === "logos") setUploadingLogo(false);
    else setUploadingCover(false);

    if (url) {
      const field = asset === "logos" ? { logo_url: url } : { cover_url: url };
      await updateStoreHook(field as Partial<Store>);
    } else {
      Alert.alert("خطأ", "تعذر رفع الصورة. حاول مرة أخرى.");
    }
    setPendingAssetType(null);
    setPendingImageUri(null);
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
                  { key: "description", label: "الوصف", placeholder: "وصف مختصر للمتجر", multiline: true },
                  { key: "phone_number", label: "رقم الهاتف", placeholder: "0555 000 000", keyboardType: "phone-pad" },
                  { key: "address_line1", label: "عنوان المتجر *", placeholder: "الشارع أو الحي" },
                  { key: "city", label: "المدينة", placeholder: "عين الصفراء" },
                  { key: "opens_at", label: "وقت الفتح (HH:MM)", placeholder: "09:00" },
                  { key: "closes_at", label: "وقت الغلق (HH:MM)", placeholder: "21:00" },
                  { key: "latitude", label: "خط العرض (اختياري)", placeholder: "مثال: 32.7490", keyboardType: "decimal-pad" },
                  { key: "longitude", label: "خط الطول (اختياري)", placeholder: "-0.5860", keyboardType: "decimal-pad" },
                ] as Array<{
                  key: keyof CreateFormValues;
                  label: string;
                  placeholder: string;
                  multiline?: boolean;
                  keyboardType?: "default" | "decimal-pad" | "phone-pad";
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

              <View style={{ marginBottom: tokens.spacing.md }}>
                <WorkspaceText color="secondary" style={{ fontSize: tokens.typography.sizes.sm, marginBottom: 4 }}>
                  الفئة الرئيسية *
                </WorkspaceText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                  <View style={{ flexDirection: "row-reverse", gap: 8 }}>
                    {categories.map((cat) => (
                      <TouchableOpacity
                        key={cat.id}
                        onPress={() => handleCategoryChange(cat.id)}
                        style={[
                          {
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            borderRadius: tokens.radius.sm,
                            borderWidth: 1,
                            borderColor: createForm.category_id === cat.id ? colors.primary : colors.borderSubtle,
                            backgroundColor: createForm.category_id === cat.id ? colors.primary + "18" : colors.bgElevated,
                          },
                        ]}
                      >
                        <Text style={{ color: createForm.category_id === cat.id ? colors.primary : colors.textPrimary, fontSize: 13, fontWeight: "600" }}>
                          {cat.name_ar}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              {subcategories.length > 0 && (
                <View style={{ marginBottom: tokens.spacing.md }}>
                  <WorkspaceText color="secondary" style={{ fontSize: tokens.typography.sizes.sm, marginBottom: 4 }}>
                    الفئة الفرعية
                  </WorkspaceText>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: "row-reverse", gap: 8 }}>
                      {subcategories.map((sub) => (
                        <TouchableOpacity
                          key={sub.id}
                          onPress={() => setCreateForm((prev) => ({ ...prev, subcategory_id: sub.id }))}
                          style={[
                            {
                              paddingHorizontal: 12,
                              paddingVertical: 8,
                              borderRadius: tokens.radius.sm,
                              borderWidth: 1,
                              borderColor: createForm.subcategory_id === sub.id ? colors.primary : colors.borderSubtle,
                              backgroundColor: createForm.subcategory_id === sub.id ? colors.primary + "18" : colors.bgElevated,
                            },
                          ]}
                        >
                          <Text style={{ color: createForm.subcategory_id === sub.id ? colors.primary : colors.textPrimary, fontSize: 13 }}>
                            {sub.name_ar}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              )}

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
      : store.status === "pending"
      ? "قيد المراجعة"
      : store.status === "paused"
      ? "موقوف مؤقتاً"
      : store.status === "suspended"
      ? "موقوف من الإدارة"
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
        {/* My Stores (متاجري) section */}
        <SectionCard>
          <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginBottom: tokens.spacing.sm }}>
            <View style={{ flexDirection: "row-reverse", alignItems: "center" }}>
              <SectionTitle
                icon={<StoreIcon color={colors.primary} size={tokens.spacing.lg} />}
              >
                {`متاجري (${stores.length}/5)`}
              </SectionTitle>
              {store && (
                <TouchableOpacity
                  onPress={() => router.push(`/store-details?id=${store.id}`)}
                  style={{
                    marginRight: tokens.spacing.md,
                    backgroundColor: colors.info + "18",
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: tokens.radius.sm,
                    flexDirection: "row-reverse",
                    alignItems: "center",
                  }}
                >
                  <ShoppingBag color={colors.info} size={14} />
                  <Text style={{ color: colors.info, fontSize: 12, marginRight: 4, fontWeight: "600" }}>معاينة في السوق</Text>
                </TouchableOpacity>
              )}
            </View>
            {stores.length < 5 ? (
              <TouchableOpacity
                onPress={() => setShowCreateForm(true)}
                style={{
                  backgroundColor: colors.primary,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: tokens.radius.sm,
                }}
              >
                <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>+ إضافة متجر</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {stores.length >= 5 && (
            <WorkspaceText color="error" style={{ fontSize: 12, marginBottom: 8, textAlign: "right" }}>
              لقد وصلت إلى الحد الأقصى وهو 5 متاجر.
            </WorkspaceText>
          )}

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
            <View style={{ flexDirection: "row-reverse", gap: 8 }}>
              {stores.map((s) => {
                const isActive = s.id === storeId;
                return (
                  <TouchableOpacity
                    key={s.id}
                    onPress={() => {
                      setStoreId(s.id);
                      setShowCreateForm(false);
                    }}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      borderRadius: tokens.radius.sm,
                      borderWidth: 1,
                      borderColor: isActive ? colors.primary : colors.borderSubtle,
                      backgroundColor: isActive ? colors.primary + "18" : colors.bgElevated,
                      minWidth: 110,
                      alignItems: "flex-end",
                    }}
                  >
                    <Text
                      numberOfLines={1}
                      style={{
                        color: isActive ? colors.primary : colors.textPrimary,
                        fontSize: 13,
                        fontWeight: "700",
                        textAlign: "right",
                      }}
                    >
                      {s.name}
                    </Text>
                    <Text
                      style={{
                        color: colors.textSecondary,
                        fontSize: 11,
                        marginTop: 2,
                        textAlign: "right",
                      }}
                    >
                      {s.status === "active" ? "نشط" : "قيد المراجعة"}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </SectionCard>

        {/* Quick Actions & Status */}
        <View style={{ flexDirection: "row-reverse", gap: tokens.spacing.md, paddingHorizontal: tokens.spacing.md, marginBottom: tokens.spacing.md }}>
          <SectionCard style={{ flex: 1, marginBottom: 0 }}>
            <View style={{ alignItems: "center" }}>
              <WorkspaceText color="secondary" style={{ fontSize: 12, marginBottom: 4 }}>حالة المتجر</WorkspaceText>
              <Switch
                value={isOpen}
                onValueChange={handleToggleOpen}
                disabled={togglingOpen}
                trackColor={{ false: colors.borderSubtle, true: colors.success }}
                thumbColor={colors.textOnBrand}
              />
              <WorkspaceText
                color={isOpen ? "success" : "error"}
                style={{ fontWeight: "700", fontSize: 12, marginTop: 4 }}
              >
                {isOpen ? "مفتوح" : "مغلق"}
              </WorkspaceText>
            </View>
          </SectionCard>

          <SectionCard style={{ flex: 2, marginBottom: 0 }}>
            <View style={{ flexDirection: "row-reverse", justifyContent: "space-around", alignItems: "center", height: "100%" }}>
              <TouchableOpacity style={{ alignItems: "center" }} onPress={() => router.push(`/store-details?id=${store.id}`)}>
                <View style={{ backgroundColor: colors.info + "18", padding: 8, borderRadius: tokens.radius.full, marginBottom: 4 }}>
                  <Eye color={colors.info} size={20} />
                </View>
                <Text style={{ color: colors.textPrimary, fontSize: 11, fontWeight: "600" }}>معاينة</Text>
              </TouchableOpacity>

              <TouchableOpacity style={{ alignItems: "center" }} onPress={openEditModal}>
                <View style={{ backgroundColor: colors.primary + "18", padding: 8, borderRadius: tokens.radius.full, marginBottom: 4 }}>
                  <Pencil color={colors.primary} size={20} />
                </View>
                <Text style={{ color: colors.textPrimary, fontSize: 11, fontWeight: "600" }}>تعديل</Text>
              </TouchableOpacity>

              <TouchableOpacity style={{ alignItems: "center" }} onPress={() => {}}>
                <View style={{ backgroundColor: colors.success + "18", padding: 8, borderRadius: tokens.radius.full, marginBottom: 4 }}>
                  <ShoppingBag color={colors.success} size={20} />
                </View>
                <Text style={{ color: colors.textPrimary, fontSize: 11, fontWeight: "600" }}>الطلبات</Text>
              </TouchableOpacity>
            </View>
          </SectionCard>
        </View>

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
          {merchant && <WorkspaceRow label="اسم المالك" value={merchant.owner_full_name} />}
          {merchant && <WorkspaceRow label="البريد الإلكتروني" value={merchant.email} />}
          <WorkspaceRow label="الفئة" value={store.category} />
          {store.description ? (
            <WorkspaceRow label="الوصف" value={store.description} />
          ) : null}
          <WorkspaceRow label="رقم الهاتف" value={store.phone_number || "غير محدد"} />
          <WorkspaceRow label="المدينة" value={store.city || "عين الصفراء"} />
          <WorkspaceRow label="العنوان" value={store.address_line1 || "غير محدد"} />
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

        {/* Promotions link */}
        <SectionCard>
          <SectionTitle icon={<Tag color={colors.primary} size={tokens.spacing.lg} />}>
            العروض الترويجية
          </SectionTitle>
          <WorkspaceText color="secondary" style={{ textAlign: "right", fontSize: tokens.typography.sizes.sm, marginBottom: tokens.spacing.sm }}>
            أنشئ عروضاً وخصومات مخصصة لمتجرك من تبويب "العروض" في شريط التنقل.
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
            storeId={store.id}
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

                <View style={{ marginBottom: tokens.spacing.md }}>
                  <WorkspaceText color="secondary" style={{ fontSize: tokens.typography.sizes.sm, marginBottom: 4 }}>
                    الفئة الرئيسية
                  </WorkspaceText>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: "row-reverse", gap: 8 }}>
                      {categories.map((cat) => (
                        <TouchableOpacity
                          key={cat.id}
                          onPress={() => handleEditCategoryChange(cat.id)}
                          style={[
                            {
                              paddingHorizontal: 12,
                              paddingVertical: 8,
                              borderRadius: tokens.radius.sm,
                              borderWidth: 1,
                              borderColor: form?.category_id === cat.id ? colors.primary : colors.borderSubtle,
                              backgroundColor: form?.category_id === cat.id ? colors.primary + "18" : colors.bgElevated,
                            },
                          ]}
                        >
                          <Text style={{ color: form?.category_id === cat.id ? colors.primary : colors.textPrimary, fontSize: 13, fontWeight: "600" }}>
                            {cat.name_ar}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>

                {subcategories.length > 0 && (
                  <View style={{ marginBottom: tokens.spacing.md }}>
                    <WorkspaceText color="secondary" style={{ fontSize: tokens.typography.sizes.sm, marginBottom: 4 }}>
                      الفئة الفرعية
                    </WorkspaceText>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={{ flexDirection: "row-reverse", gap: 8 }}>
                        {subcategories.map((sub) => (
                          <TouchableOpacity
                            key={sub.id}
                            onPress={() => setForm((prev) => prev ? { ...prev, subcategory_id: sub.id } : prev)}
                            style={[
                              {
                                paddingHorizontal: 12,
                                paddingVertical: 8,
                                borderRadius: tokens.radius.sm,
                                borderWidth: 1,
                                borderColor: form?.subcategory_id === sub.id ? colors.primary : colors.borderSubtle,
                                backgroundColor: form?.subcategory_id === sub.id ? colors.primary + "18" : colors.bgElevated,
                              },
                            ]}
                          >
                            <Text style={{ color: form?.subcategory_id === sub.id ? colors.primary : colors.textPrimary, fontSize: 13 }}>
                              {sub.name_ar}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                )}

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

      <ImageOptimizerModal
        visible={optimizerVisible}
        imageUri={pendingImageUri}
        imageType={optimizerType}
        onClose={() => setOptimizerVisible(false)}
        onComplete={handleOptimizerComplete}
      />
    </WorkspaceScreen>
  );
}
