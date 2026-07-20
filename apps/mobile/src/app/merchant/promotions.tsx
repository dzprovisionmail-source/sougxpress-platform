import React, { useState } from "react";
import {
  ScrollView,
  View,
  Modal,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
} from "react-native";
import {
  Tag,
  CirclePlus,
  SquarePen,
  Trash2,
  X,
  ImagePlus,
  CheckCircle,
  XCircle,
} from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";

import { useAppTheme } from "@/contexts/ThemeContext";
import { useCurrentUserId } from "@/features/workspace/useCurrentUserId";
import { getStoreByMerchantId } from "@/services/store.service";
import { uploadPromotionImage } from "@/services/promotion.service";
import { useMerchantPromotions } from "@/hooks/usePromotions";
import { StorePromotion, StoreDiscountType } from "@/types/schema-03-core";
import { SimpleSelect } from "@/components/ui";
import {
  WorkspaceScreen,
  SectionCard,
  SectionTitle,
  WorkspaceText,
  WorkspaceButton,
  WorkspaceRow,
  LoadingState,
  EmptyState,
} from "@/features/workspace/ui";
import { useEffect } from "react";

// ─── helpers ─────────────────────────────────────────────────────────────────

const DISCOUNT_OPTIONS = [
  { value: "percentage", label: "نسبة مئوية (%)" },
  { value: "fixed_amount", label: "مبلغ ثابت (د.ج)" },
  { value: "free_delivery", label: "توصيل مجاني" },
];

const formatDiscount = (p: StorePromotion) => {
  if (p.discount_type === "percentage") return `${p.discount_value}%`;
  if (p.discount_type === "fixed_amount") return `${p.discount_value} د.ج`;
  return "توصيل مجاني";
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("ar-DZ", { day: "2-digit", month: "2-digit", year: "numeric" });

const isLive = (p: StorePromotion) => {
  const now = Date.now();
  return p.is_active && new Date(p.starts_at).getTime() <= now && new Date(p.ends_at).getTime() >= now;
};

// ─── form ────────────────────────────────────────────────────────────────────

interface FormState {
  title: string;
  description: string;
  discount_type: StoreDiscountType;
  discount_value: string;
  starts_at: string;  // "YYYY-MM-DD"
  ends_at: string;
  min_order: string;
  imageUri: string | null;
  existingImageUrl: string | null;
}

const todayStr = () => new Date().toISOString().slice(0, 10);
const nextWeek  = () => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().slice(0, 10); };

const EMPTY_FORM: FormState = {
  title: "",
  description: "",
  discount_type: "percentage",
  discount_value: "",
  starts_at: todayStr(),
  ends_at: nextWeek(),
  min_order: "",
  imageUri: null,
  existingImageUrl: null,
};

const promoToForm = (p: StorePromotion): FormState => ({
  title: p.title,
  description: p.description ?? "",
  discount_type: p.discount_type,
  discount_value: String(p.discount_value),
  starts_at: p.starts_at.slice(0, 10),
  ends_at: p.ends_at.slice(0, 10),
  min_order: p.min_order_minor > 0 ? String(p.min_order_minor / 100) : "",
  imageUri: null,
  existingImageUrl: p.image_url ?? null,
});

// ─── screen ──────────────────────────────────────────────────────────────────

