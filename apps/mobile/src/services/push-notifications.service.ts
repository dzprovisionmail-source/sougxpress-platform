import Constants, { AppOwnership, ExecutionEnvironment } from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";

export type PushRegistration = {
  token: string;
  subscription: Notifications.Subscription;
};

let notificationHandlerConfigured = false;

/**
 * Remote push notifications are not available in Expo Go on Android/iOS.
 * Development builds and standalone builds keep full notification support.
 */
export function isRemotePushNotificationsAvailable(): boolean {
  if (Platform.OS === "web") return false;

  const isExpoGo =
    Constants.appOwnership === AppOwnership.Expo ||
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

  return !isExpoGo;
}

function configureNotificationHandler(): void {
  if (notificationHandlerConfigured || !isRemotePushNotificationsAvailable()) return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
  notificationHandlerConfigured = true;
}

function getProjectId(): string | undefined {
  return Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

function getPushTokenValue(data: Notifications.ExpoPushToken | Notifications.DevicePushToken): string {
  return data.data;
}

export async function registerForPushNotifications(userId: string): Promise<PushRegistration | null> {
  if (!isRemotePushNotificationsAvailable() || !Device.isDevice) {
    return null;
  }

  configureNotificationHandler();

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Soug-XPRESS",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      sound: "default",
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }

  const permissions = await Notifications.getPermissionsAsync();
  let finalStatus = permissions.status;
  if (finalStatus !== Notifications.PermissionStatus.GRANTED) {
    const requested = await Notifications.requestPermissionsAsync();
    finalStatus = requested.status;
  }

  if (finalStatus !== Notifications.PermissionStatus.GRANTED) {
    return null;
  }

  const projectId = getProjectId();
  if (!projectId) {
    throw new Error("Expo EAS project ID is not configured");
  }

  const expoToken = await Notifications.getExpoPushTokenAsync({ projectId });
  const token = getPushTokenValue(expoToken);
  const { error } = await supabase.rpc("claim_user_device", {
    p_push_token: token,
    p_platform: Platform.OS,
    p_device_name: Device.deviceName ?? null,
  });

  if (error) {
    throw error;
  }

  const subscription = Notifications.addPushTokenListener(async (nextToken) => {
    const nextValue = getPushTokenValue(nextToken);
    await supabase.rpc("claim_user_device", {
      p_push_token: nextValue,
      p_platform: Platform.OS,
      p_device_name: Device.deviceName ?? null,
    });
  });

  return { token, subscription };
}

export async function releasePushToken(token: string): Promise<void> {
  if (!isRemotePushNotificationsAvailable()) return;
  await supabase.rpc("release_user_device", { p_push_token: token });
}

export function routeFromNotificationResponse(response: Notifications.NotificationResponse): void {
  const data = response.notification.request.content.data as {
    route?: string;
    conversation_id?: string;
    order_id?: string;
    store_id?: string;
    product_id?: string;
    assignment_id?: string;
  };

  if (data.route) {
    router.push(data.route as never);
    return;
  }

  if (data.conversation_id) {
    router.push({ pathname: "/chat/[id]", params: { id: data.conversation_id } });
    return;
  }

  if (data.order_id) {
    router.push({ pathname: "/customer/orders", params: { orderId: data.order_id } });
    return;
  }

  if (data.store_id) {
    router.push({ pathname: "/store-details", params: { id: data.store_id } });
    return;
  }

  if (data.product_id) {
    router.push({ pathname: "/product-details", params: { id: data.product_id } });
    return;
  }

  if (data.assignment_id) {
    router.push({ pathname: "/driver/deliveries", params: { assignmentId: data.assignment_id } });
  }
}
