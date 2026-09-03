import { useEffect } from "react";
import { AppState, LogBox, I18nManager, Platform } from "react-native";
LogBox.ignoreLogs([
  "SafeAreaView has been deprecated",
  "MediaTypeOptions` have been deprecated",
  "Method getInfoAsync imported from \"expo-file-system\" is deprecated",
]);
import { Stack, useRouter } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { ThemeProvider } from "@/contexts/ThemeContext";
import type * as Notifications from "expo-notifications";
import {
  getNotificationsModule,
  registerForPushNotifications,
  releasePushToken,
  routeFromNotificationResponse,
  isRemotePushNotificationsAvailable,
} from "@/services/push-notifications.service";

// SougXpress is Arabic-only — force RTL layout direction app-wide.
if (Platform.OS !== "web") {
  I18nManager.allowRTL(true);
  if (!I18nManager.isRTL) {
    I18nManager.forceRTL(true);
  }
}

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    let disposed = false;
    let activeToken: string | null = null;
    let registeredUserId: string | null = null;
    let registrationInFlight = false;
    let tokenSubscription: Notifications.Subscription | null = null;
    let responseSubscription: Notifications.Subscription | null = null;
    const notificationsAvailable = isRemotePushNotificationsAvailable();
    const handledNotificationIds = new Set<string>();

    const registerCurrentUser = async (force = false) => {
      const { data } = await supabase.auth.getUser();
      if (disposed || !data.user || (!force && registeredUserId === data.user.id) || registrationInFlight) return;

      registrationInFlight = true;
      try {
        const registration = await registerForPushNotifications(data.user.id);
        if (!disposed && registration) {
          activeToken = registration.token;
          tokenSubscription?.remove();
          tokenSubscription = registration.subscription;
          registeredUserId = data.user.id;
        }
      } catch (error) {
        console.warn("Push notification registration failed", error);
      } finally {
        registrationInFlight = false;
      }
    };

    const initializeNotificationListeners = async () => {
      if (!notificationsAvailable) return;
      const notifications = await getNotificationsModule();
      if (!notifications || disposed) return;

      const routeNotificationOnce = (response: Notifications.NotificationResponse) => {
        const notificationId = response.notification.request.identifier;
        if (handledNotificationIds.has(notificationId)) return;
        handledNotificationIds.add(notificationId);
        routeFromNotificationResponse(response);
      };

      void registerCurrentUser();
      responseSubscription = notifications.addNotificationResponseReceivedListener(
        routeNotificationOnce,
      );

      void notifications.getLastNotificationResponseAsync().then((response) => {
        if (!disposed && response) routeNotificationOnce(response);
      });
    };

    void initializeNotificationListeners();

    const appStateSubscription = AppState.addEventListener("change", (state) => {
      if (state === "active" && notificationsAvailable) {
        void registerCurrentUser(true);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (notificationsAvailable && (event === "SIGNED_IN" || event === "TOKEN_REFRESHED")) {
        setTimeout(() => void registerCurrentUser(), 0);
      }
      if (event === "SIGNED_OUT") {
        if (activeToken) void releasePushToken(activeToken);
        tokenSubscription?.remove();
        activeToken = null;
        tokenSubscription = null;
        registeredUserId = null;
        registrationInFlight = false;
        router.replace("/");
      }
    });

    return () => {
      disposed = true;
      responseSubscription?.remove();
      tokenSubscription?.remove();
      appStateSubscription.remove();
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
