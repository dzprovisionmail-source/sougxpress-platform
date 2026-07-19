import React, { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Typography, Input, Button, AinSefraZoneSelect, SimpleSelect } from "../ui";
import type { SelectOption } from "../ui";
import { TOKENS } from "../../constants/tokens";
import { getThemeColors, DEFAULT_THEME } from "../../constants/theme";
import { supabase } from "../../lib/supabase";
import { AIN_SEFRA_ZONES } from "../../constants/ain-sefra-zones";

type Role = "customer" | "merchant" | "driver";

interface Zone {
  id: string;
  name: string;
}

interface AuthScreenProps {
  role: Role;
  titleAr: string;
  subtitleAr: string;
}

/** Returns true if the string looks like a Supabase UUID */
const isUUID = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

/** Map a Supabase/PostgREST error to a clear Arabic message for the user */
const toArabicProvisioningError = (err: unknown): string => {
  const msg: string = (err as any)?.message ?? (err as any)?.details ?? "";
  if (msg.includes("duplicate") || msg.includes("unique") || msg.includes("already exists")) {
    return "الحساب موجود مسبقاً. يرجى تسجيل الدخول بدلاً من ذلك.";
  }
  if (msg.includes("null value") || msg.includes("not-null") || msg.includes("violates not-null")) {
    return "بيانات ناقصة. يرجى ملء جميع الحقول والمحاولة مجدداً.";
  }
  if (msg.includes("column") || msg.includes("relation") || msg.includes("violates")) {
    return "حدث خطأ في إعداد الحساب. يرجى التواصل مع الدعم.";
  }
  return "فشل إعداد بيانات الحساب. يرجى المحاولة لاحقاً.";
};

/** Zone label per role */
const zoneLabelFor = (role: Role): string => {
  if (role === "merchant") return "حي المتجر";
  return "الحي";
};

const VEHICLE_TYPES: { value: string; label: string }[] = [
  { value: "motorcycle", label: "دراجة نارية" },
  { value: "car", label: "سيارة" },
  { value: "lcv", label: "مركبة تجارية خفيفة" },
];

