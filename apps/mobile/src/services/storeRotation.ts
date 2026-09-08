export type RotationStore = {
  id?: string | null;
  zone_id?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
};

export type RotationLocation = {
  zoneId: string | null;
  latitude: number | null;
  longitude: number | null;
};

let activeRotationUserId: string | null = null;
let activeRotationSeed: string | null = null;

const randomSeed = (): string => {
  const cryptoObject = globalThis.crypto as Crypto | undefined;
  if (cryptoObject?.getRandomValues) {
    const values = new Uint32Array(4);
    cryptoObject.getRandomValues(values);
    return Array.from(values, (value) => value.toString(16).padStart(8, "0")).join("");
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
};

/** Returns one seed for the current authenticated app session, not per render. */
export const getStoreRotationSessionSeed = (userId: string | null | undefined): string | null => {
  if (!userId) {
    activeRotationUserId = null;
    activeRotationSeed = null;
    return null;
  }
  if (activeRotationUserId !== userId || !activeRotationSeed) {
    activeRotationUserId = userId;
    activeRotationSeed = randomSeed();
  }
  return activeRotationSeed;
};

/** Test/support hook for resetting the module session between isolated sessions. */
export const resetStoreRotationSession = (): void => {
  activeRotationUserId = null;
  activeRotationSeed = null;
};

const hashSeed = (value: string): number => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const seededRandom = (seed: string): (() => number) => {
  let state = hashSeed(seed) || 0x9e3779b9;
  return () => {
    state = (Math.imul(state ^ (state >>> 15), 1 | state) + 0x6d2b79f5) | 0;
    let result = Math.imul(state ^ (state >>> 7), 61 | state);
    result ^= result + Math.imul(result ^ (result >>> 14), 9 | result);
    return ((result ^ (result >>> 13)) >>> 0) / 4294967296;
  };
};

/** Stable seeded Fisher-Yates. It never mutates the source array. */
export const seededShuffle = <T>(items: readonly T[], seed: string): T[] => {
  const result = [...items];
  const random = seededRandom(seed);
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
};

export const rotateStores = <T>(items: readonly T[], sessionSeed: string | null, sectionSalt: string): T[] => {
  if (!sessionSeed || items.length < 2) return [...items];
  return seededShuffle(items, `${sessionSeed}:${sectionSalt}`);
};

const finiteCoordinate = (value: unknown): number | null => {
  const numberValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
};

const distanceInKm = (aLat: number, aLon: number, bLat: number, bLon: number): number => {
  const earthRadiusKm = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLon = ((bLon - aLon) * Math.PI) / 180;
  const lat1 = (aLat * Math.PI) / 180;
  const lat2 = (bLat * Math.PI) / 180;
  const haversine = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
};

/**
 * Keeps distance as the first ordering key. Stores inside the same 1km band
 * rotate independently; stores without coordinates remain at the end.
 */
export const rotateNearbyStores = <T extends RotationStore>(
  items: readonly T[],
  sessionSeed: string | null,
  location: RotationLocation,
): T[] => {
  if (!sessionSeed || items.length < 2) return [...items];
  const { latitude, longitude } = location;
  if (latitude === null || longitude === null) {
    return rotateStores(items, sessionSeed, "nearby-no-location");
  }

  const located: Array<{ item: T; distance: number; originalIndex: number }> = [];
  const missing: T[] = [];
  items.forEach((item, originalIndex) => {
    const itemLatitude = finiteCoordinate(item.latitude);
    const itemLongitude = finiteCoordinate(item.longitude);
    if (itemLatitude === null || itemLongitude === null) {
      missing.push(item);
      return;
    }
    located.push({ item, distance: distanceInKm(latitude, longitude, itemLatitude, itemLongitude), originalIndex });
  });

  located.sort((a, b) => a.distance - b.distance || a.originalIndex - b.originalIndex);
  const bands = new Map<number, T[]>();
  located.forEach(({ item, distance }) => {
    const band = Math.floor(distance);
    const group = bands.get(band) || [];
    group.push(item);
    bands.set(band, group);
  });

  const result: T[] = [];
  [...bands.entries()].sort(([a], [b]) => a - b).forEach(([band, group]) => {
    // Keep the closest member of the nearest band first. Rotation applies
    // inside the remaining close stores without allowing a farther store to
    // jump ahead of the actual nearest result.
    if (result.length === 0 && group.length > 0) {
      result.push(group[0]);
      result.push(...rotateStores(group.slice(1), sessionSeed, `nearby-distance-band-${band}`));
    } else {
      result.push(...rotateStores(group, sessionSeed, `nearby-distance-band-${band}`));
    }
  });
  result.push(...rotateStores(missing, sessionSeed, "nearby-missing-location"));
  return result;
};

/** Rotates existing zone-prioritized output without changing zone priority. */
export const rotateWithinZoneGroups = <T extends RotationStore>(
  items: readonly T[],
  sessionSeed: string | null,
): T[] => {
  if (!sessionSeed || items.length < 2) return [...items];
  const result: T[] = [];
  let group: T[] = [];
  let currentZone: string | null | undefined;
  const flush = () => {
    if (group.length > 0) result.push(...rotateStores(group, sessionSeed, `nearby-zone-${currentZone || "unknown"}`));
    group = [];
  };
  items.forEach((item) => {
    if (group.length > 0 && item.zone_id !== currentZone) flush();
    currentZone = item.zone_id;
    group.push(item);
  });
  flush();
  return result;
};
