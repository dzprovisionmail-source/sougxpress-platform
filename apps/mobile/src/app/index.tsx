import React from "react";
import { Link } from "expo-router";
import { Image } from "react-native";
import { View, ScrollView, StyleSheet, SafeAreaView, I18nManager, TouchableOpacity } from "react-native";
import { Typography } from "../components/ui";
import { BRAND_NAME_AR, BRAND_SLOGAN, BRAND_CITY_LABEL, LOGO_DARK } from "../constants/brand";
import { TOKENS } from "../constants/tokens";
import { getThemeColors, DEFAULT_THEME } from "../constants/theme";

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
 * Uses the official logo asset. Logo is dark-bg only.
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
        {/* Official Logo */}
        <View style={styles.logoArea}>
          <Image
            source={LOGO_DARK}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        {/* Slogan */}
        <Typography variant="h1" style={styles.slogan} align="center">
          {BRAND_SLOGAN}
        </Typography>

        {/* City Label */}
        <Typography variant="body" color="secondary" align="center" style={styles.cityLabel}>
          {BRAND_CITY_LABEL}
        </Typography>

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
            {BRAND_NAME_AR} — منصة التجارة المحلية الأولى في عين صفراء
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
});
