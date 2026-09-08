import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SmartHeroSlide } from "./smartHeroSlider.service";

export type HeroRotationCycle = {
  rotation_cycle_id: string;
  started_at: string;
  ends_at: string;
  seed: string;
};

const CYCLE_STORAGE_KEY = "sougxpress.hero.rotation_cycle";
const COURIER_STORAGE_KEY = "sougxpress.hero.previous_courier";

const pad = (value: number) => String(value).padStart(2, "0");
const localDateKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const getRotationCycleForDate = (date = new Date()): HeroRotationCycle => {
  const morning = date.getHours() < 12;
  const started = new Date(date);
  started.setHours(morning ? 0 : 12, 0, 0, 0);
  const ends = new Date(started);
  ends.setHours(morning ? 12 : 24, 0, 0, 0);
  const rotation_cycle_id = `${localDateKey(date)}-${morning ? "morning" : "evening"}`;
  return {
    rotation_cycle_id,
    started_at: started.toISOString(),
    ends_at: ends.toISOString(),
    seed: `sougxpress:${rotation_cycle_id}`,
  };
};

export const getStoredHeroRotationCycle = async (date = new Date()): Promise<HeroRotationCycle> => {
  const current = getRotationCycleForDate(date);
  try {
    const raw = await AsyncStorage.getItem(CYCLE_STORAGE_KEY);
    const stored = raw ? JSON.parse(raw) as Partial<HeroRotationCycle> : null;
    if (stored?.rotation_cycle_id === current.rotation_cycle_id && stored.seed) return stored as HeroRotationCycle;
    await AsyncStorage.setItem(CYCLE_STORAGE_KEY, JSON.stringify(current));
  } catch {
    // A device storage failure must not prevent the Market from rendering.
  }
  return current;
};

export const getPreviousCourierId = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(COURIER_STORAGE_KEY);
  } catch {
    return null;
  }
};

export const rememberCourierOfTheDay = async (courierId: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(COURIER_STORAGE_KEY, courierId);
  } catch {
    // Best effort only; the next cycle still has deterministic selection.
  }
};

export const withCycleMetadata = <T extends object>(slides: T[], cycle: HeroRotationCycle): T[] =>
  slides.map((slide) => ({
    ...slide,
    rotation_cycle_id: cycle.rotation_cycle_id,
    rotation_cycle_started_at: cycle.started_at,
  })) as T[];
