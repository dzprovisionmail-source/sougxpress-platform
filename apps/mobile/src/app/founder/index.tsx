import { FlatList, I18nManager, StyleSheet, Text, View } from "react-native";

import { FOUNDER_MODULE_CARDS, type FounderModuleCard } from "@/features/founder-os/dashboard/moduleCards";

/**
 * Founder Operating System dashboard — Phase 1 skeleton.
 * Arabic RTL. Mock data only, conforming to the typed interfaces in
 * src/types (docs/v2/03 / 03b / 03c). No CRUD, no Supabase connection.
 */
export default function FounderDashboardScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>نظام تشغيل المؤسس</Text>
      <Text style={styles.subtitle}>عين الصفراء — الحسابات التجريبية فقط</Text>
      <FlatList
        data={FOUNDER_MODULE_CARDS}
        keyExtractor={(item) => item.key}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <ModuleCard item={item} />}
      />
    </View>
  );
}

function ModuleCard({ item }: { item: FounderModuleCard }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>{item.labelAr}</Text>
      <Text style={styles.cardCount}>{item.count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B1220",
    paddingTop: 48,
    paddingHorizontal: 16,
    direction: I18nManager.isRTL ? "rtl" : "ltr",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
    textAlign: "right",
  },
  subtitle: {
    color: "#94A3B8",
    fontSize: 13,
    textAlign: "right",
    marginBottom: 16,
  },
  list: {
    gap: 12,
    paddingBottom: 32,
  },
  row: {
    gap: 12,
  },
  card: {
    flex: 1,
    backgroundColor: "#111827",
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: "flex-end",
    borderWidth: 1,
    borderColor: "#1F2937",
  },
  cardLabel: {
    color: "#E2E8F0",
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 6,
  },
  cardCount: {
    color: "#38BDF8",
    fontSize: 20,
    fontWeight: "700",
  },
});
