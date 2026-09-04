import React, { useEffect, useState, useCallback } from "react";
import {
  ScrollView,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
  Image,
  Text,
  StyleSheet,
  Modal,
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
  Plus,
  ChevronDown,
  MapPin,
  Phone,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
  Save,
  Eye,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";

import { useAppTheme } from "@/contexts/ThemeContext";
import { KeyboardAwareView } from "@/components/ui/KeyboardAwareView";
import { useCurrentUserId } from "@/features/workspace/useCurrentUserId";
import { getStore, getStoresByMerchantId, getStoreSubcategories, updateStore, createStore } from "@/services/store.service";
import { DEFAULT_STORE_HOURS, getStoreHours, validateStoreHours } from "@/services/store-hours";
import useStore from "@/hooks/useStore";
import { useMerchantProducts } from "@/hooks/useProducts";
import { Store } from "@/types/schema-03-core";
import StoreImageGallery from "@/components/profile/StoreImageGallery";
import StoreProductManagement from "@/components/profile/StoreProductManagement";
import { supabase } from "@/lib/supabase";
import { ImageOptimizerModal, SimpleSelect } from "@/components/ui";
import { ImageType, prepareImageForUpload } from "@/utils/imageOptimizer";
import { getActiveCategories, getActiveSubcategories } from "@/services/category.service";
import { uploadToSupabase } from "@/utils/upload.utils";
import {
  SectionCard,
  SectionTitle,
  WorkspaceButton,
  LoadingState,
} from "@/features/workspace/ui";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { AIN_SEFRA_ZONES } from "@/constants/ain-sefra-zones";

const CLOSED_DAY_OPTIONS = [
  { value: "sunday", label: "الأحد" },
  { value: "monday", label: "الاثنين" },
  { value: "tuesday", label: "الثلاثاء" },
  { value: "wednesday", label: "الأربعاء" },
  { value: "thursday", label: "الخميس" },
  { value: "friday", label: "الجمعة" },
  { value: "saturday", label: "السبت" },
];

interface StoreFormValues {
  name: string;
  category: string;
  category_id?: string;
  subcategory_id?: string;
  subcategory_ids?: string[];
  description: string;
  phone_number: string;
  address_line1: string;
  city: string;
  zone_id?: string;
  state_province?: string;
  opens_at: string;
  closes_at: string;
  closed_day: NonNullable<Store["closed_day"]> | "";
}

const EMPTY_FORM: StoreFormValues = {
  name: "",
  category: "",
  category_id: undefined,
  subcategory_id: undefined,
  subcategory_ids: [],
  description: "",
  phone_number: "",
  address_line1: "",
  city: "عين الصفراء",
  zone_id: undefined,
  state_province: "",
  opens_at: DEFAULT_STORE_HOURS.opens_at,
  closes_at: DEFAULT_STORE_HOURS.closes_at,
  closed_day: "",
};

export default function UnifiedMerchantStoreDashboard() {
  const { colors, tokens } = useAppTheme();
  const { userId } = useCurrentUserId();
  const router = useRouter();

  const [stores, setStores] = useState<Store[]>([]);
  const [storeId, setStoreId] = useState<string>("");
  const [merchant, setMerchant] = useState<any>(null);
  const [loadingList, setLoadingList] = useState(true);

  // Store selector modal
  const [showSelectorModal, setShowSelectorModal] = useState(false);

  // Create store modal/form state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<StoreFormValues>(EMPTY_FORM);
  const [creating, setCreating] = useState(false);

  // Edit store info modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<StoreFormValues>(EMPTY_FORM);
  const [savingEdit, setSavingEdit] = useState(false);

  // Categories & Subcategories
  const [categories, setCategories] = useState<Array<{ id: string; name_ar: string }>>([]);
  const [subcategories, setSubcategories] = useState<Array<{ id: string; name_ar: string }>>([]);

  // Image upload / optimizer state
  const [optimizerVisible, setOptimizerVisible] = useState(false);
  const [optimizerType, setOptimizerType] = useState<ImageType>("logo");
  const [pendingAssetType, setPendingAssetType] = useState<"logos" | "covers" | null>(null);
  const [pendingImageUri, setPendingImageUri] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!userId) return;
    setLoadingList(true);

    const { data: mData } = await supabase
      .from("merchants")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    setMerchant(mData);

    let list = await getStoresByMerchantId(userId);

    // Auto-repair if merchant has 0 stores
    if (list.length === 0 && mData) {
      const created = await createStore(userId, {
        name: mData.business_name || "متجري الأول",
        category: "عام",
        address_line1: mData.address || "العنوان الرئيسي",
        city: "عين الصفراء",
        country: "Algeria",
      });
      if (created) list = [created];
    }

    setStores(list);
    if (list.length > 0) {
      if (!storeId || !list.some((s) => s.id === storeId)) {
        setStoreId(list[0].id);
      }
    }
    setLoadingList(false);
  }, [userId, storeId]);

  useEffect(() => {
    loadData();
    getActiveCategories().then(setCategories);
  }, [loadData]);

  const { store, galleryImages, selectedSubcategories, handleImageUpload, handleImageDelete, updateStore: updateStoreHook } = useStore(storeId);
  const { products, loading: productsLoading, addProduct, editProduct, removeProduct, setVisibility } = useMerchantProducts(storeId);

  const handleCategoryChange = async (categoryId: string, isCreate: boolean) => {
    const subs = await getActiveSubcategories(categoryId);
    setSubcategories(subs);
    if (isCreate) {
      setCreateForm((prev) => ({ ...prev, category_id: categoryId, subcategory_id: undefined }));
    } else {
      setEditForm((prev) => ({
        ...prev,
        category_id: categoryId,
        subcategory_id: undefined,
        subcategory_ids: [],
      }));
    }
  };

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
    if (!createForm.address_line1.trim()) {
      Alert.alert("خطأ", "عنوان المتجر مطلوب");
      return;
    }
    const hoursError = validateStoreHours(createForm.opens_at, createForm.closes_at);
    if (hoursError) {
      Alert.alert("خطأ", hoursError);
      return;
    }

    setCreating(true);
    const created = await createStore(userId, {
      name: createForm.name.trim(),
      category: createForm.category.trim() || "عام",
      category_id: createForm.category_id,
      subcategory_id: createForm.subcategory_id,
      description: createForm.description.trim() || undefined,
      phone_number: createForm.phone_number.trim() || undefined,
      address_line1: createForm.address_line1.trim(),
      city: createForm.city.trim() || "عين الصفراء",
      zone_id: createForm.zone_id,
      state_province: createForm.state_province,
      country: "Algeria",
      opens_at: createForm.opens_at,
      closes_at: createForm.closes_at,
      closed_day: createForm.closed_day || null,
    });
    setCreating(false);

    if (created) {
      setStoreId(created.id);
      setCreateForm(EMPTY_FORM);
      setShowCreateModal(false);
      await loadData();
    } else {
      Alert.alert("خطأ", "تعذر إنشاء المتجر.");
    }
  };

  const [allZones, setAllZones] = useState<Array<{ id: string; name: string }>>([]);
  useEffect(() => {
    supabase.from("zones").select("id, name").then(({ data }) => {
      if (data) setAllZones(data);
    });
  }, []);

  const openEditModal = async () => {
    const editableStore = store ?? stores.find((item) => item.id === storeId) ?? stores[0];
    if (!editableStore) return;
    setShowEditModal(true);
    const availableCategories = categories.length > 0 ? categories : await getActiveCategories();
    if (categories.length === 0) setCategories(availableCategories);
    const savedSubcategories = selectedSubcategories.length > 0
      ? selectedSubcategories
      : await getStoreSubcategories(editableStore.id);
    setEditForm({
      name: editableStore.name ?? "",
      category: editableStore.category ?? "",
      category_id: editableStore.category_id ?? undefined,
      subcategory_id: editableStore.subcategory_id ?? undefined,
      subcategory_ids: savedSubcategories,
      description: editableStore.description ?? "",
      phone_number: editableStore.phone_number ?? "",
      address_line1: editableStore.address_line1 ?? "",
      city: editableStore.city ?? "عين الصفراء",
      zone_id: (editableStore as any).zone_id || undefined,
      state_province: editableStore.state_province || "",
      opens_at: getStoreHours(editableStore).opens_at,
      closes_at: getStoreHours(editableStore).closes_at,
      closed_day: editableStore.closed_day ?? "",
    });
    if (editableStore.category_id) {
      getActiveSubcategories(editableStore.category_id).then(setSubcategories);
    } else {
      setSubcategories([]);
    }
  };

  const handleSaveEdit = async () => {
    const editableStore = store ?? stores.find((item) => item.id === storeId) ?? stores[0];
    if (!editableStore) return;
    if (!editForm.name.trim()) {
      Alert.alert("خطأ", "اسم المتجر مطلوب");
      return;
    }
    const hoursError = validateStoreHours(editForm.opens_at, editForm.closes_at);
    if (hoursError) {
      Alert.alert("خطأ", hoursError);
      return;
    }
    setSavingEdit(true);
    const updates: any = {
      name: editForm.name.trim(),
      category: editForm.category.trim(),
      main_category: categories.find((category) => category.id === editForm.category_id)?.name_ar || editForm.category.trim() || null,
      description: editForm.description.trim() || undefined,
      phone_number: editForm.phone_number.trim() || undefined,
      address_line1: editForm.address_line1.trim() || undefined,
      city: editForm.city.trim() || "عين الصفراء",
      zone_id: editForm.zone_id,
      state_province: editForm.state_province,
      opens_at: editForm.opens_at || undefined,
      closes_at: editForm.closes_at || undefined,
      closed_day: editForm.closed_day || null,
      subcategory_ids: editForm.subcategory_ids || [],
      subcategory_id: editForm.subcategory_ids?.[0] || null,
    };
    if (editForm.category_id) updates.category_id = editForm.category_id;

    const ok = await updateStoreHook(updates);
    if (ok) {
      const refreshed = await getStore(editableStore.id);
      if (!refreshed) {
        setSavingEdit(false);
        Alert.alert("خطأ", "تم الحفظ لكن تعذر إعادة تحميل الإعدادات.");
        return;
      }
      setStores((current) => current.map((item) => item.id === refreshed.id ? refreshed : item));
      setSavingEdit(false);
      setShowEditModal(false);
      Alert.alert("نجاح", "تم حفظ التعديلات وإعادة تحميلها بنجاح");
    } else {
      setSavingEdit(false);
      Alert.alert("خطأ", "تعذر حفظ التعديلات");
    }
  };

  const pickImage = async (assetType: "logos" | "covers") => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("إذن مطلوب", "يجب السماح بالوصول إلى الصور.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
    });
    if (res.canceled || !res.assets[0]?.uri) return;

    setPendingImageUri(res.assets[0].uri);
    setPendingAssetType(assetType);
    setOptimizerType(assetType === "logos" ? "logo" : "cover");
    setOptimizerVisible(true);
  };

  const handleOptimizerComplete = async (processedUri: string) => {
    if (!store || !pendingAssetType) return;
    setOptimizerVisible(false);

    try {
      const prepared = await prepareImageForUpload(processedUri);
      const filePath = `${store.id}-${pendingAssetType === "logos" ? "logo" : "cover"}.jpg`;

      await uploadToSupabase(supabase, "store_images", filePath, prepared.uri, prepared.contentType);

      const { data } = supabase.storage.from("store_images").getPublicUrl(filePath);
      if (data?.publicUrl) {
        const field = pendingAssetType === "logos" ? { logo_url: data.publicUrl } : { cover_url: data.publicUrl };
        await updateStoreHook(field);
        Alert.alert("نجاح", "تم تحديث الصورة بنجاح");
      }
    } catch (err: any) {
      console.error("[store] upload error:", err);
      Alert.alert("خطأ", "فشل رفع الصورة: " + (err.message || "خطأ غير معروف"));
    } finally {
      setPendingAssetType(null);
    }
  };

  if (loadingList) {
    return (
      <AdminPageShell title="إدارة المتجر">
        <LoadingState message="جاري تحميل لوحة التحكم..." />
      </AdminPageShell>
    );
  }

  const activeStore = stores.find((s) => s.id === storeId) || stores[0];

  return (
    <AdminPageShell title="لوحة تحكم التاجر">
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Store Header & Selector Card */}
        <SectionCard>
          <View style={styles.headerRow}>
            <View style={{ flex: 1, alignItems: "flex-end" }}>
              <Text style={[styles.storeNameText, { color: colors.textPrimary }]}>
                {activeStore ? activeStore.name : "متجر جديد"}
              </Text>
              <Text style={[styles.storeSubText, { color: colors.textSecondary }]}>
                {merchant?.business_name || "حساب تاجر"} • {stores.length} / 5 متاجر
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowSelectorModal(true)}
              style={[styles.selectorBtn, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]}
            >
              <StoreIcon size={20} color={colors.primary} />
              <ChevronDown size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {stores.length < 5 && (
            <TouchableOpacity
              onPress={() => setShowCreateModal(true)}
              style={[styles.addStoreBtn, { backgroundColor: colors.primary + "18", borderColor: colors.primary }]}
            >
              <Plus size={16} color={colors.primary} />
              <Text style={[styles.addStoreText, { color: colors.primary }]}>إضافة متجر جديد</Text>
            </TouchableOpacity>
          )}
        </SectionCard>

        {activeStore && (
          <>
            {/* Store Information Card */}
            <SectionCard>
              <View style={styles.sectionHeaderRow}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <TouchableOpacity onPress={() => router.push(`/store-details?id=${activeStore.id}`)} style={[styles.editBtn, { backgroundColor: colors.success + "18", marginLeft: 8 }]}>
                    <Eye size={16} color={colors.success} />
                    <Text style={[styles.editBtnText, { color: colors.success }]}>معاينة</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={openEditModal} style={[styles.editBtn, { backgroundColor: colors.primary + "18" }]}>
                    <Pencil size={16} color={colors.primary} />
                    <Text style={[styles.editBtnText, { color: colors.primary }]}>تعديل</Text>
                  </TouchableOpacity>
                </View>
                <SectionTitle icon={<StoreIcon size={18} color={colors.primary} />}>معلومات المتجر</SectionTitle>
              </View>

              <View style={styles.infoRow}>
                <Text style={[styles.infoVal, { color: colors.textPrimary }]}>{activeStore.name}</Text>
                <Text style={[styles.infoKey, { color: colors.textSecondary }]}>اسم المتجر</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.infoVal, { color: colors.textPrimary }]}>{activeStore.description || "—"}</Text>
                <Text style={[styles.infoKey, { color: colors.textSecondary }]}>الوصف</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.infoVal, { color: colors.textPrimary }]}>{activeStore.phone_number || merchant?.phone || "—"}</Text>
                <Text style={[styles.infoKey, { color: colors.textSecondary }]}>الهاتف</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.infoVal, { color: colors.textPrimary }]}>{activeStore.address_line1 || "—"}, {activeStore.city || "عين الصفراء"}</Text>
                <Text style={[styles.infoKey, { color: colors.textSecondary }]}>العنوان</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.infoVal, { color: colors.textPrimary }]}>{activeStore.category || "عام"}</Text>
                <Text style={[styles.infoKey, { color: colors.textSecondary }]}>التصنيف</Text>
              </View>
            </SectionCard>

            {/* Opening Hours Card */}
            <SectionCard>
              <SectionTitle icon={<Clock3 size={18} color={colors.primary} />}>أوقات العمل</SectionTitle>
              <View style={styles.infoRow}>
                <Text style={[styles.infoVal, { color: colors.textPrimary }]}>
                  {(() => {
                    const hours = getStoreHours(activeStore);
                    return `${hours.opens_at} - ${hours.closes_at}`;
                  })()}
                </Text>
                <Text style={[styles.infoKey, { color: colors.textSecondary }]}>ساعات العمل اليومية</Text>
              </View>
            </SectionCard>

            {/* Store Branding Card (Logo & Cover) */}
            <SectionCard>
              <SectionTitle icon={<Images size={18} color={colors.primary} />}>الهوية البصرية (الشعار والغلاف)</SectionTitle>
              <View style={styles.brandingRow}>
                <View style={styles.brandingItem}>
                  <Text style={[styles.labelSmall, { color: colors.textSecondary }]}>شعار المتجر (Logo)</Text>
                  <TouchableOpacity
                    onPress={() => pickImage("logos")}
                    style={[styles.imageBox, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]}
                  >
                    {activeStore.logo_url ? (
                      <Image source={{ uri: activeStore.logo_url }} style={styles.uploadedImg} />
                    ) : (
                      <ImagePlus size={24} color={colors.textSecondary} />
                    )}
                  </TouchableOpacity>
                </View>
                <View style={styles.brandingItem}>
                  <Text style={[styles.labelSmall, { color: colors.textSecondary }]}>صورة الغلاف (Cover)</Text>
                  <TouchableOpacity
                    onPress={() => pickImage("covers")}
                    style={[styles.imageBox, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]}
                  >
                    {activeStore.cover_url ? (
                      <Image source={{ uri: activeStore.cover_url }} style={styles.uploadedImg} />
                    ) : (
                      <ImagePlus size={24} color={colors.textSecondary} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </SectionCard>

            {/* Store Gallery Card */}
            <SectionCard>
              <SectionTitle icon={<Images size={18} color={colors.primary} />}>معرض الصور</SectionTitle>
              <StoreImageGallery
                storeId={storeId}
                images={galleryImages}
                isMerchantView={true}
                onImageUpload={handleImageUpload}
                onImageDelete={handleImageDelete}
              />
            </SectionCard>

            {/* Products Management Card */}
            <SectionCard>
              <SectionTitle icon={<ShoppingBag size={18} color={colors.primary} />}>إدارة المنتجات</SectionTitle>
              <StoreProductManagement
                storeId={storeId}
                isMerchantView={true}
                products={products}
                loading={productsLoading}
                onAddProduct={addProduct}
                onEditProduct={editProduct}
                onDeleteProduct={removeProduct}
                onToggleVisibility={setVisibility}
              />
            </SectionCard>
          </>
        )}

      </ScrollView>

      {/* Selector Modal */}
      <Modal visible={showSelectorModal} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.bgSurface }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowSelectorModal(false)}>
                <X size={20} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>اختر المتجر</Text>
            </View>
            <ScrollView style={{ maxHeight: 300 }}>
              {stores.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  onPress={() => {
                    setStoreId(s.id);
                    setShowSelectorModal(false);
                  }}
                  style={[
                    styles.selectorItem,
                    {
                      backgroundColor: s.id === storeId ? colors.primary + "18" : colors.bgElevated,
                      borderColor: s.id === storeId ? colors.primary : colors.borderSubtle,
                    },
                  ]}
                >
                  <Text style={[styles.selectorItemText, { color: s.id === storeId ? colors.primary : colors.textPrimary }]}>
                    {s.name} ({s.category})
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Create Store Modal */}
      <Modal visible={showCreateModal} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.bgSurface }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <X size={20} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>إضافة متجر جديد</Text>
            </View>
            <KeyboardAwareView style={{ flex: 1 }}>
              <ScrollView
                contentContainerStyle={{ paddingBottom: 24 }}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
              >
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>اسم المتجر *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.bgElevated, color: colors.textPrimary, borderColor: colors.borderSubtle }]}
                  placeholder="أدخل اسم المتجر"
                  placeholderTextColor={colors.textDisabled}
                  value={createForm.name}
                  onChangeText={(t) => setCreateForm({ ...createForm, name: t })}
                  textAlign="right"
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>الحي (عين الصفراء)</Text>
                <SimpleSelect
                  value={createForm.state_province || ""}
                  onChange={(val) => {
                    const zone = allZones.find(z => z.name === val);
                    setCreateForm({ ...createForm, state_province: val, zone_id: zone?.id });
                  }}
                  options={AIN_SEFRA_ZONES.map((z) => ({ value: z, label: z }))}
                  placeholder="اختر الحي"
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>العنوان بالتفصيل *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.bgElevated, color: colors.textPrimary, borderColor: colors.borderSubtle }]}
                  placeholder="أدخل العنوان"
                  placeholderTextColor={colors.textDisabled}
                  value={createForm.address_line1}
                  onChangeText={(t) => setCreateForm({ ...createForm, address_line1: t })}
                  textAlign="right"
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>الفئة الرئيسية</Text>
                <SimpleSelect
                  value={createForm.category_id || ""}
                  onChange={(id) => handleCategoryChange(id, true)}
                  options={categories.map((c) => ({ value: c.id, label: c.name_ar }))}
                  placeholder="اختر الفئة"
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>الوصف</Text>
                <TextInput
                  style={[styles.inputMulti, { backgroundColor: colors.bgElevated, color: colors.textPrimary, borderColor: colors.borderSubtle }]}
                  placeholder="وصف مختصر للمتجر"
                  placeholderTextColor={colors.textDisabled}
                  value={createForm.description}
                  onChangeText={(t) => setCreateForm({ ...createForm, description: t })}
                  textAlign="right"
                  multiline
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>وقت الفتح *</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.bgElevated, color: colors.textPrimary, borderColor: colors.borderSubtle }]}
                    value={createForm.opens_at}
                    onChangeText={(t) => setCreateForm({ ...createForm, opens_at: t })}
                    placeholder="HH:MM"
                    placeholderTextColor={colors.textDisabled}
                    textAlign="right"
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>وقت الإغلاق *</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.bgElevated, color: colors.textPrimary, borderColor: colors.borderSubtle }]}
                    value={createForm.closes_at}
                    onChangeText={(t) => setCreateForm({ ...createForm, closes_at: t })}
                    placeholder="HH:MM"
                    placeholderTextColor={colors.textDisabled}
                    textAlign="right"
                  />
                </View>
              </View>
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>يوم الإغلاق (اختياري)</Text>
                <SimpleSelect
                  value={createForm.closed_day}
                  onChange={(value) => setCreateForm({ ...createForm, closed_day: value as StoreFormValues["closed_day"] })}
                  options={CLOSED_DAY_OPTIONS}
                  placeholder="لا يوجد"
                />
              </View>

              <WorkspaceButton
                title="إنشاء المتجر"
                onPress={handleCreateStore}
                isLoading={creating}
                style={{ marginTop: 16 }}
              />
              </ScrollView>
            </KeyboardAwareView>
          </View>
        </View>
      </Modal>

      {/* Edit Store Modal */}
      <Modal visible={showEditModal} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.bgSurface }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <X size={20} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>تعديل بيانات المتجر</Text>
            </View>
            <KeyboardAwareView style={{ flex: 1 }}>
              <ScrollView
                contentContainerStyle={{ paddingBottom: 24 }}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
              >
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>اسم المتجر *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.bgElevated, color: colors.textPrimary, borderColor: colors.borderSubtle }]}
                  value={editForm.name}
                  onChangeText={(t) => setEditForm({ ...editForm, name: t })}
                  textAlign="right"
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>الوصف</Text>
                <TextInput
                  style={[styles.inputMulti, { backgroundColor: colors.bgElevated, color: colors.textPrimary, borderColor: colors.borderSubtle }]}
                  value={editForm.description}
                  onChangeText={(t) => setEditForm({ ...editForm, description: t })}
                  textAlign="right"
                  multiline
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>الهاتف</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.bgElevated, color: colors.textPrimary, borderColor: colors.borderSubtle }]}
                  value={editForm.phone_number}
                  onChangeText={(t) => setEditForm({ ...editForm, phone_number: t })}
                  textAlign="right"
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>الحي (عين الصفراء)</Text>
                <SimpleSelect
                  value={editForm.state_province || ""}
                  onChange={(val) => {
                    const zone = allZones.find(z => z.name === val);
                    setEditForm({ ...editForm, state_province: val, zone_id: zone?.id });
                  }}
                  options={AIN_SEFRA_ZONES.map((z) => ({ value: z, label: z }))}
                  placeholder="اختر الحي"
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>العنوان بالتفصيل</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.bgElevated, color: colors.textPrimary, borderColor: colors.borderSubtle }]}
                  value={editForm.address_line1}
                  onChangeText={(t) => setEditForm({ ...editForm, address_line1: t })}
                  textAlign="right"
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>الفئة الرئيسية</Text>
                <SimpleSelect
                  value={editForm.category_id || ""}
                  onChange={(id) => handleCategoryChange(id, false)}
                  options={categories.map((c) => ({ value: c.id, label: c.name_ar }))}
                  placeholder="اختر الفئة"
                />
              </View>
              {editForm.category_id && (
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>الفئات الفرعية (متعدد)</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {subcategories.map(sub => {
                      const isSelected = editForm.subcategory_ids?.includes(sub.id);
                      return (
                        <TouchableOpacity
                          key={sub.id}
                          onPress={() => {
                            const current = editForm.subcategory_ids || [];
                            const next = isSelected ? current.filter(id => id !== sub.id) : [...current, sub.id];
                            setEditForm({ ...editForm, subcategory_ids: next, subcategory_id: next[0] });
                          }}
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 16,
                            backgroundColor: isSelected ? colors.primary : colors.bgElevated,
                            margin: 4,
                            borderWidth: 1,
                            borderColor: isSelected ? colors.primary : colors.borderSubtle
                          }}
                        >
                          <Text style={{ color: isSelected ? colors.textOnBrand : colors.textPrimary, fontSize: 12 }}>
                            {sub.name_ar}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
              <View style={styles.row}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>وقت الفتح *</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.bgElevated, color: colors.textPrimary, borderColor: colors.borderSubtle }]}
                    value={editForm.opens_at}
                    onChangeText={(t) => setEditForm({ ...editForm, opens_at: t })}
                    placeholder="HH:MM"
                    placeholderTextColor={colors.textDisabled}
                    textAlign="right"
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>وقت الإغلاق *</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.bgElevated, color: colors.textPrimary, borderColor: colors.borderSubtle }]}
                    value={editForm.closes_at}
                    onChangeText={(t) => setEditForm({ ...editForm, closes_at: t })}
                    placeholder="HH:MM"
                    placeholderTextColor={colors.textDisabled}
                    textAlign="right"
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>يوم الإغلاق (اختياري)</Text>
                <SimpleSelect
                  value={editForm.closed_day}
                  onChange={(value) => setEditForm({ ...editForm, closed_day: value as StoreFormValues["closed_day"] })}
                  options={CLOSED_DAY_OPTIONS}
                  placeholder="لا يوجد"
                />
              </View>

              <WorkspaceButton
                title="حفظ التعديلات"
                onPress={handleSaveEdit}
                isLoading={savingEdit}
                style={{ marginTop: 16 }}
              />
              </ScrollView>
            </KeyboardAwareView>
          </View>
        </View>
      </Modal>

      {/* Image Optimizer Modal */}
      <ImageOptimizerModal
        visible={optimizerVisible}
        imageUri={pendingImageUri}
        imageType={optimizerType}
        onClose={() => setOptimizerVisible(false)}
        onComplete={handleOptimizerComplete}
      />
    </AdminPageShell>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },
  storeNameText: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "right",
  },
  storeSubText: {
    fontSize: 13,
    textAlign: "right",
    marginTop: 2,
  },
  selectorBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  addStoreBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  addStoreText: {
    fontWeight: "700",
    fontSize: 14,
  },
  sectionHeaderRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  editBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
  infoRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  infoKey: {
    fontSize: 13,
  },
  infoVal: {
    fontSize: 14,
    fontWeight: "600",
  },
  statusBadge: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  brandingRow: {
    flexDirection: "row-reverse",
    gap: 12,
    marginTop: 8,
  },
  brandingItem: {
    flex: 1,
  },
  labelSmall: {
    fontSize: 12,
    marginBottom: 6,
    textAlign: "right",
  },
  imageBox: {
    height: 90,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  uploadedImg: {
    width: "100%",
    height: "100%",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  selectorItem: {
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  selectorItemText: {
    textAlign: "right",
    fontWeight: "600",
    fontSize: 15,
  },
  formGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    marginBottom: 6,
    textAlign: "right",
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    textAlign: "right",
  },
  inputMulti: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    textAlign: "right",
    height: 80,
    textAlignVertical: "top",
  },
  row: {
    flexDirection: "row-reverse",
    gap: 10,
  },
});
