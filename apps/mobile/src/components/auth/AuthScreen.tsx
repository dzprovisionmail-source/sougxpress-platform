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
import { Typography, Input, Button, AinSefraZoneSelect } from "../ui";
import { TOKENS } from "@/constants/tokens";
import { getThemeColors, DEFAULT_THEME } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { AIN_SEFRA_ZONES } from "@/constants/ain-sefra-zones";

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
  const errObj = err as any;
  const msg: string = errObj?.message ?? errObj?.details ?? "";
  const code: string = errObj?.code ?? "";

  if (code === "23502" || msg.includes("null value") || msg.includes("not-null")) {
    if (msg.includes("contact_phone") || msg.includes("phone")) {
      return "رقم الهاتف مطلوب لتسجيل التاجر.";
    }
    if (msg.includes("contact_email") || msg.includes("email")) {
      return "البريد الإلكتروني مطلوب لتسجيل التاجر.";
    }
    if (msg.includes("business_name")) {
      return "اسم المتجر مطلوب لتسجيل التاجر.";
    }
    return "يرجى استكمال جميع الحقول الإلزامية لتسجيل الحساب.";
  }
  if (msg.includes("duplicate") || msg.includes("unique") || msg.includes("already exists")) {
    return "الحساب موجود مسبقاً. يرجى تسجيل الدخول بدلاً من ذلك.";
  }
  return msg ? `خطأ في إعداد الحساب: ${msg}` : "فشل إعداد بيانات الحساب. يرجى المحاولة لاحقاً.";
};

