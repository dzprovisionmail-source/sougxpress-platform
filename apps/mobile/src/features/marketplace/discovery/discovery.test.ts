const assert = {
  equal(actual: unknown, expected: unknown) {
    if (actual !== expected) throw new Error(`Expected ${String(expected)}, got ${String(actual)}`);
  },
  ok(value: unknown, message: string) {
    if (!value) throw new Error(message);
  },
  deepEqual(actual: unknown, expected: unknown) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
  },
};

import { evaluateDiscovery } from './discovery.engine';

const now = Date.parse('2026-09-03T12:00:00.000Z');
const store = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  status: 'active',
  created_at: '2026-09-03T11:00:00.000Z',
  is_featured: false,
  is_new: false,
  is_open: true,
  zone_id: 'z1',
  latitude: 34.8,
  longitude: -0.15,
  ...extra,
});
const product = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  status: 'active',
  created_at: '2026-09-03T11:00:00.000Z',
  store_id: 's1',
  ...extra,
});
const makeContext = (sessionEpoch: number, location = { zoneId: 'z1', latitude: 34.8, longitude: -0.15 }) => ({
  now,
  location,
  zoneNames: {},
  sessionEpoch,
});

const stores = [
  store('featured', { is_featured: true }),
  store('new', { is_new: true, created_at: '2026-09-03T10:00:00.000Z' }),
  store('nearby', { latitude: 34.8005, longitude: -0.1505 }),
  store('far', { latitude: 35.5, longitude: -0.15 }),
  store('inactive', { status: 'inactive', is_featured: true, is_new: true }),
];
const products = [
  product('p-new', { created_at: '2026-09-03T11:00:00.000Z' }),
  product('p-liked', { created_at: '2026-08-01T11:00:00.000Z', favorite_count: 20 }),
  product('p-draft', { status: 'draft', favorite_count: 99 }),
];

const result = evaluateDiscovery({
  stores,
  products,
  mostLikedProducts: [products[1]],
  context: makeContext(1),
});

// Featured must not consume or hide New Stores; both sections have independent candidates.
assert.ok(result.featuredStores.some((item: any) => item.id === 'featured'), 'featured store missing');
assert.ok(result.newStores.some((item: any) => item.id === 'new'), 'new store hidden by featured section');
// New Stores must not consume or hide Nearby Stores.
assert.ok(result.nearbyStores.some((item: any) => item.id === 'nearby'), 'nearby store hidden by new section');
// Fallback fills sections from active candidates without admitting inactive data.
assert.ok(result.featuredStores.length >= 1, 'featured fallback did not fill');
assert.equal(result.featuredStores.some((item: any) => item.id === 'inactive'), false);
assert.equal(result.newStores.some((item: any) => item.id === 'inactive'), false);
assert.equal(result.nearbyStores.some((item: any) => item.id === 'inactive'), false);
// Nearby uses real distance and does not treat a far active store as nearby when a valid nearby set exists.
assert.equal(result.nearbyStores.some((item: any) => item.id === 'far'), false);
// New Products and Most Liked are independent sections.
assert.deepEqual(result.newProducts.map((item: any) => item.id), ['p-new', 'p-liked']);
assert.deepEqual(result.mostLikedProducts.map((item: any) => item.id), ['p-liked']);
assert.equal(result.newProducts.some((item: any) => item.id === 'p-draft'), false);
assert.equal(result.mostLikedProducts.some((item: any) => item.id === 'p-draft'), false);
// Most Liked ranking uses favorite_count when it is present.
const likedRanking = evaluateDiscovery({
  stores: [],
  products: [product('p1'), product('p2')],
  mostLikedProducts: [product('p1', { favorite_count: 1 }), product('p2', { favorite_count: 10 })],
  context: makeContext(1),
});
assert.deepEqual(likedRanking.mostLikedProducts.map((item: any) => item.id), ['p2', 'p1']);
// If favorite_count is absent, source order is preserved rather than claiming a likes ranking.
const sourceOrder = evaluateDiscovery({
  stores: [],
  products: [],
  mostLikedProducts: [product('source-a'), product('source-b')],
  context: makeContext(1),
});
assert.deepEqual(sourceOrder.mostLikedProducts.map((item: any) => item.id), ['source-a', 'source-b']);
// Same epoch is deterministic; a different epoch may rotate equal-score candidates.
const deterministicA = evaluateDiscovery({ stores: [store('a'), store('b'), store('c')], products: [], mostLikedProducts: [], context: makeContext(1) });
const deterministicB = evaluateDiscovery({ stores: [store('a'), store('b'), store('c')], products: [], mostLikedProducts: [], context: makeContext(1) });
assert.deepEqual(deterministicA, deterministicB);
const rotated = evaluateDiscovery({ stores: [store('a'), store('b'), store('c')], products: [], mostLikedProducts: [], context: makeContext(2) });
assert.ok(JSON.stringify(rotated.nearbyStores) !== JSON.stringify(deterministicA.nearbyStores), 'epoch did not allow deterministic rotation');
// Missing location falls back safely to same-zone/active stores and never crashes.
const noLocation = evaluateDiscovery({ stores, products: [], mostLikedProducts: [], context: makeContext(1, { zoneId: null, latitude: null, longitude: null }) });
assert.ok(noLocation.nearbyStores.length > 0, 'location fallback is empty');
const empty = evaluateDiscovery({ stores: [], products: [], mostLikedProducts: [], context: makeContext(1) });
assert.deepEqual(empty.featuredStores, []);
assert.deepEqual(empty.newProducts, []);

console.log('discovery.test.ts: PASS');
