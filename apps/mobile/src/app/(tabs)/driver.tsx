import { Redirect } from "expo-router";

/**
 * Legacy route kept for backward compatibility.
 * The driver profile now lives inside the Driver workspace.
 */
export default function LegacyDriverRedirect() {
  return <Redirect href="/driver/dashboard" />;
}
