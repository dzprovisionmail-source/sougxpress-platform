import React, { useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  I18nManager,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Typography, Input, Button } from "../ui";
import { TOKENS } from "../../constants/tokens";
import { getThemeColors, DEFAULT_THEME } from "../../constants/theme";
import { supabase } from "../../lib/supabase";
import { Database } from "../../../../../src/types/supabase";

type Role = "customer" | "merchant" | "driver";

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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [businessName, setBusinessName] = useState("");

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

        // Check profile role
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .single();

        if (profileError) throw profileError;

        if (profile.role !== role) {
          await supabase.auth.signOut();
          throw new Error(`هذا الحساب مسجل كـ ${profile.role} وليس ${role}`);
        }

        router.replace(role === "customer" ? "/guest-marketplace" : "/");
      } else {
        // Validation for Sign Up
        if (!firstName || !lastName || !phoneNumber) {
          Alert.alert("خطأ", "يرجى ملء جميع الحقول المطلوبة");
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

        // 1. Create Profile (Role is handled by RLS/Trigger but we pass it for clarity)
        const { error: pError } = await supabase
          .from("profiles")
          .insert({ id: userId, role });
        
        if (pError && !pError.message.includes("already exists")) throw pError;

        // 2. Create Role-Specific Record
        if (role === "customer") {
          const { error: cError } = await supabase.from("customers").insert({
            id: userId,
            email,
            first_name: firstName,
            last_name: lastName,
            phone_number: phoneNumber,
            status: "active",
          });
          if (cError) throw cError;
        } else if (role === "merchant") {
          const { error: mError } = await supabase.from("merchants").insert({
            id: userId,
            business_name: businessName,
            contact_email: email,
            contact_phone: phoneNumber,
            status: "pending",
          });
          if (mError) throw mError;
        } else if (role === "driver") {
          const { error: dError } = await supabase.from("drivers").insert({
            id: userId,
            first_name: firstName,
            last_name: lastName,
            email,
            phone_number: phoneNumber,
            status: "pending",
          });
          if (dError) throw dError;
        }

        Alert.alert(
          "نجاح",
          role === "customer" 
            ? "تم إنشاء الحساب بنجاح" 
            : "تم تقديم الطلب بنجاح. يرجى انتظار مراجعة الإدارة."
        );
        
        if (role === "customer") {
          router.replace("/guest-marketplace");
        } else {
          setIsLogin(true);
        }
      }
    } catch (error: any) {
      Alert.alert("خطأ", error.message || "حدث خطأ ما");
    } finally {
      setLoading(false);
    }
  };

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
                    style={{ flex: 1, marginLeft: isRTL ? 0 : 8, marginRight: isRTL ? 8 : 0 }}
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
  submitBtn: {
    marginTop: TOKENS.spacing.md,
  },
  backBtn: {
    marginTop: TOKENS.spacing.xl,
  },
});
