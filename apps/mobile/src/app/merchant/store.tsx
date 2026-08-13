import React, { useEffect, useState, useCallback } from "react";
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
  StyleSheet,
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
  Plus,
  ChevronLeft,
  LayoutDashboard,
  MapPin,
  User,
  Mail,
  Phone,
  Video,
  CheckCircle2,
  AlertCircle,
  Clock,
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
import { ImageOptimizerModal, SimpleSelect, Typography } from "@/components/ui";
import { ImageType } from "@/utils/imageOptimizer";
import { getActiveCategories, getActiveSubcategories } from "@/services/category.service";
import {
  SectionCard,
  SectionTitle,
  WorkspaceRow,
  WorkspaceText,
  WorkspaceButton,
  LoadingState,
} from "@/features/workspace/ui";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { TOKENS } from "@/constants/tokens";

/* ─── Types ─────────────────────────────────────────────────── */
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
};

/* ─── Helpers ───────────────────────────────────────────────── */
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

/* ─── Screen ─────────────────────────────────────────────────── */
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

  /* ── Actions ────────────────────────────────────────────────── */
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
      country: "Algeria",
      opens_at: createForm.opens_at || "09:00",
      closes_at: createForm.closes_at || "21:00",
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

  const handleToggleOpen = async (value: boolean) => {
    if (!store) return;
    setTogglingOpen(true);
    const updated = await updateStore(store.id, { is_open: value });
    if (updated) {
      await updateStoreHook({ is_open: value });
    }
    setTogglingOpen(false);
  };

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

  const handleSaveEdit = async () => {
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

  /* ── Render Parts ─────────────────────────────────────────── */
  const renderStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; color: string; icon: any }> = {
      active: { label: "نشط", color: colors.success, icon: CheckCircle2 },
      pending: { label: "قيد المراجعة", color: colors.warning, icon: Clock },
      paused: { label: "متوقف مؤقتاً", color: colors.info, icon: AlertCircle },
      suspended: { label: "موقوف من الإدارة", color: colors.error, icon: AlertCircle },
    };
    const config = statusMap[status] || { label: status, color: colors.textSecondary, icon: AlertCircle };
    const Icon = config.icon;
    
    return (
      <View style={[styles.statusBadge, { backgroundColor: config.color + "18" }]}>
        <Icon color={config.color} size={14} />
        <Text style={[styles.statusBadgeText, { color: config.color, fontFamily: tokens.typography.families.arabic }]}>
          {config.label}
        </Text>
      </View>
    );
  };

  if (resolving) {
    return (
      <AdminPageShell title="إدارة المتجر">
        <LoadingState message="جاري تحميل المتجر..." />
      </AdminPageShell>
    );
  }

  if (showCreateForm || (!storeId && !resolving)) {
    return (
      <AdminPageShell title="إنشاء متجر جديد" showBack={stores.length > 0}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <SectionCard style={{ marginTop: tokens.spacing.lg }}>
            <SectionTitle icon={<Plus color={colors.primary} size={20} />}>بيانات المتجر الجديد</SectionTitle>
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>اسم المتجر *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.bgBase, color: colors.textPrimary, borderColor: colors.borderSubtle }]}
                value={createForm.name}
                onChangeText={(t) => setCreateForm(p => ({ ...p, name: t }))}
                placeholder="أدخل اسم المتجر"
                placeholderTextColor={colors.textDisabled}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>الفئة الرئيسية</Text>
              <SimpleSelect
                value={createForm.category_id || ""}
                onChange={handleCategoryChange}
                options={categories.map(c => ({ value: c.id, label: c.name_ar }))}
                placeholder="اختر فئة"
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>العنوان *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.bgBase, color: colors.textPrimary, borderColor: colors.borderSubtle }]}
                value={createForm.address_line1}
                onChangeText={(t) => setCreateForm(p => ({ ...p, address_line1: t }))}
                placeholder="العنوان التفصيلي"
              />
            </View>
            <WorkspaceButton
              title={creating ? "جاري الإنشاء..." : "إنشاء المتجر"}
              onPress={handleCreateStore}
              isLoading={creating}
              style={{ marginTop: tokens.spacing.md }}
            />
            {stores.length > 0 && (
              <WorkspaceButton
                title="إلغاء"
                variant="ghost"
                onPress={() => setShowCreateForm(false)}
                style={{ marginTop: tokens.spacing.xs }}
              />
            )}
          </SectionCard>
        </KeyboardAvoidingView>
      </AdminPageShell>
    );
  }

  if (storeId && loading && !store) {
    return (
      <AdminPageShell title="إدارة المتجر">
        <LoadingState message="جاري تحميل بيانات المتجر..." />
      </AdminPageShell>
    );
  }

  if (!store) return null;

  return (
    <AdminPageShell title="لوحة إدارة المتجر">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: tokens.spacing["3xl"] }}>
        
        {/* 1. Header & Switcher */}
        <SectionCard style={{ marginTop: tokens.spacing.lg }}>
          <View style={styles.headerRow}>
            <View style={styles.headerInfo}>
              <WorkspaceText variant="title" style={{ textAlign: "right" }}>{store.name}</WorkspaceText>
              {renderStatusBadge(store.status)}
            </View>
            <View style={styles.headerLogo}>
              {store.logo_url ? (
                <Image source={{ uri: store.logo_url }} style={styles.logoCircle} />
              ) : (
                <View style={[styles.logoCircle, { backgroundColor: colors.bgBase, justifyContent: "center", alignItems: "center" }]}>
                  <StoreIcon color={colors.textDisabled} size={24} />
                </View>
              )}
            </View>
          </View>

          <View style={styles.switcherRow}>
            <WorkspaceText color="secondary" style={{ fontSize: 12 }}>{`متاجري (${stores.length}/5)`}</WorkspaceText>
            {stores.length < 5 && (
              <TouchableOpacity onPress={() => setShowCreateForm(true)} style={styles.addStoreBtn}>
                <Plus color={colors.primary} size={14} />
                <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "600", marginRight: 4 }}>إضافة متجر</Text>
              </TouchableOpacity>
            )}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.storeList}>
            <View style={{ flexDirection: "row-reverse", gap: 8 }}>
              {stores.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  onPress={() => setStoreId(s.id)}
                  style={[
                    styles.storeTab,
                    { 
                      borderColor: s.id === storeId ? colors.primary : colors.borderSubtle,
                      backgroundColor: s.id === storeId ? colors.primary + "10" : "transparent"
                    }
                  ]}
                >
                  <Text style={{ color: s.id === storeId ? colors.primary : colors.textPrimary, fontWeight: s.id === storeId ? "700" : "500", fontSize: 13 }}>
                    {s.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </SectionCard>

        {/* 2. Status & Quick Actions */}
        <View style={styles.quickActionsGrid}>
          <SectionCard style={styles.statusCard}>
            <View style={{ alignItems: "center" }}>
              <WorkspaceText color="secondary" style={{ fontSize: 11, marginBottom: 4 }}>حالة الفتح</WorkspaceText>
              <Switch
                value={store.is_open}
                onValueChange={handleToggleOpen}
                disabled={togglingOpen}
                trackColor={{ false: colors.borderSubtle, true: colors.success }}
                thumbColor={colors.textOnBrand}
              />
              <WorkspaceText color={store.is_open ? "success" : "error"} style={{ fontWeight: "700", fontSize: 12, marginTop: 4 }}>
                {store.is_open ? "مفتوح" : "مغلق"}
              </WorkspaceText>
            </View>
          </SectionCard>

          <SectionCard style={styles.actionsCard}>
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => router.push(`/store-details?id=${store.id}`)}>
                <View style={[styles.actionIcon, { backgroundColor: colors.info + "15" }]}><Eye color={colors.info} size={18} /></View>
                <Text style={styles.actionLabel}>معاينة</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => router.push("/merchant/orders")}>
                <View style={[styles.actionIcon, { backgroundColor: colors.success + "15" }]}><ShoppingBag color={colors.success} size={18} /></View>
                <Text style={styles.actionLabel}>الطلبات</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => router.push("/merchant/promotions")}>
                <View style={[styles.actionIcon, { backgroundColor: colors.warning + "15" }]}><Tag color={colors.warning} size={18} /></View>
                <Text style={styles.actionLabel}>العروض</Text>
              </TouchableOpacity>
            </View>
          </SectionCard>
        </View>

        {/* 3. Store Info */}
        <SectionCard>
          <View style={styles.sectionHeader}>
            <SectionTitle icon={<LayoutDashboard color={colors.primary} size={18} />}>معلومات المتجر</SectionTitle>
            <TouchableOpacity onPress={openEditModal} style={styles.editBtn}>
              <Pencil color={colors.primary} size={14} />
              <Text style={styles.editBtnText}>تعديل</Text>
            </TouchableOpacity>
          </View>
          
          <WorkspaceRow label="اسم المتجر" value={store.name} icon={<StoreIcon size={16} color={colors.textDisabled} />} />
          {merchant && <WorkspaceRow label="اسم المالك" value={merchant.owner_full_name} icon={<User size={16} color={colors.textDisabled} />} />}
          {merchant && <WorkspaceRow label="البريد الإلكتروني" value={merchant.email} icon={<Mail size={16} color={colors.textDisabled} />} />}
          <WorkspaceRow label="رقم الهاتف" value={store.phone_number || "غير محدد"} icon={<Phone size={16} color={colors.textDisabled} />} />
          <WorkspaceRow label="المدينة" value={store.city || "عين الصفراء"} icon={<MapPin size={16} color={colors.textDisabled} />} />
          <WorkspaceRow label="العنوان" value={store.address_line1 || "غير محدد"} isLast />
          
          {store.description && (
            <View style={styles.descBox}>
              <Text style={[styles.descLabel, { color: colors.textSecondary }]}>الوصف:</Text>
              <Text style={[styles.descText, { color: colors.textPrimary }]}>{store.description}</Text>
            </View>
          )}
        </SectionCard>

        {/* 4. Hours & Category */}
        <View style={styles.twoColumnRow}>
          <SectionCard style={{ flex: 1, marginRight: 0, marginLeft: tokens.spacing.sm }}>
            <SectionTitle icon={<Clock3 color={colors.primary} size={18} />}>ساعات العمل</SectionTitle>
            <WorkspaceRow label="الفتح" value={store.opens_at ? String(store.opens_at).slice(0, 5) : "--"} />
            <WorkspaceRow label="الغلق" value={store.closes_at ? String(store.closes_at).slice(0, 5) : "--"} isLast />
          </SectionCard>
          <SectionCard style={{ flex: 1, marginLeft: 0, marginRight: tokens.spacing.sm }}>
            <SectionTitle icon={<Tag color={colors.primary} size={18} />}>التصنيف</SectionTitle>
            <WorkspaceRow label="الرئيسي" value={store.category} />
            <WorkspaceRow label="الفرعي" value={store.sub_category || "--"} isLast />
          </SectionCard>
        </View>

        {/* 5. Visual Identity */}
        <SectionCard>
          <SectionTitle icon={<ImagePlus color={colors.primary} size={18} />}>الهوية البصرية</SectionTitle>
          <View style={styles.visualGrid}>
            <View style={styles.visualItem}>
              <Text style={[styles.visualLabel, { color: colors.textSecondary }]}>الشعار (Logo)</Text>
              <TouchableOpacity style={[styles.visualBox, { borderColor: colors.borderSubtle }]} onPress={() => pickAndUpload("logos")}>
                {store.logo_url ? (
                  <Image source={{ uri: store.logo_url }} style={styles.visualImg} />
                ) : (
                  <Plus color={colors.textDisabled} size={24} />
                )}
                {uploadingLogo && <ActivityIndicator style={styles.loader} color={colors.primary} />}
              </TouchableOpacity>
            </View>
            <View style={styles.visualItem}>
              <Text style={[styles.visualLabel, { color: colors.textSecondary }]}>الغلاف (Cover)</Text>
              <TouchableOpacity style={[styles.visualBox, { borderColor: colors.borderSubtle, aspectRatio: 2 }]} onPress={() => pickAndUpload("covers")}>
                {store.cover_url ? (
                  <Image source={{ uri: store.cover_url }} style={styles.visualImg} />
                ) : (
                  <Plus color={colors.textDisabled} size={24} />
                )}
                {uploadingCover && <ActivityIndicator style={styles.loader} color={colors.primary} />}
              </TouchableOpacity>
            </View>
          </View>
        </SectionCard>

        {/* 6. Gallery */}
        <SectionCard>
          <SectionTitle icon={<Images color={colors.primary} size={18} />}>معرض الصور</SectionTitle>
          <StoreImageGallery
            storeId={store.id}
            images={galleryImages}
            isMerchantView
            onImageUpload={handleImageUpload}
            onImageDelete={handleImageDelete}
          />
        </SectionCard>

        {/* 7. Products Management */}
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

      {/* ── Edit Modal ─────────────────────────────────────────── */}
      <Modal visible={editModalOpen} animationType="slide">
        <AdminPageShell title="تعديل بيانات المتجر" showBack={false}>
          <View style={{ paddingVertical: tokens.spacing.lg }}>
            <SectionCard>
              <View style={styles.formGroup}>
                <Text style={styles.label}>اسم المتجر</Text>
                <TextInput
                  style={[styles.input, { borderColor: colors.borderSubtle, color: colors.textPrimary }]}
                  value={form?.name}
                  onChangeText={(t) => setForm(p => p ? ({ ...p, name: t }) : null)}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>الوصف</Text>
                <TextInput
                  style={[styles.input, { borderColor: colors.borderSubtle, color: colors.textPrimary, height: 80 }]}
                  value={form?.description}
                  onChangeText={(t) => setForm(p => p ? ({ ...p, description: t }) : null)}
                  multiline
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>رقم الهاتف</Text>
                <TextInput
                  style={[styles.input, { borderColor: colors.borderSubtle, color: colors.textPrimary }]}
                  value={form?.phone_number}
                  onChangeText={(t) => setForm(p => p ? ({ ...p, phone_number: t }) : null)}
                  keyboardType="phone-pad"
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>الفئة</Text>
                <SimpleSelect
                  value={form?.category_id || ""}
                  onChange={handleEditCategoryChange}
                  options={categories.map(c => ({ value: c.id, label: c.name_ar }))}
                />
              </View>
              <View style={styles.twoColumnRow}>
                <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.label}>وقت الفتح</Text>
                  <TextInput
                    style={[styles.input, { borderColor: colors.borderSubtle, color: colors.textPrimary }]}
                    value={form?.opens_at}
                    onChangeText={(t) => setForm(p => p ? ({ ...p, opens_at: t }) : null)}
                    placeholder="09:00"
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.label}>وقت الغلق</Text>
                  <TextInput
                    style={[styles.input, { borderColor: colors.borderSubtle, color: colors.textPrimary }]}
                    value={form?.closes_at}
                    onChangeText={(t) => setForm(p => p ? ({ ...p, closes_at: t }) : null)}
                    placeholder="21:00"
                  />
                </View>
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>العنوان</Text>
                <TextInput
                  style={[styles.input, { borderColor: colors.borderSubtle, color: colors.textPrimary }]}
                  value={form?.address_line1}
                  onChangeText={(t) => setForm(p => p ? ({ ...p, address_line1: t }) : null)}
                />
              </View>
              
              <View style={{ flexDirection: "row-reverse", gap: 12, marginTop: 12 }}>
                <WorkspaceButton title="حفظ التغييرات" onPress={handleSaveEdit} isLoading={saving} style={{ flex: 1 }} />
                <WorkspaceButton title="إلغاء" variant="outline" onPress={() => setEditModalOpen(false)} style={{ flex: 1 }} />
              </View>
            </SectionCard>
          </View>
        </AdminPageShell>
      </Modal>

      <ImageOptimizerModal
        visible={optimizerVisible}
        imageUri={pendingImageUri || ""}
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
    marginBottom: 16,
  },
  headerInfo: {
    flex: 1,
    alignItems: "flex-end",
  },
  headerLogo: {
    marginLeft: 16,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: "#FF8A00",
  },
  statusBadge: {
    flexDirection: "row-reverse",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
    gap: 4,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  switcherRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  addStoreBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    paddingVertical: 4,
  },
  storeList: {
    marginTop: 8,
  },
  storeTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 80,
    alignItems: "center",
  },
  quickActionsGrid: {
    flexDirection: "row-reverse",
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 0,
  },
  statusCard: {
    flex: 1,
    marginHorizontal: 0,
    padding: 12,
  },
  actionsCard: {
    flex: 2.5,
    marginHorizontal: 0,
    padding: 12,
  },
  actionButtons: {
    flexDirection: "row-reverse",
    justifyContent: "space-around",
    alignItems: "center",
    height: "100%",
  },
  actionBtn: {
    alignItems: "center",
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  actionLabel: {
    fontSize: 10,
    fontWeight: "600",
    fontFamily: TOKENS.typography.families.arabic,
  },
  sectionHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  editBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: "#FF8A0015",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4,
  },
  editBtnText: {
    color: "#FF8A00",
    fontSize: 12,
    fontWeight: "700",
    fontFamily: TOKENS.typography.families.arabic,
  },
  descBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "#00000005",
    borderRadius: 8,
  },
  descLabel: {
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 4,
    fontFamily: TOKENS.typography.families.arabic,
    textAlign: "right",
  },
  descText: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: TOKENS.typography.families.arabic,
    textAlign: "right",
  },
  twoColumnRow: {
    flexDirection: "row-reverse",
    marginHorizontal: 8,
  },
  visualGrid: {
    flexDirection: "row-reverse",
    gap: 12,
  },
  visualItem: {
    flex: 1,
  },
  visualLabel: {
    fontSize: 11,
    marginBottom: 6,
    textAlign: "right",
    fontFamily: TOKENS.typography.families.arabic,
  },
  visualBox: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    backgroundColor: "#00000003",
  },
  visualImg: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  loader: {
    position: "absolute",
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "right",
    fontFamily: TOKENS.typography.families.arabic,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    textAlign: "right",
    fontFamily: TOKENS.typography.families.arabic,
  },
});
