import { getProjectLocalTime, getStoreHours, resolveStoreHours, validateStoreHours } from "../src/services/store-hours";
import { getStoreOpenState } from "../src/services/store-open-state";

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

const activeStore = {
  id: "11111111-1111-4111-8111-111111111111",
  status: "active",
} as const;

console.log("\n=== Store Hours Tests ===\n");

const defaults = resolveStoreHours(undefined, undefined);
assert(defaults?.opens_at === "09:00" && defaults?.closes_at === "22:00", "default is 09:00–22:00");
assert(getStoreHours({}).opens_at === "09:00" && getStoreHours({}).closes_at === "22:00", "legacy empty store receives service defaults");
assert(validateStoreHours("", "22:00") !== null, "empty opening time is rejected");
assert(validateStoreHours("09:00", "25:00") !== null, "invalid closing time is rejected");
assert(validateStoreHours("09:00", "22:00") === null, "valid time values are accepted");

const storeA = { ...activeStore, id: "11111111-1111-4111-8111-111111111111", opens_at: "08:00", closes_at: "16:00" };
const storeB = { ...activeStore, id: "22222222-2222-4222-8222-222222222222", opens_at: "12:00", closes_at: "20:00" };
assert(getStoreHours(storeA).opens_at === "08:00" && getStoreHours(storeB).opens_at === "12:00", "two stores keep independent schedules");
assert(getStoreHours(storeA).closes_at === "16:00" && getStoreHours(storeB).closes_at === "20:00", "changing one store does not affect the other");

const atOpening = new Date("2026-08-28T08:00:00.000Z"); // 09:00 in Africa/Algiers
const inside = new Date("2026-08-28T20:59:00.000Z"); // 21:59 in Africa/Algiers
const atClosing = new Date("2026-08-28T21:00:00.000Z"); // 22:00 in Africa/Algiers
const beforeOpening = new Date("2026-08-28T07:59:00.000Z"); // 08:59 in Africa/Algiers
const scheduledStore = { ...activeStore, opens_at: "09:00", closes_at: "22:00" };
assert(getStoreOpenState(scheduledStore, atOpening).isOpen === true, "Open at the opening boundary 09:00");
assert(getStoreOpenState(scheduledStore, inside).isOpen === true, "Open inside the configured period");
assert(getStoreOpenState(scheduledStore, atClosing).isOpen === false, "Closed at the closing boundary 22:00");
assert(getStoreOpenState(scheduledStore, beforeOpening).isOpen === false, "Closed outside the configured period");

const closedFridayStore = { ...scheduledStore, closed_day: "friday" as const };
assert(getStoreOpenState(closedFridayStore, inside).isOpen === false && getStoreOpenState(closedFridayStore, inside).reason === "closed_day", "closed_day overrides the daily schedule");

const overnightStore = { ...activeStore, opens_at: "22:00", closes_at: "02:00" };
assert(getStoreOpenState(overnightStore, new Date("2026-08-28T21:30:00.000Z")).isOpen === true, "overnight schedule is open after opening");
assert(getStoreOpenState(overnightStore, new Date("2026-08-28T00:30:00.000Z")).isOpen === true, "overnight schedule is open before closing");

const localTime = getProjectLocalTime(atOpening);
assert(localTime.minutes === 540 && localTime.dayIndex === 5, "Open/Closed uses Africa/Algiers project timezone");

console.log(`\n=== Summary: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
