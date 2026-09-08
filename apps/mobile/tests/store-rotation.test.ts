import {
  getStoreRotationSessionSeed,
  resetStoreRotationSession,
  rotateNearbyStores,
  rotateStores,
  seededShuffle,
} from "../src/services/storeRotation";

type TestStore = { id: string; latitude?: number; longitude?: number };
let passed = 0;
let failed = 0;
function assert(condition: boolean, label: string): void {
  if (condition) {
    passed += 1;
    console.log(`  ✅ ${label}`);
  } else {
    failed += 1;
    console.log(`  ❌ ${label}`);
  }
}
const ids = (stores: TestStore[]) => stores.map((store) => store.id).join(",");
const stores: TestStore[] = ["a", "b", "c", "d", "e"].map((id, index) => ({ id, latitude: 34.8 + index * 0.002, longitude: -0.5 }));

console.log("\n=== Store Rotation Tests ===\n");
resetStoreRotationSession();
const firstSeed = getStoreRotationSessionSeed("user-1");
const sameSeed = getStoreRotationSessionSeed("user-1");
assert(Boolean(firstSeed) && firstSeed === sameSeed, "same authenticated session keeps one seed");
const firstSeedOrder = seededShuffle(stores, `${firstSeed}:all`);
const repeatedOrder = seededShuffle(stores, `${sameSeed}:all`);
assert(ids(firstSeedOrder) === ids(repeatedOrder), "rerender-equivalent calls keep the same order");
assert(new Set(firstSeedOrder.map((store) => store.id)).size === stores.length, "rotation has no duplicate or missing stores");
const featuredOrder = rotateStores(stores, firstSeed, "featured");
const allOrder = rotateStores(stores, firstSeed, "all");
assert(ids(featuredOrder) !== ids(allOrder), "section salts produce independent ordering");
resetStoreRotationSession();
const secondSeed = getStoreRotationSessionSeed("user-1");
const secondOrder = rotateStores(stores, secondSeed, "all");
assert(firstSeed !== secondSeed, "a new session gets a new seed");
assert(ids(firstSeedOrder) !== ids(secondOrder), "a new session normally produces a different order");
const nearby = rotateNearbyStores(stores, secondSeed, { zoneId: null, latitude: 34.8, longitude: -0.5 });
assert(nearby[0]?.id === "a", "nearest store remains first in nearby results");
assert(new Set(nearby.map((store) => store.id)).size === stores.length, "nearby rotation keeps every store exactly once");
resetStoreRotationSession();
assert(getStoreRotationSessionSeed(null) === null, "guest users do not receive a rotation seed");
console.log(`\n=== Summary: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
