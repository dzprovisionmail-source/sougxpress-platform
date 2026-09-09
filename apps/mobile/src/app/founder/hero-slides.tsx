import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { ArrowRight, Copy, Eye, ImagePlus, Pencil, Plus, Save, Trash2 } from "lucide-react-native";
import { AdminPageShell } from "@/components/admin";
import { MarketHeroSlider } from "@/components/market/hero/MarketHeroSlider";
import type { HeroSlide, HeroSlideDraft, HeroSlideType, HeroTargetType } from "@/components/market/hero/hero.types";
import { useAppTheme } from "@/contexts/ThemeContext";
import { deleteFounderHeroSlide, duplicateFounderHeroSlide, getFounderHeroDashboardSlides, saveFounderHeroSlide, uploadMarketHeroImage } from "@/services/marketHero.service";

const emptyDraft: HeroSlideDraft = { type: "PROMOTION", imageUrl: "", title: "", description: "", ctaText: "", targetType: "", targetId: "", priority: 1, isActive: true, startsAt: "", endsAt: "" };
const slideTypes: Array<{ value: HeroSlideType; label: string }> = [
  { value: "PROMOTION", label: "عرض" }, { value: "STORE", label: "متجر" }, { value: "PRODUCT", label: "منتج" }, { value: "APP", label: "تطبيق" }, { value: "CUSTOM", label: "مخصص" },
];
const targetTypes: Array<{ value: HeroTargetType | ""; label: string }> = [
  { value: "", label: "بدون رابط" }, { value: "STORE", label: "Store" }, { value: "PRODUCT", label: "Product" }, { value: "CATEGORY", label: "Category" }, { value: "SCREEN", label: "Screen" }, { value: "URL", label: "URL" },
];

