import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAppTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/lib/supabase";
import { CheckCircle2, AlertTriangle, ArrowRight, RefreshCw } from "lucide-react-native";

export default function AuthCallbackScreen() {
  const { colors, tokens } = useAppTheme();
  const router = useRouter();
  const params = useLocalSearchParams();

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [errorCode, setErrorCode] = useState("");
  const [email, setEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Check for error parameters in query or hash fragment
        const error = params.error || params.error_code;
        const errDesc = params.error_description || params.message;
        const code = params.code;

        if (error) {
          setErrorCode(String(error));
          setErrorMessage(String(errDesc || "حدث خطأ أثناء تفعيل البريد الإلكتروني."));
          setStatus("error");
          return;
        }

        // If Supabase returns an authorization code, exchange it for a session
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(String(code));
          if (exchangeError) throw exchangeError;
          setStatus("success");
          return;
        }

        // Check current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (session) {
          setStatus("success");
        } else {
          // If no code and no session, check if we have query params indicating success or token
          setStatus("success");
        }
      } catch (err: any) {
        setErrorCode(err?.code || "verification_failed");
        setErrorMessage(err?.message || "رابط التفعيل منتهي أو غير صالح.");
        setStatus("error");
      }
    };

    handleAuthCallback();
  }, [params]);

  const handleResend = async () => {
    if (!email.trim()) {
      return;
    }
    try {
      setResending(true);
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
      });
      if (error) throw error;
      setResendSuccess(true);
    } catch (err: any) {
      setErrorMessage(err?.message || "تعذر إعادة إرسال رابط التفعيل.");
    } finally {
      setResending(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.bgBase }]}>
      <View style={[styles.card, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
        {status === "loading" && (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.title, { color: colors.textPrimary, fontFamily: tokens.typography.families.arabic, marginTop: 16 }]}>
              جاري تفعيل الحساب...
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary, fontFamily: tokens.typography.families.arabic }]}>
              يرجى الانتظار بينما نقوم بالتحقق من بريدك الإلكتروني.
            </Text>
          </View>
        )}

        {status === "success" && (
          <View style={styles.centerContent}>
            <CheckCircle2 size={64} color="#10B981" />
            <Text style={[styles.title, { color: colors.textPrimary, fontFamily: tokens.typography.families.arabic, marginTop: 16 }]}>
              تم تفعيل حسابك بنجاح 🎉
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary, fontFamily: tokens.typography.families.arabic }]}>
              مرحبًا بك في Soug-XPRESS. أصبح حسابك جاهزًا الآن للاستخدام والطلب من السوق المحلي.
            </Text>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
              onPress={() => router.replace("/(tabs)/home")}
            >
              <Text style={[styles.primaryButtonText, { fontFamily: tokens.typography.families.arabic }]}>
                الدخول إلى Soug-XPRESS
              </Text>
              <ArrowRight size={20} color="#FFFFFF" style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          </View>
        )}

        {status === "error" && (
          <View style={styles.centerContent}>
            <AlertTriangle size={64} color="#EF4444" />
            <Text style={[styles.title, { color: colors.textPrimary, fontFamily: tokens.typography.families.arabic, marginTop: 16 }]}>
              رابط التفعيل منتهي أو غير صالح
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary, fontFamily: tokens.typography.families.arabic }]}>
              {errorMessage || "انترنت أو رابط غير صالح. لا تقلق، يمكنك طلب رابط تفعيل جديد بسهولة."}
            </Text>

            {resendSuccess ? (
              <View style={[styles.successBox, { backgroundColor: "#10B98118", borderColor: "#10B981" }]}>
                <Text style={[styles.successText, { color: "#10B981", fontFamily: tokens.typography.families.arabic }]}>
                  تم إرسال رابط تفعيل جديد إلى بريدك الإلكتروني بنجاح.
                </Text>
              </View>
            ) : (
              <View style={styles.resendContainer}>
                <TouchableOpacity
                  style={[styles.outlineButton, { borderColor: colors.primary }]}
                  onPress={handleResend}
                  disabled={resending}
                >
                  {resending ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <>
                      <RefreshCw size={18} color={colors.primary} style={{ marginRight: 8 }} />
                      <Text style={[styles.outlineButtonText, { color: colors.primary, fontFamily: tokens.typography.families.arabic }]}>
                        إعادة إرسال رابط التفعيل
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={[styles.secondaryButton, { marginTop: 16 }]}
              onPress={() => router.replace("/components/auth/AuthScreen" as any)}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.textSecondary, fontFamily: tokens.typography.families.arabic }]}>
                العودة إلى تسجيل الدخول
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  centerContent: {
    alignItems: "center",
    width: "100%",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  primaryButton: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  resendContainer: {
    width: "100%",
    marginTop: 12,
  },
  outlineButton: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  outlineButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },
  secondaryButton: {
    paddingVertical: 8,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  successBox: {
    width: "100%",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    marginVertical: 12,
  },
  successText: {
    fontSize: 13,
    textAlign: "center",
  },
});
