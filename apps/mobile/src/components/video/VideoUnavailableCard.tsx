import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useAppTheme } from "@/contexts/ThemeContext";

export default function VideoUnavailableCard() {
  const { colors, tokens } = useAppTheme();

  return (
    <View style={[styles.root, { backgroundColor: "#1a1a2e", borderRadius: tokens.radius.sm }]}>
      <View style={styles.iconWrap}>
        <Text style={styles.icon}>🎬</Text>
      </View>
      <Text style={[styles.text, { color: colors.textSecondary }]}>الفيديو غير متاح حالياً</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: "100%",
    aspectRatio: 16 / 9,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  iconWrap: {
    marginBottom: 12,
  },
  icon: {
    fontSize: 36,
  },
  text: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
});
