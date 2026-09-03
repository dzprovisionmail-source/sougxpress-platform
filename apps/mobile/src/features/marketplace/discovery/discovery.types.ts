export type DiscoverySectionKey =
  | 'featuredStores'
  | 'newStores'
  | 'nearbyStores'
  | 'newProducts'
  | 'mostLikedProducts';

export type DiscoveryCandidateKind = 'store' | 'product' | 'courier';

export type DiscoveryLocation = {
  zoneId: string | null;
  latitude: number | null;
  longitude: number | null;
};

export type DiscoveryContext = {
  now: number;
  location: DiscoveryLocation;
  zoneNames: Record<string, string>;
  sessionEpoch: number;
};

export type DiscoveryConfig = {
  limits: Record<DiscoverySectionKey, number>;
  freshnessHalfLifeDays: number;
  deduplicateAcrossSections: boolean;
};

export type DiscoveryResult<TStore = any, TProduct = any> = {
  featuredStores: TStore[];
  newStores: TStore[];
  nearbyStores: TStore[];
  newProducts: TProduct[];
  mostLikedProducts: TProduct[];
  generatedAt: number;
  expiresAt: number;
};

export type DiscoverySnapshot<TStore = any, TProduct = any> = {
  stores: TStore[];
  products: TProduct[];
  mostLikedProducts: TProduct[];
  context: DiscoveryContext;
};

export const DEFAULT_DISCOVERY_CONFIG: DiscoveryConfig = {
  limits: {
    featuredStores: 6,
    newStores: 6,
    nearbyStores: 6,
    newProducts: 10,
    mostLikedProducts: 10,
  },
  freshnessHalfLifeDays: 14,
  deduplicateAcrossSections: true,
};
