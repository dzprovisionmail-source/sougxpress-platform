import React from "react";
import { Redirect } from "expo-router";

/**
 * Canonical earnings entry point for the driver workspace.
 * The detailed commission and payment screen lives in /(tabs)/earnings.
 */
export default function DriverEarningsRedirect() {
  return <Redirect href="/(tabs)/earnings" />;
}
