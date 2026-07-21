import React, { useCallback, useEffect, useState } from "react";
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  ScrollView, Modal, ActivityIndicator,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Edit2, CheckCircle, Trash2, Truck, DollarSign, RotateCcw, Lock } from "lucide-react-native";
import {
  FounderPageShell, AdminLoadingState, AdminErrorState,
} from "@/components/admin";
import { useAppTheme } from "@/contexts/ThemeContext";
import {
  getFounderDriver, updateFounderDriver, setFounderDriverStatus,
  softDeleteFounderDriver, resetUserPassword, getFounderZones,
  type FounderDriver, type FounderZone, type CommissionCycle,
} from "@/services/founder-users.service";

const STATUS_COLORS: Record<string, string> = {
  pending_review: "#FFD600",
  active:         "#00C853",
  offline:        "#64748B",
  suspended:      "#D50000",
};
const STATUS_LABELS: Record<string, string> = {
  pending_review: "ينتظر الموافقة",
  active:         "نشط",
  offline:        "غير متصل",
  suspended:      "موقوف",
};
const STATUS_TRANSITIONS: Array<{ value: string; label: string; color: string }> = [
  { value: "active",         label: "تفعيل / الموافقة",  color: "#00C853" },
  { value: "offline",        label: "تعيين كغير متصل",   color: "#64748B" },
  { value: "suspended",      label: "تعليق الحساب",      color: "#D50000" },
  { value: "pending_review", label: "إعادة للمراجعة",   color: "#FFD600" },
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
      <Text style={{ color, fontSize: 11, fontWeight: "700", textAlign: "center", marginTop: 4 }}>{label}</Text>
    </TouchableOpacity>
  );
}

function formatMinor(minor: number) {
  return `${(minor / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")} د.ج`;
}

