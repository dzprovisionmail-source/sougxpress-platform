import React from "react";
import { Link } from "expo-router";
import { Image } from "react-native";
import { View, ScrollView, StyleSheet, SafeAreaView, I18nManager } from "react-native";
import { Typography, Card } from "../components/ui";
import { BRAND_NAME_AR, LOGO_ICON } from "../constants/brand";
import { TOKENS } from "../constants/tokens";
import { getThemeColors, DEFAULT_THEME } from "../constants/theme";

/**
 * Role Selection Gateway — Brand Logo Integration
 *
 * This is the role-selection screen accessed from the entry screen via
 * the "الدخول إلى السوق" button. It presents the 4 role options:
 * - أريد التسوق
 * - أريد بيع منتجاتي
 * - أريد العمل كموصل
 * - استكشف السوق أولاً
 *
 * Uses the official logo icon in the header.
 */

interface IntentOption {
  id: string;
  emoji: string;
  titleAr: string;
  descriptionAr: string;
  route: string;
}

const INTENT_OPTIONS: IntentOption[] = [
  {
    id: "customer",
    emoji: "🛍️",
    titleAr: "أريد التسوق",
    descriptionAr: "اكتشف المتاجر المحلية واطلب ما تحتاجه.",
    route: "/customer-auth",
  },
  {
    id: "merchant",
    emoji: "🏪",
    titleAr: "أريد بيع منتجاتي",
    descriptionAr: "أنشئ متجرك وابدأ البيع بعد اعتماد حسابك.",
    route: "/merchant-auth",
  },
  {
    id: "driver",
    emoji: "🛵",
    titleAr: "أريد العمل كموصل",
    descriptionAr: "انضم إلى فريق التوصيل بعد الموافقة.",
    route: "/driver-auth",
  },
  {
    id: "guest",
    emoji: "👀",
    titleAr: "استكشف السوق أولًا",
    descriptionAr: "تصفح المتاجر والمنتجات دون إنشاء حساب.",
    route: "/guest-marketplace",
  },
];

export default function RoleSelectionScreen() {
  const colors = getThemeColors(DEFAULT_THEME);
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
              <Card variant="elevated" style={styles.intentCard}>
                <View style={[styles.cardContent, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                  <View style={styles.emojiWrapper}>
                    <Typography style={styles.emoji}>{option.emoji}</Typography>
                  </View>
                  <View style={styles.textWrapper}>
                    <Typography variant="h3" style={styles.intentTitle}>
                      {option.titleAr}
                    </Typography>
                    <Typography variant="caption" color="secondary">
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
    paddingHorizontal: TOKENS.spacing.lg,
    paddingTop: TOKENS.spacing["3xl"],
    paddingBottom: TOKENS.spacing.xl,
  },
  header: {
    marginBottom: TOKENS.spacing["3xl"],
    alignItems: "center",
  },
  headerLogo: {
    width: 64,
    height: 64,
    marginBottom: TOKENS.spacing.md,
  },
  headerTitle: {
    color: TOKENS.colors.brandPrimary,
    marginBottom: TOKENS.spacing.xs,
  },
  optionsContainer: {
    gap: TOKENS.spacing.md,
    flex: 1,
  },
  intentCard: {
    marginBottom: TOKENS.spacing.xs,
  },
  cardContent: {
    alignItems: "center",
    gap: TOKENS.spacing.lg,
  },
  emojiWrapper: {
    width: 60,
    height: 60,
    borderRadius: TOKENS.radius.md,
    backgroundColor: "rgba(255, 138, 0, 0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: {
    fontSize: 32,
  },
  textWrapper: {
    flex: 1,
  },
  intentTitle: {
    marginBottom: 4,
  },
  footer: {
    marginTop: TOKENS.spacing["2xl"],
    paddingTop: TOKENS.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
  },
});
