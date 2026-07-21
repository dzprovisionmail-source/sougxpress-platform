import React, { useCallback, useEffect, useState } from "react";
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  ScrollView, Modal, ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Edit2, CheckCircle, Trash2, Store } from "lucide-react-native";
import {
  AdminPageShell, AdminLoadingState, AdminErrorState,
} from "@/components/admin";
import { useAppTheme } from "@/contexts/ThemeContext";
import {
  getFounderMerchant, updateFounderMerchant, setFounderMerchantStatus,
  softDeleteFounderMerchant, getFounderZones,
  type FounderMerchant, type FounderZone,
} from "@/services/founder-users.service";

const STATUS_COLORS: Record<string, string> = {
  pending_review: "#FFD600",
  active:         "#00C853",
  suspended:      "#FF8A00",
  rejected:       "#D50000",
};
const STATUS_LABELS: Record<string, string> = {
  pending_review: "ينتظر الموافقة",
  active:         "نشط",
  suspended:      "موقوف",
  rejected:       "مرفوض",
};
const STATUS_TRANSITIONS: Array<{ value: string; label: string; color: string }> = [
  { value: "active",         label: "الموافقة وتفعيل",   color: "#00C853" },
  { value: "suspended",      label: "تعليق الحساب",       color: "#FF8A00" },
  { value: "rejected",       label: "رفض الطلب",          color: "#D50000" },
  { value: "pending_review", label: "إعادة للمراجعة",    color: "#FFD600" },
];

function InfoRow({ label, value }: { label: string; value: string }) {
  const { colors, tokens } = useAppTheme();
  return (
    <View style={[styles.infoRow, { borderColor: colors.borderSubtle }]}>
      <Text style={{ color: colors.textSecondary, fontSize: tokens.typography.sizes.sm, textAlign: "right", flex: 1 }}>{label}</Text>
      <Text style={{ color: colors.textPrimary, fontSize: tokens.typography.sizes.base, textAlign: "right", flex: 2, fontWeight: "500" }} numberOfLines={2}>{value || "—"}</Text>
    </View>
  );
}

function SectionHeader({ title }: { title: string }) {
  const { colors } = useAppTheme();
  return <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: "700", textAlign: "right", textTransform: "uppercase", marginTop: 20, marginBottom: 8 }}>{title}</Text>;
}