export const AuthScreen: React.FC<AuthScreenProps> = ({
  role,
  titleAr,
  subtitleAr,
}) => {
  const router = useRouter();
  const colors = getThemeColors(DEFAULT_THEME);

  // UI state
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [approvalStatus, setApprovalStatus] = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  // Zones
  const [zones, setZones] = useState<Zone[]>([]);

  // Shared registration fields
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedZoneId, setSelectedZoneId] = useState("");
  const [zoneError, setZoneError] = useState("");
  const [address, setAddress] = useState("");

  // Merchant-only
  const [businessName, setBusinessName] = useState("");

  // Driver-only
  const [vehicleType, setVehicleType] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");

  // Auth fields (always shown)
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    fetchZones();
    checkExistingSession();
  }, []);

  const fetchZones = async () => {
    try {
      const { data, error } = await supabase
        .from("zones")
        .select("id, name")
        .eq("status", "active")
        .eq("city", "Ain Sefra");

      if (error) throw error;

      if (data && data.length > 0) {
        setZones(data);
      } else {
        // Fall back to the official constant list (names used as identifiers)
        setZones(AIN_SEFRA_ZONES.map((name) => ({ id: name, name })));
      }
    } catch {
      setZones(AIN_SEFRA_ZONES.map((name) => ({ id: name, name })));
    }
  };

  const checkExistingSession = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        await handleProvisioningAndGating(
          session.user.id,
          session.user.email ?? ""
        );
      }
    } catch (error) {
      console.error("Session check error:", error);
    } finally {
      setInitialLoading(false);
    }
  };

  const handleProvisioningAndGating = async (
    userId: string,
    userEmail: string
  ) => {
    // 1. Check / Provision Profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      Alert.alert(
        "خطأ في البيانات",
        "تعذر التحقق من ملفك الشخصي. يرجى المحاولة لاحقاً."
      );
      return;
    }

    let userRole = profile?.role;

    if (!profile) {
      const { error: insertError } = await supabase
        .from("profiles")
        .insert({ id: userId, role })
        .select()
        .single();

      if (insertError) {
        Alert.alert(
          "خطأ في التسجيل",
          "فشل إنشاء الملف الشخصي. يرجى المحاولة لاحقاً."
        );
        return;
      }
      userRole = role;
    }

    // 2. Role mismatch check
    if (userRole !== role) {
      Alert.alert(
        "خطأ في الوصول",
        `هذا الحساب مسجل كـ ${userRole} وليس ${role}. يرجى تسجيل الدخول من البوابة الصحيحة.`
      );
      return;
    }

    // 3. Provision role-specific entity (idempotent)
    // zone_id: only store if it's a real UUID (not a fallback name-based key)
    const resolvedZoneId = isUUID(selectedZoneId) ? selectedZoneId : null;

    let status = "pending";
    try {
      if (role === "customer") {
        const { data: customer, error: cQueryError } = await supabase
          .from("customers")
          .select("status")
          .eq("id", userId)
          .maybeSingle();
        if (cQueryError) throw cQueryError;

        if (!customer) {
          const { error: cInsertError } = await supabase
            .from("customers")
            .insert({
              id: userId,
              full_name: fullName || "مستخدم",
              phone: phoneNumber || "",
              email: userEmail,
              zone_id: resolvedZoneId,
              address: address.trim() || null,
              status: "active",
            });
          if (cInsertError) throw cInsertError;
          status = "active";
        } else {
          status = customer.status;
        }
      } else if (role === "merchant") {
        const { data: merchant, error: mQueryError } = await supabase
          .from("merchants")
          .select("status")
          .eq("id", userId)
          .maybeSingle();
        if (mQueryError) throw mQueryError;

        if (!merchant) {
          const { error: mInsertError } = await supabase
            .from("merchants")
            .insert({
              id: userId,
              owner_full_name: fullName || "تاجر",
              business_name: businessName.trim() || fullName || "متجر",
              phone: phoneNumber || "",
              zone_id: resolvedZoneId,
              address: address.trim() || null,
              status: "pending_review",
            });
          if (mInsertError) throw mInsertError;
          status = "pending";
        } else {
          status = merchant.status;
        }
      } else if (role === "driver") {
        const { data: driver, error: dQueryError } = await supabase
          .from("drivers")
          .select("status")
          .eq("id", userId)
          .maybeSingle();
        if (dQueryError) throw dQueryError;

        if (!driver) {
          const { error: dInsertError } = await supabase
            .from("drivers")
            .insert({
              id: userId,
              full_name: fullName || "موصل",
              phone: phoneNumber || "",
              email: userEmail,
              zone_id: resolvedZoneId,
              vehicle_type: vehicleType.trim() || null,
              license_plate: vehicleNumber.trim() || null,
              availability: "offline",
              status: "pending_review",
            });
          if (dInsertError) throw dInsertError;
          status = "pending";
        } else {
          status = driver.status;
        }
      }
    } catch (provisionErr) {
      console.error("[AuthScreen] provisioning error:", provisionErr);
      Alert.alert("خطأ في التجهيز", toArabicProvisioningError(provisionErr));
      return;
    }

    // 4. Status gating
    setApprovalStatus(status);

    if (status === "active") {
      if (role === "customer") router.replace("/customer/home");
      else if (role === "merchant") router.replace("/merchant/dashboard");
      else if (role === "driver") router.replace("/driver/dashboard");
    }
  };

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert("خطأ", "يرجى إدخال البريد الإلكتروني وكلمة المرور");
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        await handleProvisioningAndGating(
          data.user.id,
          data.user.email ?? ""
        );
      } else {
        // Registration validation
        if (!fullName.trim()) {
          Alert.alert("خطأ", "يرجى إدخال الاسم الكامل");
          setLoading(false);
          return;
        }
        if (!phoneNumber.trim()) {
          Alert.alert("خطأ", "يرجى إدخال رقم الهاتف");
          setLoading(false);
          return;
        }
        if (role !== "driver" && !selectedZoneId) {
          setZoneError("يرجى اختيار الحي");
          setLoading(false);
          return;
        }
        if (role === "merchant" && !businessName.trim()) {
          Alert.alert("خطأ", "يرجى إدخال اسم المتجر");
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              role,
              full_name: fullName,
              phone_number: phoneNumber,
              zone_id: isUUID(selectedZoneId) ? selectedZoneId : null,
              business_name:
                role === "merchant" ? businessName : undefined,
            },
          },
        });

        if (error) throw error;

        if (data.user && !data.session) {
          setNeedsConfirmation(true);
        } else if (data.user && data.session) {
          await handleProvisioningAndGating(
            data.user.id,
            data.user.email ?? ""
          );
        }
      }
    } catch (error: any) {
      const errMsg: string = error?.message ?? "";
      // If Auth user already exists from a previously failed provisioning attempt,
      // sign in silently and let handleProvisioningAndGating complete the DB record.
      if (
        !isLogin &&
        (errMsg.includes("User already registered") ||
          errMsg.includes("already registered") ||
          errMsg.includes("already been registered"))
      ) {
        try {
          const { data: recoverData, error: recoverErr } =
            await supabase.auth.signInWithPassword({ email, password });
          if (recoverErr) throw recoverErr;
          await handleProvisioningAndGating(
            recoverData.user.id,
            recoverData.user.email ?? ""
          );
        } catch (recoverError: any) {
          console.error("[AuthScreen] retry recovery error:", recoverError);
          Alert.alert(
            "خطأ",
            recoverError?.message || "فشل استكمال التسجيل. يرجى المحاولة لاحقاً."
          );
        }
        return;
      }
      console.error("[AuthScreen] auth error:", error);
      Alert.alert("خطأ", errMsg || "حدث خطأ ما");
    } finally {
      setLoading(false);
    }
  };

  // ── Loading splash ──────────────────────────────────────────────
  if (initialLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.bgBase }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // ── Email confirmation screen ───────────────────────────────────
  if (needsConfirmation) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bgBase }]}>
        <View style={styles.statusContainer}>
          <Typography variant="h1" align="center" style={styles.statusTitle}>
            تأكيد البريد الإلكتروني
          </Typography>
          <Typography
            variant="body"
            color="secondary"
            align="center"
            style={styles.statusMessage}
          >
            تم إرسال رابط تأكيد إلى بريدك الإلكتروني. يرجى تأكيد الحساب ثم
            تسجيل الدخول.
          </Typography>
          <Button
            title="العودة لتسجيل الدخول"
            onPress={() => {
              setNeedsConfirmation(false);
              setIsLogin(true);
            }}
          />
        </View>
      </SafeAreaView>
    );
  }

  // ── Approval / blocked screen ───────────────────────────────────
  if (approvalStatus && approvalStatus !== "active") {
    const isBlocked = ["suspended", "blocked", "rejected"].includes(
      approvalStatus
    );
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bgBase }]}>
        <View style={styles.statusContainer}>
          <Typography variant="h1" align="center" style={styles.statusTitle}>
            {isBlocked ? "الحساب معطل" : "قيد المراجعة"}
          </Typography>
          <Typography
            variant="body"
            color="secondary"
            align="center"
            style={styles.statusMessage}
          >
            {isBlocked
              ? "عذراً، تم تعليق أو رفض حسابك. يرجى التواصل مع الدعم الفني."
              : "طلبك قيد المراجعة من قبل الإدارة. سنقوم بتفعيل حسابك قريباً."}
          </Typography>
          <Button
            title="تسجيل الخروج"
            variant="outline"
            onPress={async () => {
              await supabase.auth.signOut();
              setApprovalStatus(null);
            }}
          />
        </View>
      </SafeAreaView>
    );
  }

  // ── Main auth form ──────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bgBase }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Typography variant="h1" align="center" style={styles.title}>
              {titleAr}
            </Typography>
            <Typography variant="body" color="secondary" align="center">
              {subtitleAr}
            </Typography>
          </View>

          <View style={styles.form}>
            {/* ── Registration-only fields ── */}
            {!isLogin && (
              <>
                {/* 1. الاسم الكامل */}
                <Input
                  label="الاسم الكامل"
                  placeholder="أحمد علي"
                  value={fullName}
                  onChangeText={setFullName}
                />

                {/* 2. رقم الهاتف */}
                <Input
                  label="رقم الهاتف"
                  placeholder="06XXXXXXXX"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  keyboardType="phone-pad"
                />

                {/* 3. الحي (customer + merchant only) */}
                {role !== "driver" && (
                  <AinSefraZoneSelect
                    zones={zones}
                    value={selectedZoneId}
                    onChange={(id) => {
                      setSelectedZoneId(id);
                      setZoneError("");
                    }}
                    label={zoneLabelFor(role)}
                    error={zoneError}
                  />
                )}

                {/* 4a. Customer — العنوان التفصيلي */}
                {role === "customer" && (
                  <Input
                    label="العنوان التفصيلي"
                    placeholder="الشارع، البناية، الطابق..."
                    value={address}
                    onChangeText={setAddress}
                  />
                )}

                {/* 4b. Merchant — عنوان المتجر + اسم المتجر */}
                {role === "merchant" && (
                  <>
                    <Input
                      label="عنوان المتجر"
                      placeholder="الشارع والحي..."
                      value={address}
                      onChangeText={setAddress}
                    />
                    <Input
                      label="اسم المتجر"
                      placeholder="متجر السعادة"
                      value={businessName}
                      onChangeText={setBusinessName}
                    />
                  </>
                )}

                {/* 4c. Driver — نوع المركبة (dropdown) + رقم تسجيل المركبة */}
                {role === "driver" && (
                  <>
                    <SimpleSelect
                      label="نوع المركبة"
                      placeholder="اختر نوع المركبة"
                      options={VEHICLE_TYPES}
                      value={vehicleType}
                      onChange={setVehicleType}
                    />
                    <Input
                      label="رقم المركبة"
                      placeholder="000-000-00"
                      value={vehicleNumber}
                      onChangeText={setVehicleNumber}
                    />
                  </>
                )}
              </>
            )}

            {/* 5 / 6. البريد الإلكتروني + كلمة المرور (both modes) */}
            <Input
              label="البريد الإلكتروني"
              placeholder="example@mail.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />
            <Input
              label="كلمة المرور"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <Button
              title={isLogin ? "تسجيل الدخول" : "إنشاء حساب جديد"}
              onPress={handleAuth}
              isLoading={loading}
              style={styles.submitBtn}
            />
            <Button
              title={
                isLogin
                  ? "ليس لديك حساب؟ سجل الآن"
                  : "لديك حساب بالفعل؟ سجل دخولك"
              }
              variant="ghost"
              onPress={() => setIsLogin(!isLogin)}
            />
          </View>

          <Button
            title="العودة للرئيسية"
            variant="outline"
            onPress={() => router.push("/")}
            style={styles.backBtn}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  scrollContent: {
    padding: TOKENS.spacing.xl,
    paddingTop: TOKENS.spacing["3xl"],
    paddingBottom: TOKENS.spacing["2xl"],
  },
  header: { marginBottom: TOKENS.spacing["2xl"] },
  title: { color: TOKENS.colors.brandPrimary, marginBottom: TOKENS.spacing.xs },
  form: { gap: TOKENS.spacing.sm },
  submitBtn: { marginTop: TOKENS.spacing.md },
  backBtn: { marginTop: TOKENS.spacing.xl },
  statusContainer: {
    flex: 1,
    justifyContent: "center",
    padding: TOKENS.spacing.xl,
    gap: TOKENS.spacing.lg,
  },
  statusTitle: { color: TOKENS.colors.brandPrimary },
  statusMessage: { marginBottom: TOKENS.spacing.lg },
});
