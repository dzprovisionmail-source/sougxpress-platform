import React from "react";
import { Link } from "expo-router";
import { View, ScrollView, StyleSheet, SafeAreaView, I18nManager, TouchableOpacity } from "react-native";
import { Typography, Card, Button } from "../components/ui";
import { TOKENS } from "../constants/tokens";
import { getThemeColors, DEFAULT_THEME } from "../constants/theme";

/**
 * SougXPRESS Entry Screen — UI Refinement Sprint
 * 
 * First visible screen when opening the app:
 * - Large SougXPRESS brand mark
 * - Slogan: "سوقك يوصلك لبابك"
 * - Subtitle: "سوق عين الصفراء"
 * - Primary action button: "الدخول إلى السوق"
 * - Button opens the existing role-selection flow (intent gateway)
 * 
 * Uses only orange/black brand direction. No cyan.
 */

export default function EntryScreen() {
  const colors = getThemeColors(DEFAULT_THEME);
  const isRTL = I18nManager.isRTL;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bgBase }]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Brand Logo Area */}
        <View style={styles.logoArea}>
          {/* Logo mark: orange cart circle with X */}
          <View style={styles.logoMark}>
            <View style={styles.logoCircle}>
              <View style={styles.logoInner}>
                <Typography variant="display" style={styles.logoX}>X</Typography>
              </View>
            </View>
          </View>

          {/* Brand wordmark */}
          <View style={[styles.wordmarkRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <Typography variant="display" style={styles.sougText}>
              سوق
            </Typography>
            <Typography variant="display" style={styles.xpressText}>
              إكسبريس
            </Typography>
          </View>

          {/* Slogan */}
          <Typography variant="h1" style={styles.slogan} align="center">
            سوقك يوصلك لبابك
          </Typography>

          {/* Subtitle */}
          <Typography variant="body" color="secondary" align="center">
            سوق عين الصفراء
          </Typography>
        </View>

        {/* Role Selection Gateway */}
        <View style={styles.gatewayContainer}>
          <Link href="/login" asChild>
            <TouchableOpacity activeOpacity={0.8} style={styles.enterButton}>
              <Typography variant="h2" style={styles.enterButtonText}>
                الدخول إلى السوق
              </Typography>
            </TouchableOpacity>
          </Link>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Typography variant="caption" color="disabled" align="center">
            سوق إكسبريس — منصة التجارة المحلية الأولى في عين صفراء
          </Typography>
        </View>
      </ScrollView>
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
    marginBottom: TOKENS.spacing["3xl"],
  },
  logoMark: {
    marginBottom: TOKENS.spacing.lg,
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: TOKENS.colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  logoInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
  },
  logoX: {
    color: TOKENS.colors.brandPrimary,
    fontWeight: "900",
  },
  wordmarkRow: {
    alignItems: "center",
    gap: TOKENS.spacing.sm,
    marginBottom: TOKENS.spacing.md,
  },
  sougText: {
    color: TOKENS.colors.brandPrimary,
    fontWeight: "900",
  },
  xpressText: {
    color: TOKENS.colors.brandPrimary,
    fontWeight: "900",
  },
  slogan: {
    color: TOKENS.colors.brandAccent,
    marginBottom: TOKENS.spacing.xs,
  },
  gatewayContainer: {
    width: "100%",
    marginTop: TOKENS.spacing["2xl"],
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
});