function ActionBtn({ label, color, icon, onPress }: { label: string; color: string; icon: React.ReactNode; onPress: () => void }) {
  const { tokens } = useAppTheme();
  return (
    <TouchableOpacity onPress={onPress} style={[styles.actionBtn, { backgroundColor: color + "18", borderColor: color + "44", borderRadius: tokens.radius.md }]}>
      {icon}
      <Text style={{ color, fontSize: 12, fontWeight: "700", textAlign: "center", marginTop: 4 }}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function MerchantDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, tokens } = useAppTheme();

  const [merchant, setMerchant] = useState<FounderMerchant | null>(null);
  const [stores, setStores] = useState<Record<string, unknown>[]>([]);
  const [ordersCount, setOrdersCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zones, setZones] = useState<FounderZone[]>([]);

  const [showEdit, setShowEdit] = useState(false);
  const [showStatus, setShowStatus] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showZonePicker, setShowZonePicker] = useState(false);

  const [editOwner, setEditOwner] = useState("");
  const [editBusiness, setEditBusiness] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editZone, setEditZone] = useState<FounderZone | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    const [res, zonesData] = await Promise.all([getFounderMerchant(id), getFounderZones()]);
    setZones(zonesData);
    if (res.error || !res.merchant) {
      setError(res.error ?? "التاجر غير موجود");
    } else {
      const m = res.merchant;
      setMerchant(m);
      setStores(res.stores);
      setOrdersCount(res.ordersCount);
      setEditOwner(m.owner_full_name ?? "");
      setEditBusiness(m.business_name ?? "");
      setEditPhone(m.phone ?? "");
      setEditEmail(m.email ?? "");
      setEditAddress(m.address ?? "");
      setEditDescription(m.description ?? "");
      setEditNotes(m.admin_notes ?? "");
      setEditZone(zonesData.find((z) => z.id === m.zone_id) ?? null);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSave = async () => {
    if (!id) return;
    setSaving(true); setSaveError(null);
    const { error: err } = await updateFounderMerchant(id, {
      owner_full_name: editOwner.trim(),
      business_name:   editBusiness.trim(),
      phone:           editPhone.trim(),
      email:           editEmail.trim(),
      address:         editAddress.trim() || undefined,
      description:     editDescription.trim() || undefined,
      admin_notes:     editNotes.trim() || undefined,
      zone_id:         editZone?.id ?? undefined,
    });
    setSaving(false);
    if (err) setSaveError(err); else { setShowEdit(false); loadData(); }
  };

  const handleStatusChange = async (s: string) => {
    if (!id) return;
    setStatusLoading(true);
    await setFounderMerchantStatus(id, s);
    setStatusLoading(false);
    setShowStatus(false);
    loadData();
  };

  const handleDelete = async () => {
    if (!id) return;
    await softDeleteFounderMerchant(id);
    setShowDeleteConfirm(false);
    loadData();
  };

  if (loading) return <AdminPageShell showLogout title="..." showBack><AdminLoadingState /></AdminPageShell>;
  if (error || !merchant) return <AdminPageShell showLogout title="خطأ" showBack><AdminErrorState message={error ?? "غير موجود"} onRetry={loadData} /></AdminPageShell>;

  const statusColor = STATUS_COLORS[merchant.status] ?? colors.primary;

  return (
    <AdminPageShell showLogout title="ملف التاجر" showBack scrollable={false}>
      <ScrollView contentContainerStyle={{ padding: tokens.spacing.lg, paddingBottom: 80 }} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={[styles.profileCard, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]}>
          <View style={[styles.iconWrap, { backgroundColor: statusColor + "18" }]}>
            <Store size={28} color={statusColor} />
          </View>
          <View style={{ flex: 1, alignItems: "flex-end" }}>
            <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: "700", textAlign: "right" }}>{merchant.business_name}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: "right" }}>{merchant.owner_full_name}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + "22" }]}>
            <Text style={{ color: statusColor, fontSize: 12, fontWeight: "700" }}>
              {merchant.deleted_at ? "محذوف" : STATUS_LABELS[merchant.status] ?? merchant.status}
            </Text>
          </View>
        </View>

        {/* Actions */}
        {!merchant.deleted_at && (
          <View style={styles.actions}>
            <ActionBtn label="تعديل" color={colors.primary} icon={<Edit2 size={18} color={colors.primary} />} onPress={() => setShowEdit(true)} />
            <ActionBtn label="الحالة" color={statusColor} icon={<CheckCircle size={18} color={statusColor} />} onPress={() => setShowStatus(true)} />
            <ActionBtn label="حذف" color={colors.error} icon={<Trash2 size={18} color={colors.error} />} onPress={() => setShowDeleteConfirm(true)} />
          </View>
        )}

        {/* Info */}
        <SectionHeader title="المعلومات الأساسية" />
        <View style={[styles.infoCard, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]}>
          <InfoRow label="رقم الهاتف"       value={merchant.phone} />
          <InfoRow label="البريد الإلكتروني" value={merchant.email} />
          <InfoRow label="المنطقة"           value={zones.find((z) => z.id === merchant.zone_id)?.name ?? "—"} />
          <InfoRow label="العنوان"           value={merchant.address ?? "—"} />
          <InfoRow label="الوصف"            value={merchant.description ?? "—"} />
          <InfoRow label="نسبة العمولة"      value={`${merchant.commission_rate ?? 0}%`} />
          <InfoRow label="إجمالي الطلبات"    value={String(ordersCount)} />
          <InfoRow label="تاريخ الانضمام"   value={new Date(merchant.created_at).toLocaleDateString("ar-DZ")} />
        </View>

        {/* Stores */}
        <SectionHeader title={`المتاجر (${stores.length})`} />
        {stores.length === 0 ? (
          <Text style={{ color: colors.textDisabled, textAlign: "right", fontSize: 13 }}>لا توجد متاجر مرتبطة</Text>
        ) : (
          stores.map((s) => (
            <View key={String(s["id"])} style={[styles.storeCard, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]}>
              <Text style={{ color: colors.textPrimary, fontWeight: "600", textAlign: "right" }}>{String(s["name"] ?? "")}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12, textAlign: "right" }}>{String(s["category"] ?? "")} · {String(s["status"] ?? "")}</Text>
            </View>
          ))
        )}

        {/* Admin notes */}
        <SectionHeader title="ملاحظات الإدارة" />
        <View style={[styles.notesCard, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]}>
          <Text style={{ color: merchant.admin_notes ? colors.textPrimary : colors.textDisabled, textAlign: "right", fontSize: 14, lineHeight: 22 }}>
            {merchant.admin_notes || "لا توجد ملاحظات"}
          </Text>
        </View>
      </ScrollView>

      {/* Edit modal */}
      <Modal visible={showEdit} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: colors.bgSurface }]}>
            <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>تعديل بيانات التاجر</Text>
            <ScrollView>
              {[
                { label: "اسم المالك",   value: editOwner,       setter: setEditOwner },
                { label: "اسم التجارة", value: editBusiness,    setter: setEditBusiness },
                { label: "رقم الهاتف",  value: editPhone,       setter: setEditPhone },
                { label: "البريد الإلكتروني", value: editEmail, setter: setEditEmail },
                { label: "العنوان",     value: editAddress,     setter: setEditAddress },
                { label: "وصف التجارة", value: editDescription, setter: setEditDescription },
              ].map(({ label, value, setter }) => (
                <View key={label} style={{ marginBottom: 12 }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 12, textAlign: "right", marginBottom: 4 }}>{label}</Text>
                  <TextInput value={value} onChangeText={setter} textAlign="right" style={[styles.modalInput, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle, color: colors.textPrimary }]} />
                </View>
              ))}
              <TouchableOpacity onPress={() => setShowZonePicker(true)} style={[styles.modalInput, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle, justifyContent: "flex-end", marginBottom: 12 }]}>
                <Text style={{ color: editZone ? colors.textPrimary : colors.textDisabled, textAlign: "right" }}>{editZone ? editZone.name : "اختر المنطقة"}</Text>
              </TouchableOpacity>
              <Text style={{ color: colors.textSecondary, fontSize: 12, textAlign: "right", marginBottom: 4 }}>ملاحظات الإدارة</Text>
              <TextInput value={editNotes} onChangeText={setEditNotes} multiline numberOfLines={3} textAlign="right"
                style={[styles.modalInput, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle, color: colors.textPrimary, minHeight: 80, textAlignVertical: "top" }]} />
              {saveError && <Text style={{ color: colors.error, textAlign: "right", marginTop: 8, fontSize: 13 }}>{saveError}</Text>}
              <View style={{ flexDirection: "row-reverse", gap: 10, marginTop: 16 }}>
                <TouchableOpacity onPress={handleSave} disabled={saving} style={[styles.saveBtn, { backgroundColor: colors.primary, flex: 1 }]}>
                  {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontWeight: "700", textAlign: "center" }}>حفظ</Text>}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setShowEdit(false); setSaveError(null); }} style={[styles.saveBtn, { backgroundColor: colors.bgElevated, flex: 1, borderWidth: 1, borderColor: colors.borderSubtle }]}>
                  <Text style={{ color: colors.textSecondary, textAlign: "center" }}>إلغاء</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Status modal */}
      <Modal visible={showStatus} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: colors.bgSurface }]}>
            <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>تغيير الحالة</Text>
            {statusLoading ? <ActivityIndicator color={colors.primary} /> : (
              STATUS_TRANSITIONS.filter((t) => t.value !== merchant.status).map((opt) => (
                <TouchableOpacity key={opt.value} onPress={() => handleStatusChange(opt.value)}
                  style={[styles.filterOpt, { borderColor: opt.color + "44", backgroundColor: opt.color + "18", marginBottom: 8 }]}>
                  <Text style={{ color: opt.color, textAlign: "right", fontWeight: "700", fontSize: 15 }}>{opt.label}</Text>
                </TouchableOpacity>
              ))
            )}
            <TouchableOpacity onPress={() => setShowStatus(false)} style={{ marginTop: 8, alignItems: "center" }}>
              <Text style={{ color: colors.textSecondary }}>إلغاء</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Delete confirm */}
      <Modal visible={showDeleteConfirm} transparent animationType="fade">
        <View style={[styles.overlay, { justifyContent: "center", padding: 24 }]}>
          <View style={[styles.confirmBox, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
            <Text style={{ fontSize: 40, textAlign: "center", marginBottom: 12 }}>⚠️</Text>
            <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: "700", textAlign: "center", marginBottom: 8 }}>تأكيد الحذف</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 14, textAlign: "center", lineHeight: 22 }}>
              سيتم تعطيل حساب التاجر. لا يمكن لأحد الوصول إليه بعد ذلك.
            </Text>
            <View style={{ flexDirection: "row-reverse", gap: 10, marginTop: 20 }}>
              <TouchableOpacity onPress={handleDelete} style={[styles.saveBtn, { backgroundColor: colors.error, flex: 1 }]}>
                <Text style={{ color: "#fff", fontWeight: "700", textAlign: "center" }}>تأكيد</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowDeleteConfirm(false)} style={[styles.saveBtn, { backgroundColor: colors.bgElevated, flex: 1, borderWidth: 1, borderColor: colors.borderSubtle }]}>
                <Text style={{ color: colors.textSecondary, textAlign: "center" }}>إلغاء</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Zone picker */}
      <Modal visible={showZonePicker} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: colors.bgSurface }]}>
            <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>اختر المنطقة</Text>
            <ScrollView>
              <TouchableOpacity onPress={() => { setEditZone(null); setShowZonePicker(false); }} style={[styles.filterOpt, { borderColor: colors.borderSubtle, marginBottom: 8 }]}>
                <Text style={{ color: colors.textSecondary, textAlign: "right" }}>بدون منطقة</Text>
              </TouchableOpacity>
              {zones.map((z) => (
                <TouchableOpacity key={z.id} onPress={() => { setEditZone(z); setShowZonePicker(false); }}
                  style={[styles.filterOpt, { borderColor: editZone?.id === z.id ? colors.primary : colors.borderSubtle, backgroundColor: editZone?.id === z.id ? colors.primary + "18" : "transparent", marginBottom: 8 }]}>
                  <Text style={{ color: colors.textPrimary, textAlign: "right", fontWeight: "600" }}>{z.name}</Text>
                  <Text style={{ color: colors.textSecondary, textAlign: "right", fontSize: 12 }}>{z.city}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity onPress={() => setShowZonePicker(false)} style={{ marginTop: 12, alignItems: "center" }}>
              <Text style={{ color: colors.error, fontSize: 14 }}>إغلاق</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </AdminPageShell>
  );
}

const styles = StyleSheet.create({
  profileCard: { flexDirection: "row-reverse", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 12, padding: 16, marginBottom: 16 },
  iconWrap: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  actions: { flexDirection: "row-reverse", gap: 8, marginBottom: 4 },
  actionBtn: { flex: 1, borderWidth: 1, borderRadius: 10, padding: 10, alignItems: "center", gap: 4 },
  infoCard: { borderWidth: 1, borderRadius: 12, overflow: "hidden" },
  infoRow: { flexDirection: "row-reverse", padding: 12, borderBottomWidth: 1, gap: 8 },
  storeCard: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 8, gap: 4 },
  notesCard: { borderWidth: 1, borderRadius: 10, padding: 12, minHeight: 60 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40, maxHeight: "85%" },
  sheetTitle: { fontSize: 17, fontWeight: "700", textAlign: "right", marginBottom: 16 },
  modalInput: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 15, textAlign: "right" },
  saveBtn: { borderRadius: 10, padding: 14, alignItems: "center" },
  filterOpt: { borderWidth: 1, borderRadius: 8, padding: 12 },
  confirmBox: { borderWidth: 1, borderRadius: 16, padding: 24 },
});
