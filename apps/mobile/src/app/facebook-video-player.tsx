import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAppTheme } from "@/contexts/ThemeContext";

const { width: SW, height: SH } = Dimensions.get("window");

export default function FacebookVideoPlayerScreen() {
  const { colors, tokens } = useAppTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const embedUrl = typeof params.embedUrl === "string" ? params.embedUrl : "";
  const title = typeof params.title === "string" ? params.title : "فيديو";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  if (!embedUrl) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.bgBase }]}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.error }]}>
            الفيديو غير متاح حالياً داخل السوق
          </Text>
          <Text
            style={[styles.backLink, { color: colors.primary }]}
            onPress={() => router.back()}
          >
            العودة
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const htmlContent = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #000; display: flex; justify-content: center; align-items: center; width: 100%; height: 100vh; overflow: hidden; }
    iframe { width: 100%; height: 100%; border: none; }
  </style>
</head>
<body>
  <iframe src="${embedUrl}" allow="autoplay; fullscreen; encrypted-media" allowfullscreen></iframe>
</body>
</html>`;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bgBase }]}>
      <WebView
        source={{ html: htmlContent }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsFullscreenVideo={true}
        mediaPlaybackRequiresUserAction={false}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ color: colors.textSecondary, marginTop: 12, fontSize: 14 }}>
              جاري تحميل الفيديو...
            </Text>
          </View>
        )}
        onLoadEnd={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setError(true);
        }}
        onHttpError={() => {
          setLoading(false);
          setError(true);
        }}
        injectedJavaScript=""
        scrollEnabled={false}
      />

      {error && (
        <View style={styles.errorOverlay}>
          <Text style={[styles.errorText, { color: colors.textPrimary, fontSize: 16 }]}>
            الفيديو غير متاح حالياً داخل السوق
          </Text>
          <Text
            style={[styles.backLink, { color: colors.primary }]}
            onPress={() => router.back()}
          >
            العودة
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  webview: {
    width: SW,
    height: SH,
  },
  loadingContainer: {
    width: SW,
    height: SH,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.85)",
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 24,
  },
  backLink: {
    fontSize: 14,
    fontWeight: "600",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
  },
});
