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
import { Typography, Input, Button, Card } from "../ui";
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
        await handleRoleGating(session.user.id);
      }
    } catch (error) {
      console.error("Session check error:", error);
    } finally {
      setInitialLoading(false);
    }
  };

  const handleRoleGating = async (userId: string) => {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (profileError || !profile) return;

    if (profile.role !== role) {
      // Role mismatch - we don't sign out automatically here to allow user to see other roles
      // but we don't let them proceed in this specific auth flow
      return;
    }

    // Check status for specific roles
    let status = "active";
    if (role === "customer") {
      const { data } = await supabase.from("customers").select("status").eq("id", userId).single();
      status = data?.status || "active";
    } else if (role === "merchant") {
      const { data } = await supabase.from("merchants").select("status").eq("id", userId).single();
      status = data?.status || "pending";
    } else if (role === "driver") {
      const { data } = await supabase.from("drivers").select("status").eq("id", userId).single();
      status = data?.status || "pending";
    }

    setApprovalStatus(status);

    if (status === "active") {
      if (role === "customer") {
        router.replace("/guest-marketplace");
      } else {
        // Redirect to role dashboard if exists, else stay
        // router.replace(`/${role}-dashboard`);
      }
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
        await handleRoleGating(data.user.id);
      } else {
        // Validation for Sign Up
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
        });

        if (error) throw error;
        if (!data.user) throw new Error("فشل إنشاء المستخدم");

        const userId = data.user.id;

        // Provisioning (Idempotent: RLS/Triggers handle profiles)
        // Note: profiles.role is source of truth, inserted by trigger or manually if allowed
        await supabase.from("profiles").insert({ id: userId, role }).select().single();

        if (role === "customer") {
          await supabase.from("customers").upsert({
            id: userId,
            email,
            first_name: firstName,
            last_name: lastName,
            phone_number: phoneNumber,
            zone_id: selectedZoneId,
            status: "active",
          });
        } else if (role === "merchant") {
          await supabase.from("merchants").upsert({
            id: userId,
            business_name: businessName,
            contact_email: email,
            contact_phone: phoneNumber,
            zone_id: selectedZoneId,
            status: "pending",
          });
        } else if (role === "driver") {
          await supabase.from("drivers").upsert({
            id: userId,
            first_name: firstName,
            last_name: lastName,
            email,
            phone_number: phoneNumber,
            zone_id: selectedZoneId,
            status: "pending",
          });
        }

        await handleRoleGating(userId);
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

  // Approval Gating Screens
  if (approvalStatus && approvalStatus !== "active") {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bgBase }]}>
        <View style={styles.statusContainer}>
          <Typography variant="h1" align="center" style={styles.statusTitle}>
            {approvalStatus === "pending" ? "قيد المراجعة" : "الحساب معطل"}
          </Typography>
          <Typography variant="body" color="secondary" align="center" style={styles.statusMessage}>
            {approvalStatus === "pending" 
              ? "طلبك قيد المراجعة من قبل الإدارة. سنقوم بتفعيل حسابك قريباً."
              : "عذراً، تم تعليق أو رفض حسابك. يرجى التواصل مع الدعم الفني."}
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
            <Typography variant="h1" align="center" style={styles.title}>
              {titleAr}
            </Typography>
            <Typography variant="body" color="secondary" align="center">
              {subtitleAr}
            </Typography>
          </View>

          <View style={styles.form}>
            {!isLogin && (
              <>
                <View style={[styles.row, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                  <Input
                    label="الاسم الأول"
                    placeholder="أحمد"
                    value={firstName}
                    onChangeText={setFirstName}
                    style={{ flex: 1 }}
                  />
                  <Input
                    label="اللقب"
                    placeholder="علي"
                    value={lastName}
                    onChangeText={setLastName}
                    style={{ flex: 1 }}
                  />
                </View>
                {role === "merchant" && (
                  <Input
                    label="اسم المتجر"
                    placeholder="متجر السعادة"
                    value={businessName}
                    onChangeText={setBusinessName}
                  />
                )}
                <Input
                  label="رقم الهاتف"
                  placeholder="06XXXXXXXX"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  keyboardType="phone-pad"
                />
                
                <Typography variant="caption" color="secondary" style={styles.label}>
                  اختر المنطقة (عين صفراء)
                </Typography>
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
                      <Typography 
                        variant="caption" 
                        align="center"
                        style={{ color: selectedZoneId === zone.id ? colors.primary : colors.textPrimary }}
                      >
                        {zone.name}
                      </Typography>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <Input
              label="البريد الإلكتروني"
              placeholder="example@mail.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />

            <Input
              label="كلمة المرور"
              placeholder="********"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <Button
              title={isLogin ? "تسجيل الدخول" : "إنشاء حساب جديد"}
              onPress={handleAuth}
              loading={loading}
              style={styles.submitBtn}
            />

            <Button
              title={isLogin ? "ليس لديك حساب؟ سجل الآن" : "لديك حساب بالفعل؟ سجل دخولك"}
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
  safeArea: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    padding: TOKENS.spacing.xl,
    paddingTop: TOKENS.spacing["3xl"],
  },
  header: {
    marginBottom: TOKENS.spacing["2xl"],
  },
  title: {
    color: TOKENS.colors.brandPrimary,
    marginBottom: TOKENS.spacing.xs,
  },
  form: {
    gap: TOKENS.spacing.sm,
  },
  row: {
    gap: TOKENS.spacing.md,
    width: "100%",
  },
  label: {
    marginBottom: TOKENS.spacing.xs,
    fontWeight: "600",
  },
  zonesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: TOKENS.spacing.sm,
    marginBottom: TOKENS.spacing.md,
  },
  zoneItem: {
    paddingVertical: TOKENS.spacing.sm,
    paddingHorizontal: TOKENS.spacing.md,
    borderRadius: TOKENS.radius.sm,
    borderWidth: 1,
    minWidth: "30%",
  },
  submitBtn: {
    marginTop: TOKENS.spacing.md,
  },
  backBtn: {
    marginTop: TOKENS.spacing.xl,
  },
  statusContainer: {
    flex: 1,
    justifyContent: "center",
    padding: TOKENS.spacing.xl,
    gap: TOKENS.spacing.lg,
  },
  statusTitle: {
    color: TOKENS.colors.brandPrimary,
  },
  statusMessage: {
    marginBottom: TOKENS.spacing.xl,
  },
});
