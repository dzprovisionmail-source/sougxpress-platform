import { useEffect } from "react";
import { LogBox, I18nManager } from "react-native";
LogBox.ignoreLogs([
  "SafeAreaView has been deprecated",
  "MediaTypeOptions` have been deprecated",
  "Method getInfoAsync imported from \"expo-file-system\" is deprecated"
]);
import { Stack, useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { ThemeProvider } from "@/contexts/ThemeContext";

// SougXpress is Arabic-only — force RTL layout direction app-wide.
I18nManager.allowRTL(true);
I18nManager.swapLeftAndRightInRTL(true);
if (!I18nManager.isRTL) {
  I18nManager.forceRTL(true);
}

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        router.replace("/");
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, [router]);

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
