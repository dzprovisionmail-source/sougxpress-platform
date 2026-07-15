import { Redirect } from "expo-router";

/**
 * Legacy route kept for backward compatibility.
 * Merchant store management now lives inside the Merchant workspace.
 */
export default function LegacyMerchantStoreRedirect() {
  return <Redirect href="/merchant/store" />;
}