export default function FounderHeroSlidesScreen() {
  const { colors, isRTL } = useAppTheme();
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [draft, setDraft] = useState<HeroSlideDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);

  const loadSlides = useCallback(async () => {
    setLoading(true);
    try {
      setSlides(await getFounderHeroDashboardSlides());
    } catch (error: any) {
      Alert.alert("تعذّر تحميل السلايدر", error?.message || "حاول مرة أخرى");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadSlides(); }, [loadSlides]);

  const updateDraft = <K extends keyof HeroSlideDraft>(key: K, value: HeroSlideDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const editSlide = (slide: HeroSlide) => {
    if (slide.source !== "FOUNDER") return;
    setEditingId(slide.id);
    setDraft({ type: slide.type, imageUrl: slide.imageUrl, title: slide.title || "", description: slide.description || "", ctaText: slide.ctaText || "", targetType: slide.targetType || "", targetId: slide.targetId || slide.targetUrl || "", priority: slide.priority, isActive: slide.isActive, startsAt: slide.startsAt || "", endsAt: slide.endsAt || "" });
    setPreview(false);
  };
  const resetDraft = () => { setEditingId(undefined); setDraft(emptyDraft); setPreview(false); };

  const chooseImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [16, 9], quality: 0.85 });
    if (result.canceled || !result.assets[0]?.uri) return;
    setSaving(true);
    try { updateDraft("imageUrl", await uploadMarketHeroImage(result.assets[0].uri)); }
    catch (error: any) { Alert.alert("تعذّر رفع الصورة", error?.message || "حاول مرة أخرى"); }
    finally { setSaving(false); }
  };

  const handleSave = async () => {
    if (!draft.title.trim()) { Alert.alert("العنوان مطلوب", "أضف عنواناً قصيراً للسلايدر."); return; }
    setSaving(true);
    try { await saveFounderHeroSlide(draft, editingId); await loadSlides(); resetDraft(); Alert.alert("تم الحفظ", "تم تحديث بيانات السلايدر."); }
    catch (error: any) { Alert.alert("تعذّر الحفظ", error?.message || "حاول مرة أخرى"); }
    finally { setSaving(false); }
  };

  const handleDelete = (slide: HeroSlide) => {
    if (slide.source !== "FOUNDER") return;
    Alert.alert("حذف الشريحة؟", slide.title || "هذه الشريحة", [{ text: "إلغاء", style: "cancel" }, { text: "حذف", style: "destructive", onPress: async () => { try { await deleteFounderHeroSlide(slide.id); await loadSlides(); if (editingId === slide.id) resetDraft(); } catch (error: any) { Alert.alert("تعذّر الحذف", error?.message || "حاول مرة أخرى"); } } }]);
  };
  const handleDuplicate = async (slide: HeroSlide) => {
    if (slide.source !== "FOUNDER") return;
    try { await duplicateFounderHeroSlide(slide); await loadSlides(); } catch (error: any) { Alert.alert("تعذّر التكرار", error?.message || "حاول مرة أخرى"); }
  };

  const previewSlide = useMemo<HeroSlide>(() => ({ id: editingId || "preview", type: draft.type, source: "FOUNDER", imageUrl: draft.imageUrl, title: draft.title || "عنوان العرض", description: draft.description || "وصف مختصر للعرض", ctaText: draft.ctaText || "اكتشف الآن", priority: draft.priority, isActive: true, targetType: draft.targetType || undefined, targetId: draft.targetId || undefined }), [draft, editingId]);

  return (
    <AdminPageShell title="إدارة Hero السوق">
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={[styles.back, { borderColor: colors.borderSubtle, backgroundColor: colors.bgSurface }]} onPress={() => router.back()}><ArrowRight size={18} color={colors.textPrimary} /><Text style={{ color: colors.textPrimary }}>العودة للوحة التحكم</Text></TouchableOpacity>
        <View style={[styles.headerCard, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
          <View style={styles.headerRow}><View style={[styles.iconCircle, { backgroundColor: colors.primary }]}><Eye color="#fff" size={20} /></View><View style={{ flex: 1 }}><Text style={[styles.heading, { color: colors.textPrimary }]}>Hero السوق</Text><Text style={[styles.muted, { color: colors.textSecondary }]}>أنشئ عروضاً قصيرة وواضحة تظهر في بداية Market.</Text></View></View>
          <TouchableOpacity onPress={resetDraft} style={[styles.primaryBtn, { backgroundColor: colors.primary }]}><Plus color="#fff" size={17} /><Text style={styles.primaryText}>شريحة جديدة</Text></TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
          <View style={styles.cardTitleRow}><Pencil size={18} color={colors.primary} /><Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{editingId ? "تعديل الشريحة" : "شريحة جديدة"}</Text></View>
          <Text style={[styles.label, { color: colors.textSecondary }]}>نوع المحتوى</Text>
          <View style={styles.chips}>{slideTypes.map((item) => <TouchableOpacity key={item.value} onPress={() => updateDraft("type", item.value)} style={[styles.chip, { borderColor: draft.type === item.value ? colors.primary : colors.borderSubtle, backgroundColor: draft.type === item.value ? `${colors.primary}18` : colors.bgElevated }]}><Text style={{ color: draft.type === item.value ? colors.primary : colors.textSecondary, fontWeight: "700", fontSize: 12 }}>{item.label}</Text></TouchableOpacity>)}</View>
          <Text style={[styles.label, { color: colors.textSecondary }]}>العنوان *</Text><TextInput value={draft.title} onChangeText={(value) => updateDraft("title", value)} placeholder="عنوان قصير وواضح" placeholderTextColor={colors.textSecondary} textAlign="right" style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]} />
          <Text style={[styles.label, { color: colors.textSecondary }]}>الوصف</Text><TextInput value={draft.description} onChangeText={(value) => updateDraft("description", value)} placeholder="وصف اختياري قصير جداً" placeholderTextColor={colors.textSecondary} textAlign="right" style={[styles.input, styles.multiline, { color: colors.textPrimary, backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]} multiline />
          <Text style={[styles.label, { color: colors.textSecondary }]}>نص CTA</Text><TextInput value={draft.ctaText} onChangeText={(value) => updateDraft("ctaText", value)} placeholder="اكتشف الآن" placeholderTextColor={colors.textSecondary} textAlign="right" style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]} />
          <TouchableOpacity onPress={chooseImage} disabled={saving} style={[styles.imageBtn, { borderColor: colors.borderSubtle, backgroundColor: colors.bgElevated }]}><ImagePlus color={colors.primary} size={18} /><Text style={{ color: colors.textPrimary, fontWeight: "700" }}>{draft.imageUrl ? "تغيير الصورة" : "رفع صورة قوية"}</Text></TouchableOpacity>
          {!!draft.imageUrl && <Text numberOfLines={1} style={[styles.url, { color: colors.textSecondary }]}>{draft.imageUrl}</Text>}
          <Text style={[styles.label, { color: colors.textSecondary }]}>هدف CTA (اختياري)</Text><View style={styles.chips}>{targetTypes.map((item) => <TouchableOpacity key={item.value || "none"} onPress={() => updateDraft("targetType", item.value)} style={[styles.chip, { borderColor: draft.targetType === item.value ? colors.primary : colors.borderSubtle, backgroundColor: draft.targetType === item.value ? `${colors.primary}18` : colors.bgElevated }]}><Text style={{ color: draft.targetType === item.value ? colors.primary : colors.textSecondary, fontWeight: "700", fontSize: 11 }}>{item.label}</Text></TouchableOpacity>)}</View>
          {!!draft.targetType && <TextInput value={draft.targetId} onChangeText={(value) => updateDraft("targetId", value)} placeholder={draft.targetType === "URL" ? "https://..." : "المعرّف أو المسار"} placeholderTextColor={colors.textSecondary} textAlign="right" style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]} />}
          <View style={styles.row}><View style={{ flex: 1 }}><Text style={[styles.label, { color: colors.textSecondary }]}>الأولوية</Text><TextInput value={String(draft.priority)} onChangeText={(value) => updateDraft("priority", Number(value.replace(/\D/g, "")) || 0)} keyboardType="number-pad" textAlign="right" style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]} /></View><View style={styles.switchBox}><Text style={[styles.label, { color: colors.textSecondary }]}>نشطة</Text><Switch value={draft.isActive} onValueChange={(value) => updateDraft("isActive", value)} trackColor={{ true: colors.primary }} /></View></View>
          <View style={styles.row}><View style={{ flex: 1 }}><Text style={[styles.label, { color: colors.textSecondary }]}>تبدأ (ISO اختياري)</Text><TextInput value={draft.startsAt} onChangeText={(value) => updateDraft("startsAt", value)} placeholder="2026-09-10T08:00:00Z" placeholderTextColor={colors.textSecondary} style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]} /></View><View style={{ flex: 1 }}><Text style={[styles.label, { color: colors.textSecondary }]}>تنتهي (ISO اختياري)</Text><TextInput value={draft.endsAt} onChangeText={(value) => updateDraft("endsAt", value)} placeholder="2026-09-20T23:00:00Z" placeholderTextColor={colors.textSecondary} style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]} /></View></View>
          <View style={styles.actions}><TouchableOpacity onPress={() => setPreview((value) => !value)} style={[styles.secondaryBtn, { borderColor: colors.borderSubtle }]}><Eye color={colors.textPrimary} size={16} /><Text style={{ color: colors.textPrimary, fontWeight: "700" }}>{preview ? "إخفاء المعاينة" : "معاينة الهاتف"}</Text></TouchableOpacity><TouchableOpacity onPress={handleSave} disabled={saving} style={[styles.primaryBtn, { backgroundColor: colors.primary }]}>{saving ? <ActivityIndicator color="#fff" /> : <><Save color="#fff" size={16} /><Text style={styles.primaryText}>حفظ</Text></>}</TouchableOpacity></View>
          {preview && <View style={{ marginTop: 14 }}><MarketHeroSlider slides={[previewSlide]} colors={colors} isRTL={isRTL} /></View>}
        </View>

        <View style={[styles.card, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}><View style={styles.cardTitleRow}><Eye size={18} color={colors.primary} /><Text style={[styles.cardTitle, { color: colors.textPrimary }]}>الشرائح الحالية ({slides.length})</Text></View>{loading ? <ActivityIndicator color={colors.primary} /> : slides.length === 0 ? <Text style={[styles.muted, { color: colors.textSecondary }]}>لا توجد شرائح بعد.</Text> : slides.map((slide) => <View key={`${slide.source}-${slide.id}`} style={[styles.slideRow, { borderColor: colors.borderSubtle }]}><View style={{ flex: 1 }}><Text style={[styles.slideTitle, { color: colors.textPrimary }]}>{slide.title || "بدون عنوان"}</Text><Text style={[styles.muted, { color: colors.textSecondary }]}>{slide.type} · {slide.source} · أولوية {slide.priority} · {slide.isActive ? "نشطة" : "متوقفة"}</Text></View>{slide.source === "FOUNDER" ? <><TouchableOpacity onPress={() => handleDuplicate(slide)} style={styles.iconBtn}><Copy color={colors.textSecondary} size={17} /></TouchableOpacity><TouchableOpacity onPress={() => editSlide(slide)} style={styles.iconBtn}><Pencil color={colors.primary} size={17} /></TouchableOpacity><TouchableOpacity onPress={() => handleDelete(slide)} style={styles.iconBtn}><Trash2 color={colors.error} size={17} /></TouchableOpacity></> : <Text style={[styles.muted, { color: colors.primary }]}>AUTO</Text>}</View>)}</View>
      </ScrollView>
    </AdminPageShell>
  );
}

