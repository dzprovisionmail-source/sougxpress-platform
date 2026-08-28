import { useEffect, useState } from "react";
import type { Store } from "@/types/schema-03-core";
import { getProjectLocalTime, getStoreHours } from "@/services/store-hours";

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;

type ScheduleValue =
  | string
  | {
      open?: unknown;
      close?: unknown;
      opens_at?: unknown;
      closes_at?: unknown;
      closed?: unknown;
    }
  | null
  | undefined;

export type ClosedDay = (typeof DAY_NAMES)[number];

export type StoreOpenState = {
  /** `null` means no usable schedule is configured. */
  isOpen: boolean | null;
  label: "مفتوح الآن" | "مغلق الآن" | "غير متاح إداريًا" | "ساعات العمل غير محددة";
  reason: "administrative" | "closed_day" | "schedule" | "unknown";
};

const ADMIN_UNAVAILABLE_STATUSES = new Set([
  "draft",
  "pending",
  "paused",
  "suspended",
  "inactive",
  "disabled",
]);

const DAY_ALIASES: Record<string, number> = {
  sunday: 0,
  sun: 0,
  monday: 1,
  mon: 1,
  tuesday: 2,
  tue: 2,
  tues: 2,
  wednesday: 3,
  wed: 3,
  thursday: 4,
  thu: 4,
  thurs: 4,
  friday: 5,
  fri: 5,
  saturday: 6,
  sat: 6,
  الأحد: 0,
  الاثنين: 1,
  الثلاثاء: 2,
  الأربعاء: 3,
  الخميس: 4,
  الجمعة: 5,
  السبت: 6,
};

const toMinutes = (value: unknown): number | null => {
  if (typeof value !== "string") return null;
  const match = value.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
};

const isTruthyClosed = (value: unknown): boolean =>
  value === true || value === "true" || value === "closed" || value === "مغلق";

const getDayIndex = (value: unknown): number | null => {
  if (typeof value === "number" && value >= 0 && value <= 6) return value;
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (normalized in DAY_ALIASES) return DAY_ALIASES[normalized];
  if (/^[0-6]$/.test(normalized)) return Number(normalized);
  return null;
};

const isClosedOnDay = (value: unknown, dayIndex: number): boolean => {
  if (Array.isArray(value)) return value.some((item) => getDayIndex(item) === dayIndex);
  return getDayIndex(value) === dayIndex;
};

const parseSchedule = (value: ScheduleValue): { open: number; close: number } | "closed" | null => {
  if (typeof value === "string") {
    if (isTruthyClosed(value.trim().toLowerCase())) return "closed";
    const parts = value.split(/\s*(?:-|–|—|to|إلى)\s*/i);
    if (parts.length === 2) {
      const open = toMinutes(parts[0]);
      const close = toMinutes(parts[1]);
      if (open !== null && close !== null) return { open, close };
    }
    return null;
  }

  if (!value || typeof value !== "object") return null;
  if (isTruthyClosed(value.closed)) return "closed";
  const open = toMinutes(value.open ?? value.opens_at);
  const close = toMinutes(value.close ?? value.closes_at);
  return open !== null && close !== null ? { open, close } : null;
};

const getScheduleForDay = (store: Partial<Store>, dayIndex: number): { open: number; close: number } | "closed" | null => {
  const closedDay = store?.closed_day;
  if (isClosedOnDay(closedDay, dayIndex)) return "closed";

  const hours = store?.opening_hours as Record<string, unknown> | null | undefined;
  if (hours && typeof hours === "object" && !Array.isArray(hours)) {
    const dayValue = hours[DAY_NAMES[dayIndex]] ?? hours[String(dayIndex)] ?? hours[dayIndex];
    const aliasValue = Object.entries(DAY_ALIASES).find(([, index]) => index === dayIndex)?.[0];
    const schedule = parseSchedule(dayValue ?? (aliasValue ? hours[aliasValue] : undefined));
    if (schedule) return schedule;

    const closedDay = hours.closed_day ?? hours.closedDay ?? hours.day_off ?? hours.dayOff ?? hours.closed_days ?? hours.closedDays;
    if (isClosedOnDay(closedDay, dayIndex)) return "closed";
  }

  const { opens_at, closes_at } = getStoreHours(store);
  const open = toMinutes(opens_at);
  const close = toMinutes(closes_at);
  return open !== null && close !== null ? { open, close } : null;
};

const isWithinSchedule = (schedule: { open: number; close: number }, nowMinutes: number): boolean => {
  if (schedule.open === schedule.close) return true;
  if (schedule.open < schedule.close) return nowMinutes >= schedule.open && nowMinutes < schedule.close;
  return nowMinutes >= schedule.open || nowMinutes < schedule.close;
};

export const getStoreOpenState = (store: Partial<Store> | null | undefined, now = new Date()): StoreOpenState => {
  if (!store) {
    return { isOpen: null, label: "ساعات العمل غير محددة", reason: "unknown" };
  }

  if (ADMIN_UNAVAILABLE_STATUSES.has(String(store.status))) {
    return { isOpen: false, label: "غير متاح إداريًا", reason: "administrative" };
  }

  const { dayIndex, minutes: nowMinutes } = getProjectLocalTime(now);
  const schedule = getScheduleForDay(store, dayIndex);
  if (schedule === "closed") {
    return { isOpen: false, label: "مغلق الآن", reason: "closed_day" };
  }

  if (!schedule) {
    return { isOpen: null, label: "ساعات العمل غير محددة", reason: "unknown" };
  }

  return isWithinSchedule(schedule, nowMinutes)
    ? { isOpen: true, label: "مفتوح الآن", reason: "schedule" }
    : { isOpen: false, label: "مغلق الآن", reason: "schedule" };
};

export const useStoreOpenState = (store: Partial<Store> | null | undefined): StoreOpenState => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  return getStoreOpenState(store, now);
};
