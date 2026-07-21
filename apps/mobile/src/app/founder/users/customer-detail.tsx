import React, { useCallback, useEffect, useState } from "react";
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  ScrollView, Modal, ActivityIndicator, Alert, Switch,
  Image,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import {
  Edit2, Lock, Ban, CheckCircle, Trash2, Camera, MapPin,
} from "lucide-react-native";
import {
  FounderPageShell, AdminLoadingState, AdminErrorState,
} from "@/components/admin";
import { useAppTheme } from "@/contexts/ThemeContext";
import {
  getFounderCustomer, updateFounderCustomer, setFounderCustomerStatus,
  softDeleteFounderCustomer, resetUserPassword, pickAndUploadAvatar,
  getFounderZones,
  type FounderCustomer, type CustomerAddress, type FounderZone,
} from "@/services/founder-users.service";

// ─── Status config ─────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  active: "#00C853", suspended: "#FFD600", banned: "#D50000",
};
const STATUS_LABELS: Record<string, string> = {
  active: "نشط", suspended: "موقوف", banned: "محظور",
};

const NEXT_STATUSES: Record<string, Array<{ value: string; label: string; color: string }>> = {
  active:    [{ value: "suspended", label: "تعليق الحساب",  color: "#FFD600" }, { value: "banned", label: "حظر الحساب", color: "#D50000" }],
  suspended: [{ value: "active",    label: "إعادة تفعيل",   color: "#00C853" }, { value: "banned", label: "حظر الحساب", color: "#D50000" }],
  banned:    [{ value: "active",    label: "إعادة تفعيل",   color: "#00C853" }, { value: "suspended", label: "تعليق",   color: "#FFD600" }],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
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
  return (
    <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: "700", textAlign: "right", textTransform: "uppercase", marginTop: 20, marginBottom: 8 }}>
      {title}
    </Text>
  );
}

