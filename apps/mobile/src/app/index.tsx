import { KeyboardAwareView } from "@/components/ui/KeyboardAwareView";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { router, useLocalSearchParams } from "expo-router";
import {
  Image,
  Modal,
  ActivityIndicator,
  Platform,
  TextInput,
  Pressable,
  Keyboard,
} from "react-native";
import {
  View,
  ScrollView,
  StyleSheet,
  I18nManager,
  TouchableOpacity,
  Text,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Typography } from "@/components/ui";
import {
  BRAND_NAME_AR,
  BRAND_SLOGAN,
  BRAND_CITY_LABEL,
  LOGO_DARK,
  LOGO_OFFICIAL_WORDMARK,
} from "@/constants/brand";
import { TOKENS } from "@/constants/tokens";
import { getThemeColors, DEFAULT_THEME } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { getAuthenticatedEntryRoute } from "@/services/auth-entry.service";

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
 * The admin entry is opened from the brand-name link on the role-selection screen.
 */

type DialogState = "idle" | "loading" | "denied";

export default function EntryScreen() {
  const colors = getThemeColors(DEFAULT_THEME);
  const insets = useSafeAreaInsets();

  /* ── Founder dialog state ─ */
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogState, setDialogState] = useState<DialogState>("idle");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const passwordRef = useRef<TextInput>(null);

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

  const params = useLocalSearchParams<{ admin?: string }>();

  useEffect(() => {
    if (params.admin === "1") {
      openFounderDialog();
    }
  }, [params.admin, openFounderDialog]);

  /* ── Authentication ── */
  const handleFounderLogin = async () => {
    if (!email.trim() || !password) {
      setErrorMsg("يرجى إدخال البريد الإلكتروني وكلمة المرور.");
      return;
    }

    setDialogState("loading");
    setErrorMsg("");

    try {
      // signInWithPassword replaces the current Supabase session; avoid emitting
      // SIGNED_OUT first, which can race the navigation to the Founder workspace.
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

      // Verify an authorized Founder workspace role in public.profiles
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", authData.user.id)
        .single();

      if (profileError || !profile || !["founder", "admin"].includes(profile.role)) {
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

  const handleMarketEntry = async () => {
    try {
      const route = await getAuthenticatedEntryRoute();
      if (route) {
        router.push(route);
      } else {
        router.replace("/login");
      }
    } catch {
      router.replace("/login");
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
              {/* Official Logo */}
        <View style={styles.logoArea}>
          <Image
            source={LOGO_OFFICIAL_WORDMARK}
            style={styles.logoImage}
            resizeMode="contain"
          />
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
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.enterButton}
            onPress={handleMarketEntry}
          >
            <Typography variant="h2" style={styles.enterButtonText}>
              الدخول إلى السوق
            </Typography>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.footerTextContainer}>
            <TouchableOpacity onPress={openFounderDialog} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={[styles.footerText, { color: colors.textPrimary }]}>
                Soug-XPRESS
              </Text>
            </TouchableOpacity>
            <Text style={[styles.footerText, { color: colors.textDisabled }]}>
              {" "}— منصة التجارة المحلية الأولى في عين صفراء
            </Text>
          </View>
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
          <Pressable style={[styles.dialogCard, { backgroundColor: colors.bgElevated }]}>
            <KeyboardAwareView
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
                    backgroundColor: colors.bgSurface,
                    color: colors.textPrimary,
                    borderColor: colors.borderSubtle,
                  },
                ]}
                placeholder="البريد الإلكتروني"
                placeholderTextColor={colors.textDisabled}
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
                textAlign="left"
              />

              {/* Password */}
              <TextInput
                ref={passwordRef}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.bgSurface,
                    color: colors.textPrimary,
                    borderColor: colors.borderSubtle,
                  },
                ]}
                placeholder="كلمة المرور"
                placeholderTextColor={colors.textDisabled}
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
                textAlign="left"
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
                      ? colors.bgSurface
                      : colors.primary,
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
                      color: "#FFFFFF",
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
                  style={{ color: colors.textSecondary }}
                >
                  إلغاء
                </Typography>
              </TouchableOpacity>
            </KeyboardAwareView>
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
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: TOKENS.spacing["2xl"],
    paddingHorizontal: TOKENS.spacing.md,
  },
  logoImage: {
    width: "100%",
    maxWidth: 380,
    height: 112,
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
    backgroundColor: "#0D47A1",
    borderRadius: TOKENS.radius.full,
    paddingVertical: TOKENS.spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    ...TOKENS.shadows.neonBlue,
  },
  enterButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  footer: {
    marginTop: "auto",
    paddingTop: TOKENS.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
    width: "100%",
  },
  footerTextContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    flexWrap: "wrap",
  },
  footerText: {
    fontFamily: TOKENS.typography.families.arabic,
    fontSize: TOKENS.typography.sizes.xs,
    fontWeight: "400",
    textAlign: "center",
    lineHeight: TOKENS.typography.lineHeights.arabic * TOKENS.typography.sizes.xs,
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
    paddingVertical: 0,
    fontSize: 15,
    lineHeight: 20,
    height: 52,
    marginBottom: TOKENS.spacing.md,
    writingDirection: "ltr",
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
