import { LogBox, I18nManager } from "react-native";
LogBox.ignoreLogs([
  "Unable to activate keep awake",
  "SafeAreaView has been deprecated",
  "MediaTypeOptions` have been deprecated",
  "Method getInfoAsync imported from \"expo-file-system\" is deprecated"
]);
import { useEffect } from "react";
import { Stack } from "expo-router";
import { ThemeProvider } from "@/contexts/ThemeContext";

// SougXpress is Arabic-only — force RTL layout direction app-wide.
I18nManager.allowRTL(true);
I18nManager.swapLeftAndRightInRTL(true);
if (!I18nManager.isRTL) {
  I18nManager.forceRTL(true);
}

export default function RootLayout() {
  useEffect(() => {
    let mounted = true;
    let deactivateFn: (() => void) | null = null;

    if (__DEV__) {
      // In some environments like Termux or certain Android versions, 
      // keep-awake may fail. Wrap in a robust try-catch to prevent uncaught rejections.
      const setupKeepAwake = async () => {
        try {
          const { activateKeepAwakeAsync, deactivateKeepAwake } = await import("expo-keep-awake");
          if (mounted) {
            deactivateFn = deactivateKeepAwake;
            // The promise from activateKeepAwakeAsync MUST be caught.
            await activateKeepAwakeAsync();
          }
        } catch (e) {
          // Silently fail as this is non-critical for app functionality.
        }
      };
      void setupKeepAwake();
    }

    return () => {
      mounted = false;
      if (deactivateFn) deactivateFn();
    };
  }, []);

  return (
    <ThemeProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="admin" />
        <Stack.Screen name="founder" />
        <Stack.Screen name="customer-auth" />
        <Stack.Screen name="merchant-auth" />
        <Stack.Screen name="driver-auth" />
        <Stack.Screen name="store-details" />
        <Stack.Screen name="product-details" />
        <Stack.Screen name="checkout" />
        <Stack.Screen name="merchant-orders" />
        {/* Legacy role trees - kept as hidden to prevent route errors but not used for navigation */}
        <Stack.Screen name="merchant" />
        <Stack.Screen name="driver" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </ThemeProvider>
  );
}