const styles = StyleSheet.create({ page: { padding: 16, paddingBottom: 40, gap: 14 }, back: { alignSelf: "flex-start", flexDirection: "row-reverse", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 }, headerCard: { borderWidth: 1, borderRadius: 18, padding: 16, gap: 14 }, headerRow: { flexDirection: "row-reverse", alignItems: "center", gap: 12 }, iconCircle: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" }, heading: { fontSize: 20, fontWeight: "900", textAlign: "right" }, muted: { fontSize: 12, lineHeight: 18, textAlign: "right" }, card: { borderWidth: 1, borderRadius: 18, padding: 16, gap: 10 }, cardTitleRow: { flexDirection: "row-reverse", alignItems: "center", gap: 8, marginBottom: 4 }, cardTitle: { flex: 1, textAlign: "right", fontSize: 16, fontWeight: "900" }, label: { textAlign: "right", fontSize: 12, fontWeight: "700", marginTop: 4 }, input: { borderWidth: 1, borderRadius: 10, minHeight: 44, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13 }, multiline: { minHeight: 74, textAlignVertical: "top" }, chips: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 7 }, chip: { borderWidth: 1, borderRadius: 99, paddingHorizontal: 11, paddingVertical: 8 }, imageBtn: { minHeight: 44, borderWidth: 1, borderRadius: 10, flexDirection: "row-reverse", justifyContent: "center", alignItems: "center", gap: 8 }, url: { fontSize: 10, textAlign: "right" }, row: { flexDirection: "row-reverse", gap: 10 }, switchBox: { width: 90, alignItems: "center" }, actions: { flexDirection: "row-reverse", justifyContent: "space-between", gap: 10, marginTop: 8 }, primaryBtn: { minHeight: 42, borderRadius: 10, paddingHorizontal: 14, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 7 }, primaryText: { color: "#fff", fontWeight: "800" }, secondaryBtn: { minHeight: 42, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 7 }, slideRow: { borderTopWidth: 1, paddingVertical: 12, flexDirection: "row-reverse", alignItems: "center", gap: 7 }, slideTitle: { fontSize: 14, fontWeight: "800", textAlign: "right" }, iconBtn: { padding: 7 },
});
