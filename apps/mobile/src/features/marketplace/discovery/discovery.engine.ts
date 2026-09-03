import {
  DEFAULT_DISCOVERY_CONFIG,
  DiscoveryConfig,
  DiscoveryContext,
  DiscoveryResult,
  DiscoverySectionKey,
  DiscoverySnapshot,
} from './discovery.types';

const EARTH_RADIUS_KM = 6371;
const MAX_NEARBY_DISTANCE_KM = 25;

const finite = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
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
  for (let index = 0; index < id.length; index += 1) hash = Math.imul(hash ^ id.charCodeAt(index), 16777619);
  return (hash >>> 0) / 4_294_967_295;
};

const stableCompare = (a: any, b: any, epoch: number): number => {
  const byEpoch = stableHash(String(a?.id ?? ''), epoch) - stableHash(String(b?.id ?? ''), epoch);
  return byEpoch || String(a?.id ?? '').localeCompare(String(b?.id ?? ''));
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

const getDistance = (store: any, context: DiscoveryContext): number | null => {
  const userLat = finite(context.location.latitude);
  const userLon = finite(context.location.longitude);
  const storeLat = finite(store?.latitude);
  const storeLon = finite(store?.longitude);
  if (userLat === null || userLon === null || storeLat === null || storeLon === null) return null;
  return distanceKm(userLat, userLon, storeLat, storeLon);
};

const storeScore = (store: any, context: DiscoveryContext, config: DiscoveryConfig, mode: DiscoverySectionKey): number => {
  const recent = freshness(store?.created_at, context.now, config.freshnessHalfLifeDays);
  const zone = sameZone(store, context);
  const open = openScore(store);
  const distance = getDistance(store, context);
  const proximity = distance === null ? 0 : 1 / (1 + distance);
  if (mode === 'featuredStores') return (store?.is_featured === true ? 100 : 0) + open * 15 + zone * 10 + recent * 5;
  if (mode === 'newStores') return (store?.is_new === true ? 100 : 0) + recent * 25 + open * 5;
  return open * 20 + zone * 30 + proximity * 35 + recent * 5;
};

const productScore = (product: any, context: DiscoveryContext, config: DiscoveryConfig, liked: boolean): number => {
  const favorites = Math.max(0, finite(product?.favorite_count) ?? 0);
  const favoriteSignal = Math.min(1, favorites / 25);
  const recent = freshness(product?.created_at, context.now, config.freshnessHalfLifeDays);
  return liked ? favoriteSignal * 100 + recent * 10 : recent * 100 + recent * 10;
};

const unique = <T extends any>(items: T[]): T[] => {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = keyOf(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const fillFromCandidates = <T extends any>(primary: T[], fallback: T[], limit: number): T[] => {
  const selected = unique(primary).slice(0, limit);
  if (selected.length >= limit) return selected;
  const selectedKeys = new Set(selected.map(keyOf));
  for (const item of unique(fallback)) {
    if (selected.length >= limit) break;
    if (selectedKeys.has(keyOf(item))) continue;
    selected.push(item);
    selectedKeys.add(keyOf(item));
  }
  return selected;
};

const sortStores = (stores: any[], context: DiscoveryContext, config: DiscoveryConfig, mode: DiscoverySectionKey): any[] =>
  [...stores].sort((a, b) => storeScore(b, context, config, mode) - storeScore(a, context, config, mode) || stableCompare(a, b, context.sessionEpoch));

const sortProducts = (products: any[], context: DiscoveryContext, config: DiscoveryConfig, liked: boolean): any[] =>
  [...products].sort((a, b) => productScore(b, context, config, liked) - productScore(a, context, config, liked) || stableCompare(a, b, context.sessionEpoch));

export function evaluateDiscovery<TStore = any, TProduct = any>(
  snapshot: DiscoverySnapshot<TStore, TProduct>,
  config: DiscoveryConfig = DEFAULT_DISCOVERY_CONFIG,
): DiscoveryResult<TStore, TProduct> {
  const { stores, products, mostLikedProducts, context } = snapshot;
  const activeStores = stores.filter(isActive);
  const activeProducts = products.filter(isActive);

  const featuredPrimary = sortStores(activeStores.filter((store: any) => store.is_featured === true), context, config, 'featuredStores');
  const featuredFallback = sortStores(activeStores, context, config, 'featuredStores');
  const newPrimary = sortStores(activeStores.filter((store: any) => store.is_new === true), context, config, 'newStores');
  const newFallback = sortStores(activeStores, context, config, 'newStores');

  const storesWithDistance = activeStores
    .map((store: any) => ({ store, distance: getDistance(store, context) }))
    .filter(({ distance }) => distance !== null && distance <= MAX_NEARBY_DISTANCE_KM)
    .sort((a, b) => (a.distance as number) - (b.distance as number) || stableCompare(a.store, b.store, context.sessionEpoch))
    .map(({ store }) => store);
  const sameZoneStores = sortStores(activeStores.filter((store: any) => sameZone(store, context) === 1), context, config, 'nearbyStores');
  const nearbyFallback = sortStores(activeStores, context, config, 'nearbyStores');
  const hasLocation = finite(context.location.latitude) !== null && finite(context.location.longitude) !== null;
  const nearbyPrimary = hasLocation ? storesWithDistance : sameZoneStores;

  const newProducts = sortProducts(activeProducts, context, config, false);
  const likedCandidates = unique(mostLikedProducts).filter(isActive);
  const hasFavoriteCounts = likedCandidates.some((product: any) => finite(product.favorite_count) !== null);
  const mostLikedProductsRanked = hasFavoriteCounts
    ? sortProducts(likedCandidates, context, config, true)
    : likedCandidates;

  return {
    featuredStores: fillFromCandidates(featuredPrimary, featuredFallback, config.limits.featuredStores),
    newStores: fillFromCandidates(newPrimary, newFallback, config.limits.newStores),
    nearbyStores: hasLocation
      ? unique(nearbyPrimary).slice(0, config.limits.nearbyStores)
      : fillFromCandidates(nearbyPrimary, nearbyFallback, config.limits.nearbyStores),
    newProducts: unique(newProducts).slice(0, config.limits.newProducts),
    mostLikedProducts: unique(mostLikedProductsRanked).slice(0, config.limits.mostLikedProducts),
    generatedAt: context.now,
    expiresAt: context.now + 5 * 60_000,
  };
}

export { distanceKm, freshness, MAX_NEARBY_DISTANCE_KM };