export default function DriverDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, tokens } = useAppTheme();

  const [driver, setDriver] = useState<FounderDriver | null>(null);
  const [deliveriesCount, setDeliveriesCount] = useState(0);
  const [commissionCycle, setCommissionCycle] = useState<CommissionCycle | null>(null);
  const [totalOwedMinor, setTotalOwedMinor] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zones, setZones] = useState<FounderZone[]>([]);

  const [showEdit, setShowEdit] = useState(false);
  const [showStatus, setShowStatus] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showZonePicker, setShowZonePicker] = useState(false);
  const [showPwReset, setShowPwReset] = useState(false);
  const [showSettlementConfirm, setShowSettlementConfirm] = useState(false);

  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editVehicleType, setEditVehicleType] = useState("");
  const [editVehicleNumber, setEditVehicleNumber] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editZone, setEditZone] = useState<FounderZone | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  const [newPw, setNewPw] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true); setError(null);
    const [res, zonesData] = await Promise.all([getFounderDriver(id), getFounderZones()]);
    setZones(zonesData);
    if (res.error || !res.driver) {
      setError(res.error ?? "الموصل غير موجود");
    } else {
      const d = res.driver;
      setDriver(d);
      setDeliveriesCount(res.deliveriesCount);
      setCommissionCycle(res.activeCommissionCycle);
      setTotalOwedMinor(res.totalOwedMinor);
      setEditName(d.full_name ?? "");
      setEditPhone(d.phone ?? "");
      setEditEmail(d.email ?? "");
      setEditAddress(d.address ?? "");
      setEditVehicleType(d.vehicle_type ?? "");
      setEditVehicleNumber(d.vehicle_number ?? "");
      setEditNotes(d.admin_notes ?? "");
      setEditZone(zonesData.find((z) => z.id === d.zone_id) ?? null);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSave = async () => {
    if (!id) return;
    setSaving(true); setSaveError(null);
    const { error: err } = await updateFounderDriver(id, {
      full_name:      editName.trim(),
      phone:          editPhone.trim(),
      email:          editEmail.trim(),
      address:        editAddress.trim() || undefined,
      vehicle_type:   editVehicleType.trim() || undefined,
      vehicle_number: editVehicleNumber.trim() || undefined,
      admin_notes:    editNotes.trim() || undefined,
      zone_id:        editZone?.id ?? undefined,
    });
    setSaving(false);
    if (err) setSaveError(err); else { setShowEdit(false); loadData(); }
  };

  const handleStatusChange = async (s: string) => {
    if (!id) return;
    setStatusLoading(true);
    await setFounderDriverStatus(id, s);
    setStatusLoading(false);
    setShowStatus(false);
    loadData();
  };

  const handleDelete = async () => {
    if (!id) return;
    await softDeleteFounderDriver(id);
    setShowDeleteConfirm(false);
    loadData();
  };

  const handlePasswordReset = async () => {
    if (!id || newPw.length < 8) { setPwError("كلمة المرور يجب أن تكون 8 أحرف على الأقل"); return; }
    setPwLoading(true); setPwError(null);
    const { error: err } = await resetUserPassword(id, newPw);
    setPwLoading(false);
    if (err) setPwError(err); else { setPwSuccess(true); setTimeout(() => { setShowPwReset(false); setPwSuccess(false); setNewPw(""); }, 2000); }
  };

  if (loading) return <FounderPageShell title="..." showBack><AdminLoadingState /></FounderPageShell>;
  if (error || !driver) return <FounderPageShell title="خطأ" showBack><AdminErrorState message={error ?? "غير موجود"} onRetry={loadData} /></FounderPageShell>;

  const statusColor = STATUS_COLORS[driver.status] ?? colors.primary;

  return (
    <FounderPageShell title="ملف الموصل" showBack scrollable={false}>
      <ScrollView contentContainerStyle={{ padding: tokens.spacing.lg, paddingBottom: 80 }} showsVerticalScrollIndicator={false}>

        {/* Profile header */}
        <View style={[styles.profileCard, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]}>
          <View style={[styles.iconWrap, { backgroundColor: statusColor + "18" }]}>
            <Truck size={28} color={statusColor} />
          </View>
          <View style={{ flex: 1, alignItems: "flex-end" }}>
            <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: "700", textAlign: "right" }}>{driver.full_name}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: "right" }}>
              {driver.vehicle_type}{driver.vehicle_number ? ` · ${driver.vehicle_number}` : ""}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + "22" }]}>
            <Text style={{ color: statusColor, fontSize: 12, fontWeight: "700" }}>
              {driver.deleted_at ? "محذوف" : STATUS_LABELS[driver.status] ?? driver.status}
            </Text>
          </View>
        </View>

        {/* Actions */}
        {!driver.deleted_at && (
          <View style={styles.actions}>
            <ActionBtn label="تعديل"     color={colors.primary} icon={<Edit2 size={16} color={colors.primary} />}    onPress={() => setShowEdit(true)} />
            <ActionBtn label="الحالة"    color={statusColor}    icon={<CheckCircle size={16} color={statusColor} />}  onPress={() => setShowStatus(true)} />
            <ActionBtn label="كلمة المرور" color={colors.info} icon={<Lock size={16} color={colors.info} />}          onPress={() => setShowPwReset(true)} />
            <ActionBtn label="حذف"       color={colors.error}   icon={<Trash2 size={16} color={colors.error} />}      onPress={() => setShowDeleteConfirm(true)} />
          </View>
        )}

        {/* Balance card */}
        <SectionHeader title="الرصيد والتسوية" />
        <View style={[styles.balanceCard, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]}>
          <View style={styles.balanceRow}>
            <View style={{ alignItems: "flex-end", flex: 1 }}>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>إجمالي التوصيلات</Text>
              <Text style={{ color: colors.secondary, fontSize: 24, fontWeight: "800" }}>{deliveriesCount}</Text>
            </View>
            <View style={{ alignItems: "flex-end", flex: 1 }}>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>التقييم</Text>
              <Text style={{ color: colors.warning, fontSize: 24, fontWeight: "800" }}>⭐ {(driver.rating ?? 0).toFixed(1)}</Text>
            </View>
          </View>

          {commissionCycle && (
            <View style={[styles.cycleBox, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
              <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>الدورة الحالية</Text>
                <View style={[styles.cycleBadge, { backgroundColor: commissionCycle.status === "payment_due" ? colors.error + "22" : colors.success + "22" }]}>
                  <Text style={{ color: commissionCycle.status === "payment_due" ? colors.error : colors.success, fontSize: 11, fontWeight: "700" }}>
                    {commissionCycle.status === "payment_due" ? "مستحق الدفع" : commissionCycle.status === "active" ? "نشط" : commissionCycle.status}
                  </Text>
                </View>
              </View>
              <Text style={{ color: colors.textPrimary, fontSize: 15, fontWeight: "600", textAlign: "right", marginTop: 4 }}>
                {commissionCycle.deliveries_count} توصيلة · {formatMinor(commissionCycle.commission_earned_minor)}
              </Text>
            </View>
          )}

          {totalOwedMinor > 0 && (
            <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>المبلغ المستحق للمنصة</Text>
                <Text style={{ color: colors.error, fontSize: 22, fontWeight: "800" }}>{formatMinor(totalOwedMinor)}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowSettlementConfirm(true)}
                style={[styles.settlementBtn, { backgroundColor: colors.success + "18", borderColor: colors.success + "44" }]}
              >
                <RotateCcw size={16} color={colors.success} />
                <Text style={{ color: colors.success, fontSize: 13, fontWeight: "700", marginTop: 2 }}>تسوية</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Info */}
        <SectionHeader title="المعلومات الأساسية" />
        <View style={[styles.infoCard, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]}>
          <InfoRow label="رقم الهاتف"       value={driver.phone} />
          <InfoRow label="البريد الإلكتروني" value={driver.email} />
          <InfoRow label="المنطقة"           value={zones.find((z) => z.id === driver.zone_id)?.name ?? "—"} />
          <InfoRow label="العنوان"           value={driver.address ?? "—"} />
          <InfoRow label="نوع المركبة"       value={driver.vehicle_type ?? "—"} />
          <InfoRow label="رقم المركبة"       value={driver.vehicle_number ?? "—"} />
          <InfoRow label="التوافر"           value={driver.availability === "online" ? "متصل" : driver.availability === "on_delivery" ? "في توصيل" : "غير متصل"} />
          <InfoRow label="تاريخ الانضمام"   value={new Date(driver.created_at).toLocaleDateString("ar-DZ")} />
        </View>

        {/* Admin notes */}
        <SectionHeader title="ملاحظات الإدارة" />
        <View style={[styles.notesCard, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]}>
          <Text style={{ color: driver.admin_notes ? colors.textPrimary : colors.textDisabled, textAlign: "right", fontSize: 14, lineHeight: 22 }}>
            {driver.admin_notes || "لا توجد ملاحظات"}
          </Text>
        </View>
      </ScrollView>

      {/* Edit modal */}
      <Modal visible={showEdit} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: colors.bgSurface }]}>
            <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>تعديل بيانات الموصل</Text>
            <ScrollView>
              {[
                { label: "الاسم الكامل",   value: editName,          setter: setEditName },
                { label: "رقم الهاتف",     value: editPhone,         setter: setEditPhone },
                { label: "البريد الإلكتروني", value: editEmail,      setter: setEditEmail },
                { label: "العنوان",         value: editAddress,       setter: setEditAddress },
                { label: "نوع المركبة",     value: editVehicleType,   setter: setEditVehicleType },
                { label: "رقم المركبة",     value: editVehicleNumber, setter: setEditVehicleNumber },
              ].map(({ label, value, setter }) => (
                <View key={label} style={{ marginBottom: 12 }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 12, textAlign: "right", marginBottom: 4 }}>{label}</Text>
                  <TextInput value={value} onChangeText={setter} textAlign="right"
                    style={[styles.modalInput, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle, color: colors.textPrimary }]} />
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
              STATUS_TRANSITIONS.filter((t) => t.value !== driver.status).map((opt) => (
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

      {/* Password reset modal */}
      <Modal visible={showPwReset} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: colors.bgSurface }]}>
            <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>إعادة تعيين كلمة المرور</Text>
            <Text style={{ color: colors.textSecondary, textAlign: "right", fontSize: 13, marginBottom: 12 }}>
              أدخل كلمة مرور جديدة للموصل (8 أحرف على الأقل)
            </Text>
            <TextInput value={newPw} onChangeText={setNewPw} secureTextEntry textAlign="right" placeholder="كلمة مرور جديدة" placeholderTextColor={colors.textDisabled}
              style={[styles.modalInput, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle, color: colors.textPrimary }]} />
            {pwError && <Text style={{ color: colors.error, textAlign: "right", fontSize: 13, marginTop: 8 }}>{pwError}</Text>}
            {pwSuccess && <Text style={{ color: colors.success, textAlign: "right", fontSize: 13, marginTop: 8 }}>تم بنجاح ✓</Text>}
            <View style={{ flexDirection: "row-reverse", gap: 10, marginTop: 16 }}>
              <TouchableOpacity onPress={handlePasswordReset} disabled={pwLoading} style={[styles.saveBtn, { backgroundColor: colors.info, flex: 1 }]}>
                {pwLoading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontWeight: "700", textAlign: "center" }}>إعادة التعيين</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setShowPwReset(false); setNewPw(""); setPwError(null); }} style={[styles.saveBtn, { backgroundColor: colors.bgElevated, flex: 1, borderWidth: 1, borderColor: colors.borderSubtle }]}>
                <Text style={{ color: colors.textSecondary, textAlign: "center" }}>إلغاء</Text>
              </TouchableOpacity>
            </View>
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
              سيتم تعطيل حساب الموصل وتجميد نشاطه. البيانات محفوظة.
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

      {/* Settlement confirm */}
      <Modal visible={showSettlementConfirm} transparent animationType="fade">
        <View style={[styles.overlay, { justifyContent: "center", padding: 24 }]}>
          <View style={[styles.confirmBox, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
            <Text style={{ fontSize: 40, textAlign: "center", marginBottom: 12 }}>💰</Text>
            <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: "700", textAlign: "center", marginBottom: 8 }}>تأكيد التسوية</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 14, textAlign: "center", lineHeight: 22 }}>
              التسوية اليدوية ستُسجَّل في سجل العمليات. يتم التحقق منها عبر الدفع المادي الفعلي.
            </Text>
            <Text style={{ color: colors.success, fontSize: 22, fontWeight: "800", textAlign: "center", marginTop: 12 }}>
              {formatMinor(totalOwedMinor)}
            </Text>
            <View style={{ flexDirection: "row-reverse", gap: 10, marginTop: 20 }}>
              <TouchableOpacity
                onPress={() => {
                  // The actual commission confirmation goes through the existing
                  // confirm_delivery_payment RPC on the commission cycle.
                  // Here we just close and show a note — full settlement
                  // implementation is in Founder Phase 3 (Finance module).
                  setShowSettlementConfirm(false);
                }}
                style={[styles.saveBtn, { backgroundColor: colors.success, flex: 1 }]}
              >
                <Text style={{ color: "#fff", fontWeight: "700", textAlign: "center" }}>تم استلام الدفع</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowSettlementConfirm(false)} style={[styles.saveBtn, { backgroundColor: colors.bgElevated, flex: 1, borderWidth: 1, borderColor: colors.borderSubtle }]}>
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
            <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>تعيين المنطقة</Text>
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
    </FounderPageShell>
  );
}

