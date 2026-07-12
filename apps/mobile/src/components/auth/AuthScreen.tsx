import React, { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  I18nManager,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { Typography, Input, Button } from "../ui";
import { TOKENS } from "../../constants/tokens";
import { getThemeColors, DEFAULT_THEME } from "../../constants/theme";
import { supabase } from "../../lib/supabase";

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

export const AuthScreen: React.FC<AuthScreenProps> = ({
  role,
  titleAr,
  subtitleAr,
}) => {
  const router = useRouter();
  const colors = getThemeColors(DEFAULT_THEME);
  const isRTL = I18nManager.isRTL;

  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [selectedZoneId, setSelectedZoneId] = useState<string>("");
  const [zones, setZones] = useState<Zone[]>([]);
  const [approvalStatus, setApprovalStatus] = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

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
      setZones(data || []);
    } catch (error) {
      console.error("Error fetching zones:", error);
    }
  };

  const checkExistingSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await handleProvisioningAndGating(session.user.id, session.user.email || "");
      }
    } catch (error) {
      console.error("Session check error:", error);
    } finally {
      setInitialLoading(false);
    }
  };

  const handleProvisioningAndGating = async (userId: string, userEmail: string) => {
    // 1. Check/Provision Profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      Alert.alert("خطأ في البيانات", "تعذر التحقق من ملفك الشخصي. يرجى المحاولة لاحقاً.");
      return;
    }

    let userRole = profile?.role;

    if (!profile) {
      // Provision profile if missing
      const { error: insertError } = await supabase
        .from("profiles")
        .insert({ id: userId, role })
        .select()
        .single();
      
      if (insertError) {
        Alert.alert("خطأ في التسجيل", "فشل إنشاء الملف الشخصي. يرجى المحاولة لاحقاً.");
        return;
      }
      userRole = role;
    }

    // 2. Role Mismatch Check
    if (userRole !== role) {
      Alert.alert("خطأ في الوصول", `هذا الحساب مسجل كـ ${userRole} وليس ${role}. يرجى تسجيل الدخول من البوابة الصحيحة.`);
      return;
    }

    // 3. Provision Role-Specific Entity (Idempotent)
    let status = "pending";
    try {
      if (role === "customer") {
        const { data: customer, error: cQueryError } = await supabase.from("customers").select("status").eq("id", userId).maybeSingle();
        if (cQueryError) throw cQueryError;
        
        if (!customer) {
          const { error: cInsertError } = await supabase.from("customers").insert({
            id: userId,
            email: userEmail,
            first_name: firstName || "User",
            last_name: lastName || "",
            phone_number: phoneNumber || "",
            zone_id: selectedZoneId || null,
            status: "active",
          });
          if (cInsertError) throw cInsertError;
          status = "active";
        } else {
          status = customer.status;
        }
      } else if (role === "merchant") {
        const { data: merchant, error: mQueryError } = await supabase.from("merchants").select("status").eq("id", userId).maybeSingle();
        if (mQueryError) throw mQueryError;

        if (!merchant) {
          const { error: mInsertError } = await supabase.from("merchants").insert({
            id: userId,
            business_name: businessName || "Store",
            contact_email: userEmail,
            contact_phone: phoneNumber || "",
            zone_id: selectedZoneId || null,
            status: "pending",
          });
          if (mInsertError) throw mInsertError;
          status = "pending";
        } else {
          status = merchant.status;
        }
      } else if (role === "driver") {
        const { data: driver, error: dQueryError } = await supabase.from("drivers").select("status").eq("id", userId).maybeSingle();
        if (dQueryError) throw dQueryError;

        if (!driver) {
          const { error: dInsertError } = await supabase.from("drivers").insert({
            id: userId,
            first_name: firstName || "Driver",
            last_name: lastName || "",
            email: userEmail,
            phone_number: phoneNumber || "",
            zone_id: selectedZoneId || null,
            status: "pending",
          });
          if (dInsertError) throw dInsertError;
          status = "pending";
        } else {
          status = driver.status;
        }
      }
    } catch (err) {
      Alert.alert("خطأ في التجهيز", "فشل إعداد بيانات الحساب. يرجى التواصل مع الدعم.");
      return;
    }

    // 4. Status Gating
    setApprovalStatus(status);

    if (status === "active") {
      if (role === "customer") {
        router.replace("/guest-marketplace");
      }
      // Future: add merchant/driver dashboard routes here
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
        await handleProvisioningAndGating(data.user.id, data.user.email || "");
      } else {
        // Sign Up Validation
        if (!firstName || !lastName || !phoneNumber || !selectedZoneId) {
          Alert.alert("خطأ", "يرجى ملء جميع الحقول المطلوبة واختيار المنطقة");
          setLoading(false);
          return;
        }
        if (role === "merchant" && !businessName) {
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
              first_name: firstName,
              last_name: lastName,
              phone_number: phoneNumber,
              zone_id: selectedZoneId,
              business_name: role === "merchant" ? businessName : undefined,
            }
          }
        });

        if (error) throw error;

        if (data.user && !data.session) {
          // Email confirmation required
          setNeedsConfirmation(true);
        } else if (data.user && data.session) {
          await handleProvisioningAndGating(data.user.id, data.user.email || "");
        }
      }
    } catch (error: any) {
      Alert.alert("خطأ", error.message || "حدث خطأ ما");
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.bgBase }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (needsConfirmation) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bgBase }]}>
        <View style={styles.statusContainer}>
          <Typography variant="h1" align="center" style={styles.statusTitle}>تأكيد البريد الإلكتروني</Typography>
          <Typography variant="body" color="secondary" align="center" style={styles.statusMessage}>
            تم إرسال رابط تأكيد إلى بريدك الإلكتروني. يرجى تأكيد الحساب ثم تسجيل الدخول.
          </Typography>
          <Button title="العودة لتسجيل الدخول" onPress={() => { setNeedsConfirmation(false); setIsLogin(true); }} />
        </View>
      </SafeAreaView>
    );
  }

  if (approvalStatus && approvalStatus !== "active") {
    const isBlocked = ["suspended", "blocked", "rejected"].includes(approvalStatus);
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bgBase }]}>
        <View style={styles.statusContainer}>
          <Typography variant="h1" align="center" style={styles.statusTitle}>
            {isBlocked ? "الحساب معطل" : "قيد المراجعة"}
          </Typography>
          <Typography variant="body" color="secondary" align="center" style={styles.statusMessage}>
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

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bgBase }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Typography variant="h1" align="center" style={styles.title}>{titleAr}</Typography>
            <Typography variant="body" color="secondary" align="center">{subtitleAr}</Typography>
          </View>

          <View style={styles.form}>
            {!isLogin && (
              <>
                <View style={[styles.row, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                  <Input label="الاسم الأول" placeholder="أحمد" value={firstName} onChangeText={setFirstName} style={{ flex: 1 }} />
                  <Input label="اللقب" placeholder="علي" value={lastName} onChangeText={setLastName} style={{ flex: 1 }} />
                </View>
                {role === "merchant" && (
                  <Input label="اسم المتجر" placeholder="متجر السعادة" value={businessName} onChangeText={setBusinessName} />
                )}
                <Input label="رقم الهاتف" placeholder="06XXXXXXXX" value={phoneNumber} onChangeText={setPhoneNumber} keyboardType="phone-pad" />
                
                <Typography variant="caption" color="secondary" style={styles.label}>اختر المنطقة (عين صفراء)</Typography>
                <View style={styles.zonesGrid}>
                  {zones.map((zone) => (
                    <TouchableOpacity
                      key={zone.id}
                      onPress={() => setSelectedZoneId(zone.id)}
                      style={[
                        styles.zoneItem,
                        { 
                          borderColor: selectedZoneId === zone.id ? colors.primary : colors.borderSubtle,
                          backgroundColor: selectedZoneId === zone.id ? "rgba(0, 229, 255, 0.1)" : colors.bgSurface
                        }
                      ]}
                    >
                      <Typography variant="caption" align="center" style={{ color: selectedZoneId === zone.id ? colors.primary : colors.textPrimary }}>
                        {zone.name}
                      </Typography>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <Input label="البريد الإلكتروني" placeholder="example@mail.com" value={email} onChangeText={setEmail} keyboardType="email-address" />
            <Input label="كلمة المرور" placeholder="********" value={password} onChangeText={setPassword} secureTextEntry />

            <Button title={isLogin ? "تسجيل الدخول" : "إنشاء حساب جديد"} onPress={handleAuth} loading={loading} style={styles.submitBtn} />
            <Button title={isLogin ? "ليس لديك حساب؟ سجل الآن" : "لديك حساب بالفعل؟ سجل دخولك"} variant="ghost" onPress={() => setIsLogin(!isLogin)} />
          </View>

          <Button title="العودة للرئيسية" variant="outline" onPress={() => router.push("/")} style={styles.backBtn} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  scrollContent: { padding: TOKENS.spacing.xl, paddingTop: TOKENS.spacing["3xl"] },
  header: { marginBottom: TOKENS.spacing["2xl"] },
  title: { color: TOKENS.colors.brandPrimary, marginBottom: TOKENS.spacing.xs },
  form: { gap: TOKENS.spacing.sm },
  row: { gap: TOKENS.spacing.md, width: "100%" },
  label: { marginBottom: TOKENS.spacing.xs, fontWeight: "600" },
  zonesGrid: { flexDirection: "row", flexWrap: "wrap", gap: TOKENS.spacing.sm, marginBottom: TOKENS.spacing.md },
  zoneItem: { paddingVertical: TOKENS.spacing.sm, paddingHorizontal: TOKENS.spacing.md, borderRadius: TOKENS.radius.sm, borderWidth: 1, minWidth: "30%" },
  submitBtn: { marginTop: TOKENS.spacing.md },
  backBtn: { marginTop: TOKENS.spacing.xl },
  statusContainer: { flex: 1, justifyContent: "center", padding: TOKENS.spacing.xl, gap: TOKENS.spacing.lg },
  statusTitle: { color: TOKENS.colors.brandPrimary },
  statusMessage: { marginBottom: TOKENS.spacing.xl },
});
