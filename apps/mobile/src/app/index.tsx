import React, { useState, useRef, useCallback } from "react";
import { Link, router } from "expo-router";
import {
  Image,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Pressable,
  Keyboard,
} from "react-native";
import {
  View,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  I18nManager,
  TouchableOpacity,
} from "react-native";
import { Typography } from "../components/ui";
import {
  BRAND_NAME_AR,
  BRAND_SLOGAN,
  BRAND_CITY_LABEL,
  LOGO_DARK,
} from "../constants/brand";
import { TOKENS } from "../constants/tokens";
import { getThemeColors, DEFAULT_THEME } from "../constants/theme";
import { supabase } from "../lib/supabase";

/**
 * Soug-XPRESS Entry Screen — Brand Logo Integration
 *
 * First visible screen when opening the app:
 * - Official Soug-XPRESS logo (mascot + wordmark)
 * - Slogan: "سوقك يوصلك لبابك"
 * - Location label: "سوق عين الصفراء"
 * - Primary action button: "الدخول إلى السوق"
 * - Button opens the existing role-selection flow (intent gateway)
 *
 * Hidden: 5-tap sequence on the logo within 3 seconds opens the Founder login dialog.
 * Not accessible or visible during normal customer / merchant / driver use.
 */

type DialogState = "idle" | "loading" | "denied";

const FOUNDER_TAP_THRESHOLD = 5;
const FOUNDER_TAP_WINDOW_MS = 3000;

