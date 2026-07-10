import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

/**
 * Driver Authentication Placeholder
 * 
 * Temporary destination for "أريد العمل كموصل" (I want to deliver) intent.
 * Will be replaced with proper driver onboarding flow in future phases.
 */
export default function DriverAuthScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>تسجيل الدخول - الموصل</Text>
      <Text style={styles.subtitle}>Driver Authentication</Text>
      <Text style={styles.placeholder}>
        هذه شاشة مؤقتة. سيتم تنفيذ عملية الإنضمام الحقيقية للموصلين لاحقًا.
      </Text>
      <Link href="/" style={styles.backLink}>
        العودة إلى البداية
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000000",
    padding: 24,
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#B0B0B0",
    textAlign: "center",
  },
  placeholder: {
    fontSize: 14,
    color: "#B0B0B0",
    textAlign: "center",
    marginVertical: 16,
  },
  backLink: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: "#121212",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2C2C2C",
    color: "#00E5FF",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
});
