export const HERO_REFRESH_MIN_INTERVAL = 1_500;

export const shouldRefreshHero = (lastRefreshAt: number, now = Date.now(), minimumInterval = HERO_REFRESH_MIN_INTERVAL): boolean =>
  lastRefreshAt <= 0 || now - lastRefreshAt >= minimumInterval;
