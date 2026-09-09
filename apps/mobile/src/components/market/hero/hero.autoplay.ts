export const HERO_AUTOPLAY_INTERVAL = 7_000;

export interface HeroAutoplayState {
  active: boolean;
  appStateActive: boolean;
  slideCount: number;
}

export const shouldRunHeroAutoplay = ({ active, appStateActive, slideCount }: HeroAutoplayState): boolean =>
  active && appStateActive && slideCount > 1;

export const nextHeroIndex = (index: number, slideCount: number): number =>
  slideCount > 0 ? (index + 1) % slideCount : 0;

export const clampHeroIndex = (index: number, slideCount: number): number =>
  slideCount > 0 ? Math.max(0, Math.min(index, slideCount - 1)) : 0;
