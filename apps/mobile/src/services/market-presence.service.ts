import { AppState, type AppStateStatus } from "react-native";
import { supabase } from "@/lib/supabase";

export const MARKET_PRESENCE_CHANNEL = "market-presence";
export const MARKET_PRESENCE_TTL_MS = 60_000;
export const MARKET_PRESENCE_HEARTBEAT_MS = 20_000;

export type MarketPresenceRole = "customer" | "merchant" | "driver";
export type MarketPresenceActivity = "market" | "store" | "product" | "courier";

export type MarketPresencePayload = {
  role: MarketPresenceRole;
  activity: MarketPresenceActivity;
  activity_started_at: string;
  last_activity_at: string;
};

type PresenceRecord = Record<string, unknown>;
type PresenceListener = (entries: MarketPresencePayload[]) => void;

type PresenceSession = {
  channel: ReturnType<typeof supabase.channel>;
  payload: MarketPresencePayload;
  references: number;
  ready: Promise<boolean>;
  heartbeat: ReturnType<typeof setInterval> | null;
};

let session: PresenceSession | null = null;

const VALID_ROLES: readonly MarketPresenceRole[] = ["customer", "merchant", "driver"];
const VALID_ACTIVITIES: readonly MarketPresenceActivity[] = ["market", "store", "product", "courier"];

function isValidRole(value: unknown): value is MarketPresenceRole {
  return typeof value === "string" && VALID_ROLES.includes(value as MarketPresenceRole);
}

function isValidActivity(value: unknown): value is MarketPresenceActivity {
  return typeof value === "string" && VALID_ACTIVITIES.includes(value as MarketPresenceActivity);
}

function isFreshTimestamp(value: unknown, now = Date.now()): value is string {
  if (typeof value !== "string") return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && now - timestamp <= MARKET_PRESENCE_TTL_MS && timestamp <= now + 5_000;
}

function normalizePayload(value: unknown, now = Date.now()): MarketPresencePayload | null {
  if (!value || typeof value !== "object") return null;
  const record = value as PresenceRecord;
  if (!isValidRole(record.role) || !isValidActivity(record.activity)) return null;
  if (typeof record.activity_started_at !== "string" || !Number.isFinite(Date.parse(record.activity_started_at))) return null;
  if (!isFreshTimestamp(record.last_activity_at, now)) return null;
  return {
    role: record.role,
    activity: record.activity,
    activity_started_at: record.activity_started_at,
    last_activity_at: record.last_activity_at,
  };
}

export function readMarketPresence(state: Record<string, unknown[]> | Record<string, unknown>, now = Date.now()): MarketPresencePayload[] {
  const entries: MarketPresencePayload[] = [];
  Object.values(state ?? {}).forEach((value) => {
    const values = Array.isArray(value) ? value : [value];
    values.forEach((item) => {
      const payload = normalizePayload(item, now);
      if (payload) entries.push(payload);
    });
  });
  return entries;
}

function buildPayload(role: MarketPresenceRole, activity: MarketPresenceActivity, startedAt: string): MarketPresencePayload {
  return {
    role,
    activity,
    activity_started_at: startedAt,
    last_activity_at: new Date().toISOString(),
  };
}

async function trackCurrentSession(): Promise<void> {
  if (!session) return;
  session.payload = {
    ...session.payload,
    last_activity_at: new Date().toISOString(),
  };
  await session.channel.track(session.payload);
}

async function stopSessionReference(): Promise<void> {
  if (!session) return;
  session.references -= 1;
  if (session.references > 0) return;
  const current = session;
  session = null;
  if (current.heartbeat) clearInterval(current.heartbeat);
  await current.channel.untrack().catch(() => undefined);
  await supabase.removeChannel(current.channel);
}

export async function startMarketPresence(
  role: MarketPresenceRole,
  activity: MarketPresenceActivity,
): Promise<(() => Promise<void>) | null> {
  if (!isValidRole(role) || !isValidActivity(activity)) return null;

  const now = new Date().toISOString();
  if (session) {
    session.references += 1;
    session.payload = {
      ...session.payload,
      activity,
      activity_started_at: now,
      last_activity_at: now,
    };
    await session.ready;
    await trackCurrentSession();
    return stopSessionReference;
  }

  const channel = supabase.channel(MARKET_PRESENCE_CHANNEL, {
    config: { presence: { key: `market-${Date.now()}-${Math.random().toString(36).slice(2, 10)}` } },
  });
  const payload = buildPayload(role, activity, now);
  const ready = new Promise<boolean>((resolve) => {
    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        try {
          await channel.track(payload);
          resolve(true);
        } catch {
          resolve(false);
        }
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        resolve(false);
      }
    });
  });
  session = { channel, payload, references: 1, ready, heartbeat: null };
  await ready;
  if (!session || session.channel !== channel) return stopSessionReference;
  session.heartbeat = setInterval(() => {
    void trackCurrentSession();
  }, MARKET_PRESENCE_HEARTBEAT_MS);
  return stopSessionReference;
}

export function subscribeToMarketPresence(listener: PresenceListener): () => void {
  const channel = supabase.channel(`${MARKET_PRESENCE_CHANNEL}-founder-view`, {
    config: { presence: { key: `founder-view-${Date.now()}-${Math.random().toString(36).slice(2, 10)}` } },
  });
  const emit = () => listener(readMarketPresence(channel.presenceState()));
  channel.on("presence", { event: "sync" }, emit);
  channel.on("presence", { event: "join" }, emit);
  channel.on("presence", { event: "leave" }, emit);
  channel.subscribe((status) => {
    if (status === "SUBSCRIBED") emit();
  });
  return () => {
    void supabase.removeChannel(channel);
  };
}

export function observeMarketPresenceAppState(onActive: () => void, onBackground: () => void): () => void {
  const subscription = AppState.addEventListener("change", (nextState: AppStateStatus) => {
    if (nextState === "active") onActive();
    else if (nextState === "background" || nextState === "inactive") onBackground();
  });
  return () => subscription.remove();
}
