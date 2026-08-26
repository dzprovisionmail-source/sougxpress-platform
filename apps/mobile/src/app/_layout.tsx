import { useEffect } from "react";
import { LogBox, I18nManager } from "react-native";
LogBox.ignoreLogs([
  "SafeAreaView has been deprecated",
  "MediaTypeOptions` have been deprecated",
  "Method getInfoAsync imported from \"expo-file-system\" is deprecated"
]);
import { Stack, useRouter } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { ThemeProvider } from "@/contexts/ThemeContext";
import * as Notifications from "expo-notifications";
import {
  registerForPushNotifications,
  releasePushToken,
  routeFromNotificationResponse,
} from "@/services/push-notifications.service";

// SougXpress is Arabic-only — force RTL layout direction app-wide.
I18nManager.allowRTL(true);
I18nManager.swapLeftAndRightInRTL(true);
if (!I18nManager.isRTL) {
  I18nManager.forceRTL(true);
}

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    let activeToken: string | null = null;
    let tokenSubscription: Notifications.Subscription | null = null;

    const registerCurrentUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;

      try {
        const registration = await registerForPushNotifications(data.user.id);
        if (registration) {
          activeToken = registration.token;
          tokenSubscription = registration.subscription;
        }
      } catch (error) {
        console.warn("Push notification registration failed", error);
      }
    };

    void registerCurrentUser();

    const responseSubscription = Notifications.addNotificationResponseReceivedListener(
      routeFromNotificationResponse,
    );

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) routeFromNotificationResponse(response);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        setTimeout(() => void registerCurrentUser(), 0);
      }
      if (event === "SIGNED_OUT") {
        if (activeToken) void releasePushToken(activeToken);
        tokenSubscription?.remove();
        activeToken = null;
        tokenSubscription = null;
        router.replace("/");
      }
    });

    return () => {
      responseSubscription.remove();
      tokenSubscription?.remove();
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  return (
    <SafeAreaProvider>
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
    </SafeAreaProvider>
  );
}
