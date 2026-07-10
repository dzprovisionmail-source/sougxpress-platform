import { Link } from "expo-router";
import { StyleSheet, Text, View, ScrollView, I18nManager } from "react-native";

/**
 * Intent Gateway — First Production Screen
 * 
 * This is the official entry point where users select their role before authentication.
 * Four distinct intentions are presented:
 * 1. أريد التسوق (I want to shop)
 * 2. أريد بيع منتجاتي (I want to sell)
 * 3. أريد العمل كموصل (I want to deliver)
 * 4. استكشف السوق أولًا (Explore marketplace first)
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

export default function IntentGateway() {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      scrollEnabled={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>سوق إكسبريس</Text>
        <Text style={styles.headerSubtitle}>اختر ما تريد أن تفعل</Text>
      </View>

      {/* Intent Options Grid */}
      <View style={styles.optionsContainer}>
        {INTENT_OPTIONS.map((option) => (
          <Link key={option.id} href={option.route} asChild>
            <View style={styles.intentCard}>
              <Text style={styles.emoji}>{option.emoji}</Text>
              <Text style={styles.intentTitle}>{option.titleAr}</Text>
              <Text style={styles.intentDescription}>{option.descriptionAr}</Text>
            </View>
          </Link>
        ))}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          سوق إكسبريس — منصة التجارة المحلية الأولى في عين صفراء
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000", // bg-base
  },
  contentContainer: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 32,
    paddingBottom: 24,
    justifyContent: "space-between",
  },
  header: {
    marginBottom: 40,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "700",
    color: "#FFFFFF", // text-primary
    marginBottom: 8,
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#B0B0B0", // text-secondary
    textAlign: "center",
  },
  optionsContainer: {
    gap: 12,
    marginBottom: 32,
  },
  intentCard: {
    backgroundColor: "#121212", // bg-surface
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2C2C2C", // border-subtle
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 140,
    // Active state feedback
    shadowColor: "#00E5FF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  emoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  intentTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF", // text-primary
    marginBottom: 8,
    textAlign: "center",
  },
  intentDescription: {
    fontSize: 13,
    color: "#B0B0B0", // text-secondary
    textAlign: "center",
    lineHeight: 18,
  },
  footer: {
    marginTop: "auto",
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: "#2C2C2C", // border-subtle
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    color: "#4F4F4F", // text-disabled
    textAlign: "center",
    lineHeight: 16,
  },
});