/** Zone label per role */
const zoneLabelFor = (role: Role): string => {
  if (role === "merchant") return "حي المتجر";
  return "الحي";
};

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
            session.user.email ?? "",
            session.user.user_metadata
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
    userEmail: string,
    userMetadata: Record<string, unknown> = {}
  ) => {
    // Registration data may come from the current form, or from Auth metadata
    // when a previous signup created auth.users but provisioning failed.
    const metadataFullName =
      typeof userMetadata.full_name === "string"
        ? userMetadata.full_name.trim()
        : [userMetadata.first_name, userMetadata.last_name]
            .filter((value): value is string => typeof value === "string")
            .join(" ")
            .trim();
    const provisioningFullName = fullName.trim() || metadataFullName;
    const provisioningPhone =
      phoneNumber.trim() ||
      (typeof userMetadata.phone_number === "string"
        ? userMetadata.phone_number.trim()
        : "");
    const provisioningZoneId =
      selectedZoneId ||
      (typeof userMetadata.zone_id === "string" ? userMetadata.zone_id : "");
    const nameParts = provisioningFullName.split(/\s+/).filter(Boolean);
    const provisioningFirstName = nameParts[0] || "موصل";
    const provisioningLastName = nameParts.slice(1).join(" ") || "غير محدد";

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
      console.log("[AuthScreen] Inserting profile for userId:", userId, "role:", role);
      const { error: insertError } = await supabase
        .from("profiles")
        .upsert(
          {
            id: userId,
            role,
            full_name: provisioningFullName || null,
            email: userEmail || null,
            phone: provisioningPhone || null,
          },
          { onConflict: "id" }
        )
        .select()
        .single();

      if (insertError) {
        console.error("[AuthScreen] Profile upsert error:", insertError.code, insertError.message, insertError.details, insertError.hint);
        Alert.alert(
          "خطأ في التسجيل",
          `فشل إنشاء الملف الشخصي: ${insertError.message}`
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
    const resolvedZoneId = isUUID(provisioningZoneId)
      ? provisioningZoneId
      : null;

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
          console.log("[AuthScreen] Inserting customer record for userId:", userId);
          const { error: cInsertError } = await supabase
            .from("customers")
            .upsert({
              id: userId,
              first_name: provisioningFirstName,
              last_name: provisioningLastName,
              full_name: provisioningFullName || "مستخدم",
              phone_number: provisioningPhone || null,
              phone: provisioningPhone || null,
              email: userEmail,
              zone_id: resolvedZoneId,
              address: address.trim() || null,
              status: "active",
            }, { onConflict: "id" });
          if (cInsertError) {
            console.error("[AuthScreen] Customer upsert error:", cInsertError.code, cInsertError.message, cInsertError.details, cInsertError.hint);
            throw cInsertError;
          }
          status = "active";
        } else {
          status = customer.status;
        }
      } else if (role === "merchant") {
        const { data: merchant, error: mQueryError } = await supabase
          .from("merchants")
          .select("status, business_name")
          .eq("id", userId)
          .maybeSingle();
        if (mQueryError) throw mQueryError;

        const bName = businessName.trim() || merchant?.business_name || fullName || "متجر";
        if (!merchant) {
          const { error: mInsertError } = await supabase
            .from("merchants")
            .upsert({
              id: userId,
              owner_full_name: provisioningFullName || "تاجر",
              business_name: bName,
              phone: provisioningPhone || "",
              contact_phone: provisioningPhone || "",
              contact_email: userEmail,
              email: userEmail,
              zone_id: resolvedZoneId,
              address: address.trim() || null,
              status: "pending_review",
            }, { onConflict: "id" });
          if (mInsertError) throw mInsertError;
          status = "pending";
        } else {
          status = merchant.status;
        }

        // Ensure at least one store exists for the merchant (idempotent)
        const { count: storeCount, error: countErr } = await supabase
          .from("stores")
          .select("*", { count: "exact", head: true })
          .eq("merchant_id", userId);

        if (!countErr && (storeCount === null || storeCount === 0)) {
          const { error: storeInsertErr } = await supabase
            .from("stores")
            .insert({
              merchant_id: userId,
              name: bName,
              category: "عام",
              main_category: "عام",
              address_line1: address.trim() || "العنوان الرئيسي",
              city: "عين الصفراء",
              country: "Algeria",
              zone_id: resolvedZoneId,
              status: "pending",
              is_open: false,
            });
          if (storeInsertErr) {
            console.error("[AuthScreen] Failed to create initial store #1:", storeInsertErr);
          }
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
            .upsert({
              id: userId,
              first_name: provisioningFirstName,
              last_name: provisioningLastName,
              full_name: provisioningFullName || "موصل",
              phone_number: provisioningPhone,
              phone: provisioningPhone || null,
              email: userEmail,
              zone_id: resolvedZoneId,
              availability: "offline",
              status: "pending_review",
            }, { onConflict: "id" });
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
      router.replace("/(tabs)/home");
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
          data.user.email ?? "",
          data.user.user_metadata
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

        console.log("[AuthScreen] Attempting signUp for email:", email, "role:", role);
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: "sougxpress://auth/callback",
            data: {
              role,
              full_name: fullName.trim(),
              phone_number: phoneNumber.trim(),
              zone_id: isUUID(selectedZoneId) ? selectedZoneId : null,
              business_name:
                role === "merchant" ? businessName.trim() : undefined,
            },
          },
        });

        console.log("[AuthScreen] signUp result - user:", !!data?.user, "session:", !!data?.session, "error:", error?.message);

        if (error) throw error;

        let sessionData = data?.session;

        if (!sessionData) {
          console.log("[AuthScreen] No session returned from signUp. Attempting the same password sign-in flow used by the other roles...");
          const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (signInErr) {
            console.error("[AuthScreen] explicit signIn failed after signUp:", signInErr.message);
            throw new Error("تم إنشاء الحساب ولكن تعذر تسجيل الدخول تلقائياً. يرجى تسجيل الدخول يدوياً.");
          }
          sessionData = signInData?.session;
        }

        const activeUserId = sessionData?.user?.id || data?.user?.id;
        const activeUserEmail = sessionData?.user?.email || data?.user?.email || email;
        if (!activeUserId) {
          throw new Error("فشل إنشاء جلسة المستخدم. يرجى تسجيل الدخول يدوياً.");
        }

        await handleProvisioningAndGating(
          activeUserId,
          activeUserEmail,
          data?.user?.user_metadata ?? {}
        );
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
        Alert.alert(
          "الحساب موجود بالفعل",
          "هذا البريد الإلكتروني مسجل مسبقاً. يرجى تسجيل الدخول بدلاً من ذلك.",
          [
            {
              text: "تسجيل الدخول",
              onPress: () => setIsLogin(true)
            },
            {
              text: "إلغاء",
              style: "cancel"
            }
          ]
        );
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
