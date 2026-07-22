import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Share,
  ActivityIndicator,
} from "react-native";
import { Store, ShoppingBag, Truck, Users, X, Copy, CheckCircle } from "lucide-react-native";
import { useAppTheme } from "@/contexts/ThemeContext";
import { AdminPageShell } from "@/components/admin";
import { AIN_SEFRA_ZONES } from "@/constants/ain-sefra-zones";
import {
  getAdminZones,
  getAdminMerchantsForPicker,
  createAdminStore,
  adminProvisionAccount,
} from "@/services/admin.service";

// ─── Types ────────────────────────────────────────────────────────────────────

type SetupMode = null | "store" | "merchant" | "driver" | "customer";

interface ZoneOption {
  id: string;
  name: string;
}

interface SuccessResult {
  user_id?: string;
  email?: string;
  phone?: string;
  full_name?: string;
  name?: string;
  message?: string;
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function AdminSetupScreen() {
  const { colors, tokens } = useAppTheme();
  const [mode, setMode] = useState<SetupMode>(null);
  const [zones, setZones] = useState<ZoneOption[]>([]);
  const [zonesLoaded, setZonesLoaded] = useState(false);

  useEffect(() => {
    getAdminZones().then(({ data }) => {
      if (data.length > 0) {
        setZones(
          data
            .map((z) => ({ id: String(z["id"] ?? ""), name: String(z["name"] ?? "") }))
            .filter((z) => z.id && z.name)
        );
      } else {
        // Fall back to AIN_SEFRA_ZONES constants (name only, no UUID)
        setZones(AIN_SEFRA_ZONES.map((name) => ({ id: name, name })));
      }
      setZonesLoaded(true);
    });
  }, []);

  const selectMode = (next: SetupMode) =>
    setMode((prev) => (prev === next ? null : next));

  const s = makeBaseStyles(tokens);

  return (
    <AdminPageShell title="مركز التهيئة والتشغيل" showBack>
      <Text
        style={[s.intro, { color: colors.textSecondary, fontFamily: tokens.typography.families.arabic, fontSize: tokens.typography.sizes.sm }]}
      >
        اختر نوع الإنشاء لبدء العملية
      </Text>

      <View style={s.cardsGrid}>
        {(
          [
            { key: "store", label: "إنشاء متجر", Icon: Store },
            { key: "merchant", label: "إنشاء حساب تاجر", Icon: ShoppingBag },
            { key: "driver", label: "إنشاء حساب موصل", Icon: Truck },
            { key: "customer", label: "إنشاء حساب زبون", Icon: Users },
          ] as const
        ).map(({ key, label, Icon }) => (
          <TouchableOpacity
            key={key}
            onPress={() => selectMode(key)}
            activeOpacity={0.8}
            style={[
              s.card,
              {
                backgroundColor: mode === key ? colors.primary + "22" : colors.bgElevated,
                borderColor: mode === key ? colors.primary : colors.borderSubtle,
                borderRadius: tokens.radius.md,
                padding: tokens.spacing.lg,
              },
            ]}
          >
            <Icon color={mode === key ? colors.primary : colors.textSecondary} size={28} />
            <Text
              style={[
                s.cardLabel,
                {
                  color: mode === key ? colors.primary : colors.textPrimary,
                  fontFamily: tokens.typography.families.arabic,
                  fontSize: tokens.typography.sizes.sm,
                },
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {mode === "store" && zonesLoaded && (
        <StoreForm zones={zones} onDone={() => setMode(null)} />
      )}
      {(mode === "merchant" || mode === "driver" || mode === "customer") &&
        zonesLoaded && (
          <AccountForm
            role={mode}
            zones={zones}
            onDone={() => setMode(null)}
          />
        )}
      {!zonesLoaded && mode && (
        <View style={s.loadingRow}>
          <ActivityIndicator color={colors.primary} />
        </View>
      )}
    </AdminPageShell>
  );
}

// ─── Zone picker ──────────────────────────────────────────────────────────────

function ZonePicker({
  zones,
  selected,
  onSelect,
}: {
  zones: ZoneOption[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  const { colors, tokens } = useAppTheme();
  const s = makeBaseStyles(tokens);
  return (
    <View style={s.zonesRow}>
      {zones.map((z) => (
        <TouchableOpacity
          key={z.id}
          onPress={() => onSelect(selected === z.id ? "" : z.id)}
          style={[
            s.zoneChip,
            {
              backgroundColor: selected === z.id ? colors.primary : colors.bgElevated,
              borderColor: selected === z.id ? colors.primary : colors.borderSubtle,
              borderRadius: tokens.radius.full,
              paddingHorizontal: tokens.spacing.md,
              paddingVertical: tokens.spacing.xs,
            },
          ]}
        >
          <Text
            style={{
              color: selected === z.id ? "#000" : colors.textPrimary,
              fontFamily: tokens.typography.families.arabic,
              fontSize: tokens.typography.sizes.sm,
              fontWeight: "600",
            }}
          >
            {z.name}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── Field row ────────────────────────────────────────────────────────────────

function FieldRow({
  label,
  value,
  onChange,
  placeholder,
  numeric,
  secure,
  required,
  errorMsg,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  numeric?: boolean;
  secure?: boolean;
  required?: boolean;
  errorMsg?: string;
}) {
  const { colors, tokens } = useAppTheme();
  const s = makeBaseStyles(tokens);
  return (
    <View style={s.fieldBlock}>
      <Text
        style={[
          s.fieldLabel,
          { color: colors.textSecondary, fontFamily: tokens.typography.families.arabic, fontSize: tokens.typography.sizes.sm },
        ]}
      >
        {label}
        {required && (
          <Text style={{ color: colors.error }}> *</Text>
        )}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textDisabled}
        keyboardType={numeric ? "phone-pad" : "default"}
        secureTextEntry={secure}
        textAlign="right"
        style={[
          s.input,
          {
            backgroundColor: colors.bgElevated,
            borderColor: errorMsg ? colors.error : colors.borderSubtle,
            color: colors.textPrimary,
            borderRadius: tokens.radius.sm,
            fontFamily: tokens.typography.families.arabic,
            fontSize: tokens.typography.sizes.base,
            padding: tokens.spacing.md,
          },
        ]}
      />
      {errorMsg ? (
        <Text
          style={{
            color: colors.error,
            fontFamily: tokens.typography.families.arabic,
            fontSize: tokens.typography.sizes.xs,
            textAlign: "right",
            marginTop: 4,
          }}
        >
          {errorMsg}
        </Text>
      ) : null}
    </View>
  );
}

// ─── Status pill selector ─────────────────────────────────────────────────────

function StatusPicker({
  options,
  selected,
  onSelect,
}: {
  options: Array<{ value: string; label: string }>;
  selected: string;
  onSelect: (v: string) => void;
}) {
  const { colors, tokens } = useAppTheme();
  return (
    <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 }}>
      {options.map((o) => (
        <TouchableOpacity
          key={o.value}
          onPress={() => onSelect(o.value)}
          style={{
            paddingHorizontal: tokens.spacing.md,
            paddingVertical: tokens.spacing.xs,
            borderRadius: tokens.radius.full,
            borderWidth: 1,
            borderColor: selected === o.value ? colors.primary : colors.borderSubtle,
            backgroundColor: selected === o.value ? colors.primary + "22" : colors.bgElevated,
          }}
        >
          <Text
            style={{
              color: selected === o.value ? colors.primary : colors.textSecondary,
              fontFamily: tokens.typography.families.arabic,
              fontSize: tokens.typography.sizes.sm,
              fontWeight: "600",
            }}
          >
            {o.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── Boolean toggle ───────────────────────────────────────────────────────────

function BoolToggle({
  label,
  value,
  onToggle,
}: {
  label: string;
  value: boolean;
  onToggle: () => void;
}) {
  const { colors, tokens } = useAppTheme();
  return (
    <TouchableOpacity
      onPress={onToggle}
      style={{
        flexDirection: "row-reverse",
        alignItems: "center",
        gap: 10,
        marginBottom: 10,
      }}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 6,
          borderWidth: 2,
          borderColor: value ? colors.primary : colors.borderSubtle,
          backgroundColor: value ? colors.primary : "transparent",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {value && <Text style={{ color: "#000", fontSize: 13, fontWeight: "900" }}>✓</Text>}
      </View>
      <Text
        style={{
          color: colors.textPrimary,
          fontFamily: tokens.typography.families.arabic,
          fontSize: tokens.typography.sizes.base,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Success banner ───────────────────────────────────────────────────────────

function SuccessBanner({
  result,
  onClose,
}: {
  result: SuccessResult;
  onClose: () => void;
}) {
  const { colors, tokens } = useAppTheme();

  const credentials =
    result.email && result.phone
      ? `الاسم: ${result.full_name ?? ""}\nالبريد: ${result.email}\nالهاتف: ${result.phone}`
      : result.name
      ? `المتجر: ${result.name}`
      : "";

  return (
    <View
      style={{
        backgroundColor: colors.success + "18",
        borderColor: colors.success,
        borderWidth: 1,
        borderRadius: tokens.radius.lg,
        padding: tokens.spacing.lg,
        marginTop: tokens.spacing.lg,
      }}
    >
      <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <CheckCircle color={colors.success} size={20} />
        <Text
          style={{
            color: colors.success,
            fontFamily: tokens.typography.families.arabic,
            fontSize: tokens.typography.sizes.base,
            fontWeight: "700",
            flex: 1,
            textAlign: "right",
          }}
        >
          {result.message ?? "تمت العملية بنجاح"}
        </Text>
      </View>

      {credentials ? (
        <>
          <TextInput
            value={credentials}
            editable={false}
            multiline
            selectTextOnFocus
            style={{
              backgroundColor: colors.bgElevated,
              borderColor: colors.borderSubtle,
              borderWidth: 1,
              borderRadius: tokens.radius.sm,
              padding: tokens.spacing.md,
              color: colors.textPrimary,
              fontFamily: tokens.typography.families.arabic,
              fontSize: tokens.typography.sizes.sm,
              textAlign: "right",
              marginBottom: 10,
              lineHeight: 22,
            }}
          />
          <TouchableOpacity
            onPress={() =>
              Share.share({ message: credentials, title: "بيانات تسجيل الدخول" })
            }
            style={{
              flexDirection: "row-reverse",
              alignItems: "center",
              gap: 6,
              alignSelf: "flex-end",
              backgroundColor: colors.secondary + "22",
              borderRadius: tokens.radius.full,
              paddingHorizontal: tokens.spacing.md,
              paddingVertical: tokens.spacing.xs,
            }}
          >
            <Copy color={colors.secondary} size={14} />
            <Text
              style={{
                color: colors.secondary,
                fontFamily: tokens.typography.families.arabic,
                fontSize: tokens.typography.sizes.sm,
                fontWeight: "600",
              }}
            >
              مشاركة بيانات الدخول
            </Text>
          </TouchableOpacity>
        </>
      ) : null}

      <TouchableOpacity
        onPress={onClose}
        style={{
          marginTop: 12,
          alignSelf: "flex-end",
          flexDirection: "row-reverse",
          alignItems: "center",
          gap: 6,
        }}
      >
        <X color={colors.textSecondary} size={16} />
        <Text
          style={{
            color: colors.textSecondary,
            fontFamily: tokens.typography.families.arabic,
            fontSize: tokens.typography.sizes.sm,
          }}
        >
          إغلاق
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Store form ───────────────────────────────────────────────────────────────

const STORE_CATEGORIES = [
  "بقالة",
  "مطعم",
  "ملابس",
  "إلكترونيات",
  "صيدلية",
  "حلويات",
  "خضار وفواكه",
  "مخبزة",
  "أثاث",
  "أخرى",
];

const STORE_STATUS_OPTIONS = [
  { value: "active", label: "نشط" },
  { value: "draft", label: "مسودة" },
  { value: "paused", label: "موقوف مؤقتاً" },
];

function StoreForm({
  zones,
  onDone,
}: {
  zones: ZoneOption[];
  onDone: () => void;
}) {
  const { colors, tokens } = useAppTheme();
  const s = makeBaseStyles(tokens);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");
  const [openingHours, setOpeningHours] = useState("");
  const [status, setStatus] = useState("active");
  const [isNew, setIsNew] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [showOnHome, setShowOnHome] = useState(false);
  const [merchantId, setMerchantId] = useState("");

  const [merchants, setMerchants] = useState<Array<{ id: string; business_name: string }>>([]);
  const [showMerchantPicker, setShowMerchantPicker] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState<SuccessResult | null>(null);

  useEffect(() => {
    getAdminMerchantsForPicker().then(({ data }) => setMerchants(data));
  }, []);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "اسم المتجر مطلوب";
    if (!category.trim()) e.category = "التصنيف مطلوب";
    return e;
  };

  const isValidUUID = (v: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

  const handleSubmit = async () => {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    // Prevent invalid UUID
    const safeZoneId = zoneId && isValidUUID(zoneId) ? zoneId : undefined;
    const safeMerchantId = merchantId && isValidUUID(merchantId) ? merchantId : undefined;

    setSubmitting(true);
    setSubmitError(null);

    const { data, error } = await createAdminStore({
      name: name.trim(),
      category: category.trim(),
      zone_id: safeZoneId,
      address_line1: address.trim() || undefined,
      phone_number: phone.trim() || undefined,
      description: description.trim() || undefined,
      opening_hours: openingHours.trim() || undefined,
      status,
      is_new: isNew,
      is_featured: isFeatured,
      show_on_home: showOnHome,
      merchant_id: safeMerchantId,
    });

    setSubmitting(false);

    if (error) {
      setSubmitError(error);
    } else {
      setSuccess({
        name: String(data?.["name"] ?? name),
        message: `تم إنشاء المتجر "${name.trim()}" بنجاح`,
      });
    }
  };

  if (success) {
    return (
      <SuccessBanner
        result={success}
        onClose={() => { setSuccess(null); onDone(); }}
      />
    );
  }

  return (
    <View
      style={[
        s.formPanel,
        {
          backgroundColor: colors.bgSurface,
          borderColor: colors.borderSubtle,
          borderRadius: tokens.radius.lg,
          padding: tokens.spacing.lg,
          marginTop: tokens.spacing.lg,
        },
      ]}
    >
      <Text style={[s.formTitle, { color: colors.textPrimary, fontFamily: tokens.typography.families.arabic, fontSize: tokens.typography.sizes.md }]}>
        إنشاء متجر جديد
      </Text>

      <FieldRow label="اسم المتجر" value={name} onChange={setName} placeholder="مثال: متجر الأمل" required errorMsg={errors.name} />
      <FieldRow label="العنوان" value={address} onChange={setAddress} placeholder="الحي والشارع" />
      <FieldRow label="رقم الهاتف" value={phone} onChange={setPhone} placeholder="0661234567" numeric />
      <FieldRow label="الوصف" value={description} onChange={setDescription} placeholder="وصف مختصر للمتجر" />
      <FieldRow label="أوقات العمل" value={openingHours} onChange={setOpeningHours} placeholder="مثال: 08:00 - 22:00" />

      {/* Category */}
      <View style={s.fieldBlock}>
        <Text style={[s.fieldLabel, { color: colors.textSecondary, fontFamily: tokens.typography.families.arabic, fontSize: tokens.typography.sizes.sm }]}>
          التصنيف <Text style={{ color: colors.error }}>*</Text>
        </Text>
        {errors.category ? (
          <Text style={{ color: colors.error, fontFamily: tokens.typography.families.arabic, fontSize: tokens.typography.sizes.xs, textAlign: "right", marginBottom: 4 }}>{errors.category}</Text>
        ) : null}
        <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 }}>
          {STORE_CATEGORIES.map((c) => (
            <TouchableOpacity
              key={c}
              onPress={() => setCategory(c)}
              style={{
                paddingHorizontal: tokens.spacing.md,
                paddingVertical: tokens.spacing.xs,
                borderRadius: tokens.radius.full,
                borderWidth: 1,
                borderColor: category === c ? colors.primary : colors.borderSubtle,
                backgroundColor: category === c ? colors.primary + "22" : colors.bgElevated,
              }}
            >
              <Text style={{ color: category === c ? colors.primary : colors.textPrimary, fontFamily: tokens.typography.families.arabic, fontSize: tokens.typography.sizes.sm, fontWeight: "600" }}>
                {c}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Zone */}
      <View style={s.fieldBlock}>
        <Text style={[s.fieldLabel, { color: colors.textSecondary, fontFamily: tokens.typography.families.arabic, fontSize: tokens.typography.sizes.sm }]}>الحي</Text>
        <ZonePicker zones={zones} selected={zoneId} onSelect={setZoneId} />
      </View>

      {/* Status */}
      <View style={s.fieldBlock}>
        <Text style={[s.fieldLabel, { color: colors.textSecondary, fontFamily: tokens.typography.families.arabic, fontSize: tokens.typography.sizes.sm }]}>حالة المتجر</Text>
        <StatusPicker options={STORE_STATUS_OPTIONS} selected={status} onSelect={setStatus} />
      </View>

      {/* Booleans */}
      <View style={[s.fieldBlock, { gap: 0 }]}>
        <BoolToggle label="متجر جديد" value={isNew} onToggle={() => setIsNew((v) => !v)} />
        <BoolToggle label="متجر مميز" value={isFeatured} onToggle={() => setIsFeatured((v) => !v)} />
        <BoolToggle label="يظهر في الصفحة الرئيسية" value={showOnHome} onToggle={() => setShowOnHome((v) => !v)} />
      </View>

      {/* Merchant picker */}
      <View style={s.fieldBlock}>
        <Text style={[s.fieldLabel, { color: colors.textSecondary, fontFamily: tokens.typography.families.arabic, fontSize: tokens.typography.sizes.sm }]}>التاجر المرتبط (اختياري)</Text>
        <TouchableOpacity
          onPress={() => setShowMerchantPicker(true)}
          style={{
            backgroundColor: colors.bgElevated,
            borderColor: colors.borderSubtle,
            borderWidth: 1,
            borderRadius: tokens.radius.sm,
            padding: tokens.spacing.md,
          }}
        >
          <Text style={{ color: merchantId ? colors.textPrimary : colors.textDisabled, fontFamily: tokens.typography.families.arabic, fontSize: tokens.typography.sizes.base, textAlign: "right" }}>
            {merchantId ? (merchants.find((m) => m.id === merchantId)?.business_name ?? merchantId) : "اختر تاجراً (اختياري)"}
          </Text>
        </TouchableOpacity>
      </View>

      {submitError && (
        <Text style={{ color: colors.error, fontFamily: tokens.typography.families.arabic, fontSize: tokens.typography.sizes.sm, textAlign: "right", marginBottom: 8 }}>
          {submitError}
        </Text>
      )}

      <TouchableOpacity
        onPress={handleSubmit}
        disabled={submitting}
        style={{
          backgroundColor: submitting ? colors.textDisabled : colors.primary,
          borderRadius: tokens.radius.full,
          paddingVertical: tokens.spacing.md,
          alignItems: "center",
          marginTop: tokens.spacing.sm,
        }}
      >
        {submitting ? (
          <ActivityIndicator color="#000" />
        ) : (
          <Text style={{ color: "#000", fontFamily: tokens.typography.families.arabic, fontSize: tokens.typography.sizes.base, fontWeight: "700" }}>
            إنشاء المتجر
          </Text>
        )}
      </TouchableOpacity>

      {/* Merchant modal */}
      <Modal visible={showMerchantPicker} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: colors.bgSurface, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "60%", padding: tokens.spacing.lg }}>
            <View style={{ flexDirection: "row-reverse", alignItems: "center", marginBottom: 12 }}>
              <Text style={{ color: colors.textPrimary, fontFamily: tokens.typography.families.arabic, fontSize: tokens.typography.sizes.md, fontWeight: "700", flex: 1, textAlign: "right" }}>اختر تاجراً</Text>
              <TouchableOpacity onPress={() => setShowMerchantPicker(false)}>
                <X color={colors.textSecondary} size={20} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={() => { setMerchantId(""); setShowMerchantPicker(false); }}
              style={{ padding: tokens.spacing.md, borderBottomWidth: 1, borderBottomColor: colors.borderSubtle }}
            >
              <Text style={{ color: colors.textSecondary, fontFamily: tokens.typography.families.arabic, fontSize: tokens.typography.sizes.base, textAlign: "right" }}>بدون تاجر</Text>
            </TouchableOpacity>
            <ScrollView>
              {merchants.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  onPress={() => { setMerchantId(m.id); setShowMerchantPicker(false); }}
                  style={{ padding: tokens.spacing.md, borderBottomWidth: 1, borderBottomColor: colors.borderSubtle }}
                >
                  <Text style={{ color: colors.textPrimary, fontFamily: tokens.typography.families.arabic, fontSize: tokens.typography.sizes.base, textAlign: "right" }}>{m.business_name}</Text>
                </TouchableOpacity>
              ))}
              {merchants.length === 0 && (
                <Text style={{ color: colors.textDisabled, fontFamily: tokens.typography.families.arabic, fontSize: tokens.typography.sizes.sm, textAlign: "center", padding: 24 }}>لا يوجد تجار نشطون حالياً</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Account form (merchant / driver / customer) ──────────────────────────────

const MERCHANT_STATUS_OPTIONS = [
  { value: "pending_review", label: "قيد المراجعة" },
  { value: "active", label: "مفعّل مباشرة" },
];

const DRIVER_STATUS_OPTIONS = [
  { value: "offline", label: "غير متصل" },
  { value: "active", label: "نشط" },
];

const CUSTOMER_STATUS_OPTIONS = [
  { value: "active", label: "نشط" },
  { value: "suspended", label: "موقوف" },
];

const VEHICLE_TYPES = ["دراجة نارية", "سيارة", "دراجة هوائية", "مشياً على الأقدام"];

function AccountForm({
  role,
  zones,
  onDone,
}: {
  role: "merchant" | "driver" | "customer";
  zones: ZoneOption[];
  onDone: () => void;
}) {
  const { colors, tokens } = useAppTheme();
  const s = makeBaseStyles(tokens);

  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [address, setAddress] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [isAvailable, setIsAvailable] = useState(false);
  const [isGoldMember, setIsGoldMember] = useState(false);
  const [status, setStatus] = useState(
    role === "merchant" ? "pending_review" : role === "driver" ? "offline" : "active"
  );

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState<SuccessResult | null>(null);

  const roleLabel =
    role === "merchant" ? "التاجر" : role === "driver" ? "الموصل" : "الزبون";

  const validate = () => {
    const e: Record<string, string> = {};
    if (!fullName.trim()) e.fullName = "الاسم الكامل مطلوب";
    if (!phone.trim()) e.phone = "رقم الهاتف مطلوب";
    if (!email.trim()) e.email = "البريد الإلكتروني مطلوب";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      e.email = "صيغة البريد الإلكتروني غير صحيحة";
    if (!password) e.password = "كلمة المرور مطلوبة";
    else if (password.length < 6) e.password = "كلمة المرور يجب أن تكون 6 أحرف على الأقل";
    return e;
  };

  const isValidUUID = (v: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

  const handleSubmit = async () => {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    const safeZoneId = zoneId && isValidUUID(zoneId) ? zoneId : undefined;

    setSubmitting(true);
    setSubmitError(null);

    const { data, error } = await adminProvisionAccount({
      role,
      full_name: fullName.trim(),
      phone: phone.trim(),
      email: email.trim(),
      password,
      zone_id: safeZoneId,
      address: address.trim() || undefined,
      status,
      business_name: role === "merchant" ? businessName.trim() || undefined : undefined,
      vehicle_type: role === "driver" ? vehicleType || undefined : undefined,
      vehicle_number: role === "driver" ? vehicleNumber.trim() || undefined : undefined,
      is_gold_member: role === "customer" ? isGoldMember : undefined,
    });

    setSubmitting(false);

    if (error) {
      setSubmitError(error);
    } else {
      setSuccess({
        user_id: String(data?.["user_id"] ?? ""),
        email: email.trim(),
        phone: phone.trim(),
        full_name: fullName.trim(),
        message: String(data?.["message"] ?? `تم إنشاء حساب ${roleLabel} بنجاح`),
      });
    }
  };

  if (success) {
    return (
      <SuccessBanner
        result={success}
        onClose={() => { setSuccess(null); onDone(); }}
      />
    );
  }

  return (
    <View
      style={[
        s.formPanel,
        {
          backgroundColor: colors.bgSurface,
          borderColor: colors.borderSubtle,
          borderRadius: tokens.radius.lg,
          padding: tokens.spacing.lg,
          marginTop: tokens.spacing.lg,
        },
      ]}
    >
      <Text style={[s.formTitle, { color: colors.textPrimary, fontFamily: tokens.typography.families.arabic, fontSize: tokens.typography.sizes.md }]}>
        إنشاء حساب {roleLabel}
      </Text>

      <FieldRow label="الاسم الكامل" value={fullName} onChange={setFullName} placeholder={`الاسم الكامل لـ${roleLabel}`} required errorMsg={errors.fullName} />

      {role === "merchant" && (
        <FieldRow label="اسم النشاط التجاري" value={businessName} onChange={setBusinessName} placeholder="الاسم الرسمي للنشاط" />
      )}

      <FieldRow label="رقم الهاتف" value={phone} onChange={setPhone} placeholder="0661234567" numeric required errorMsg={errors.phone} />
      <FieldRow label="البريد الإلكتروني" value={email} onChange={setEmail} placeholder="example@email.com" required errorMsg={errors.email} />
      <FieldRow label="كلمة مرور مؤقتة" value={password} onChange={setPassword} placeholder="6 أحرف على الأقل" secure required errorMsg={errors.password} />
      <FieldRow label="العنوان" value={address} onChange={setAddress} placeholder="الحي والشارع" />

      {/* Zone */}
      <View style={s.fieldBlock}>
        <Text style={[s.fieldLabel, { color: colors.textSecondary, fontFamily: tokens.typography.families.arabic, fontSize: tokens.typography.sizes.sm }]}>الحي</Text>
        <ZonePicker zones={zones} selected={zoneId} onSelect={setZoneId} />
      </View>

      {/* Driver-specific */}
      {role === "driver" && (
        <>
          <View style={s.fieldBlock}>
            <Text style={[s.fieldLabel, { color: colors.textSecondary, fontFamily: tokens.typography.families.arabic, fontSize: tokens.typography.sizes.sm }]}>نوع المركبة</Text>
            <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 }}>
              {VEHICLE_TYPES.map((v) => (
                <TouchableOpacity
                  key={v}
                  onPress={() => setVehicleType((prev) => (prev === v ? "" : v))}
                  style={{
                    paddingHorizontal: tokens.spacing.md,
                    paddingVertical: tokens.spacing.xs,
                    borderRadius: tokens.radius.full,
                    borderWidth: 1,
                    borderColor: vehicleType === v ? colors.primary : colors.borderSubtle,
                    backgroundColor: vehicleType === v ? colors.primary + "22" : colors.bgElevated,
                  }}
                >
                  <Text style={{ color: vehicleType === v ? colors.primary : colors.textPrimary, fontFamily: tokens.typography.families.arabic, fontSize: tokens.typography.sizes.sm, fontWeight: "600" }}>
                    {v}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <FieldRow label="رقم المركبة / اللوحة" value={vehicleNumber} onChange={setVehicleNumber} placeholder="مثال: 123-456-07" />
          <View style={s.fieldBlock}>
            <BoolToggle label="السماح بالعمل فوراً" value={isAvailable} onToggle={() => setIsAvailable((v) => !v)} />
            <Text style={{ color: colors.textDisabled, fontFamily: tokens.typography.families.arabic, fontSize: tokens.typography.sizes.xs, textAlign: "right" }}>
              عداد التوصيلات الابتدائي: 0 — رسوم التوصيل: 150 د.ج — حصة الموصل: 80%
            </Text>
          </View>
        </>
      )}

      {/* Customer gold member */}
      {role === "customer" && (
        <View style={s.fieldBlock}>
          <BoolToggle label="العضو الذهبي" value={isGoldMember} onToggle={() => setIsGoldMember((v) => !v)} />
        </View>
      )}

      {/* Status */}
      <View style={s.fieldBlock}>
        <Text style={[s.fieldLabel, { color: colors.textSecondary, fontFamily: tokens.typography.families.arabic, fontSize: tokens.typography.sizes.sm }]}>حالة الحساب</Text>
        <StatusPicker
          options={
            role === "merchant"
              ? MERCHANT_STATUS_OPTIONS
              : role === "driver"
              ? DRIVER_STATUS_OPTIONS
              : CUSTOMER_STATUS_OPTIONS
          }
          selected={status}
          onSelect={setStatus}
        />
      </View>

      {submitError && (
        <Text style={{ color: colors.error, fontFamily: tokens.typography.families.arabic, fontSize: tokens.typography.sizes.sm, textAlign: "right", marginBottom: 8 }}>
          {submitError}
        </Text>
      )}

      <TouchableOpacity
        onPress={handleSubmit}
        disabled={submitting}
        style={{
          backgroundColor: submitting ? colors.textDisabled : colors.primary,
          borderRadius: tokens.radius.full,
          paddingVertical: tokens.spacing.md,
          alignItems: "center",
          marginTop: tokens.spacing.sm,
        }}
      >
        {submitting ? (
          <ActivityIndicator color="#000" />
        ) : (
          <Text style={{ color: "#000", fontFamily: tokens.typography.families.arabic, fontSize: tokens.typography.sizes.base, fontWeight: "700" }}>
            إنشاء حساب {roleLabel}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

// ─── Shared styles factory ────────────────────────────────────────────────────

function makeBaseStyles(tokens: ReturnType<typeof useAppTheme>["tokens"]) {
  return StyleSheet.create({
    intro: { textAlign: "right", marginBottom: 16 },
    cardsGrid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 12 },
    card: { width: "47%", borderWidth: 1.5, alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 20 },
    cardLabel: { fontWeight: "700", textAlign: "center" },
    formPanel: { borderWidth: 1 },
    formTitle: { fontWeight: "700", textAlign: "right", marginBottom: 16 },
    fieldBlock: { marginBottom: 14 },
    fieldLabel: { textAlign: "right", marginBottom: 6, fontWeight: "500" },
    input: { borderWidth: 1, writingDirection: "rtl" },
    zonesRow: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8, marginTop: 4 },
    zoneChip: { borderWidth: 1 },
    loadingRow: { alignItems: "center", marginTop: 32 },
  });
}
