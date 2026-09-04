import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { AdminPageShell } from "@/components/admin";
import { useAdminProfile } from "@/hooks/useAdminProfile";
import {
  getPushRuntimeDiagnostics,
  maskExpoPushToken,
  readCurrentPushDevice,
  registerForPushNotifications,
  type CurrentPushDevice,
  type PushRegistrationDiagnostics,
} from "@/services/push-notifications.service";
import { useAppTheme } from "@/contexts/ThemeContext";

const initialDiagnostics: PushRegistrationDiagnostics = {
  ...getPushRuntimeDiagnostics(),
  permission: "not_started",
  expoTokenStatus: "not_started",
  tokenMasked: null,
  claimStatus: "not_started",
  userDevicesUpdatedAt: null,
  userDevicesIsActive: null,
  userDevicesPlatform: null,
  lastError: null,
};

function valueOrUnknown(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined || value === "") return "Unknown";
  return String(value);
}

export default function PushDiagnosticsScreen() {
  const { colors, tokens } = useAppTheme();
  const { profile, loading: profileLoading, authorized } = useAdminProfile();
  const [diagnostics, setDiagnostics] = useState(initialDiagnostics);
  const [device, setDevice] = useState<CurrentPushDevice | null>(null);
  const [busy, setBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Ready");

  const refreshStatus = useCallback(async () => {
    if (!profile?.id) return;
    setBusy(true);
    try {
      const current = await readCurrentPushDevice(profile.id);
      setDevice(current);
      setDiagnostics((previous) => ({
        ...previous,
        userDevicesUpdatedAt: current?.updated_at ?? null,
        userDevicesIsActive: current?.is_active ?? null,
        userDevicesPlatform: current?.platform ?? null,
        tokenMasked: maskExpoPushToken(current?.push_token),
      }));
      setStatusMessage(current ? "Status refreshed" : "No Android device record found");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setDiagnostics((previous) => ({ ...previous, lastError: message }));
      setStatusMessage("Refresh failed");
    } finally {
      setBusy(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    if (authorized) void refreshStatus();
  }, [authorized, refreshStatus]);

  const registerNow = useCallback(async () => {
    if (!profile?.id) return;
    setBusy(true);
    setStatusMessage("Registering push token...");
    setDiagnostics({ ...initialDiagnostics, ...getPushRuntimeDiagnostics(), lastError: null });
    try {
      const registration = await registerForPushNotifications(profile.id, (progress) => {
        setDiagnostics((previous) => ({ ...previous, ...progress }));
      });
      if (!registration) {
        setStatusMessage("Registration stopped");
        return;
      }
      const current = await readCurrentPushDevice(profile.id);
      setDevice(current);
      setDiagnostics((previous) => ({
        ...previous,
        userDevicesUpdatedAt: current?.updated_at ?? null,
        userDevicesIsActive: current?.is_active ?? null,
        userDevicesPlatform: current?.platform ?? null,
        tokenMasked: maskExpoPushToken(current?.push_token ?? registration.token),
      }));
      setStatusMessage("Registration complete");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setDiagnostics((previous) => ({ ...previous, lastError: message }));
      setStatusMessage("Registration failed");
    } finally {
      setBusy(false);
    }
  }, [profile?.id]);

  const rows = useMemo(
    () => [
      ["App Version", diagnostics.appVersion],
      ["Version Code", diagnostics.versionCode],
      ["Runtime Version", diagnostics.runtimeVersion],
      ["OTA Update ID", diagnostics.updateId],
      ["Channel", "preview"],
      ["Notification Permission", diagnostics.permission],
      ["getExpoPushTokenAsync", diagnostics.expoTokenStatus],
      ["Token status (masked)", diagnostics.tokenMasked ? `available: ${diagnostics.tokenMasked}` : "not_available"],
      ["claim_user_device", diagnostics.claimStatus],
      ["user_devices updated_at", diagnostics.userDevicesUpdatedAt],
      ["user_devices is_active", diagnostics.userDevicesIsActive],
      ["user_devices platform", diagnostics.userDevicesPlatform],
      ["Registration status", statusMessage],
      ["Last error", diagnostics.lastError],
      ["Refresh token masked", device?.push_token ? maskExpoPushToken(device.push_token) : null],
    ] as const,
    [device?.push_token, diagnostics, statusMessage],
  );

  if (profileLoading || !authorized) {
    return (
      <AdminPageShell title="Push Diagnostics" showBack>
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell title="Push Diagnostics" showBack>
      <ScrollView contentContainerStyle={[styles.content, { padding: tokens.spacing.lg }]}>
        <Text style={[styles.warning, { color: colors.warning }]}>Temporary Founder/Admin diagnostics. Full push tokens are never displayed.</Text>
        <View style={[styles.card, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
          {rows.map(([label, value]) => (
            <View key={label} style={[styles.row, { borderBottomColor: colors.borderSubtle }]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
              <Text selectable style={[styles.value, { color: label === "Last error" && value ? colors.error : colors.textPrimary }]}>{valueOrUnknown(value)}</Text>
            </View>
          ))}
        </View>
        {diagnostics.permission !== "granted" && diagnostics.permission !== "not_started" && (
          <Text style={[styles.permissionError, { color: colors.error }]}>Notification permission denied. Allow notifications from Android Settings.</Text>
        )}
        <TouchableOpacity disabled={busy} onPress={() => void registerNow()} style={[styles.button, { backgroundColor: colors.primary, opacity: busy ? 0.6 : 1 }]}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Register Push Token Now</Text>}
        </TouchableOpacity>
        <TouchableOpacity disabled={busy} onPress={() => void refreshStatus()} style={[styles.button, styles.secondaryButton, { borderColor: colors.primary, opacity: busy ? 0.6 : 1 }]}>
          <Text style={[styles.buttonText, { color: colors.primary }]}>Refresh Status</Text>
        </TouchableOpacity>
        <Text style={[styles.note, { color: colors.textSecondary }]}>Only the authenticated Founder/Admin user can open this screen. No Push is sent by these controls.</Text>
      </ScrollView>
    </AdminPageShell>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, paddingBottom: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  warning: { fontSize: 13, lineHeight: 19, textAlign: "right" },
  card: { borderWidth: 1, borderRadius: 14, overflow: "hidden" },
  row: { paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth, gap: 4 },
  label: { fontSize: 12, textAlign: "right" },
  value: { fontSize: 14, fontWeight: "600", textAlign: "right" },
  permissionError: { fontSize: 14, fontWeight: "700", lineHeight: 21, textAlign: "right" },
  button: { minHeight: 48, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  secondaryButton: { backgroundColor: "transparent", borderWidth: 1 },
  buttonText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  note: { fontSize: 12, lineHeight: 18, textAlign: "right" },
});
