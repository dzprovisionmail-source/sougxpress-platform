import React from "react";
import { Link } from "expo-router";
import { View, ScrollView, StyleSheet, SafeAreaView, I18nManager } from "react-native";
import { Typography, Card, Button } from "../components/ui";
import { TOKENS } from "../constants/tokens";
import { getThemeColors, DEFAULT_THEME } from "../constants/theme";

/**
 * Intent Gateway — Sprint 2 Refactor
 * 
 * Official entry point using the new SougXpress UI Kit.
 * Respects: Premium, Minimal, Arabic First, Dark Mode First.
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
    descriptionAr: "انضم إلى فريق التوصil بعد الموافقة.",
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

export default function IntentGateway() {
  const colors = getThemeColors(DEFAULT_THEME);
  const isRTL = I18nManager.isRTL;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bgBase }]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Typography variant="display" align="center" style={styles.brandTitle}>
            سوق إكسبريس
          </Typography>
          <Typography variant="h3" color="secondary" align="center">
            سوقك يوصلك لبابك
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
  },
  header: {
    marginBottom: TOKENS.spacing["3xl"],
    alignItems: "center",
  },
  brandTitle: {
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
    backgroundColor: "rgba(0, 229, 255, 0.05)",
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
    borderTopColor: "rgba(255, 255, 255, 0.05)",
  },
});
