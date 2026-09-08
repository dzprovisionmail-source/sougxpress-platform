import { useState, useEffect, useRef } from "react";
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
import { Dimensions } from "react-native";
import { supabase } from "@/lib/supabase";
import { Image as ImageIcon, Plus, Trash2, Edit3, ArrowRight, Check, X, Eye, ChevronUp, ChevronDown } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";

import { useAppTheme } from "@/contexts/ThemeContext";
import { AdminPageShell } from "@/components/admin";
import {
  getFounderHeroSlides,
  createHeroSlide,
  updateHeroSlide,
  deleteHeroSlide,
  reorderHeroSlides,
  uploadHeroSlideImage,
  getHeroSliderSettings,
  updateHeroSliderSettings,
  getSmartHeroSliderSettings,
  updateSmartHeroSliderSettings,
  DEFAULT_SMART_HERO_SETTINGS,
  type SmartHeroSliderSettings,
  type HeroSlide,
} from "@/services/heroSlider.service";
import { getSmartHeroSlides, type SmartHeroSlide } from "@/services/smartHeroSlider.service";
import { buildFinalHeroSlides, MAX_HERO_SLIDES } from "@/services/heroSlider.runtime";
import { getStoredHeroRotationCycle, withCycleMetadata, type HeroRotationCycle } from "@/services/heroRotationCycle";

