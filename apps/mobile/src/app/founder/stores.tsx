import React, { useCallback, useEffect, useState } from "react";
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  FlatList, RefreshControl, Modal, ScrollView, ActivityIndicator, Image, Alert, Linking,
} from "react-native";
import { router } from "expo-router";
import { Plus, Filter, Search, Star, MapPin, Clock, Store, X, Check, Image as ImageIcon, Upload, Trash2, Eye, EyeOff, Video, Package } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import {
  AdminPageShell, AdminListItem, AdminStatCard,
  AdminLoadingState, AdminEmptyState, AdminErrorState,
} from "@/components/admin";
import { useAppTheme } from "@/contexts/ThemeContext";
import {
  getFounderStores, getFounderStore, updateFounderStore, setFounderStoreStatus,
  softDeleteFounderStore, uploadStoreLogo, uploadStoreCover,
  type FounderStore,
} from "@/services/founder-stores.service";
import {
  getFounderStoreGallery, addFounderGalleryImage, updateFounderGalleryImage, deleteFounderGalleryImage,
  getFounderStoreVideos, addFounderVideo, updateFounderVideo, deleteFounderVideo,
  getFounderStoreFacebookVideos, addFounderFacebookVideo,
  getFounderStoreProducts, addFounderProduct, updateFounderProduct, deleteFounderProduct,
} from "@/services/founder-store-content.service";
import { StoreGalleryImage, StoreVideo, Product } from "@/types/schema-03-core";
import { supabase } from "@/lib/supabase";

type StoreStatus = "all" | "draft" | "active" | "paused" | "suspended";
type StoreCategory = "all" | "grocery" | "restaurant" | "pharmacy" | "bakery" | "butcher" | "electronics" | "household" | "other";

  const STATUS_OPTS: Array<{ value: StoreStatus; label: string; color?: string }> = [
    { value: "all", label: "الكل" },
    { value: "draft", label: "مسودة", color: "#64748B" },
    { value: "active", label: "نشط", color: "#00C853" },
    { value: "paused", label: "متوقف", color: "#FFD600" },
    { value: "suspended", label: "موقوف", color: "#D50000" },
  ];

  const DEMO_BADGE_COLOR = "#9C27B0";
  const DEMO_BADGE_LABEL = "تجريبي";

const CATEGORY_OPTS: Array<{ value: StoreCategory; label: string }> = [
  { value: "all", label: "الكل" },
  { value: "grocery", label: "بقالة" },
  { value: "restaurant", label: "مطعم" },
  { value: "pharmacy", label: "صيدلية" },
  { value: "bakery", label: "مخبز" },
  { value: "butcher", label: "جزارة" },
  { value: "electronics", label: "إلكترونيات" },
  { value: "household", label: "منزلية" },
  { value: "other", label: "أخرى" },
];

const STATUS_COLORS: Record<string, string> = {
  draft: "#64748B", active: "#00C853", paused: "#FFD600", suspended: "#D50000",
};
const STATUS_LABELS: Record<string, string> = {
  draft: "مسودة", active: "نشط", paused: "متوقف", suspended: "موقوف",
};

