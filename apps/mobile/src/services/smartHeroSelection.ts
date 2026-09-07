import type { SmartHeroSliderSettings, SmartHeroSource } from "./heroSlider.service";

export interface SmartSelectionSlide {
  id: string;
  image: string;
  title: string;
  description: string;
  buttonLabel: string;
  storeId?: string;
  storeName?: string;
  target_id?: string;
  display_duration_seconds?: number;
  transition_duration_ms?: number;
  transition_type?: "slide" | "fade";
  kind: "promotion" | "store" | "product";
  source?: SmartHeroSource;
  smartScore?: number;
  smartReason?: string;
}

export type SmartCandidate = SmartSelectionSlide & {
  source: SmartHeroSource;
  sourceId: string;
  createdAt: number;
  featured?: boolean;
  manualPriority?: number;
};

const recentSmartIds: string[] = [];
const MAX_RECENT_IDS = 12;
const validImage = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const remember = (ids: string[]) => {
  ids.forEach((id) => {
    const index = recentSmartIds.indexOf(id);
    if (index >= 0) recentSmartIds.splice(index, 1);
    recentSmartIds.push(id);
  });
  while (recentSmartIds.length > MAX_RECENT_IDS) recentSmartIds.shift();
};

export const scoreSmartCandidate = (candidate: SmartCandidate, sourceWeight: number, newestAt: number, now: number, repeatPenaltyWeight = 35) => {
  const ageDays = Math.max(0, (now - candidate.createdAt) / 86_400_000);
  const freshness = clamp(30 - ageDays * 1.4, 0, 30);
  const featured = candidate.featured ? 22 : 0;
  const imageQuality = validImage(candidate.image) ? 10 : 0;
  const manualPriority = clamp(candidate.manualPriority ?? 0, 0, 100) * 0.25;
  const recencyPenalty = recentSmartIds.includes(candidate.sourceId) ? repeatPenaltyWeight : 0;
  const repeatPenalty = recentSmartIds[recentSmartIds.length - 1] === candidate.sourceId ? 50 : 0;
  const sourceBalance = (sourceWeight / 100) * 18;
  const normalizedFreshness = newestAt > 0 ? (candidate.createdAt / newestAt) * 10 : 0;
  return freshness + featured + imageQuality + manualPriority + sourceBalance + normalizedFreshness - recencyPenalty - repeatPenalty;
};

export function selectSmartHeroSlides(candidates: SmartCandidate[], settings: SmartHeroSliderSettings, limit = 6): SmartSelectionSlide[] {
  const enabled = new Set(Object.entries(settings.enabledSources).filter(([, value]) => value).map(([key]) => key));
  const available = candidates.filter((candidate) => enabled.has(candidate.source) && validImage(candidate.image) && (settings.maxRepeatCount > 0 || !recentSmartIds.includes(candidate.sourceId)));
  const unique = [...new Map(available.map((candidate) => [candidate.sourceId, candidate])).values()];
  const now = Date.now();
  const newestAt = Math.max(...unique.map((candidate) => candidate.createdAt), 1);
  const repeatPenaltyWeight = settings.maxRepeatCount > 0 ? 35 / settings.maxRepeatCount : 0;
  const ranked = unique.map((candidate) => ({ candidate, score: scoreSmartCandidate(candidate, settings.sourceWeights[candidate.source] ?? 0, newestAt, now, repeatPenaltyWeight) }))
    .sort((a, b) => b.score - a.score || b.candidate.createdAt - a.candidate.createdAt || a.candidate.sourceId.localeCompare(b.candidate.sourceId));
  const result: SmartCandidate[] = [];
  const sourceCounts = new Map<SmartHeroSource, number>();
  const maxPerSource = Math.max(1, Math.ceil(limit / Math.max(1, new Set(ranked.map(({ candidate }) => candidate.source)).size)) + 1);
  while (ranked.length && result.length < limit) {
    const previous = result[result.length - 1];
    const nextIndex = ranked.findIndex(({ candidate }) => candidate.source !== previous?.source && (sourceCounts.get(candidate.source) ?? 0) < maxPerSource);
    const fallbackIndex = ranked.findIndex(({ candidate }) => (sourceCounts.get(candidate.source) ?? 0) < maxPerSource);
    const index = nextIndex >= 0 ? nextIndex : fallbackIndex;
    if (index < 0) break;
    const [{ candidate, score }] = ranked.splice(index, 1);
    result.push({ ...candidate, smartScore: Math.round(score), smartReason: candidate.featured ? "مميز وحديث مع صورة حقيقية" : "حديث ومتوازن مع مصادر السوق" });
    sourceCounts.set(candidate.source, (sourceCounts.get(candidate.source) ?? 0) + 1);
  }
  remember(result.map((item) => item.sourceId));
  return result.map(({ sourceId: _sourceId, createdAt: _createdAt, featured: _featured, manualPriority: _manualPriority, ...slide }) => slide);
}
