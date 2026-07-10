import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

/**
 * Phase 1 skeleton entry point. No Supabase auth is wired yet, so this
 * screen simply routes toward the login skeleton and the Founder OS
 * skeleton for now.
 */
export default function IndexScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Soug-XPRESS V2</Text>
      <Text style={styles.subtitle}>Founder Operating System — Phase 1 Skeleton</Text>
      <Link href="/login" style={styles.link}>
        الدخول (Login)
      </Link>
      <Link href="/founder" style={styles.link}>
        نظام تشغيل المؤسس (Founder OS)
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: "#0B1220",
    padding: 24,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "700",
  },
  subtitle: {
    color: "#94A3B8",
    fontSize: 14,
    marginBottom: 24,
  },
  link: {
    color: "#38BDF8",
    fontSize: 16,
    paddingVertical: 8,
  },
});