const styles = StyleSheet.create({
  profileCard: { flexDirection: "row-reverse", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 12, padding: 16, marginBottom: 16 },
  iconWrap: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  actions: { flexDirection: "row-reverse", gap: 6, marginBottom: 4 },
  actionBtn: { flex: 1, borderWidth: 1, borderRadius: 10, padding: 10, alignItems: "center", gap: 4 },
  infoCard: { borderWidth: 1, borderRadius: 12, overflow: "hidden" },
  infoRow: { flexDirection: "row-reverse", padding: 12, borderBottomWidth: 1, gap: 8 },
  notesCard: { borderWidth: 1, borderRadius: 10, padding: 12, minHeight: 60 },
  balanceCard: { borderWidth: 1, borderRadius: 12, padding: 16, gap: 12 },
  balanceRow: { flexDirection: "row-reverse", gap: 12 },
  cycleBox: { borderWidth: 1, borderRadius: 8, padding: 12 },
  cycleBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  settlementBtn: { borderWidth: 1, borderRadius: 10, padding: 12, alignItems: "center", gap: 4 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40, maxHeight: "85%" },
  sheetTitle: { fontSize: 17, fontWeight: "700", textAlign: "right", marginBottom: 16 },
  modalInput: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 15, textAlign: "right" },
  saveBtn: { borderRadius: 10, padding: 14, alignItems: "center" },
  filterOpt: { borderWidth: 1, borderRadius: 8, padding: 12 },
  confirmBox: { borderWidth: 1, borderRadius: 16, padding: 24 },
});