const FounderCarousel: any = require("react-native-reanimated-carousel").Carousel;
const FOUNDER_PREVIEW_WIDTH = Dimensions.get("window").width - 64;

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
  const [formDisplayDuration, setFormDisplayDuration] = useState("3");
  const [formTransitionDuration, setFormTransitionDuration] = useState("350");
  const [formTransitionType, setFormTransitionType] = useState<"slide" | "fade">("slide");
  const [formIsActive, setFormIsActive] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);

  // Rotation settings state
  const [autoRotate, setAutoRotate] = useState(true);
  const [rotationInterval, setRotationInterval] = useState(3);
  const [smartSettings, setSmartSettings] = useState<SmartHeroSliderSettings>(DEFAULT_SMART_HERO_SETTINGS);
  const [previewSlides, setPreviewSlides] = useState<SmartHeroSlide[]>([]);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewCycle, setPreviewCycle] = useState<HeroRotationCycle | null>(null);
  const previewCarouselRef = useRef<{ scrollTo: (options: { index: number; animated?: boolean }) => void }>(null);

  // Store and product selectors for structured hero destinations
  const [allStoresList, setAllStoresList] = useState<any[]>([]);
  const [allCouriersList, setAllCouriersList] = useState<any[]>([]);
  const [storeProductsList, setStoreProductsList] = useState<any[]>([]);
  const [selectedProductStoreId, setSelectedProductStoreId] = useState("");

  useEffect(() => {
    supabase.from("stores").select("id, name").eq("status", "active").then(({ data }) => {
      if (data) setAllStoresList(data);
    });
    supabase.from("couriers").select("id, full_name, avatar_url").eq("is_available", true).eq("show_on_home", true).eq("is_mock", false).order("display_order", { ascending: true }).then(({ data }) => {
      if (data) setAllCouriersList(data);
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
    const [data, settings, loadedSmartSettings] = await Promise.all([
      getFounderHeroSlides(),
      getHeroSliderSettings(),
      getSmartHeroSliderSettings(),
    ]);
    setSlides(data);
    setAutoRotate(settings.autoRotate);
    setRotationInterval(settings.intervalSeconds);
    setSmartSettings(loadedSmartSettings);
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

  const handleSaveSmartSettings = async (patch: Partial<SmartHeroSliderSettings>) => {
    const next = { ...smartSettings, ...patch };
    setSmartSettings(next);
    const res = await updateSmartHeroSliderSettings(next);
    if (!res.success) Alert.alert("خطأ", res.error || "تعذّر حفظ إعدادات Smart Slider");
  };

  const updateSmartSource = (source: keyof SmartHeroSliderSettings["enabledSources"], enabled: boolean) =>
    handleSaveSmartSettings({ enabledSources: { ...smartSettings.enabledSources, [source]: enabled } });

  const updateSmartWeight = (source: keyof SmartHeroSliderSettings["sourceWeights"], weight: number) =>
    handleSaveSmartSettings({ sourceWeights: { ...smartSettings.sourceWeights, [source]: weight } });

  const handleModeChange = (mode: SmartHeroSliderSettings["mode"]) =>
    handleSaveSmartSettings({ mode, smartMode: mode === "smart" });

  const handlePreview = async () => {
    const cycle = await getStoredHeroRotationCycle();
    const smart = smartSettings.mode === "manual" ? [] : await getSmartHeroSlides(smartSettings, MAX_HERO_SLIDES, cycle.seed);
    setPreviewCycle(cycle);
    setPreviewIndex(0);
    setPreviewSlides(withCycleMetadata(buildFinalHeroSlides(smartSettings.mode, slides, smart), cycle) as SmartHeroSlide[]);
    setPreviewVisible(true);
  };

  const moveSlide = async (id: string, direction: -1 | 1) => {
    const index = slides.findIndex((slide) => slide.id === id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= slides.length) return;
    const nextSlides = [...slides];
    [nextSlides[index], nextSlides[nextIndex]] = [nextSlides[nextIndex], nextSlides[index]];
    const normalized = nextSlides.map((slide, order) => ({ ...slide, display_order: order + 1 }));
    setSlides(normalized);
    const result = await reorderHeroSlides(normalized.map((slide) => slide.id));
    if (!result.success) {
      Alert.alert("خطأ", result.error || "تعذّر حفظ الترتيب");
      loadSlides();
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
    setFormDisplayDuration("3");
    setFormTransitionDuration("350");
    setFormTransitionType("slide");
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
    setFormTargetId(slide.target_id || slide.target_store_id || slide.target_product_id || "");
    setFormDisplayOrder(String(slide.display_order));
    setFormPriority(String(slide.priority));
    setFormDisplayDuration(String(slide.display_duration_seconds ?? 3));
    setFormTransitionDuration(String(slide.transition_duration_ms ?? 350));
    setFormTransitionType(slide.transition_type === "fade" ? "fade" : "slide");
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
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    let validatedTargetId = formTargetId.trim() || null;
    let targetStoreId: string | null = null;
    let targetProductId: string | null = null;

    if (formContentType === 'store') {
      if (validatedTargetId && !UUID_REGEX.test(validatedTargetId)) {
        Alert.alert("خطأ", "معرف المتجر غير صالح (يجب أن يكون UUID)");
        setSaving(false);
        return;
      }
      targetStoreId = validatedTargetId;
    } else if (formContentType === 'product') {
      if (validatedTargetId && !UUID_REGEX.test(validatedTargetId)) {
        Alert.alert("خطأ", "معرف المنتج غير صالح (يجب أن يكون UUID)");
        setSaving(false);
        return;
      }
      targetProductId = validatedTargetId;
    } else if (formContentType === 'courier') {
      if (validatedTargetId && !UUID_REGEX.test(validatedTargetId)) {
        Alert.alert("خطأ", "معرف الموصل غير صالح (يجب أن يكون UUID)");
        setSaving(false);
        return;
      }
    }

    const payload = {
      title: formTitle.trim(),
      subtitle: formSubtitle.trim() || null,
      image_url: formImageUrl.trim(),
      cta_label: formCtaLabel.trim() || "تسوق الآن",
      content_type: formContentType,
      target_id: validatedTargetId,
      target_store_id: targetStoreId,
      target_product_id: targetProductId,
      display_order: parseInt(formDisplayOrder, 10) || 0,
      priority: parseInt(formPriority, 10) || 0,
      display_duration_seconds: Math.max(1, Math.min(60, parseInt(formDisplayDuration, 10) || 3)),
      transition_duration_ms: Math.max(150, Math.min(1000, parseInt(formTransitionDuration, 10) || 350)),
      transition_type: formTransitionType,
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
            <Text style={styles.createBtnText}>CREATE MARKET AD</Text>
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
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((sec) => (
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

        <View style={[styles.settingsCard, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]}>
          <View style={styles.smartHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.textPrimary, fontFamily: tokens.typography.families.arabic, fontWeight: "700", textAlign: "right" }}>Smart Slider</Text>
              <Text style={{ color: colors.textSecondary, fontFamily: tokens.typography.families.arabic, fontSize: 12, textAlign: "right", marginTop: 3 }}>محتوى حقيقي يتجدد تلقائيًا من المنتجات والمتاجر وAssets الرسمية</Text>
            </View>
            <Switch value={smartSettings.mode !== "manual"} onValueChange={(value) => handleModeChange(value ? "smart" : "manual")} trackColor={{ false: "#767577", true: colors.primary + "88" }} thumbColor={smartSettings.mode !== "manual" ? colors.primary : "#f4f3f4"} />
          </View>
          <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 14 }]}>الوضع</Text>
          <View style={styles.modeRow}>
            {([["manual", "MANUAL"], ["smart", "SMART"], ["hybrid", "HYBRID"]] as const).map(([mode, label]) => (
              <TouchableOpacity key={mode} style={[styles.modeChip, { backgroundColor: smartSettings.mode === mode ? colors.primary : colors.bgSurface, borderColor: smartSettings.mode === mode ? colors.primary : colors.borderSubtle }]} onPress={() => handleModeChange(mode)}>
                <Text style={{ color: smartSettings.mode === mode ? "#FFF" : colors.textPrimary, fontWeight: "700", fontSize: 12 }}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 10 }]}>الحد الأقصى: {smartSettings.maxSlides} / {MAX_HERO_SLIDES} شريحة</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((count) => (
              <TouchableOpacity key={count} style={[styles.typeChip, { backgroundColor: smartSettings.maxSlides === count ? colors.primary : colors.bgSurface, borderColor: colors.borderSubtle, marginRight: 6 }]} onPress={() => handleSaveSmartSettings({ maxSlides: count })}>
                <Text style={{ color: smartSettings.maxSlides === count ? "#FFF" : colors.textPrimary }}>{count}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 10 }]}>الدورة الحالية: {previewCycle?.rotation_cycle_id || "00:00–11:59 أو 12:00–23:59"}</Text>
          <View style={styles.smartActionRow}>
            <TouchableOpacity style={[styles.secondaryActionBtn, { borderColor: colors.primary }]} onPress={handlePreview}>
              <Eye size={16} color={colors.primary} />
              <Text style={{ color: colors.primary, fontFamily: tokens.typography.families.arabic }}>معاينة Smart Slider</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.secondaryActionBtn, { borderColor: colors.borderSubtle }]} onPress={() => Alert.alert("إعادة ضبط Smart Slider", "سيتم استعادة الإعدادات الافتراضية. هل تريد المتابعة؟", [{ text: "إلغاء", style: "cancel" }, { text: "إعادة ضبط", style: "destructive", onPress: () => handleSaveSmartSettings(DEFAULT_SMART_HERO_SETTINGS) }])}>
              <Text style={{ color: colors.textSecondary, fontFamily: tokens.typography.families.arabic }}>إعادة ضبط</Text>
            </TouchableOpacity>
          </View>
          {smartSettings.mode !== "manual" && (
            <>
              <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 12 }]}>المصادر ونسبة الظهور</Text>
              {([["products", "المنتجات الجديدة"], ["new_stores", "المتاجر الجديدة"], ["featured_stores", "المتاجر المميزة"], ["promotions", "إعلانات Soug-XPRESS الرسمية"], ["couriers", "موصل اليوم"]] as const).map(([source, label]) => (
                <View key={source} style={styles.smartSourceRow}>
                  <Switch value={smartSettings.enabledSources[source]} onValueChange={(value) => updateSmartSource(source, value)} trackColor={{ false: "#767577", true: colors.primary + "88" }} thumbColor={smartSettings.enabledSources[source] ? colors.primary : "#f4f3f4"} />
                  <Text style={{ flex: 1, color: colors.textPrimary, fontFamily: tokens.typography.families.arabic, textAlign: "right" }}>{label}</Text>
                  <TextInput value={String(smartSettings.sourceWeights[source])} onChangeText={(value) => updateSmartWeight(source, Number(value.replace(/[^0-9]/g, "")) || 0)} keyboardType="numeric" style={[styles.weightInput, { color: colors.textPrimary, borderColor: colors.borderSubtle, backgroundColor: colors.bgSurface }]} />
                  <Text style={{ color: colors.textSecondary }}>%</Text>
                </View>
              ))}
              <View style={styles.smartActionRow}>
                <TouchableOpacity style={[styles.refreshSmartBtn, { borderColor: colors.primary, flex: 1 }]} onPress={() => loadSlides(true)}>
                  <Text style={{ color: colors.primary, fontFamily: tokens.typography.families.arabic, fontWeight: "700" }}>تحديث الاختيارات</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.refreshSmartBtn, { borderColor: colors.success, flex: 1 }]} onPress={() => handleSaveSmartSettings(smartSettings)}>
                  <Text style={{ color: colors.success, fontFamily: tokens.typography.families.arabic, fontWeight: "700" }}>تطبيق الإعدادات</Text>
                </TouchableOpacity>
              </View>
              <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 14 }]}>الحركة والتكرار</Text>
              <View style={styles.smartSourceRow}>
                <Switch value={smartSettings.pauseOnTouch} onValueChange={(value) => handleSaveSmartSettings({ pauseOnTouch: value })} />
                <Text style={{ flex: 1, color: colors.textPrimary, textAlign: "right", fontFamily: tokens.typography.families.arabic }}>إيقاف عند اللمس</Text>
                <TextInput value={String(smartSettings.resumeDelaySeconds)} onChangeText={(value) => handleSaveSmartSettings({ resumeDelaySeconds: Number(value) || 1 })} keyboardType="numeric" style={[styles.weightInput, { color: colors.textPrimary, borderColor: colors.borderSubtle, backgroundColor: colors.bgSurface }]} />
                <Text style={{ color: colors.textSecondary }}>ث</Text>
              </View>
              <View style={styles.typeRow}>
                {([["slide", "انزلاق"], ["fade", "تلاشي"]] as const).map(([type, label]) => (
                  <TouchableOpacity key={type} style={[styles.typeChip, { backgroundColor: smartSettings.transitionType === type ? colors.primary : colors.bgSurface, borderColor: colors.borderSubtle }]} onPress={() => handleSaveSmartSettings({ transitionType: type })}>
                    <Text style={{ color: smartSettings.transitionType === type ? "#FFF" : colors.textPrimary }}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </View>

        <Modal visible={previewVisible} animationType="slide" transparent onRequestClose={() => setPreviewVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.previewModal, { backgroundColor: colors.bgSurface }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.textPrimary, fontFamily: tokens.typography.families.arabic }]}>معاينة ترتيب Smart Slider</Text>
                <TouchableOpacity onPress={() => setPreviewVisible(false)}><X size={24} color={colors.textSecondary} /></TouchableOpacity>
              </View>
              {previewSlides.length > 0 ? (
                <>
                  <FounderCarousel
                    data={previewSlides}
                    ref={previewCarouselRef}
                    width={FOUNDER_PREVIEW_WIDTH}
                    height={190}
                    loop={false}
                    autoplay={false}
                    renderItem={({ item }: { item: SmartHeroSlide }) => (
                      <View style={[styles.previewCarouselCard, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]}>
                        <Image source={{ uri: item.image }} style={styles.previewCarouselImage} />
                        <View style={styles.previewCarouselOverlay}>
                          <Text style={styles.previewCarouselTitle} numberOfLines={1}>{item.title}</Text>
                          <Text style={styles.previewCarouselDescription} numberOfLines={1}>{item.description}</Text>
                        </View>
                      </View>
                    )}
                    onSnapToItem={setPreviewIndex}
                    testID="founder-smart-slider-preview"
                  />
                  <View style={styles.dotsContainer}>
                    {previewSlides.map((slide, index) => (
                      <TouchableOpacity key={`${slide.id}-dot`} testID={`founder-preview-dot-${index + 1}`} onPress={() => previewCarouselRef.current?.scrollTo({ index, animated: true })} style={[styles.dot, { backgroundColor: previewIndex === index ? colors.primary : colors.borderSubtle }]} />
                    ))}
                  </View>
                  <View style={[styles.previewDiagnostics, { borderColor: colors.borderSubtle }]}>
                    <Text style={{ color: colors.textPrimary }}>الشريحة {previewIndex + 1} / {previewSlides.length}</Text>
                    <Text style={{ color: colors.textSecondary }}>المصدر: {previewSlides[previewIndex]?.source || "manual"} · Smart Score: {previewSlides[previewIndex]?.smartScore ?? "—"}</Text>
                    <Text style={{ color: colors.textSecondary }}>الأولوية: {previewSlides[previewIndex]?.smartScore ?? 0} · السبب: {previewSlides[previewIndex]?.smartReason || "اختيار يدوي"}</Text>
                    <Text style={{ color: colors.textSecondary }}>الدورة: {previewCycle?.rotation_cycle_id || "—"} · المدة: {previewSlides[previewIndex]?.display_duration_seconds ?? rotationInterval} ث</Text>
                  </View>
                </>
              ) : <Text style={{ color: colors.textSecondary, textAlign: "center" }}>لا توجد شرائح للمعاينة</Text>}
            </View>
          </View>
        </Modal>

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
                      <TouchableOpacity style={styles.actionBtn} onPress={() => moveSlide(slide.id, -1)} disabled={slides[0]?.id === slide.id}>
                        <ChevronUp size={18} color={slides[0]?.id === slide.id ? colors.textDisabled : colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.actionBtn} onPress={() => moveSlide(slide.id, 1)} disabled={slides[slides.length - 1]?.id === slide.id}>
                        <ChevronDown size={18} color={slides[slides.length - 1]?.id === slide.id ? colors.textDisabled : colors.primary} />
                      </TouchableOpacity>
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
                  {(["custom", "promotion", "store", "product", "courier"] as const).map((t) => (
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

                {formContentType === "courier" && (
                  <>
                    <Text style={styles.inputLabel}>اختر الموصل</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                      {allCouriersList.map((courier) => (
                        <TouchableOpacity key={courier.id} style={[styles.typeChip, { backgroundColor: formTargetId === courier.id ? colors.primary : colors.bgElevated, borderColor: formTargetId === courier.id ? colors.primary : colors.borderSubtle, marginRight: 8 }]} onPress={() => setFormTargetId(courier.id)}>
                          <Text style={{ color: formTargetId === courier.id ? "#FFF" : colors.textPrimary, fontSize: 12 }}>{courier.full_name}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </>
                )}

                {formContentType !== "store" && formContentType !== "product" && formContentType !== "courier" && (
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

                <View style={{ flexDirection: "row", gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>مدة العرض (ث)</Text>
                    <TextInput style={[styles.input, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle, color: colors.textPrimary }]} value={formDisplayDuration} onChangeText={setFormDisplayDuration} keyboardType="numeric" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>مدة الانتقال (ملث)</Text>
                    <TextInput style={[styles.input, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle, color: colors.textPrimary }]} value={formTransitionDuration} onChangeText={setFormTransitionDuration} keyboardType="numeric" />
                  </View>
                </View>
                <Text style={styles.inputLabel}>نوع الانتقال</Text>
                <View style={styles.typeRow}>
                  {([["slide", "انزلاق"], ["fade", "تلاشي"]] as const).map(([type, label]) => (
                    <TouchableOpacity key={type} style={[styles.typeChip, { backgroundColor: formTransitionType === type ? colors.primary : colors.bgElevated, borderColor: colors.borderSubtle }]} onPress={() => setFormTransitionType(type)}>
                      <Text style={{ color: formTransitionType === type ? "#FFF" : colors.textPrimary }}>{label}</Text>
                    </TouchableOpacity>
                  ))}
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
  smartHeaderRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
  },
  smartSourceRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  weightInput: {
    width: 54,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 5,
    textAlign: "center",
  },
  refreshSmartBtn: {
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 9,
    marginTop: 14,
  },
  modeRow: {
    flexDirection: "row-reverse",
    gap: 8,
    marginTop: 8,
  },
  modeChip: {
    flex: 1,
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 9,
  },
  smartActionRow: {
    flexDirection: "row-reverse",
    gap: 8,
    marginTop: 10,
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 9,
  },
  previewModal: {
    width: "92%",
    maxHeight: "80%",
    borderRadius: 16,
    padding: 16,
  },
  previewRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 9,
    borderWidth: 1,
    borderRadius: 10,
    padding: 8,
  },
  previewImage: {
    width: 54,
    height: 42,
    borderRadius: 6,
    backgroundColor: "#E5E7EB",
  },
  previewCarouselCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  previewCarouselImage: {
    width: "100%",
    height: "100%",
  },
  previewCarouselOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 12,
    backgroundColor: "rgba(0,0,0,0.58)",
  },
  previewCarouselTitle: {
    color: "#FFF",
    fontWeight: "800",
    textAlign: "right",
  },
  previewCarouselDescription: {
    color: "#F3F4F6",
    fontSize: 12,
    textAlign: "right",
    marginTop: 3,
  },
  dotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 5,
    marginVertical: 10,
    flexWrap: "wrap",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  previewDiagnostics: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    gap: 5,
    alignItems: "flex-end",
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
