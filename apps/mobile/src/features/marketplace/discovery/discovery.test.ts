const assert = {
  equal(actual: unknown, expected: unknown) {
    if (actual !== expected) throw new Error(`Expected ${String(expected)}, got ${String(actual)}`);
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
const context = {
  now,
  location: { zoneId: 'z1', latitude: 34.8, longitude: -0.15 },
  zoneNames: {},
  sessionEpoch: 1,
};

const result = evaluateDiscovery({
  stores: [
    store('featured', { is_featured: true }),
    store('new', { is_new: true, created_at: '2026-09-03T10:00:00.000Z' }),
    store('inactive', { status: 'inactive' }),
  ],
  products: [product('p-new'), product('p-inactive', { status: 'draft' })],
  mostLikedProducts: [product('p-new', { favorite_count: 10 })],
  context,
});

assert.deepEqual(result.featuredStores.map((item: any) => item.id), ['featured']);
assert.deepEqual(result.newStores.map((item: any) => item.id), ['new']);
assert.equal(result.nearbyStores.some((item: any) => item.id === 'inactive'), false);
assert.deepEqual(result.newProducts.map((item: any) => item.id), ['p-new']);
assert.deepEqual(result.mostLikedProducts.map((item: any) => item.id), ['p-new']);

const deterministicA = evaluateDiscovery({ stores: [store('a'), store('b')], products: [], mostLikedProducts: [], context });
const deterministicB = evaluateDiscovery({ stores: [store('a'), store('b')], products: [], mostLikedProducts: [], context });
assert.deepEqual(deterministicA, deterministicB);

const empty = evaluateDiscovery({ stores: [], products: [], mostLikedProducts: [], context });
assert.deepEqual(empty.featuredStores, []);
assert.deepEqual(empty.newProducts, []);

console.log('discovery.test.ts: PASS');
