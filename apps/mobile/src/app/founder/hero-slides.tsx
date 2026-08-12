import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
} from "react-native";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { Image as ImageIcon, Plus, Trash2, Edit3, ArrowRight, Check, X, Eye } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";

import { useAppTheme } from "@/contexts/ThemeContext";
import { AdminPageShell } from "@/components/admin";
import {
  getFounderHeroSlides,
  createHeroSlide,
  updateHeroSlide,
  deleteHeroSlide,
  uploadHeroSlideImage,
  getHeroSliderSettings,
  updateHeroSliderSettings,
  type HeroSlide,
} from "@/services/heroSlider.service";

export default function FounderHeroSlidesScreen() {
  const { colors, tokens } = useAppTheme();
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formTitle, setFormTitle] = useState("");
  const [formSubtitle, setFormSubtitle] = useState("");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formCtaLabel, setFormCtaLabel] = useState("تسوق الآن");
  const [formContentType, setFormContentType] = useState<HeroSlide["content_type"]>("custom");
  const [formTargetId, setFormTargetId] = useState("");
  const [formDisplayOrder, setFormDisplayOrder] = useState("0");
  const [formPriority, setFormPriority] = useState("0");
  const [formIsActive, setFormIsActive] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);

  // Rotation settings state
  const [autoRotate, setAutoRotate] = useState(true);
  const [rotationInterval, setRotationInterval] = useState(3);

  // Store and product selectors for structured hero destinations
  const [allStoresList, setAllStoresList] = useState<any[]>([]);
  const [storeProductsList, setStoreProductsList] = useState<any[]>([]);
  const [selectedProductStoreId, setSelectedProductStoreId] = useState("");

  useEffect(() => {
    supabase.from("stores").select("id, name").eq("status", "active").then(({ data }) => {
      if (data) setAllStoresList(data);
    });
  }, []);

  useEffect(() => {
    if (formContentType === 'product') {
      let query = supabase.from("products").select("id, name, store_id").eq("status", "active");
      if (selectedProductStoreId) {
        query = query.eq("store_id", selectedProductStoreId);
      }
      query.then(({ data }) => {
        if (data) setStoreProductsList(data);
      });
    }
  }, [formContentType, selectedProductStoreId]);

  const loadSlides = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    const [data, settings] = await Promise.all([
      getFounderHeroSlides(),
      getHeroSliderSettings(),
    ]);
    setSlides(data);
    setAutoRotate(settings.autoRotate);
    setRotationInterval(settings.intervalSeconds);
    setLoading(false);
    setRefreshing(false);
  };

  const handleSaveSettings = async (newAutoRotate: boolean, newInterval: number) => {
    setAutoRotate(newAutoRotate);
    setRotationInterval(newInterval);
    const res = await updateHeroSliderSettings(newAutoRotate, newInterval);
    if (!res.success) {
      Alert.alert("خطأ", res.error || "تعذّر حفظ إعدادات التدوير");
    }
  };

  useEffect(() => {
    loadSlides();
  }, []);

  const openCreateModal = () => {
    setEditingId(null);
    setFormTitle("");
    setFormSubtitle("");
    setFormImageUrl("");
    setFormCtaLabel("تسوق الآن");
    setFormContentType("custom");
    setFormTargetId("");
    setFormDisplayOrder(String(slides.length + 1));
    setFormPriority("0");
    setFormIsActive(true);
    setModalVisible(true);
  };

  const openEditModal = (slide: HeroSlide) => {
    setEditingId(slide.id);
    setFormTitle(slide.title);
    setFormSubtitle(slide.subtitle || "");
    setFormImageUrl(slide.image_url);
    setFormCtaLabel(slide.cta_label || "تسوق الآن");
    setFormContentType(slide.content_type);
    setFormTargetId(slide.target_id || "");
    setFormDisplayOrder(String(slide.display_order));
    setFormPriority(String(slide.priority));
    setFormIsActive(slide.is_active);
    setModalVisible(true);
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("إذن مطلوب", "يجب السماح بالوصول إلى المعرض لاختيار صورة الشريحة.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.85,
    });
    if (result.canceled) return;

    setUploadingImage(true);
    const res = await uploadHeroSlideImage(result.assets[0].uri);
    setUploadingImage(false);

    if (res.success && res.url) {
      setFormImageUrl(res.url);
    } else {
      Alert.alert("خطأ", res.error || "فشل رفع الصورة");
    }
  };

  const handleSave = async () => {
    if (!formTitle.trim()) {
      Alert.alert("خطأ", "عنوان الشريحة مطلوب");
      return;
    }

    setSaving(true);
    const payload = {
      title: formTitle.trim(),
      subtitle: formSubtitle.trim() || null,
      image_url: formImageUrl.trim(),
      cta_label: formCtaLabel.trim() || "تسوق الآن",
      content_type: formContentType,
      target_id: formTargetId.trim() || null,
      display_order: parseInt(formDisplayOrder, 10) || 0,
      priority: parseInt(formPriority, 10) || 0,
      is_active: formIsActive,
    };

    if (editingId) {
      const res = await updateHeroSlide(editingId, payload);
      setSaving(false);
      if (res.success) {
        setModalVisible(false);
        loadSlides();
      } else {
        Alert.alert("خطأ", res.error || "تعذّر التحديث");
      }
    } else {
      const res = await createHeroSlide(payload);
      setSaving(false);
      if (res.success) {
        setModalVisible(false);
        loadSlides();
      } else {
        Alert.alert("خطأ", res.error || "تعذّر الإنشاء");
      }
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert("حذف الشريحة", "هل أنت متأكد من حذف هذه الشريحة؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "حذف",
        style: "destructive",
        onPress: async () => {
          const res = await deleteHeroSlide(id);
          if (res.success) {
            loadSlides();
          } else {
            Alert.alert("خطأ", res.error || "تعذّر الحذف");
          }
        },
      },
    ]);
  };

  const toggleActive = async (slide: HeroSlide) => {
    await updateHeroSlide(slide.id, { is_active: !slide.is_active });
    loadSlides();
  };

  return (
    <AdminPageShell
      title="إدارة شرائح العرض (Hero Slider)"
      showLogout={false}
      showProfile={false}
      scrollable={false}
    >
      <View style={[styles.container, { backgroundColor: colors.bgBase }]}>
        {/* Header Action */}
        <View style={styles.headerBar}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]}
            onPress={() => router.back()}
          >
            <ArrowRight size={20} color={colors.textPrimary} />
            <Text style={{ color: colors.textPrimary, fontFamily: tokens.typography.families.arabic, fontWeight: "600" }}>العودة</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.createBtn, { backgroundColor: colors.primary }]}
            onPress={openCreateModal}
          >
            <Plus size={20} color="#FFF" />
            <Text style={styles.createBtnText}>شريحة جديدة</Text>
          </TouchableOpacity>
        </View>

        {/* Rotation Settings Card */}
        <View style={[styles.settingsCard, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <Text style={{ color: colors.textPrimary, fontFamily: tokens.typography.families.arabic, fontWeight: "700" }}>تدوير تلقائي للشرائح</Text>
            <Switch
              value={autoRotate}
              onValueChange={(val) => handleSaveSettings(val, rotationInterval)}
              trackColor={{ false: "#767577", true: colors.primary + "88" }}
              thumbColor={autoRotate ? colors.primary : "#f4f3f4"}
            />
          </View>
          {autoRotate && (
            <>
              <Text style={{ color: colors.textSecondary, fontFamily: tokens.typography.families.arabic, fontSize: 12, marginBottom: 6 }}>سرعة التدوير (بالثواني):</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {[1, 2, 3, 4, 5, 6, 10].map((sec) => (
                  <TouchableOpacity
                    key={sec}
                    style={[
                      styles.typeChip,
                      {
                        backgroundColor: rotationInterval === sec ? colors.primary : colors.bgSurface,
                        borderColor: rotationInterval === sec ? colors.primary : colors.borderSubtle,
                        marginRight: 6,
                      },
                    ]}
                    onPress={() => handleSaveSettings(autoRotate, sec)}
                  >
                    <Text style={{ color: rotationInterval === sec ? "#FFF" : colors.textPrimary, fontSize: 12 }}>{sec} ث</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
            {slides.length === 0 ? (
              <View style={styles.centered}>
                <Text style={{ color: colors.textSecondary, fontFamily: tokens.typography.families.arabic }}>لا توجد شرائح عرض حالياً</Text>
              </View>
            ) : (
              slides.map((slide) => (
                <View
                  key={slide.id}
                  style={[
                    styles.slideCard,
                    {
                      backgroundColor: colors.bgElevated,
                      borderColor: colors.borderSubtle,
                      borderRadius: tokens.radius.md,
                    },
                  ]}
                >
                  <View style={styles.slideCardHeader}>
                    <View style={{ flex: 1, alignItems: "flex-end" }}>
                      <Text style={[styles.slideTitle, { color: colors.textPrimary, fontFamily: tokens.typography.families.arabic }]}>
                        {slide.title}
                      </Text>
                      {slide.subtitle ? (
                        <Text style={[styles.slideSubtitle, { color: colors.textSecondary, fontFamily: tokens.typography.families.arabic }]} numberOfLines={1}>
                          {slide.subtitle}
                        </Text>
                      ) : null}
                    </View>
                    <Switch
                      value={slide.is_active}
                      onValueChange={() => toggleActive(slide)}
                      trackColor={{ false: "#767577", true: colors.primary + "88" }}
                      thumbColor={slide.is_active ? colors.primary : "#f4f3f4"}
                    />
                  </View>

                  {slide.image_url ? (
                    <Image source={{ uri: slide.image_url }} style={styles.slideImagePreview} resizeMode="cover" />
                  ) : (
                    <View style={[styles.slideImagePlaceholder, { backgroundColor: colors.bgSurface }]}>
                      <ImageIcon size={28} color={colors.textDisabled} />
                      <Text style={{ color: colors.textDisabled, fontSize: 12, marginTop: 4 }}>بدون صورة</Text>
                    </View>
                  )}

                  <View style={styles.slideFooter}>
                    <View style={styles.slideMeta}>
                      <Text style={[styles.metaText, { color: colors.textSecondary }]}>النوع: {slide.content_type}</Text>
                      <Text style={[styles.metaText, { color: colors.textSecondary }]}>الترتيب: {slide.display_order}</Text>
                      <Text style={[styles.metaText, { color: colors.textSecondary }]}>الأولوية: {slide.priority}</Text>
                    </View>
                    <View style={styles.slideActions}>
                      <TouchableOpacity style={styles.actionBtn} onPress={() => openEditModal(slide)}>
                        <Edit3 size={18} color={colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(slide.id)}>
                        <Trash2 size={18} color={colors.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        )}

        {/* Modal for Create/Edit */}
        <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContainer, { backgroundColor: colors.bgSurface }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.textPrimary, fontFamily: tokens.typography.families.arabic }]}>
                  {editingId ? "تعديل شريحة العرض" : "إضافة شريحة عرض جديدة"}
                </Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <X size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
                <Text style={styles.inputLabel}>العنوان *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle, color: colors.textPrimary }]}
                  value={formTitle}
                  onChangeText={setFormTitle}
                  placeholder="عنوان الشريحة الرئيسي"
                  placeholderTextColor={colors.textDisabled}
                />

                <Text style={styles.inputLabel}>العنوان الفرعي / الوصف</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle, color: colors.textPrimary }]}
                  value={formSubtitle}
                  onChangeText={setFormSubtitle}
                  placeholder="وصف مختصر أو تفاصيل الشريحة"
                  placeholderTextColor={colors.textDisabled}
                />

                <Text style={styles.inputLabel}>صورة الشريحة</Text>
                <TouchableOpacity
                  style={[styles.imageUploadBtn, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]}
                  onPress={handlePickImage}
                  disabled={uploadingImage}
                >
                  {uploadingImage ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : formImageUrl ? (
                    <Image source={{ uri: formImageUrl }} style={styles.uploadedPreview} resizeMode="cover" />
                  ) : (
                    <>
                      <ImageIcon size={24} color={colors.primary} />
                      <Text style={{ color: colors.primary, marginTop: 4, fontFamily: tokens.typography.families.arabic }}>اختر صورة الشريحة (16:9)</Text>
                    </>
                  )}
                </TouchableOpacity>

                <Text style={styles.inputLabel}>نص زر الإجراء (CTA Label)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle, color: colors.textPrimary }]}
                  value={formCtaLabel}
                  onChangeText={setFormCtaLabel}
                  placeholder="مثال: تسوق الآن"
                  placeholderTextColor={colors.textDisabled}
                />

                <Text style={styles.inputLabel}>نوع المحتوى (Content Type)</Text>
                <View style={styles.typeRow}>
                  {(["custom", "promotion", "store", "product"] as const).map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={[
                        styles.typeChip,
                        {
                          backgroundColor: formContentType === t ? colors.primary : colors.bgElevated,
                          borderColor: formContentType === t ? colors.primary : colors.borderSubtle,
                        },
                      ]}
                      onPress={() => setFormContentType(t)}
                    >
                      <Text style={{ color: formContentType === t ? "#FFF" : colors.textPrimary, fontSize: 12 }}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {formContentType === "store" && (
                  <>
                    <Text style={styles.inputLabel}>اختر المتجر المستهدف</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                      {allStoresList.map((store) => (
                        <TouchableOpacity
                          key={store.id}
                          style={[
                            styles.typeChip,
                            {
                              backgroundColor: formTargetId === store.id ? colors.primary : colors.bgElevated,
                              borderColor: formTargetId === store.id ? colors.primary : colors.borderSubtle,
                              marginRight: 8,
                            },
                          ]}
                          onPress={() => setFormTargetId(store.id)}
                        >
                          <Text style={{ color: formTargetId === store.id ? "#FFF" : colors.textPrimary, fontSize: 12 }}>
                            {store.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </>
                )}

                {formContentType === "product" && (
                  <>
                    <Text style={styles.inputLabel}>1. اختر المتجر أولاً</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                      {allStoresList.map((store) => (
                        <TouchableOpacity
                          key={store.id}
                          style={[
                            styles.typeChip,
                            {
                              backgroundColor: selectedProductStoreId === store.id ? colors.primary : colors.bgElevated,
                              borderColor: selectedProductStoreId === store.id ? colors.primary : colors.borderSubtle,
                              marginRight: 8,
                            },
                          ]}
                          onPress={() => setSelectedProductStoreId(store.id)}
                        >
                          <Text style={{ color: selectedProductStoreId === store.id ? "#FFF" : colors.textPrimary, fontSize: 12 }}>
                            {store.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>

                    <Text style={styles.inputLabel}>2. اختر المنتج المستهدف</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                      {storeProductsList.map((prod) => (
                        <TouchableOpacity
                          key={prod.id}
                          style={[
                            styles.typeChip,
                            {
                              backgroundColor: formTargetId === prod.id ? colors.primary : colors.bgElevated,
                              borderColor: formTargetId === prod.id ? colors.primary : colors.borderSubtle,
                              marginRight: 8,
                            },
                          ]}
                          onPress={() => setFormTargetId(prod.id)}
                        >
                          <Text style={{ color: formTargetId === prod.id ? "#FFF" : colors.textPrimary, fontSize: 12 }}>
                            {prod.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </>
                )}

                {formContentType !== "store" && formContentType !== "product" && (
                  <>
                    <Text style={styles.inputLabel}>معرف الهدف (اختياري)</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle, color: colors.textPrimary }]}
                      value={formTargetId}
                      onChangeText={setFormTargetId}
                      placeholder="معرف مخصص إذا وجد"
                      placeholderTextColor={colors.textDisabled}
                    />
                  </>
                )}

                <View style={{ flexDirection: "row", gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>ترتيب العرض</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle, color: colors.textPrimary }]}
                      value={formDisplayOrder}
                      onChangeText={setFormDisplayOrder}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>الأولوية</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle, color: colors.textPrimary }]}
                      value={formPriority}
                      onChangeText={setFormPriority}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <View style={styles.switchRow}>
                  <Text style={{ color: colors.textPrimary, fontFamily: tokens.typography.families.arabic }}>الشريحة نشطة للظهور</Text>
                  <Switch
                    value={formIsActive}
                    onValueChange={setFormIsActive}
                    trackColor={{ false: "#767577", true: colors.primary + "88" }}
                    thumbColor={formIsActive ? colors.primary : "#f4f3f4"}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.saveBtnText}>حفظ الشريحة</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </AdminPageShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  headerBar: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  backBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  createBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  createBtnText: {
    color: "#FFF",
    fontWeight: "700",
    fontFamily: "System",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  settingsCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  listContent: {
    gap: 16,
    paddingBottom: 40,
  },
  slideCard: {
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  slideCardHeader: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
  },
  slideTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  slideSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  slideImagePreview: {
    width: "100%",
    height: 120,
    borderRadius: 8,
  },
  slideImagePlaceholder: {
    width: "100%",
    height: 80,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  slideFooter: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
    paddingTop: 10,
  },
  slideMeta: {
    flexDirection: "row-reverse",
    gap: 12,
  },
  metaText: {
    fontSize: 11,
  },
  slideActions: {
    flexDirection: "row-reverse",
    gap: 12,
  },
  actionBtn: {
    padding: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    height: "85%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  modalBody: {
    gap: 12,
    paddingBottom: 40,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "right",
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    textAlign: "right",
  },
  imageUploadBtn: {
    height: 120,
    borderWidth: 1,
    borderRadius: 8,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  uploadedPreview: {
    width: "100%",
    height: "100%",
  },
  typeRow: {
    flexDirection: "row-reverse",
    gap: 8,
  },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  switchRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 8,
  },
  saveBtn: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 12,
  },
  saveBtnText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 16,
  },
});
