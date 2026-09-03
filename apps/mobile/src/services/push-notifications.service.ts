import Constants, { AppOwnership, ExecutionEnvironment } from "expo-constants";
import * as Device from "expo-device";
import type * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";

export type PushRegistration = {
  token: string;
  subscription: Notifications.Subscription;
};

type NotificationsModule = typeof import("expo-notifications");

let notificationsModule: NotificationsModule | null = null;
let notificationHandlerConfigured = false;

export const NOTIFICATION_SOUNDS = {
  chat: "market_message.wav",
  transaction: "market_order.wav",
  delivery: "market_success.wav",
  founder: "market_alert.wav",
} as const;

export const NOTIFICATION_CHANNELS = {
  chat: "chat_messages",
  transaction: "transactions",
  delivery: "delivery_updates",
  founder: "founder_alerts",
} as const;

function createAndroidNotificationChannels(notifications: NotificationsModule): Promise<unknown[]> {
  return Promise.all([
    notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.chat, {
      name: "رسائل المحادثات",
      importance: notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      enableVibrate: true,
      showBadge: true,
      sound: NOTIFICATION_SOUNDS.chat,
      lockscreenVisibility: notifications.AndroidNotificationVisibility.PUBLIC,
    }),
    notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.transaction, {
      name: "الطلبات والمعاملات",
      importance: notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      enableVibrate: true,
      showBadge: true,
      sound: NOTIFICATION_SOUNDS.transaction,
      lockscreenVisibility: notifications.AndroidNotificationVisibility.PUBLIC,
    }),
    notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.delivery, {
      name: "تحديثات التوصيل",
      importance: notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 180, 180, 180],
      enableVibrate: true,
      showBadge: true,
      sound: NOTIFICATION_SOUNDS.delivery,
      lockscreenVisibility: notifications.AndroidNotificationVisibility.PUBLIC,
    }),
    notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.founder, {
      name: "تنبيهات الإدارة",
      importance: notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 300, 200, 300],
      enableVibrate: true,
      showBadge: true,
      sound: NOTIFICATION_SOUNDS.founder,
      lockscreenVisibility: notifications.AndroidNotificationVisibility.PUBLIC,
    }),
    // Keep the pre-existing default channel for unclassified notifications.
    notifications.setNotificationChannelAsync("default", {
      name: "Soug-XPRESS",
      importance: notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      enableVibrate: true,
      showBadge: true,
      sound: "default",
      lockscreenVisibility: notifications.AndroidNotificationVisibility.PUBLIC,
    }),
  ]);
}

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

/**
 * expo-notifications is intentionally loaded lazily. Expo Go still bundles
 * the package in the JS graph, but its native remote-notification module is
 * unavailable there, so no native notification API is touched in Expo Go.
 */
export async function getNotificationsModule(): Promise<NotificationsModule | null> {
  if (!isRemotePushNotificationsAvailable()) return null;
  notificationsModule ??= await import("expo-notifications");
  return notificationsModule;
}

async function configureNotificationHandler(): Promise<NotificationsModule | null> {
  if (!isRemotePushNotificationsAvailable()) return null;
  const notifications = await getNotificationsModule();
  if (!notifications || notificationHandlerConfigured) return notifications;

  notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
  notificationHandlerConfigured = true;
  return notifications;
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

  const notifications = await configureNotificationHandler();
  if (!notifications) return null;

  if (Platform.OS === "android") {
    await createAndroidNotificationChannels(notifications);
  }

  const permissions = await notifications.getPermissionsAsync();
  let finalStatus = permissions.status;
  if (finalStatus !== notifications.PermissionStatus.GRANTED) {
    const requested = await notifications.requestPermissionsAsync();
    finalStatus = requested.status;
  }

  if (finalStatus !== notifications.PermissionStatus.GRANTED) {
    return null;
  }

  const projectId = getProjectId();
  if (!projectId) {
    throw new Error("Expo EAS project ID is not configured");
  }

  const expoToken = await notifications.getExpoPushTokenAsync({ projectId });
  const token = getPushTokenValue(expoToken);
  const { error } = await supabase.rpc("claim_user_device", {
    p_push_token: token,
    p_platform: Platform.OS,
    p_device_name: Device.deviceName ?? null,
  });

  if (error) {
    throw error;
  }

  const subscription = notifications.addPushTokenListener(async (nextToken) => {
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
