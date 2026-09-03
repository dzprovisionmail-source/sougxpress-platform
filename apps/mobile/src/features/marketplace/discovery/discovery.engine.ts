import {
  DEFAULT_DISCOVERY_CONFIG,
  DiscoveryConfig,
  DiscoveryContext,
  DiscoverySectionKey,
  DiscoveryResult,
  DiscoverySnapshot,
} from './discovery.types';

const EARTH_RADIUS_KM = 6371;

const finite = (value: unknown): number | null => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const distanceKm = (aLat: number, aLon: number, bLat: number, bLon: number): number => {
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLon = ((bLon - aLon) * Math.PI) / 180;
  const lat1 = (aLat * Math.PI) / 180;
  const lat2 = (bLat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

const ageDays = (createdAt: unknown, now: number): number => {
  const timestamp = typeof createdAt === 'string' ? Date.parse(createdAt) : NaN;
  if (!Number.isFinite(timestamp)) return Number.POSITIVE_INFINITY;
  return Math.max(0, (now - timestamp) / 86_400_000);
};

const freshness = (createdAt: unknown, now: number, halfLifeDays: number): number => {
  const age = ageDays(createdAt, now);
  return Number.isFinite(age) ? Math.pow(0.5, age / Math.max(1, halfLifeDays)) : 0;
};

const stableHash = (id: string, epoch: number): number => {
  let hash = 2166136261 ^ epoch;
  for (let i = 0; i < id.length; i += 1) hash = Math.imul(hash ^ id.charCodeAt(i), 16777619);
  return (hash >>> 0) / 4_294_967_295;
};

const compareStable = (a: any, b: any, epoch: number): number => {
  const hashDelta = stableHash(String(a.id), epoch) - stableHash(String(b.id), epoch);
  if (hashDelta !== 0) return hashDelta;
  return String(a.id).localeCompare(String(b.id));
};

const isActive = (item: any): boolean => item?.status === 'active';
const keyOf = (item: any): string => String(item?.id ?? '');

const sameZone = (store: any, context: DiscoveryContext): number =>
  context.location.zoneId && store?.zone_id === context.location.zoneId ? 1 : 0;

const openScore = (store: any): number => {
  if (store?.is_open === true) return 1;
  if (store?.is_open === false) return 0;
  return 0.5;
};

const proximityScore = (store: any, context: DiscoveryContext): number => {
  const lat = finite(context.location.latitude);
  const lon = finite(context.location.longitude);
  const storeLat = finite(store?.latitude);
  const storeLon = finite(store?.longitude);
  if (lat === null || lon === null || storeLat === null || storeLon === null) return 0;
  return 1 / (1 + distanceKm(lat, lon, storeLat, storeLon));
};

const storeScore = (store: any, context: DiscoveryContext, config: DiscoveryConfig, mode: DiscoverySectionKey): number => {
  const featured = store?.is_featured === true ? 1 : 0;
  const isNew = store?.is_new === true ? 1 : 0;
  const zone = sameZone(store, context);
  const proximity = proximityScore(store, context);
  const operational = openScore(store);
  const recent = freshness(store?.created_at, context.now, config.freshnessHalfLifeDays);
  if (mode === 'featuredStores') return featured * 100 + operational * 15 + zone * 10 + recent * 5;
  if (mode === 'newStores') return isNew * 100 + recent * 20 + operational * 5;
  return operational * 20 + zone * 30 + proximity * 35 + recent * 5;
};

const productScore = (product: any, context: DiscoveryContext, config: DiscoveryConfig, liked: boolean): number => {
  const favoriteCount = Math.max(0, finite(product?.favorite_count) ?? 0);
  const favoriteSignal = Math.min(1, favoriteCount / 25);
  const recent = freshness(product?.created_at, context.now, config.freshnessHalfLifeDays);
  return (liked ? favoriteSignal * 80 : recent * 100) + recent * 10;
};

const takeUnique = <T extends any>(items: T[], limit: number, used: Set<string>): T[] => {
  const result: T[] = [];
  for (const item of items) {
    const key = keyOf(item);
    if (!key || result.length >= limit || used.has(key)) continue;
    result.push(item);
    used.add(key);
  }
  return result;
};

const takeWithFallback = <T extends any>(items: T[], limit: number, used: Set<string>): T[] => {
  const unique = takeUnique(items, limit, used);
  if (unique.length > 0 || limit === 0) return unique;
  return items.slice(0, limit);
};

export function evaluateDiscovery<TStore = any, TProduct = any>(
  snapshot: DiscoverySnapshot<TStore, TProduct>,
  config: DiscoveryConfig = DEFAULT_DISCOVERY_CONFIG,
): DiscoveryResult<TStore, TProduct> {
  const { stores, products, mostLikedProducts, context } = snapshot;
  const activeStores = stores.filter(isActive);
  const activeProducts = products.filter(isActive);
  const usedStores = new Set<string>();
  const usedProducts = new Set<string>();
  const sortStores = (mode: DiscoverySectionKey) => [...activeStores]
    .sort((a, b) => storeScore(b, context, config, mode) - storeScore(a, context, config, mode) || compareStable(a, b, context.sessionEpoch));
  const sortProducts = (items: TProduct[], liked: boolean) => [...items]
    .filter(isActive)
    .sort((a, b) => productScore(b, context, config, liked) - productScore(a, context, config, liked) || compareStable(a, b, context.sessionEpoch));

  const featuredStores = takeWithFallback(sortStores('featuredStores').filter((s: any) => s.is_featured === true), config.limits.featuredStores, usedStores);
  const newStores = takeWithFallback(sortStores('newStores').filter((s: any) => s.is_new === true), config.limits.newStores, usedStores);
  const nearbyStores = takeWithFallback(sortStores('nearbyStores'), config.limits.nearbyStores, usedStores);
  const newProducts = takeWithFallback(sortProducts(activeProducts, false), config.limits.newProducts, usedProducts);
  const mostLiked = takeWithFallback(sortProducts(mostLikedProducts.filter((p: any) => activeProducts.some((active: any) => keyOf(active) === keyOf(p))), true), config.limits.mostLikedProducts, usedProducts);

  return {
    featuredStores,
    newStores,
    nearbyStores,
    newProducts,
    mostLikedProducts: mostLiked,
    generatedAt: context.now,
    expiresAt: context.now + 5 * 60_000,
  };
}

export { distanceKm, freshness };