export default function MerchantPromotionsScreen() {
  const { colors, tokens } = useAppTheme();
  const { userId } = useCurrentUserId();

  const [storeId, setStoreId] = useState("");
  const [resolving, setResolving] = useState(true);

  useEffect(() => {
    if (!userId) return;
    getStoreByMerchantId(userId).then((s) => {
      setStoreId(s?.id ?? "");
      setResolving(false);
    });
  }, [userId]);

  const { promotions, loading, addPromotion, editPromotion, removePromotion, toggleActive } =
    useMerchantPromotions(storeId);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<StorePromotion | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);

  const openAdd = () => { setEditing(null); setForm(EMPTY_FORM); setModalOpen(true); };
  const openEdit = (p: StorePromotion) => { setEditing(p); setForm(promoToForm(p)); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditing(null); setForm(EMPTY_FORM); };

  const patch = <K extends keyof FormState>(key: K, val: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { Alert.alert("إذن مطلوب", "يجب السماح بالوصول إلى المعرض."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [16, 9], quality: 0.85,
    });
    if (!result.canceled) patch("imageUri", result.assets[0].uri);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { Alert.alert("خطأ", "عنوان العرض مطلوب"); return; }
    const val = parseFloat(form.discount_value);
    if (form.discount_type !== "free_delivery" && (isNaN(val) || val < 0)) {
      Alert.alert("خطأ", "قيمة الخصم غير صحيحة"); return;
    }
    if (form.starts_at >= form.ends_at) { Alert.alert("خطأ", "تاريخ الانتهاء يجب أن يكون بعد تاريخ البداية"); return; }

    setSaving(true);
    let imageUrl = form.existingImageUrl;

    // Upload new image if picked
    if (form.imageUri) {
      setUploadingImg(true);
      const tmpId = editing?.id ?? `tmp_${Date.now()}`;
      imageUrl = await uploadPromotionImage(tmpId, form.imageUri);
      setUploadingImg(false);
    }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      discount_type: form.discount_type,
      discount_value: form.discount_type === "free_delivery" ? 0 : val,
      image_url: imageUrl,
      starts_at: new Date(form.starts_at).toISOString(),
      ends_at: new Date(form.ends_at + "T23:59:59").toISOString(),
      min_order_minor: form.min_order.trim() ? Math.round(parseFloat(form.min_order) * 100) : 0,
    };

    const result = editing
      ? await editPromotion(editing.id, payload)
      : await addPromotion({ ...payload, is_active: true });

    setSaving(false);
    if (result) { closeModal(); }
    else { Alert.alert("خطأ", "تعذر حفظ العرض. حاول مرة أخرى."); }
  };

  const handleDelete = (p: StorePromotion) => {
    Alert.alert("حذف العرض", `هل تريد حذف "${p.title}"؟`, [
      { text: "إلغاء", style: "cancel" },
      { text: "حذف", style: "destructive", onPress: async () => {
        const ok = await removePromotion(p.id);
        if (!ok) Alert.alert("خطأ", "تعذر حذف العرض.");
      }},
    ]);
  };

  if (resolving || (loading && !storeId)) {
    return <WorkspaceScreen><LoadingState message="جاري تحميل العروض..." /></WorkspaceScreen>;
  }

  if (!storeId) {
    return <WorkspaceScreen><EmptyState message="أنشئ متجرك أولاً قبل إضافة العروض." /></WorkspaceScreen>;
  }

  return (
    <WorkspaceScreen>
      <ScrollView contentContainerStyle={{ paddingTop: tokens.spacing.xl, paddingBottom: tokens.spacing["3xl"] }}>
        {/* Header + Add */}
        <SectionCard>
          <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }}>
            <SectionTitle icon={<Tag color={colors.primary} size={tokens.spacing.lg} />}>
              عروضي الترويجية
            </SectionTitle>
            <TouchableOpacity
              onPress={openAdd}
              style={{ flexDirection: "row-reverse", alignItems: "center", backgroundColor: colors.primary + "18",
                borderRadius: tokens.radius.sm, paddingHorizontal: tokens.spacing.sm, paddingVertical: 4 }}
            >
              <CirclePlus color={colors.primary} size={16} />
              <WorkspaceText color="brand" style={{ fontSize: tokens.typography.sizes.sm, marginRight: 4, fontWeight: "600" }}>
                إضافة عرض
              </WorkspaceText>
            </TouchableOpacity>
          </View>
        </SectionCard>

        {loading ? (
          <LoadingState message="جاري التحميل..." />
        ) : promotions.length === 0 ? (
          <SectionCard>
            <WorkspaceText color="secondary" style={{ textAlign: "center", paddingVertical: tokens.spacing.lg }}>
              لا توجد عروض بعد. اضغط على "إضافة عرض" للبدء.
            </WorkspaceText>
          </SectionCard>
        ) : (
          promotions.map((p) => {
            const live = isLive(p);
            return (
              <SectionCard key={p.id}>
                {/* Image */}
                {p.image_url ? (
                  <Image
                    source={{ uri: p.image_url }}
                    style={{ width: "100%", height: 120, borderRadius: tokens.radius.md, marginBottom: tokens.spacing.md }}
                    resizeMode="cover"
                  />
                ) : null}

                {/* Status badge */}
                <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginBottom: tokens.spacing.sm }}>
                  <WorkspaceText variant="title" style={{ fontWeight: "700", flex: 1, textAlign: "right" }}>{p.title}</WorkspaceText>
                  <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 4,
                    backgroundColor: (live ? colors.success : colors.textDisabled) + "22",
                    borderRadius: tokens.radius.sm, paddingHorizontal: tokens.spacing.xs, paddingVertical: 2 }}>
                    {live ? <CheckCircle color={colors.success} size={12} /> : <XCircle color={colors.textDisabled} size={12} />}
                    <WorkspaceText style={{ fontSize: 11, color: live ? colors.success : colors.textDisabled }}>
                      {live ? "نشط" : p.is_active ? "غير نشط حالياً" : "معطل"}
                    </WorkspaceText>
                  </View>
                </View>

                <WorkspaceRow label="الخصم" value={formatDiscount(p)} />
                <WorkspaceRow label="من" value={fmtDate(p.starts_at)} />
                <WorkspaceRow label="إلى" value={fmtDate(p.ends_at)} />
                {p.min_order_minor > 0 && (
                  <WorkspaceRow label="حد أدنى للطلب" value={`${(p.min_order_minor / 100).toFixed(0)} د.ج`} />
                )}
                {p.description ? (
                  <WorkspaceRow label="الوصف" value={p.description} isLast />
                ) : null}

                {/* Actions */}
                <View style={{ flexDirection: "row-reverse", gap: tokens.spacing.sm, marginTop: tokens.spacing.md }}>
                  <WorkspaceButton title={p.is_active ? "تعطيل" : "تفعيل"}
                    variant="outline" onPress={() => toggleActive(p)}
                    style={{ flex: 1 }} />
                  <WorkspaceButton title="تعديل" variant="outline"
                    icon={<SquarePen color={colors.primary} size={14} />}
                    onPress={() => openEdit(p)} style={{ flex: 1 }} />
                  <WorkspaceButton title="حذف" variant="danger"
                    icon={<Trash2 color={colors.textOnBrand} size={14} />}
                    onPress={() => handleDelete(p)} style={{ flex: 1 }} />
                </View>
              </SectionCard>
            );
          })
        )}
      </ScrollView>

      {/* ── Add / Edit Modal ───────────────────────────────── */}
      <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={closeModal}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.55)" }}>
            <View style={{ backgroundColor: colors.bgElevated, borderTopLeftRadius: tokens.radius.lg,
              borderTopRightRadius: tokens.radius.lg, padding: tokens.spacing.lg, maxHeight: "92%" }}>

              {/* Modal header */}
              <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginBottom: tokens.spacing.lg }}>
                <WorkspaceText variant="title">{editing ? "تعديل العرض" : "إضافة عرض جديد"}</WorkspaceText>
                <TouchableOpacity onPress={closeModal}><X color={colors.textSecondary} size={22} /></TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Title */}
                {renderField("عنوان العرض *", <TextInput value={form.title}
                  onChangeText={(t) => patch("title", t)}
                  style={inputStyle(colors, tokens)} placeholder="مثال: خصم نهاية الأسبوع"
                  placeholderTextColor={colors.textDisabled} textAlign="right" />, tokens)}

                {/* Description */}
                {renderField("الوصف", <TextInput value={form.description}
                  onChangeText={(t) => patch("description", t)}
                  style={[inputStyle(colors, tokens), { minHeight: 60, textAlignVertical: "top" }]}
                  placeholder="تفاصيل العرض..." placeholderTextColor={colors.textDisabled}
                  textAlign="right" multiline />, tokens)}

                {/* Discount type */}
                {renderField("نوع الخصم", <SimpleSelect
                  options={DISCOUNT_OPTIONS} value={form.discount_type}
                  onChange={(v) => patch("discount_type", v as StoreDiscountType)}
                  placeholder="اختر نوع الخصم" />, tokens)}

                {/* Discount value */}
                {form.discount_type !== "free_delivery" && renderField(
                  form.discount_type === "percentage" ? "نسبة الخصم (%)" : "مبلغ الخصم (د.ج)",
                  <TextInput value={form.discount_value}
                    onChangeText={(t) => patch("discount_value", t)}
                    style={inputStyle(colors, tokens)} placeholder="0"
                    placeholderTextColor={colors.textDisabled} textAlign="right" keyboardType="decimal-pad" />,
                  tokens
                )}

                {/* Dates */}
                {renderField("تاريخ البداية (YYYY-MM-DD)", <TextInput value={form.starts_at}
                  onChangeText={(t) => patch("starts_at", t)}
                  style={inputStyle(colors, tokens)} placeholder="2025-01-01"
                  placeholderTextColor={colors.textDisabled} textAlign="right" />, tokens)}

                {renderField("تاريخ الانتهاء (YYYY-MM-DD)", <TextInput value={form.ends_at}
                  onChangeText={(t) => patch("ends_at", t)}
                  style={inputStyle(colors, tokens)} placeholder="2025-01-31"
                  placeholderTextColor={colors.textDisabled} textAlign="right" />, tokens)}

                {/* Min order */}
                {renderField("حد أدنى للطلب (د.ج) - اختياري", <TextInput value={form.min_order}
                  onChangeText={(t) => patch("min_order", t)}
                  style={inputStyle(colors, tokens)} placeholder="0"
                  placeholderTextColor={colors.textDisabled} textAlign="right" keyboardType="decimal-pad" />, tokens)}

                {/* Image */}
                {renderField("صورة العرض", <View>
                  {(form.imageUri || form.existingImageUrl) ? (
                    <Image source={{ uri: form.imageUri ?? form.existingImageUrl! }}
                      style={{ width: "100%", height: 120, borderRadius: tokens.radius.md, marginBottom: tokens.spacing.xs }}
                      resizeMode="cover" />
                  ) : null}
                  <TouchableOpacity onPress={pickImage}
                    style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "center",
                      borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: tokens.radius.sm,
                      padding: tokens.spacing.sm, borderStyle: "dashed" }}>
                    {uploadingImg ? <ActivityIndicator size="small" color={colors.primary} /> : <ImagePlus color={colors.textSecondary} size={20} />}
                    <WorkspaceText color="secondary" style={{ marginRight: tokens.spacing.sm, fontSize: tokens.typography.sizes.sm }}>
                      {form.imageUri || form.existingImageUrl ? "تغيير الصورة" : "إضافة صورة"}
                    </WorkspaceText>
                  </TouchableOpacity>
                </View>, tokens)}

                <WorkspaceButton
                  title={saving ? "جاري الحفظ..." : editing ? "حفظ التعديلات" : "إضافة العرض"}
                  onPress={handleSave} isLoading={saving}
                  style={{ marginTop: tokens.spacing.md, marginBottom: tokens.spacing.xl }} />
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </WorkspaceScreen>
  );
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function renderField(label: string, input: React.ReactNode, tokens: any) {
  return (
    <View style={{ marginBottom: tokens.spacing.md }}>
      <WorkspaceText color="secondary" style={{ fontSize: tokens.typography.sizes.sm, marginBottom: 4 }}>
        {label}
      </WorkspaceText>
      {input}
    </View>
  );
}

function inputStyle(colors: any, tokens: any) {
  return {
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: tokens.radius.sm,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    color: colors.textPrimary,
    fontFamily: tokens.typography.families.arabic,
    fontSize: tokens.typography.sizes.base,
  };
}