export default function FounderStoresScreen() {
  const { colors, tokens } = useAppTheme();
  const [items, setItems] = useState<FounderStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StoreStatus>("all");
  const [categoryFilter, setCategoryFilter] = useState<StoreCategory>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedStore, setSelectedStore] = useState<FounderStore | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showStatusChange, setShowStatusChange] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editOpen, setEditOpen] = useState("");
  const [editClose, setEditClose] = useState("");
  const [editFeatured, setEditFeatured] = useState(false);
  const [editHome, setEditHome] = useState(false);
  const [editNotes, setEditNotes] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);

  const [logoLoading, setLogoLoading] = useState(false);
  const [coverLoading, setCoverLoading] = useState(false);

  const [contentTab, setContentTab] = useState<"gallery" | "videos" | "products">("gallery");
  const [gallery, setGallery] = useState<StoreGalleryImage[]>([]);
  const [videos, setVideos] = useState<StoreVideo[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [contentLoading, setContentLoading] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [newProductPrice, setNewProductPrice] = useState("");
  const [newVideoUrl, setNewVideoUrl] = useState("");
  const [newVideoTitle, setNewVideoTitle] = useState("");
  const [newVideoPlatform, setNewVideoPlatform] = useState("youtube");
  const [newVideoIsFacebook, setNewVideoIsFacebook] = useState(false);
  const [videoSubmitError, setVideoSubmitError] = useState<string | null>(null);
  const [uploadingGallery, setUploadingGallery] = useState(false);

  const load = useCallback(
    async (q?: string, status?: StoreStatus, refresh = false) => {
      if (refresh) setRefreshing(true); else setLoading(true);
      setError(null);
      try {
        const data = await getFounderStores(q, categoryFilter === "all" ? undefined : categoryFilter, status === "all" ? undefined : status);
        setItems(data);
      } catch {
        setError("تعذّر تحميل بيانات المتاجر");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [categoryFilter]
  );

  useEffect(() => { load(search, statusFilter); }, [load, search, statusFilter]);

  const handleSearch = () => load(search, statusFilter, false);

  const openDetail = async (store: FounderStore) => {
    setLoading(true);
    const { store: fullStore } = await getFounderStore(store.id);
    setSelectedStore(fullStore);
    setLoading(false);
    setShowDetail(true);
  };

  const loadContent = useCallback(async (storeId: string) => {
    setContentLoading(true);
    try {
      const [g, v, p] = await Promise.all([
        getFounderStoreGallery(storeId),
        getFounderStoreVideos(storeId),
        getFounderStoreProducts(storeId),
      ]);
      setGallery(g);
      setVideos(v);
      setProducts(p);
    } catch {
      // content load best-effort
    } finally {
      setContentLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedStore) {
      loadContent(selectedStore.id);
    }
  }, [selectedStore, loadContent]);

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedStore) return;
    setStatusLoading(true);
    await setFounderStoreStatus(selectedStore.id, newStatus);
    setStatusLoading(false);
    setShowStatusChange(false);
    load(search, statusFilter, true);
    if (selectedStore) {
      const { store: updated } = await getFounderStore(selectedStore.id);
      setSelectedStore(updated);
    }
  };

  const handleDelete = async () => {
    if (!selectedStore) return;
    setActionLoading(true);
    await softDeleteFounderStore(selectedStore.id);
    setActionLoading(false);
    setShowDeleteConfirm(false);
    setShowDetail(false);
    load(search, statusFilter, true);
  };

  const openEdit = () => {
    if (!selectedStore) return;
    setEditName(selectedStore.name);
    setEditDesc(selectedStore.description ?? "");
    setEditPhone(selectedStore.phone_number ?? "");
    setEditAddress(selectedStore.address_line1 ?? "");
    setEditCity(selectedStore.city ?? "");
    setEditOpen(selectedStore.opens_at);
    setEditClose(selectedStore.closes_at);
    setEditFeatured(selectedStore.is_featured);
    setEditHome(selectedStore.show_on_home);
    setEditNotes("");
    setSaveError(null);
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedStore) return;
    setActionLoading(true);
    setSaveError(null);
    const { error: err } = await updateFounderStore(selectedStore.id, {
      name: editName.trim(),
      description: editDesc.trim() || undefined,
      phone_number: editPhone.trim() || undefined,
      address_line1: editAddress.trim() || undefined,
      city: editCity.trim() || undefined,
      opens_at: editOpen,
      closes_at: editClose,
      is_featured: editFeatured,
      show_on_home: editHome,
    });
    setActionLoading(false);
    if (err) setSaveError(err);
    else {
      setShowEditModal(false);
      load(search, statusFilter, true);
      const { store: updated } = await getFounderStore(selectedStore.id);
      setSelectedStore(updated);
    }
  };

  const handleLogoUpload = async () => {
    if (!selectedStore) return;
    setLogoLoading(true);
    const { url, error: err } = await uploadStoreLogo(selectedStore.id, "");
    if (url) {
      await updateFounderStore(selectedStore.id, { logo_url: url });
      const { store: updated } = await getFounderStore(selectedStore.id);
      setSelectedStore(updated);
    } else if (err) {
      Alert.alert("خطأ", err);
    }
    setLogoLoading(false);
  };

  const handleCoverUpload = async () => {
    if (!selectedStore) return;
    setCoverLoading(true);
    const { url, error: err } = await uploadStoreCover(selectedStore.id, "");
    if (url) {
      await updateFounderStore(selectedStore.id, { cover_url: url });
      const { store: updated } = await getFounderStore(selectedStore.id);
      setSelectedStore(updated);
    } else if (err) {
      Alert.alert("خطأ", err);
    }
    setCoverLoading(false);
  };

  const toggleFeatured = async () => {
    if (!selectedStore) return;
    await updateFounderStore(selectedStore.id, { is_featured: !selectedStore.is_featured });
    const { store: updated } = await getFounderStore(selectedStore.id);
    setSelectedStore(updated);
    load(search, statusFilter, true);
  };

  const toggleHome = async () => {
    if (!selectedStore) return;
    await updateFounderStore(selectedStore.id, { show_on_home: !selectedStore.show_on_home });
    const { store: updated } = await getFounderStore(selectedStore.id);
    setSelectedStore(updated);
    load(search, statusFilter, true);
  };

  const handleGalleryUpload = async () => {
    if (!selectedStore) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("خطأ", "يجب منح صلاحية الوصول للصور");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (result.canceled) return;
    setUploadingGallery(true);
    const asset = result.assets[0];
    try {
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const fileExt = asset.uri.split(".").pop() || "jpg";
      const fileName = `${selectedStore.id}-${Date.now()}.${fileExt}`;
      const filePath = `store_gallery/${fileName}`;
      const { error: uploadError } = await supabase.storage.from("store_images").upload(filePath, blob, { contentType: blob.type });
      if (uploadError) throw uploadError;
      const { data: publicUrlData } = supabase.storage.from("store_images").getPublicUrl(filePath);
      const { image, error: err } = await addFounderGalleryImage(selectedStore.id, publicUrlData.publicUrl);
      if (image) setGallery((g) => [...g, image]);
      else if (err) Alert.alert("خطأ", err);
    } catch (e: any) {
      Alert.alert("خطأ", e.message);
    } finally {
      setUploadingGallery(false);
    }
  };

  const handleDeleteGallery = async (id: string) => {
    const { error: err } = await deleteFounderGalleryImage(id);
    if (err) Alert.alert("خطأ", err);
    else setGallery((g) => g.filter((img) => img.id !== id));
  };

  const handleToggleGalleryVisibility = async (id: string, current: boolean) => {
    const { image, error: err } = await updateFounderGalleryImage(id, { is_visible: !current });
    if (image) setGallery((g) => g.map((img) => img.id === id ? image : img));
    else if (err) Alert.alert("خطأ", err);
  };

  const handleAddVideo = async () => {
    if (!selectedStore || !newVideoUrl.trim()) return;
    setVideoSubmitError(null);

    const url = newVideoUrl.trim();
    const isFacebook = url.includes("facebook.com") || url.includes("fb.watch");

    if (isFacebook) {
      // Use Facebook oEmbed validation flow
      const { video, error: err } = await addFounderFacebookVideo(
        selectedStore.id,
        url,
        newVideoTitle.trim() || null
      );
      if (video) {
        setVideos((v) => [...v, video]);
        setNewVideoUrl("");
        setNewVideoTitle("");
      } else if (err) {
        setVideoSubmitError(err);
        Alert.alert("خطأ", err);
      }
    } else {
      // Use legacy platform detection flow
      const { video, error: err } = await addFounderVideo(selectedStore.id, url, newVideoTitle.trim() || null, newVideoPlatform);
      if (video) {
        setVideos((v) => [...v, video]);
        setNewVideoUrl("");
        setNewVideoTitle("");
      } else if (err) {
        Alert.alert("خطأ", err);
      }
    }
  };

  const handleDeleteVideo = async (id: string) => {
    const { error: err } = await deleteFounderVideo(id);
    if (err) Alert.alert("خطأ", err);
    else setVideos((v) => v.filter((vid) => vid.id !== id));
  };

  const handleAddProduct = async () => {
    if (!selectedStore || !newProductName.trim()) return;
    const priceMinor = newProductPrice.trim() ? Math.round(parseFloat(newProductPrice) * 100) : 0;
    const { product, error: err } = await addFounderProduct(selectedStore.id, {
      name: newProductName.trim(),
      price_minor: priceMinor,
      is_demo: true,
    });
    if (product) {
      setProducts((p) => [...p, product as Product]);
      setNewProductName("");
      setNewProductPrice("");
    } else if (err) {
      Alert.alert("خطأ", err);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    const { error: err } = await deleteFounderProduct(id);
    if (err) Alert.alert("خطأ", err);
    else setProducts((p) => p.filter((prod) => prod.id !== id));
  };

  const handleToggleProductVisibility = async (id: string, currentStatus: string) => {
    const next = currentStatus === "active" ? "archived" : "active";
    const { product, error: err } = await updateFounderProduct(id, { status: next });
    if (product) setProducts((p) => p.map((prod) => prod.id === id ? product as Product : prod));
    else if (err) Alert.alert("خطأ", err);
  };

  if (loading && !refreshing && !showDetail) {
    return (
      <AdminPageShell showLogout title="المتاجر" showBack>
        <AdminLoadingState message="جاري تحميل المتاجر..." />
      </AdminPageShell>
    );
  }

  if (error && !items.length) {
    return (
      <AdminPageShell showLogout title="المتاجر" showBack>
        <AdminErrorState message={error} onRetry={() => load(search, statusFilter)} />
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell showLogout title="المتاجر" showBack scrollable={false}>
      <View style={{ flex: 1 }}>
        {/* Search + filter bar */}
        <View style={[styles.topBar, { paddingHorizontal: tokens.spacing.lg, paddingTop: tokens.spacing.lg }]}>
          <View style={[styles.searchWrap, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]}>
            <TextInput
              value={search}
              onChangeText={setSearch}
              onSubmitEditing={handleSearch}
              placeholder="بحث باسم المتجر..."
              placeholderTextColor={colors.textDisabled}
              textAlign="right"
              returnKeyType="search"
              style={[styles.searchInput, { color: colors.textPrimary, fontSize: tokens.typography.sizes.base }]}
            />
            <TouchableOpacity onPress={handleSearch}>
              <Search size={18} color={colors.textDisabled} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => setShowFilters(true)} style={[styles.iconBtn, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]}>
            <Filter size={18} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push("/founder/add-store" as never)} style={[styles.iconBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]}>
            <Plus size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Stats row */}
        <View style={{ flexDirection: "row-reverse", gap: tokens.spacing.sm, paddingHorizontal: tokens.spacing.lg, marginTop: tokens.spacing.md }}>
          <AdminStatCard label="نشطة" value={items.filter(i => i.status === "active").length} accent="#00C853" style={{ flex: 1 }} />
          <AdminStatCard label="معلقة" value={items.filter(i => i.status === "pending_review").length} accent="#FFD600" style={{ flex: 1 }} />
          <AdminStatCard label="مميزة" value={items.filter(i => i.is_featured).length} accent={colors.primary} style={{ flex: 1 }} />
        </View>

        {/* List */}
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ paddingHorizontal: tokens.spacing.lg, paddingTop: tokens.spacing.md, paddingBottom: 80 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(search, statusFilter, true)} tintColor={colors.primary} />}
          ListEmptyComponent={<AdminEmptyState message="لا يوجد متاجر" />}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => openDetail(item)}>
              <View style={[styles.listItem, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle, borderRadius: tokens.radius.md, padding: tokens.spacing.md, marginBottom: tokens.spacing.sm, flexDirection: "row-reverse", alignItems: "center", gap: 12 }]}>
                <View style={{ flex: 1, alignItems: "flex-end" }}>
                  <Text style={{ color: colors.textPrimary, fontSize: tokens.typography.sizes.base, fontWeight: "600", textAlign: "right" }}>{item.name}</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: tokens.typography.sizes.xs, textAlign: "right" }}>
                    {item.is_demo ? "متجر تجريبي" : (item.merchant?.business_name ?? "—")} · {item.category} · {STATUS_LABELS[item.status] ?? item.status}
                  </Text>
                  {item.is_featured && <Text style={{ color: colors.warning, fontSize: 11, textAlign: "right" }}>⭐ مميز</Text>}
                  {item.is_demo && (
                    <Text style={{ color: DEMO_BADGE_COLOR, fontSize: 11, textAlign: "right", fontWeight: "700" }}>
                      🔒 {DEMO_BADGE_LABEL}
                    </Text>
                  )}
                </View>
                <View style={[styles.badge, { backgroundColor: (STATUS_COLORS[item.status] ?? colors.primary) + "18", borderColor: (STATUS_COLORS[item.status] ?? colors.primary) + "44" }]}>
                  <Text style={{ color: STATUS_COLORS[item.status] ?? colors.primary, fontSize: 11, fontWeight: "700" }}>
                    {STATUS_LABELS[item.status] ?? item.status}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Filters modal */}
      <Modal visible={showFilters} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: colors.bgSurface }]}>
            <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>تصفية المتاجر</Text>
            <Text style={{ color: colors.textSecondary, textAlign: "right", marginBottom: 8, fontSize: 13 }}>الحالة</Text>
            {STATUS_OPTS.map((opt) => (
              <TouchableOpacity key={opt.value} onPress={() => { setStatusFilter(opt.value); setShowFilters(false); }} style={[styles.filterOpt, { borderColor: statusFilter === opt.value ? (opt.color ?? colors.primary) : colors.borderSubtle, backgroundColor: statusFilter === opt.value ? (opt.color ?? colors.primary) + "18" : "transparent" }]}>
                <Text style={{ color: statusFilter === opt.value ? (opt.color ?? colors.primary) : colors.textPrimary, textAlign: "right", fontWeight: "600" }}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
            <Text style={{ color: colors.textSecondary, textAlign: "right", marginBottom: 8, fontSize: 13, marginTop: 16 }}>التصنيف</Text>
            {CATEGORY_OPTS.map((opt) => (
              <TouchableOpacity key={opt.value} onPress={() => { setCategoryFilter(opt.value); setShowFilters(false); }} style={[styles.filterOpt, { borderColor: categoryFilter === opt.value ? colors.primary : colors.borderSubtle, backgroundColor: categoryFilter === opt.value ? colors.primary + "18" : "transparent" }]}>
                <Text style={{ color: categoryFilter === opt.value ? colors.primary : colors.textPrimary, textAlign: "right", fontWeight: "600" }}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setShowFilters(false)} style={{ marginTop: 12, alignItems: "center" }}><Text style={{ color: colors.textSecondary }}>إغلاق</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Store detail modal */}
      <Modal visible={showDetail} transparent animationType="slide">
        <View style={styles.overlay}>
          <ScrollView style={[styles.detailScroll, { backgroundColor: colors.bgSurface }]}>
            {selectedStore && (
              <>
                <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: "700", textAlign: "right", flex: 1 }}>{selectedStore.name}</Text>
                  <TouchableOpacity onPress={() => setShowDetail(false)}><X size={20} color={colors.textSecondary} /></TouchableOpacity>
                </View>

                {selectedStore.is_demo && (
                  <View style={[styles.infoCard, { backgroundColor: DEMO_BADGE_COLOR + "18", borderColor: DEMO_BADGE_COLOR + "44", marginBottom: 12 }]}>
                    <Text style={{ color: DEMO_BADGE_COLOR, textAlign: "right", fontSize: 13, fontWeight: "700" }}>
                      🔒 {DEMO_BADGE_LABEL} — سيظهر للزبائن كمتجر عادي
                    </Text>
                  </View>
                )}

                {/* Logo / Cover */}
                <View style={{ flexDirection: "row-reverse", gap: 12, marginBottom: 16 }}>
                  <View style={[styles.logoBox, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]}>
                    {selectedStore.logo_url ? (
                      <Image source={{ uri: selectedStore.logo_url }} style={styles.logoImg} />
                    ) : (
                      <Store size={24} color={colors.textDisabled} />
                    )}
                    <TouchableOpacity onPress={handleLogoUpload} style={[styles.logoOverlay, { backgroundColor: colors.primary + "AA" }]}>
                      <ImageIcon size={14} color="#fff" />
                    </TouchableOpacity>
                  </View>
                  <View style={[styles.coverBox, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]}>
                    {selectedStore.cover_url ? (
                      <Image source={{ uri: selectedStore.cover_url }} style={styles.coverImg} />
                    ) : (
                      <Text style={{ color: colors.textDisabled, fontSize: 11, textAlign: "center" }}>غلاف</Text>
                    )}
                    <TouchableOpacity onPress={handleCoverUpload} style={[styles.logoOverlay, { backgroundColor: colors.primary + "AA" }]}>
                      <ImageIcon size={14} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Quick info */}
                <View style={[styles.infoCard, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]}>
                  <View style={styles.infoRow}>
                    <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: "right", flex: 1 }}>التاجر</Text>
                    <Text style={{ color: colors.textPrimary, fontSize: 14, textAlign: "right", flex: 2, fontWeight: "500" }}>{selectedStore.merchant?.business_name ?? "—"}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: "right", flex: 1 }}>التصنيف</Text>
                    <Text style={{ color: colors.textPrimary, fontSize: 14, textAlign: "right", flex: 2, fontWeight: "500" }}>{selectedStore.category}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: "right", flex: 1 }}>الحالة</Text>
                    <View style={[styles.badge, { backgroundColor: (STATUS_COLORS[selectedStore.status] ?? colors.primary) + "18", borderColor: (STATUS_COLORS[selectedStore.status] ?? colors.primary) + "44" }]}>
                      <Text style={{ color: STATUS_COLORS[selectedStore.status] ?? colors.primary, fontSize: 12, fontWeight: "700" }}>{STATUS_LABELS[selectedStore.status] ?? selectedStore.status}</Text>
                    </View>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: "right", flex: 1 }}>ساعات العمل</Text>
                    <Text style={{ color: colors.textPrimary, fontSize: 14, textAlign: "right", flex: 2, fontWeight: "500" }}>{selectedStore.opens_at} - {selectedStore.closes_at}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: "right", flex: 1 }}>الموقع</Text>
                    <Text style={{ color: colors.textPrimary, fontSize: 14, textAlign: "right", flex: 2, fontWeight: "500" }}>{selectedStore.address_line1 ?? "—"} {selectedStore.city ? `· ${selectedStore.city}` : ""}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: "right", flex: 1 }}>مميز</Text>
                    <TouchableOpacity onPress={toggleFeatured} style={[styles.toggleBtn, { backgroundColor: selectedStore.is_featured ? colors.warning + "18" : colors.bgSurface, borderColor: selectedStore.is_featured ? colors.warning : colors.borderSubtle }]}>
                      <Text style={{ color: selectedStore.is_featured ? colors.warning : colors.textSecondary, fontSize: 12, fontWeight: "700" }}>{selectedStore.is_featured ? "نعم ⭐" : "لا"}</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: "right", flex: 1 }}>في الصفحة الرئيسية</Text>
                    <TouchableOpacity onPress={toggleHome} style={[styles.toggleBtn, { backgroundColor: selectedStore.show_on_home ? colors.success + "18" : colors.bgSurface, borderColor: selectedStore.show_on_home ? colors.success : colors.borderSubtle }]}>
                      <Text style={{ color: selectedStore.show_on_home ? colors.success : colors.textSecondary, fontSize: 12, fontWeight: "700" }}>{selectedStore.show_on_home ? "نعم" : "لا"}</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Actions */}
                <View style={{ flexDirection: "row-reverse", gap: 8, marginTop: 16 }}>
                  <TouchableOpacity onPress={openEdit} style={[styles.actionBtn, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "44", flex: 1 }]}>
                    <Text style={{ color: colors.primary, fontSize: 13, fontWeight: "700", textAlign: "center" }}>تعديل</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setShowStatusChange(true)} style={[styles.actionBtn, { backgroundColor: colors.warning + "18", borderColor: colors.warning + "44", flex: 1 }]}>
                    <Text style={{ color: colors.warning, fontSize: 13, fontWeight: "700", textAlign: "center" }}>الحالة</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setShowDeleteConfirm(true)} style={[styles.actionBtn, { backgroundColor: colors.error + "18", borderColor: colors.error + "44", flex: 1 }]}>
                    <Text style={{ color: colors.error, fontSize: 13, fontWeight: "700", textAlign: "center" }}>حذف</Text>
                  </TouchableOpacity>
                </View>

                {/* Content Tabs: Gallery | Videos | Products */}
                <View style={{ marginTop: 24, borderTopWidth: 1, borderTopColor: colors.borderSubtle, paddingTop: 16 }}>
                  <View style={{ flexDirection: "row-reverse", gap: 8, marginBottom: 12 }}>
                    {[
                      { key: "gallery", label: "معرض", icon: <ImageIcon size={16} color={contentTab === "gallery" ? colors.primary : colors.textSecondary} /> },
                      { key: "videos", label: "فيديوهات", icon: <Video size={16} color={contentTab === "videos" ? colors.primary : colors.textSecondary} /> },
                      { key: "products", label: "منتجات", icon: <Package size={16} color={contentTab === "products" ? colors.primary : colors.textSecondary} /> },
                    ].map((tab) => (
                      <TouchableOpacity
                        key={tab.key}
                        onPress={() => setContentTab(tab.key as typeof contentTab)}
                        style={[styles.tabBtn, { borderColor: contentTab === tab.key ? colors.primary : colors.borderSubtle, backgroundColor: contentTab === tab.key ? colors.primary + "18" : "transparent" }]}
                      >
                        <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 6 }}>
                          {tab.icon}
                          <Text style={{ color: contentTab === tab.key ? colors.primary : colors.textSecondary, fontSize: 13, fontWeight: "600" }}>{tab.label}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {contentLoading && <ActivityIndicator color={colors.primary} style={{ padding: 16 }} />}

                  {/* Gallery Tab */}
                  {contentTab === "gallery" && !contentLoading && (
                    <View>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 8 }}>
                        {gallery.map((img) => (
                          <View key={img.id} style={{ position: "relative", width: 120, height: 120, borderRadius: 8, overflow: "hidden", borderWidth: 1, borderColor: colors.borderSubtle }}>
                            <Image source={{ uri: img.image_url }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                            <View style={{ position: "absolute", top: 4, right: 4, flexDirection: "row", gap: 4 }}>
                              <TouchableOpacity onPress={() => handleToggleGalleryVisibility(img.id, img.is_visible)} style={{ backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 10, padding: 4 }}>
                                {img.is_visible ? <EyeOff size={12} color="#fff" /> : <Eye size={12} color="#fff" />}
                              </TouchableOpacity>
                              <TouchableOpacity onPress={() => handleDeleteGallery(img.id)} style={{ backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 10, padding: 4 }}>
                                <Trash2 size={12} color="#fff" />
                              </TouchableOpacity>
                            </View>
                            {!img.is_visible && <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "rgba(0,0,0,0.5)", paddingVertical: 2, alignItems: "center" }}><Text style={{ color: "#fff", fontSize: 10 }}>مخفي</Text></View>}
                          </View>
                        ))}
                        <TouchableOpacity onPress={handleGalleryUpload} style={{ width: 120, height: 120, borderRadius: 8, borderWidth: 1, borderColor: colors.borderSubtle, backgroundColor: colors.bgElevated, alignItems: "center", justifyContent: "center" }}>
                          <Upload size={24} color={colors.textSecondary} />
                          <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4 }}>إضافة صورة</Text>
                        </TouchableOpacity>
                      </ScrollView>
                      {uploadingGallery && <ActivityIndicator color={colors.primary} style={{ padding: 8 }} />}
                      {gallery.length === 0 && !uploadingGallery && <Text style={{ color: colors.textDisabled, textAlign: "center", padding: 16, fontSize: 13 }}>لا توجد صور في المعرض</Text>}
                    </View>
                  )}

                      {/* Videos Tab */}
                      {contentTab === "videos" && !contentLoading && (
                        <View style={{ gap: 8 }}>
                          {videos.map((vid) => (
                            <View key={vid.id} style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: colors.borderSubtle, backgroundColor: colors.bgElevated }}>
                              <View style={{ flex: 1 }}>
                                <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: "600", textAlign: "right" }}>{vid.title || vid.url}</Text>
                                <Text style={{ color: colors.textSecondary, fontSize: 11, textAlign: "right" }}>{vid.platform}</Text>
                                {vid.provider === "facebook" && (
                                  <Text style={{ color: "#1877F2", fontSize: 10, textAlign: "right", fontWeight: "600" }}>فيسبوك · قابل للعرض</Text>
                                )}
                              </View>
                              {selectedStore && (
                                <TouchableOpacity onPress={() => {
                                  // Founder debug-only: open original link
                                  Linking.openURL(vid.url).catch(() => {});
                                }} style={{ padding: 6, borderRadius: 6, backgroundColor: colors.textSecondary + "18" }}>
                                  <Text style={{ fontSize: 10, color: colors.textSecondary }}>فتح</Text>
                                </TouchableOpacity>
                              )}
                              <TouchableOpacity onPress={() => handleDeleteVideo(vid.id)} style={{ padding: 6, borderRadius: 6, backgroundColor: colors.error + "18" }}>
                                <Trash2 size={14} color={colors.error} />
                              </TouchableOpacity>
                            </View>
                          ))}
                          <View style={{ flexDirection: "row-reverse", gap: 8, marginTop: 8 }}>
                            <TextInput value={newVideoUrl} onChangeText={setNewVideoUrl} placeholder="رابط الفيديو" placeholderTextColor={colors.textDisabled} textAlign="right" style={[styles.modalInput, { flex: 2, backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle, color: colors.textPrimary }]} />
                            <TextInput value={newVideoTitle} onChangeText={setNewVideoTitle} placeholder="العنوان (اختياري)" placeholderTextColor={colors.textDisabled} textAlign="right" style={[styles.modalInput, { flex: 1, backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle, color: colors.textPrimary }]} />
                            <TouchableOpacity onPress={handleAddVideo} style={[styles.saveBtn, { backgroundColor: colors.primary, paddingHorizontal: 12 }]}>
                              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>إضافة</Text>
                            </TouchableOpacity>
                          </View>
                          {videoSubmitError && (
                            <Text style={{ color: colors.error, fontSize: 12, textAlign: "right" }}>{videoSubmitError}</Text>
                          )}
                          {videos.length === 0 && <Text style={{ color: colors.textDisabled, textAlign: "center", padding: 16, fontSize: 13 }}>لا توجد فيديوهات</Text>}
                        </View>
                      )}

                  {/* Products Tab */}
                  {contentTab === "products" && !contentLoading && (
                    <View style={{ gap: 8 }}>
                      {products.map((prod) => (
                        <View key={prod.id} style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: colors.borderSubtle, backgroundColor: colors.bgElevated }}>
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: "600", textAlign: "right" }}>{prod.name}</Text>
                            <Text style={{ color: colors.textSecondary, fontSize: 11, textAlign: "right" }}>{(prod.price_minor / 100).toFixed(2)} د.ج · {prod.status === "active" ? "ظاهر" : "مخفي"}</Text>
                          </View>
                          <TouchableOpacity onPress={() => handleToggleProductVisibility(prod.id, prod.status)} style={{ padding: 6, borderRadius: 6, backgroundColor: colors.success + "18" }}>
                            {prod.status === "active" ? <EyeOff size={14} color={colors.success} /> : <Eye size={14} color={colors.success} />}
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => handleDeleteProduct(prod.id)} style={{ padding: 6, borderRadius: 6, backgroundColor: colors.error + "18" }}>
                            <Trash2 size={14} color={colors.error} />
                          </TouchableOpacity>
                        </View>
                      ))}
                      <View style={{ flexDirection: "row-reverse", gap: 8, marginTop: 8 }}>
                        <TextInput value={newProductName} onChangeText={setNewProductName} placeholder="اسم المنتج" placeholderTextColor={colors.textDisabled} textAlign="right" style={[styles.modalInput, { flex: 2, backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle, color: colors.textPrimary }]} />
                        <TextInput value={newProductPrice} onChangeText={setNewProductPrice} placeholder="السعر (د.ج)" placeholderTextColor={colors.textDisabled} keyboardType="decimal-pad" textAlign="right" style={[styles.modalInput, { flex: 1, backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle, color: colors.textPrimary }]} />
                        <TouchableOpacity onPress={handleAddProduct} style={[styles.saveBtn, { backgroundColor: colors.primary, paddingHorizontal: 12 }]}>
                          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>إضافة</Text>
                        </TouchableOpacity>
                      </View>
                      {products.length === 0 && <Text style={{ color: colors.textDisabled, textAlign: "center", padding: 16, fontSize: 13 }}>لا توجد منتجات</Text>}
                    </View>
                  )}
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Edit modal */}
      <Modal visible={showEditModal} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: colors.bgSurface }]}>
            <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>تعديل المتجر</Text>
            <ScrollView>
              {[
                { label: "اسم المتجر", value: editName, setter: setEditName },
                { label: "رقم الهاتف", value: editPhone, setter: setEditPhone },
                { label: "العنوان", value: editAddress, setter: setEditAddress },
                { label: "المدينة", value: editCity, setter: setEditCity },
                { label: "الوصف", value: editDesc, setter: setEditDesc },
              ].map(({ label, value, setter }) => (
                <View key={label} style={{ marginBottom: 12 }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 12, textAlign: "right", marginBottom: 4 }}>{label}</Text>
                  <TextInput value={value} onChangeText={setter} textAlign="right" style={[styles.modalInput, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle, color: colors.textPrimary }]} />
                </View>
              ))}
              <View style={{ flexDirection: "row-reverse", gap: 12, marginBottom: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 12, textAlign: "right", marginBottom: 4 }}>يفتح</Text>
                  <TextInput value={editOpen} onChangeText={setEditOpen} textAlign="right" style={[styles.modalInput, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle, color: colors.textPrimary }]} placeholder="08:00" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 12, textAlign: "right", marginBottom: 4 }}>يغلق</Text>
                  <TextInput value={editClose} onChangeText={setEditClose} textAlign="right" style={[styles.modalInput, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle, color: colors.textPrimary }]} placeholder="22:00" />
                </View>
              </View>
              <View style={{ flexDirection: "row-reverse", gap: 12, marginBottom: 12 }}>
                <TouchableOpacity onPress={() => setEditFeatured(!editFeatured)} style={[styles.toggleBtn, { backgroundColor: editFeatured ? colors.warning + "18" : colors.bgElevated, borderColor: editFeatured ? colors.warning : colors.borderSubtle, flex: 1 }]}>
                  <Text style={{ color: editFeatured ? colors.warning : colors.textSecondary, textAlign: "center", fontWeight: "600" }}>{editFeatured ? "⭐ مميز" : "غير مميز"}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setEditHome(!editHome)} style={[styles.toggleBtn, { backgroundColor: editHome ? colors.success + "18" : colors.bgElevated, borderColor: editHome ? colors.success : colors.borderSubtle, flex: 1 }]}>
                  <Text style={{ color: editHome ? colors.success : colors.textSecondary, textAlign: "center", fontWeight: "600" }}>{editHome ? "في الرئيسية" : "ليس في الرئيسية"}</Text>
                </TouchableOpacity>
              </View>
              {saveError && <Text style={{ color: colors.error, textAlign: "right", marginTop: 8, fontSize: 13 }}>{saveError}</Text>}
              <View style={{ flexDirection: "row-reverse", gap: 10, marginTop: 16 }}>
                <TouchableOpacity onPress={handleSaveEdit} disabled={actionLoading} style={[styles.saveBtn, { backgroundColor: colors.primary, flex: 1 }]}>
                  {actionLoading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontWeight: "700", textAlign: "center" }}>حفظ</Text>}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setShowEditModal(false); setSaveError(null); }} style={[styles.saveBtn, { backgroundColor: colors.bgElevated, flex: 1, borderWidth: 1, borderColor: colors.borderSubtle }]}>
                  <Text style={{ color: colors.textSecondary, textAlign: "center" }}>إلغاء</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Status change modal */}
      <Modal visible={showStatusChange} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: colors.bgSurface }]}>
            <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>تغيير حالة المتجر</Text>
            {statusLoading ? <ActivityIndicator color={colors.primary} /> : (
              STATUS_OPTS.filter((t) => t.value !== "all" && selectedStore && t.value !== selectedStore.status).map((opt) => (
                <TouchableOpacity key={opt.value} onPress={() => handleStatusChange(opt.value)} style={[styles.filterOpt, { borderColor: (opt.color ?? colors.primary) + "44", backgroundColor: (opt.color ?? colors.primary) + "18", marginBottom: 8 }]}>
                  <Text style={{ color: opt.color ?? colors.primary, textAlign: "right", fontWeight: "700", fontSize: 15 }}>{opt.label}</Text>
                </TouchableOpacity>
              ))
            )}
            <TouchableOpacity onPress={() => setShowStatusChange(false)} style={{ marginTop: 8, alignItems: "center" }}><Text style={{ color: colors.textSecondary }}>إلغاء</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Delete confirm */}
      <Modal visible={showDeleteConfirm} transparent animationType="fade">
        <View style={[styles.overlay, { justifyContent: "center", padding: 24 }]}>
          <View style={[styles.confirmBox, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
            <Text style={{ fontSize: 40, textAlign: "center", marginBottom: 12 }}>⚠️</Text>
            <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: "700", textAlign: "center", marginBottom: 8 }}>تأكيد الحذف</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 14, textAlign: "center", lineHeight: 22 }}>سيتم تعليق المتجر. لا يمكن الوصول إليه بعد ذلك.</Text>
            <View style={{ flexDirection: "row-reverse", gap: 10, marginTop: 20 }}>
              <TouchableOpacity onPress={handleDelete} disabled={actionLoading} style={[styles.saveBtn, { backgroundColor: colors.error, flex: 1 }]}>
                {actionLoading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontWeight: "700", textAlign: "center" }}>تأكيد</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowDeleteConfirm(false)} style={[styles.saveBtn, { backgroundColor: colors.bgElevated, flex: 1, borderWidth: 1, borderColor: colors.borderSubtle }]}>
                <Text style={{ color: colors.textSecondary, textAlign: "center" }}>إلغاء</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </AdminPageShell>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: "row-reverse", gap: 8, alignItems: "center" },
  searchWrap: { flex: 1, flexDirection: "row-reverse", alignItems: "center", borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, gap: 6 },
  searchInput: { flex: 1, textAlign: "right" },
  iconBtn: { width: 38, height: 38, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  listItem: { borderWidth: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 99, borderWidth: 1 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40, maxHeight: "85%" },
  sheetTitle: { fontSize: 17, fontWeight: "700", textAlign: "right", marginBottom: 16 },
  filterOpt: { borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 6 },
  detailScroll: { maxHeight: "90%", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
  infoCard: { borderWidth: 1, borderRadius: 12, overflow: "hidden" },
  infoRow: { flexDirection: "row-reverse", padding: 12, borderBottomWidth: 1, gap: 8, alignItems: "center" },
  actionBtn: { borderWidth: 1, borderRadius: 10, padding: 12, alignItems: "center" },
  saveBtn: { borderRadius: 10, padding: 14, alignItems: "center" },
  modalInput: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 15, textAlign: "right" },
  confirmBox: { borderWidth: 1, borderRadius: 16, padding: 24 },
  toggleBtn: { borderWidth: 1, borderRadius: 8, padding: 10, alignItems: "center", minWidth: 100 },
  logoBox: { width: 72, height: 72, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative" },
  coverBox: { flex: 1, height: 72, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative" },
  logoImg: { width: "100%", height: "100%" },
  coverImg: { width: "100%", height: "100%" },
  logoOverlay: { position: "absolute", bottom: 0, left: 0, right: 0, paddingVertical: 4, alignItems: "center" },
  tabBtn: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, alignItems: "center", justifyContent: "center" },
});
