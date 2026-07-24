import React, { useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Dimensions } from "react-native";
import { WebView } from "react-native-webview";
import { useAppTheme } from "@/contexts/ThemeContext";

const { width: SW } = Dimensions.get("window");

export interface InlineVideoPlayerProps {
  embed_url: string;
  embed_html: string | null;
  thumbnail_url: string | null;
  title: string | null;
  provider: string;
  onError?: () => void;
}

export default function InlineVideoPlayer(props: InlineVideoPlayerProps) {
  const { colors } = useAppTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  if (error) {
    return (
      <View style={[styles.errorBox, { backgroundColor: "#000" }]}>
        <Text style={[styles.errorText, { color: colors.textPrimary }]}>الفيديو غير متاح حالياً</Text>
      </View>
    );
  }

  let htmlContent: string;

  if (props.embed_html) {
    htmlContent = props.embed_html;
  } else if (props.embed_url) {
    htmlContent = `<!DOCTYPE html>
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
  <iframe src="${props.embed_url}" allow="autoplay; fullscreen; encrypted-media" allowfullscreen></iframe>
</body>
</html>`;
  } else {
    return (
      <View style={[styles.errorBox, { backgroundColor: "#000" }]}>
        <Text style={[styles.errorText, { color: colors.textPrimary }]}>الفيديو غير متاح حالياً</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: "#000" }]}>
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
          props.onError?.();
        }}
        onHttpError={() => {
          setLoading(false);
          setError(true);
          props.onError?.();
        }}
        injectedJavaScript=""
        scrollEnabled={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: 8,
    overflow: "hidden",
  },
  webview: {
    width: SW,
    height: SW * (9 / 16),
    backgroundColor: "#000",
  },
  loadingContainer: {
    width: SW,
    height: SW * (9 / 16),
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
    position: "absolute",
    top: 0,
    left: 0,
  },
  errorBox: {
    width: "100%",
    aspectRatio: 16 / 9,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
  },
  errorText: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
});
