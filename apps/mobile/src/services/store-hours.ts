import type { Store } from "@/types/schema-03-core";

export const PROJECT_TIME_ZONE = "Africa/Algiers";

export const DEFAULT_STORE_HOURS = Object.freeze({
  opens_at: "",
  closes_at: "",
});

const STORE_TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;

export const normalizeStoreTime = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!STORE_TIME_PATTERN.test(trimmed)) return null;
  return trimmed.slice(0, 5);
};

export const resolveStoreHours = (
  opensAt?: unknown,
  closesAt?: unknown,
): { opens_at: string; closes_at: string } | null => {
  const opens_at = opensAt === undefined ? null : normalizeStoreTime(opensAt);
  const closes_at = closesAt === undefined ? null : normalizeStoreTime(closesAt);
  if (!opens_at || !closes_at) return null;
  return { opens_at, closes_at };
};

export const getStoreHours = (store: Partial<Store> | null | undefined) =>
  resolveStoreHours(store?.opens_at, store?.closes_at) ?? { ...DEFAULT_STORE_HOURS };

export const withStoreHourDefaults = <T extends Partial<Store>>(store: T): T & { opens_at: string; closes_at: string } => ({
  ...store,
  ...getStoreHours(store),
});

export const getProjectLocalTime = (now = new Date()): { dayIndex: number; minutes: number } => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: PROJECT_TIME_ZONE,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const weekday = parts.find((part) => part.type === "weekday")?.value.toLowerCase();
  const hours = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minutes = Number(parts.find((part) => part.type === "minute")?.value ?? 0);
  const dayIndex = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"].indexOf(weekday ?? "");
  return { dayIndex: dayIndex >= 0 ? dayIndex : 0, minutes: hours * 60 + minutes };
};

export const validateStoreHours = (opensAt: unknown, closesAt: unknown): string | null => {
  if (!normalizeStoreTime(opensAt)) return "وقت الفتح غير صالح. استخدم صيغة HH:MM.";
  if (!normalizeStoreTime(closesAt)) return "وقت الإغلاق غير صالح. استخدم صيغة HH:MM.";
  return null;
};
