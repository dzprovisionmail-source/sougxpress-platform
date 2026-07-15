import { I18nManager } from "react-native";
import { Stack } from "expo-router";
import { ThemeProvider } from "@/contexts/ThemeContext";

// SougXpress is Arabic-only — force RTL layout direction app-wide.
if (!I18nManager.isRTL) {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
}

export default function RootLayout() {
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
        <Stack.Screen name="guest-marketplace" />
        <Stack.Screen name="store-details" />
        <Stack.Screen name="product-details" />
        <Stack.Screen name="cart" />
        <Stack.Screen name="checkout" />
        <Stack.Screen name="merchant-orders" />
        <Stack.Screen name="merchant" />
        <Stack.Screen name="driver" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </ThemeProvider>
  );
}