export default function EntryScreen() {
  const colors = getThemeColors(DEFAULT_THEME);

  /* ── Founder dialog state ─ */
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogState, setDialogState] = useState<DialogState>("idle");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const passwordRef = useRef<TextInput>(null);

  /* ── Multi-tap gesture state ─ */
  const tapTimestamps = useRef<number[]>([]);

  /* ── Open / close helpers ─ */
  const openFounderDialog = useCallback(() => {
    setEmail("");
    setPassword("");
    setErrorMsg("");
    setDialogState("idle");
    setDialogVisible(true);
  }, []);

  const closeFounderDialog = useCallback(() => {
    Keyboard.dismiss();
    setDialogVisible(false);
    setDialogState("idle");
    setErrorMsg("");
  }, []);

  /* ── Multi-tap handler ─ */
  const handleLogoPress = useCallback(() => {
    const now = Date.now();
    const taps = tapTimestamps.current;

    const recentTaps = taps.filter((t) => now - t <= FOUNDER_TAP_WINDOW_MS);
    recentTaps.push(now);
    tapTimestamps.current = recentTaps;

    if (recentTaps.length >= FOUNDER_TAP_THRESHOLD) {
      tapTimestamps.current = [];
      openFounderDialog();
    }
  }, [openFounderDialog]);

  /* ── Authentication ── */
  const handleFounderLogin = async () => {
    if (!email.trim() || !password) {
      setErrorMsg("يرجى إدخال البريد الإلكتروني وكلمة المرور.");
      return;
    }

    setDialogState("loading");
    setErrorMsg("");

    try {
      // Sign out any existing session first so it doesn't bleed into founder space
      await supabase.auth.signOut();

      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

      if (authError || !authData.user) {
        setErrorMsg("بريد إلكتروني أو كلمة مرور غير صحيحة.");
        setDialogState("denied");
        return;
      }

      // Verify role = 'founder' in public.profiles
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", authData.user.id)
        .single();

      if (profileError || !profile || profile.role !== "founder") {
        // Sign the non-founder user back out immediately
        await supabase.auth.signOut();
        setErrorMsg("ليس لديك صلاحية دخول منطقة المؤسس.");
        setDialogState("denied");
        return;
      }

      // Success — close dialog then navigate
      setDialogVisible(false);
      router.replace("/founder");
    } catch (e: unknown) {
      setErrorMsg("حدث خطأ غير متوقع. حاول مجدداً.");
      setDialogState("denied");
    }
  };

  /* ── Render ── */
  const isLoading = dialogState === "loading";

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bgBase }]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Official Logo — 5-tap sequence within 3 seconds reveals Founder entry */}
        <View style={styles.logoArea}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleLogoPress}
            accessible={false}
            accessibilityRole="none"
          >
            <Image
              source={LOGO_DARK}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>

        {/* Slogan */}
        <Typography variant="h1" style={styles.slogan} align="center">
          {BRAND_SLOGAN}
        </Typography>

        {/* City Label */}
        <Typography
          variant="body"
          color="secondary"
          align="center"
          style={styles.cityLabel}
        >
          {BRAND_CITY_LABEL}
        </Typography>

        {/* Role Selection Gateway */}
        <View style={styles.gatewayContainer}>
          <Link href="/login" asChild>
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.enterButton}
            >
              <Typography variant="h2" style={styles.enterButtonText}>
                الدخول إلى السوق
              </Typography>
            </TouchableOpacity>
          </Link>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Typography variant="caption" color="disabled" align="center">
            {BRAND_NAME_AR} — منصة التجارة المحلية الأولى في عين صفراء
          </Typography>
        </View>
      </ScrollView>

      {/* ── Founder Login Dialog ── Hidden from normal users ── */}
      <Modal
        visible={dialogVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closeFounderDialog}
      >
        <Pressable
          style={styles.backdrop}
          onPress={isLoading ? undefined : closeFounderDialog}
        >
          {/* Prevent taps inside the card from closing the modal */}
          <Pressable style={[styles.dialogCard, { backgroundColor: TOKENS.colors.dark.bgElevated }]}>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
              {/* Header */}
              <View style={styles.dialogHeader}>
                <Typography
                  variant="h2"
                  align="center"
                  style={{ color: TOKENS.colors.brandPrimary }}
                >
                  🔐 دخول خاص
                </Typography>
              </View>

              {/* Email */}
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: TOKENS.colors.dark.bgSurface,
                    color: TOKENS.colors.dark.textPrimary,
                    borderColor: TOKENS.colors.dark.borderSubtle,
                  },
                ]}
                placeholder="البريد الإلكتروني"
                placeholderTextColor={TOKENS.colors.dark.textDisabled}
                value={email}
                onChangeText={(v) => {
                  setEmail(v);
                  setErrorMsg("");
                  setDialogState("idle");
                }}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                editable={!isLoading}
                textAlign="right"
              />

              {/* Password */}
              <TextInput
                ref={passwordRef}
                style={[
                  styles.input,
                  {
                    backgroundColor: TOKENS.colors.dark.bgSurface,
                    color: TOKENS.colors.dark.textPrimary,
                    borderColor: TOKENS.colors.dark.borderSubtle,
                  },
                ]}
                placeholder="كلمة المرور"
                placeholderTextColor={TOKENS.colors.dark.textDisabled}
                value={password}
                onChangeText={(v) => {
                  setPassword(v);
                  setErrorMsg("");
                  setDialogState("idle");
                }}
                secureTextEntry
                textContentType="password"
                returnKeyType="done"
                onSubmitEditing={handleFounderLogin}
                editable={!isLoading}
                textAlign="right"
              />

              {/* Error / denied message */}
              {errorMsg ? (
                <View style={styles.errorRow}>
                  <Typography
                    variant="caption"
                    align="center"
                    style={{ color: TOKENS.colors.statusError }}
                  >
                    {errorMsg}
                  </Typography>
                </View>
              ) : null}

              {/* Actions */}
              <TouchableOpacity
                style={[
                  styles.loginButton,
                  {
                    backgroundColor: isLoading
                      ? TOKENS.colors.dark.bgSurface
                      : TOKENS.colors.brandPrimary,
                  },
                ]}
                onPress={handleFounderLogin}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator color={TOKENS.colors.brandPrimary} />
                ) : (
                  <Typography
                    variant="body"
                    style={{
                      color: TOKENS.colors.dark.textOnBrand,
                      fontWeight: "700",
                    }}
                  >
                    دخول
                  </Typography>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={closeFounderDialog}
                disabled={isLoading}
                activeOpacity={0.7}
              >
                <Typography
                  variant="caption"
                  style={{ color: TOKENS.colors.dark.textSecondary }}
                >
                  إلغاء
                </Typography>
              </TouchableOpacity>
            </KeyboardAvoidingView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    paddingHorizontal: TOKENS.spacing.lg,
    paddingTop: TOKENS.spacing["3xl"],
    paddingBottom: TOKENS.spacing.xl,
    alignItems: "center",
  },
  logoArea: {
    alignItems: "center",
    marginBottom: TOKENS.spacing["2xl"],
  },
  logoImage: {
    width: 280,
    height: 220,
  },
  slogan: {
    color: TOKENS.colors.brandAccent,
    marginBottom: TOKENS.spacing.sm,
  },
  cityLabel: {
    marginBottom: TOKENS.spacing["2xl"],
  },
  gatewayContainer: {
    width: "100%",
    marginTop: TOKENS.spacing.md,
    marginBottom: TOKENS.spacing.xl,
  },
  enterButton: {
    width: "100%",
    backgroundColor: TOKENS.colors.brandPrimary,
    borderRadius: TOKENS.radius.full,
    paddingVertical: TOKENS.spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  enterButtonText: {
    color: TOKENS.colors.dark.textOnBrand,
    fontWeight: "700",
  },
  footer: {
    marginTop: "auto",
    paddingTop: TOKENS.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
    width: "100%",
  },

  /* ── Founder dialog ── */
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: TOKENS.spacing.lg,
  },
  dialogCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: TOKENS.radius.lg,
    padding: TOKENS.spacing.xl,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  dialogHeader: {
    marginBottom: TOKENS.spacing.xl,
    alignItems: "center",
  },
  input: {
    borderWidth: 1,
    borderRadius: TOKENS.radius.md,
    paddingHorizontal: TOKENS.spacing.md,
    paddingVertical: TOKENS.spacing.sm + 4,
    fontSize: 15,
    marginBottom: TOKENS.spacing.md,
    writingDirection: "rtl",
  },
  errorRow: {
    marginBottom: TOKENS.spacing.sm,
    paddingHorizontal: TOKENS.spacing.xs,
  },
  loginButton: {
    borderRadius: TOKENS.radius.full,
    paddingVertical: TOKENS.spacing.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: TOKENS.spacing.xs,
    marginBottom: TOKENS.spacing.sm,
    minHeight: 48,
  },
  cancelButton: {
    alignItems: "center",
    paddingVertical: TOKENS.spacing.sm,
  },
});
