export type UserIdentityFields = {
  full_name?: string | null;
  display_name?: string | null;
  name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  business_name?: string | null;
  role?: string | null;
};

const ROLE_FALLBACKS: Record<string, string> = {
  customer: "الزبون",
  driver: "الموصل",
  courier: "الموصل",
  merchant: "المتجر",
  founder: "الإدارة",
  admin: "الإدارة",
  support: "فريق الدعم",
};

export function getUserDisplayName(
  identity: UserIdentityFields | null | undefined,
  fallbackRole?: string | null,
): string {
  if (!identity) return ROLE_FALLBACKS[fallbackRole ?? ""] ?? "العضو";

  const directName = [identity.full_name, identity.display_name, identity.name]
    .map((value) => value?.trim())
    .find((value): value is string => Boolean(value));
  if (directName) return directName;

  const personalName = [identity.first_name, identity.last_name]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .join(" ");
  if (personalName) return personalName;

  const businessName = identity.business_name?.trim();
  if (businessName) return businessName;

  return ROLE_FALLBACKS[identity.role ?? fallbackRole ?? ""] ?? "العضو";
}

export default getUserDisplayName;
