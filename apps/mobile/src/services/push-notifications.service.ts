import Constants, { AppOwnership, ExecutionEnvironment } from "expo-constants";
import * as Updates from "expo-updates";
import * as Device from "expo-device";
import type * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";

export type PushRegistrationDiagnostics = {
  appVersion: string | null;
  versionCode: number | null;
  runtimeVersion: string | null;
  updateId: string | null;
  permission: string;
  expoTokenStatus: "not_started" | "success" | "failed";
  tokenMasked: string | null;
  claimStatus: "not_started" | "success" | "failed";
  userDevicesUpdatedAt: string | null;
  userDevicesIsActive: boolean | null;
  userDevicesPlatform: string | null;
  lastError: string | null;
};

export type PushRegistrationProgress = Partial<PushRegistrationDiagnostics>;

export type PushRegistration = {
  token: string;
  getCurrentToken: () => string;
  subscription: Notifications.Subscription;
};

export type CurrentPushDevice = {
  updated_at: string | null;
  is_active: boolean | null;
  platform: string | null;
  push_token: string;
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

function maskPushToken(token: string): string {
  if (token.length <= 18) return `${token.slice(0, 6)}…`;
  return `${token.slice(0, 14)}…${token.slice(-4)}`;
}

function isValidExpoPushToken(token: string): boolean {
  return /^ExponentPushToken\[[^\]]+\]$/.test(token);
}

function permissionLabel(status: string): string {
  return status.toLowerCase();
}

export function getPushRuntimeDiagnostics(): Pick<PushRegistrationDiagnostics, "appVersion" | "versionCode" | "runtimeVersion" | "updateId"> {
  return {
    appVersion: Constants.expoConfig?.version ?? null,
    versionCode: Constants.expoConfig?.android?.versionCode ?? null,
    runtimeVersion: typeof Updates.runtimeVersion === "string" ? Updates.runtimeVersion : null,
    updateId: Updates.updateId ?? null,
  };
}

export function maskExpoPushToken(token: string | null | undefined): string | null {
  return token ? maskPushToken(token) : null;
}

export async function readCurrentPushDevice(userId: string): Promise<CurrentPushDevice | null> {
  const { data, error } = await supabase
    .from("user_devices")
    .select("updated_at, is_active, platform, push_token")
    .eq("user_id", userId)
    .eq("platform", Platform.OS)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as CurrentPushDevice | null;
}

export async function registerForPushNotifications(
  userId: string,
  onProgress?: (progress: PushRegistrationProgress) => void,
): Promise<PushRegistration | null> {
  const runtimeDiagnostics = getPushRuntimeDiagnostics();
  onProgress?.({ ...runtimeDiagnostics, permission: "not_started", expoTokenStatus: "not_started", claimStatus: "not_started", lastError: null });
  console.info("Push registration started", { userId, platform: Platform.OS, ...runtimeDiagnostics });
  if (!isRemotePushNotificationsAvailable() || !Device.isDevice) {
    console.info("Push registration skipped", { reason: !Device.isDevice ? "not_a_physical_device" : "remote_notifications_unavailable" });
    return null;
  }

  const notifications = await configureNotificationHandler();
  if (!notifications) return null;

  if (Platform.OS === "android") {
    await createAndroidNotificationChannels(notifications);
  }

  const permissions = await notifications.getPermissionsAsync();
  onProgress?.({ permission: permissionLabel(permissions.status) });
  console.info("Push permission status", { status: permissionLabel(permissions.status) });
  let finalStatus = permissions.status;
  if (finalStatus !== notifications.PermissionStatus.GRANTED) {
    const requested = await notifications.requestPermissionsAsync();
    finalStatus = requested.status;
    onProgress?.({ permission: permissionLabel(finalStatus) });
    console.info("Push permission request result", { status: permissionLabel(finalStatus) });
  }

  if (finalStatus !== notifications.PermissionStatus.GRANTED) {
    const errorMessage = "Notification permission denied";
    onProgress?.({ permission: permissionLabel(finalStatus), lastError: errorMessage });
    console.warn(errorMessage, { status: permissionLabel(finalStatus) });
    return null;
  }

  const projectId = getProjectId();
  if (!projectId) {
    throw new Error("Expo EAS project ID is not configured");
  }

  let currentToken: string;
  try {
    const expoToken = await notifications.getExpoPushTokenAsync({ projectId });
    currentToken = getPushTokenValue(expoToken);
    if (!isValidExpoPushToken(currentToken)) throw new Error("Expo returned an invalid push token");
    onProgress?.({ expoTokenStatus: "success", tokenMasked: maskPushToken(currentToken) });
    console.info("Push token acquired", { token: maskPushToken(currentToken) });
  } catch (error) {
    const lastError = error instanceof Error ? error.message : String(error);
    onProgress?.({ expoTokenStatus: "failed", lastError });
    throw error;
  }

  const claimToken = async (nextToken: string, previousToken?: string) => {
    if (!isValidExpoPushToken(nextToken)) {
      throw new Error("Expo returned an invalid push token");
    }
    console.info("claim_user_device started", { token: maskPushToken(nextToken), platform: Platform.OS });
    if (previousToken && previousToken !== nextToken) {
      await supabase.rpc("release_user_device", { p_push_token: previousToken });
      console.info("Previous push token released", { token: maskPushToken(previousToken) });
    }
    const { data, error } = await supabase.rpc("claim_user_device", {
      p_push_token: nextToken,
      p_platform: Platform.OS,
      p_device_name: Device.deviceName ?? null,
    });
    if (error) {
      onProgress?.({ claimStatus: "failed", lastError: error.message });
      console.warn("claim_user_device failure", { message: error.message });
      throw error;
    }
    const device = Array.isArray(data) ? data[0] : data;
    onProgress?.({
      claimStatus: "success",
      userDevicesUpdatedAt: device?.updated_at ?? null,
      userDevicesIsActive: device?.is_active ?? null,
      userDevicesPlatform: device?.platform ?? null,
    });
    console.info("claim_user_device success", {
      token: maskPushToken(nextToken),
      isActive: device?.is_active ?? null,
      updatedAt: device?.updated_at ?? null,
    });
  };

  await claimToken(currentToken);
  const subscription = notifications.addPushTokenListener(async (nextToken) => {
    const nextValue = getPushTokenValue(nextToken);
    if (nextValue === currentToken) return;
    const previousToken = currentToken;
    try {
      await claimToken(nextValue, previousToken);
      currentToken = nextValue;
    } catch (error) {
      console.warn("Push token change registration failed", error);
    }
  });

  return { token: currentToken, getCurrentToken: () => currentToken, subscription };
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
