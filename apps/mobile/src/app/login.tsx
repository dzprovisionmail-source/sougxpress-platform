import React from "react";
import { Link } from "expo-router";
import { Image } from "react-native";
import { View, ScrollView, StyleSheet, SafeAreaView, I18nManager } from "react-native";
import { Typography, Card } from "../components/ui";
import { BRAND_NAME_AR, LOGO_ICON, ICON_SHOPPING, ICON_STORE, ICON_DELIVERY } from "../constants/brand";
import { TOKENS } from "../constants/tokens";
import { useAppTheme } from "../contexts/ThemeContext";

export default function RoleSelectionScreen() {
  const { colors, tokens } = useAppTheme();
  const isRTL = I18nManager.isRTL;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bgBase }]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with official logo */}
        <View style={styles.header}>
          <Image
            source={LOGO_ICON}
            style={styles.headerLogo}
            resizeMode="contain"
          />
          <Typography variant="h1" align="center" style={styles.headerTitle}>
            مرحباً بك في {BRAND_NAME_AR}
          </Typography>
          <Typography variant="body" color="secondary" align="center">
            اختر ما تريد فعله
          </Typography>
        </View>

        {/* Intent Options List */}
        <View style={styles.optionsContainer}>
          {INTENT_OPTIONS.map((option) => (
            <Link key={option.id} href={option.route} asChild>
              <Card variant="elevated" style={[styles.intentCard, { backgroundColor: colors.bgElevated }]}>
                <View style={[styles.cardContent, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                  {option.icon && (
                    <View style={[styles.iconWrapper, { backgroundColor: colors.bgSurface }]}>
                      <Image
                        source={option.icon}
                        style={styles.roleIcon}
                        resizeMode="contain"
                      />
                    </View>
                  )}
                  <View style={[styles.textWrapper, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
                    <Typography variant="h3" align="right" style={styles.intentTitle}>
                      {option.titleAr}
                    </Typography>
                    <Typography variant="caption" color="secondary" align="right">
                      {option.descriptionAr}
                    </Typography>
                  </View>
                </View>
              </Card>
            </Link>
          ))}
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
    paddingHorizontal: tokens.spacing.lg,
    paddingTop: tokens.spacing["3xl"],
    paddingBottom: tokens.spacing.xl,
  },
  header: {
    marginBottom: tokens.spacing["3xl"],
    alignItems: "center",
  },
  headerLogo: {
    width: 64,
    height: 64,
    marginBottom: tokens.spacing.md,
  },
  headerTitle: {
    color: colors.brandPrimary,
    marginBottom: tokens.spacing.xs,
  },
  optionsContainer: {
    gap: tokens.spacing.md,
    flex: 1,
  },
  intentCard: {
    marginBottom: tokens.spacing.xs,
  },
  cardContent: {
    alignItems: "center",
    gap: tokens.spacing.lg,
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: tokens.radius.md,
    backgroundColor: colors.bgSurface,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  roleIcon: {
    width: "100%",
    height: "100%",
  },
  textWrapper: {
    flex: 1,
  },
  intentTitle: {
    marginBottom: 4,
  },
  footer: {
    marginTop: tokens.spacing["2xl"],
    paddingTop: tokens.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
  },
});