function ActionBtn({ label, color, icon, onPress, disabled }: { label: string; color: string; icon: React.ReactNode; onPress: () => void; disabled?: boolean }) {
  const { tokens } = useAppTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[styles.actionBtn, { backgroundColor: color + "18", borderColor: color + "44", borderRadius: tokens.radius.md, opacity: disabled ? 0.5 : 1 }]}
    >
      {icon}
      <Text style={{ color, fontSize: 12, fontWeight: "700", textAlign: "center", marginTop: 4 }}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, tokens } = useAppTheme();

  const [customer, setCustomer] = useState<FounderCustomer | null>(null);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [ordersCount, setOrdersCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zones, setZones] = useState<FounderZone[]>([]);

  // Modals
  const [showEdit, setShowEdit] = useState(false);
  const [showStatus, setShowStatus] = useState(false);
  const [showPwReset, setShowPwReset] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showZonePicker, setShowZonePicker] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editGold, setEditGold] = useState(false);
  const [editNotes, setEditNotes] = useState("");
  const [editZone, setEditZone] = useState<FounderZone | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Password reset
  const [newPw, setNewPw] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);

  // Status change
  const [statusLoading, setStatusLoading] = useState(false);

  // Avatar upload
  const [avatarLoading, setAvatarLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    const [res, zonesData] = await Promise.all([
      getFounderCustomer(id),
      getFounderZones(),
    ]);
    setZones(zonesData);
    if (res.error || !res.customer) {
      setError(res.error ?? "الزبون غير موجود");
    } else {
      const c = res.customer;
      setCustomer(c);
      setAddresses(res.addresses);
      setOrdersCount(res.ordersCount);
      setEditName(c.full_name ?? "");
      setEditPhone(c.phone ?? "");
      setEditEmail(c.email ?? "");
      setEditAddress(c.address ?? "");
      setEditGold(c.is_gold_member ?? false);
      setEditNotes(c.admin_notes ?? "");
      setEditZone(zonesData.find((z) => z.id === c.zone_id) ?? null);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    setSaveError(null);
    const { error: err } = await updateFounderCustomer(id, {
      full_name: editName.trim(),
      phone: editPhone.trim(),
      email: editEmail.trim(),
      address: editAddress.trim() || undefined,
      is_gold_member: editGold,
      admin_notes: editNotes.trim() || undefined,
      zone_id: editZone?.id ?? undefined,
    });
    setSaving(false);
    if (err) { setSaveError(err); } else { setShowEdit(false); loadData(); }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!id) return;
    setStatusLoading(true);
    await setFounderCustomerStatus(id, newStatus);
    setStatusLoading(false);
    setShowStatus(false);
    loadData();
  };

  const handlePasswordReset = async () => {
    if (!id || newPw.length < 8) { setPwError("كلمة المرور يجب أن تكون 8 أحرف على الأقل"); return; }
    setPwLoading(true);
    setPwError(null);
    const { error: err } = await resetUserPassword(id, newPw);
    setPwLoading(false);
    if (err) { setPwError(err); } else { setPwSuccess(true); setTimeout(() => { setShowPwReset(false); setPwSuccess(false); setNewPw(""); }, 2000); }
  };

  const handleDelete = async () => {
    if (!id) return;
    await softDeleteFounderCustomer(id);
    setShowDeleteConfirm(false);
    loadData();
  };

  const handleAvatarUpload = async () => {
    if (!id) return;
    setAvatarLoading(true);
    const { url, error: err } = await pickAndUploadAvatar(id);
    if (url) {
      await updateFounderCustomer(id, { avatar_url: url });
      loadData();
    } else if (err) {
      Alert.alert("خطأ", err);
    }
    setAvatarLoading(false);
  };

  if (loading) return <FounderPageShell title="..." showBack><AdminLoadingState /></FounderPageShell>;
  if (error || !customer) return <FounderPageShell title="خطأ" showBack><AdminErrorState message={error ?? "غير موجود"} onRetry={loadData} /></FounderPageShell>;

  const statusColor = STATUS_COLORS[customer.status] ?? colors.primary;

  return (
    <FounderPageShell title="ملف الزبون" showBack scrollable={false}>
      <ScrollView contentContainerStyle={{ padding: tokens.spacing.lg, paddingBottom: 80 }} showsVerticalScrollIndicator={false}>

        {/* ── Avatar + name + status ────────────────────────────────── */}
        <View style={[styles.profileCard, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]}>
          <TouchableOpacity onPress={handleAvatarUpload} disabled={avatarLoading} style={styles.avatarWrap}>
            {avatarLoading ? (
              <View style={[styles.avatar, { backgroundColor: colors.bgSurface, alignItems: "center", justifyContent: "center" }]}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : customer.avatar_url ? (
              <Image source={{ uri: customer.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: colors.bgSurface, alignItems: "center", justifyContent: "center" }]}>
                <Text style={{ fontSize: 32 }}>👤</Text>
              </View>
            )}
            <View style={[styles.cameraIcon, { backgroundColor: colors.primary }]}>
              <Camera size={12} color="#fff" />
            </View>
          </TouchableOpacity>

          <Text style={{ color: colors.textPrimary, fontSize: 20, fontWeight: "700", textAlign: "right", flex: 1 }}>
            {customer.full_name}{customer.is_gold_member ? " 🥇" : ""}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + "22" }]}>
            <Text style={{ color: statusColor, fontSize: 12, fontWeight: "700" }}>
              {customer.deleted_at ? "محذوف" : STATUS_LABELS[customer.status] ?? customer.status}
            </Text>
          </View>
        </View>

        {/* ── Action buttons ─────────────────────────────────────────── */}
        {!customer.deleted_at && (
          <View style={styles.actions}>
            <ActionBtn label="تعديل" color={colors.primary} icon={<Edit2 size={18} color={colors.primary} />} onPress={() => setShowEdit(true)} />
            <ActionBtn label="الحالة" color={statusColor} icon={<CheckCircle size={18} color={statusColor} />} onPress={() => setShowStatus(true)} />
            <ActionBtn label="كلمة المرور" color={colors.info} icon={<Lock size={18} color={colors.info} />} onPress={() => setShowPwReset(true)} />
            <ActionBtn label="حذف" color={colors.error} icon={<Trash2 size={18} color={colors.error} />} onPress={() => setShowDeleteConfirm(true)} />
          </View>
        )}

        {/* ── Info ──────────────────────────────────────────────────── */}
        <SectionHeader title="المعلومات الأساسية" />
        <View style={[styles.infoCard, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]}>
          <InfoRow label="البريد الإلكتروني" value={customer.email} />
          <InfoRow label="رقم الهاتف" value={customer.phone} />
          <InfoRow label="المنطقة" value={zones.find((z) => z.id === customer.zone_id)?.name ?? "—"} />
          <InfoRow label="العنوان" value={customer.address ?? "—"} />
          <InfoRow label="عضو ذهبي" value={customer.is_gold_member ? "نعم 🥇" : "لا"} />
          <InfoRow label="الطلبات" value={String(ordersCount)} />
          <InfoRow label="تاريخ الانضمام" value={new Date(customer.created_at).toLocaleDateString("ar-DZ")} />
          {customer.deleted_at && (
            <InfoRow label="تاريخ الحذف" value={new Date(customer.deleted_at).toLocaleDateString("ar-DZ")} />
          )}
        </View>

        {/* ── Addresses ─────────────────────────────────────────────── */}
        <SectionHeader title={`العناوين (${addresses.length})`} />
        {addresses.length === 0 ? (
          <Text style={{ color: colors.textDisabled, textAlign: "right", fontSize: 13 }}>لا توجد عناوين مسجّلة</Text>
        ) : (
          addresses.map((a) => (
            <View key={a.id} style={[styles.addressCard, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]}>
              <View style={styles.addressRow}>
                <MapPin size={14} color={a.is_default ? colors.primary : colors.textDisabled} />
                {a.is_default && <Text style={{ color: colors.primary, fontSize: 11, fontWeight: "700" }}>افتراضي</Text>}
                {a.label && <Text style={{ color: colors.textSecondary, fontSize: 11 }}>{a.label}</Text>}
              </View>
              <Text style={{ color: colors.textPrimary, textAlign: "right", fontSize: 14 }}>{a.address_line1}</Text>
              <Text style={{ color: colors.textSecondary, textAlign: "right", fontSize: 13 }}>{a.city}</Text>
            </View>
          ))
        )}

        {/* ── Admin notes ────────────────────────────────────────────── */}
        <SectionHeader title="ملاحظات الإدارة" />
        <View style={[styles.notesCard, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]}>
          <Text style={{ color: customer.admin_notes ? colors.textPrimary : colors.textDisabled, textAlign: "right", fontSize: 14, lineHeight: 22 }}>
            {customer.admin_notes || "لا توجد ملاحظات"}
          </Text>
        </View>
      </ScrollView>

      {/* ── Edit modal ────────────────────────────────────────────────── */}
      <Modal visible={showEdit} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: colors.bgSurface }]}>
            <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>تعديل بيانات الزبون</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {[
                { label: "الاسم الكامل", value: editName, setter: setEditName },
                { label: "رقم الهاتف", value: editPhone, setter: setEditPhone },
                { label: "البريد الإلكتروني", value: editEmail, setter: setEditEmail },
                { label: "العنوان", value: editAddress, setter: setEditAddress },
              ].map(({ label, value, setter }) => (
                <View key={label} style={{ marginBottom: 12 }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 12, textAlign: "right", marginBottom: 4 }}>{label}</Text>
                  <TextInput value={value} onChangeText={setter} textAlign="right" style={[styles.modalInput, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle, color: colors.textPrimary }]} />
                </View>
              ))}

              <TouchableOpacity onPress={() => setShowZonePicker(true)} style={[styles.modalInput, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle, justifyContent: "flex-end" }]}>
                <Text style={{ color: editZone ? colors.textPrimary : colors.textDisabled, textAlign: "right" }}>
                  {editZone ? editZone.name : "اختر المنطقة"}
                </Text>
              </TouchableOpacity>

              <View style={[styles.switchRow, { borderColor: colors.borderSubtle, marginBottom: 12 }]}>
                <Switch value={editGold} onValueChange={setEditGold} trackColor={{ false: colors.borderSubtle, true: colors.primary }} />
                <Text style={{ color: colors.textPrimary, flex: 1, textAlign: "right" }}>عضو ذهبي 🥇</Text>
              </View>

              <Text style={{ color: colors.textSecondary, fontSize: 12, textAlign: "right", marginBottom: 4 }}>ملاحظات الإدارة</Text>
              <TextInput
                value={editNotes}
                onChangeText={setEditNotes}
                multiline
                numberOfLines={3}
                textAlign="right"
                style={[styles.modalInput, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle, color: colors.textPrimary, minHeight: 80, textAlignVertical: "top" }]}
              />

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

      {/* ── Status modal ──────────────────────────────────────────────── */}
      <Modal visible={showStatus} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: colors.bgSurface }]}>
            <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>تغيير الحالة</Text>
            {statusLoading ? <ActivityIndicator color={colors.primary} /> : (
              (NEXT_STATUSES[customer?.status ?? "active"] ?? []).map((opt) => (
                <TouchableOpacity key={opt.value} onPress={() => handleStatusChange(opt.value)}
                  style={[styles.filterOpt, { borderColor: opt.color + "44", backgroundColor: opt.color + "18" }]}
                >
                  <Text style={{ color: opt.color, textAlign: "right", fontWeight: "700", fontSize: 15 }}>{opt.label}</Text>
                </TouchableOpacity>
              ))
            )}
            <TouchableOpacity onPress={() => setShowStatus(false)} style={{ marginTop: 12, alignItems: "center" }}>
              <Text style={{ color: colors.textSecondary }}>إلغاء</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Password reset modal ──────────────────────────────────────── */}
      <Modal visible={showPwReset} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: colors.bgSurface }]}>
            <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>إعادة تعيين كلمة المرور</Text>
            <Text style={{ color: colors.textSecondary, textAlign: "right", fontSize: 13, marginBottom: 12 }}>
              أدخل كلمة مرور جديدة للزبون (8 أحرف على الأقل)
            </Text>
            <TextInput value={newPw} onChangeText={setNewPw} secureTextEntry textAlign="right" placeholder="كلمة مرور جديدة" placeholderTextColor={colors.textDisabled}
              style={[styles.modalInput, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle, color: colors.textPrimary }]} />
            {pwError && <Text style={{ color: colors.error, textAlign: "right", fontSize: 13, marginTop: 8 }}>{pwError}</Text>}
            {pwSuccess && <Text style={{ color: colors.success, textAlign: "right", fontSize: 13, marginTop: 8 }}>تم بنجاح ✓</Text>}
            <View style={{ flexDirection: "row-reverse", gap: 10, marginTop: 16 }}>
              <TouchableOpacity onPress={handlePasswordReset} disabled={pwLoading}
                style={[styles.saveBtn, { backgroundColor: colors.info, flex: 1 }]}>
                {pwLoading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontWeight: "700", textAlign: "center" }}>إعادة التعيين</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setShowPwReset(false); setNewPw(""); setPwError(null); }}
                style={[styles.saveBtn, { backgroundColor: colors.bgElevated, flex: 1, borderWidth: 1, borderColor: colors.borderSubtle }]}>
                <Text style={{ color: colors.textSecondary, textAlign: "center" }}>إلغاء</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Delete confirm modal ──────────────────────────────────────── */}
      <Modal visible={showDeleteConfirm} transparent animationType="fade">
        <View style={[styles.overlay, { justifyContent: "center", padding: 24 }]}>
          <View style={[styles.confirmBox, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
            <Text style={{ fontSize: 40, textAlign: "center", marginBottom: 12 }}>⚠️</Text>
            <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: "700", textAlign: "center", marginBottom: 8 }}>تأكيد الحذف</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 14, textAlign: "center", lineHeight: 22 }}>
              سيتم تعطيل حساب الزبون وحفظ البيانات. لا يمكن لأحد الوصول إليه بعد ذلك.
            </Text>
            <View style={{ flexDirection: "row-reverse", gap: 10, marginTop: 20 }}>
              <TouchableOpacity onPress={handleDelete} style={[styles.saveBtn, { backgroundColor: colors.error, flex: 1 }]}>
                <Text style={{ color: "#fff", fontWeight: "700", textAlign: "center" }}>تأكيد الحذف</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowDeleteConfirm(false)} style={[styles.saveBtn, { backgroundColor: colors.bgElevated, flex: 1, borderWidth: 1, borderColor: colors.borderSubtle }]}>
                <Text style={{ color: colors.textSecondary, textAlign: "center" }}>إلغاء</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Zone picker modal ─────────────────────────────────────────── */}
      <Modal visible={showZonePicker} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: colors.bgSurface }]}>
            <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>اختر المنطقة</Text>
            <ScrollView>
              <TouchableOpacity onPress={() => { setEditZone(null); setShowZonePicker(false); }} style={[styles.filterOpt, { borderColor: colors.borderSubtle }]}>
                <Text style={{ color: colors.textSecondary, textAlign: "right" }}>بدون منطقة</Text>
              </TouchableOpacity>
              {zones.map((z) => (
                <TouchableOpacity key={z.id} onPress={() => { setEditZone(z); setShowZonePicker(false); }}
                  style={[styles.filterOpt, { borderColor: editZone?.id === z.id ? colors.primary : colors.borderSubtle, backgroundColor: editZone?.id === z.id ? colors.primary + "18" : "transparent" }]}>
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
    </FounderPageShell>
  );
}

const styles = StyleSheet.create({
  profileCard: { flexDirection: "row-reverse", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 12, padding: 16, marginBottom: 16 },
  avatar: { width: 72, height: 72, borderRadius: 36 },
  avatarWrap: { position: "relative" },
  cameraIcon: { position: "absolute", bottom: 0, right: 0, width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  actions: { flexDirection: "row-reverse", gap: 8, marginBottom: 4 },
  actionBtn: { flex: 1, borderWidth: 1, borderRadius: 10, padding: 10, alignItems: "center", gap: 4 },
  infoCard: { borderWidth: 1, borderRadius: 12, overflow: "hidden" },
  infoRow: { flexDirection: "row-reverse", padding: 12, borderBottomWidth: 1, gap: 8 },
  addressCard: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 8, gap: 4 },
  addressRow: { flexDirection: "row-reverse", gap: 6, alignItems: "center" },
  notesCard: { borderWidth: 1, borderRadius: 10, padding: 12, minHeight: 60 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40, maxHeight: "85%" },
  sheetTitle: { fontSize: 17, fontWeight: "700", textAlign: "right", marginBottom: 16 },
  modalInput: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 15, textAlign: "right" },
  saveBtn: { borderRadius: 10, padding: 14, alignItems: "center" },
  filterOpt: { borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 8 },
  confirmBox: { borderWidth: 1, borderRadius: 16, padding: 24 },
  switchRow: { flexDirection: "row-reverse", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 12 },
});
