export type TrialApprovalRole = "merchant" | "driver";

/**
 * Trial defaults are enabled until explicitly disabled by deployment config.
 * Set EXPO_PUBLIC_TRIAL_AUTO_APPROVE_MERCHANTS or _DRIVERS to "false" to
 * restore the manual pending_review flow without changing registration code.
 */
const flagEnabled = (value: string | undefined, defaultValue = true) =>
  value === undefined ? defaultValue : value.toLowerCase() === "true";

const TRIAL_AUTO_APPROVE_MERCHANTS = flagEnabled(
  process.env.EXPO_PUBLIC_TRIAL_AUTO_APPROVE_MERCHANTS,
);
const TRIAL_AUTO_APPROVE_DRIVERS = flagEnabled(
  process.env.EXPO_PUBLIC_TRIAL_AUTO_APPROVE_DRIVERS,
);

export function getRegistrationStatus(
  role: TrialApprovalRole,
  manualStatus = "pending_review",
): string {
  if (manualStatus !== "pending_review") return manualStatus;
  if (role === "merchant" && TRIAL_AUTO_APPROVE_MERCHANTS) return "active";
  if (role === "driver" && TRIAL_AUTO_APPROVE_DRIVERS) return "active";
  return manualStatus;
}

export function isTrialAutoApprovalEnabled(role: TrialApprovalRole): boolean {
  return role === "merchant"
    ? TRIAL_AUTO_APPROVE_MERCHANTS
    : TRIAL_AUTO_APPROVE_DRIVERS;
}
