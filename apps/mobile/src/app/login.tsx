import { StyleSheet, Text, View } from "react-native";

/**
 * Login skeleton — no Supabase auth wired yet per Phase 1 scope.
 */
export default function LoginScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>تسجيل الدخول</Text>
      <Text style={styles.note}>سيتم ربط تسجيل الدخول لاحقًا (لم يتم ربط Supabase في هذه المرحلة)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0B1220",
    padding: 24,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 8,
  },
  note: {
    color: "#94A3B8",
    fontSize: 13,
    textAlign: "center",
  },
});
