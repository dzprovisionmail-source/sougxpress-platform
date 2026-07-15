import { Redirect } from "expo-router";

/**
 * Legacy route kept for backward compatibility.
 * The merchant orders screen now lives inside the Merchant workspace.
 */
export default function LegacyMerchantOrdersRedirect() {
  return <Redirect href="/merchant/orders" />;
}
