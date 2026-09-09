import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, FlatList, Image, ListRenderItemInfo, NativeScrollEvent, NativeSyntheticEvent, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { ArrowLeft, ShoppingBag, Store, Tag } from "lucide-react-native";
import type { HeroSlide } from "./hero.types";
import { HERO_AUTOPLAY_INTERVAL, clampHeroIndex, nextHeroIndex, shouldRunHeroAutoplay } from "./hero.autoplay";

interface MarketHeroSliderProps {
  slides: HeroSlide[];
  colors: any;
  isRTL: boolean;
  onPressSlide?: (slide: HeroSlide) => void;
  isActive?: boolean;
}

const PEEK = 28;
const HORIZONTAL_MARGIN = 16;
const SLIDE_GAP = 10;

const typeIcon = (type: HeroSlide["type"]) => {
  if (type === "STORE") return Store;
  if (type === "PRODUCT") return ShoppingBag;
  return Tag;
};

const MarketHeroSlide = memo(function MarketHeroSlide({ slide, width, colors, onPress }: { slide: HeroSlide; width: number; colors: any; onPress?: () => void }) {
  const Icon = typeIcon(slide.type);
  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} disabled={!onPress} style={[styles.slide, { width, backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]}>
      {slide.imageUrl ? <Image source={{ uri: slide.imageUrl }} style={styles.image} resizeMode="cover" /> : <View style={[styles.placeholder, { backgroundColor: colors.primary }]}><Icon color="#fff" size={44} strokeWidth={1.6} /><View style={styles.placeholderOrb} /></View>}
      <View style={styles.scrim} />
      <View style={styles.content}>
        <View style={[styles.typePill, { backgroundColor: "rgba(255,255,255,0.18)" }]}><Icon color="#fff" size={13} /><Text style={styles.typeText}>{slide.type === "STORE" ? "متجر محلي" : slide.type === "PRODUCT" ? "منتجات السوق" : "اختيار السوق"}</Text></View>
        {!!slide.title && <Text numberOfLines={2} style={styles.title}>{slide.title}</Text>}
        {!!slide.description && <Text numberOfLines={2} style={styles.description}>{slide.description}</Text>}
        {!!slide.ctaText && <View style={[styles.cta, { backgroundColor: colors.primary }]}><Text style={styles.ctaText}>{slide.ctaText}</Text><ArrowLeft color="#fff" size={16} /></View>}
      </View>
    </TouchableOpacity>
  );
});

export const MarketHeroSlider = memo(function MarketHeroSlider({ slides, colors, isRTL, onPressSlide, isActive = true }: MarketHeroSliderProps) {
  const { width: screenWidth } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const [appStateActive, setAppStateActive] = useState(AppState.currentState === "active");
  const listRef = useRef<FlatList<HeroSlide>>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slideWidth = Math.max(260, screenWidth - HORIZONTAL_MARGIN * 2 - PEEK);
  const itemLength = slideWidth + SLIDE_GAP;
  const data = useMemo(() => slides.filter((slide) => slide.isActive && slide.imageUrl !== undefined), [slides]);

  const clearAutoplayTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const scheduleAutoplay = useCallback(() => {
    clearAutoplayTimer();
    if (!shouldRunHeroAutoplay({ active: isActive, appStateActive, slideCount: data.length })) return;
    timerRef.current = setTimeout(() => {
      const nextIndex = nextHeroIndex(activeIndex, data.length);
      listRef.current?.scrollToOffset({ offset: nextIndex * itemLength, animated: true });
      setActiveIndex(nextIndex);
      timerRef.current = null;
    }, HERO_AUTOPLAY_INTERVAL);
  }, [activeIndex, appStateActive, clearAutoplayTimer, data.length, isActive, itemLength]);

  useEffect(() => {
    setActiveIndex((current) => clampHeroIndex(current, data.length));
  }, [data.length]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => setAppStateActive(nextState === "active"));
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    scheduleAutoplay();
    return clearAutoplayTimer;
  }, [clearAutoplayTimer, scheduleAutoplay]);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offset = event.nativeEvent.contentOffset.x;
    const index = Math.max(0, Math.min(data.length - 1, Math.round(Math.abs(offset) / itemLength)));
    setActiveIndex(index);
  }, [data.length, itemLength]);

  const handleScrollBeginDrag = useCallback(() => {
    clearAutoplayTimer();
  }, [clearAutoplayTimer]);

  const handleMomentumScrollEnd = useCallback(() => {
    scheduleAutoplay();
  }, [scheduleAutoplay]);

  const renderItem = useCallback(({ item }: ListRenderItemInfo<HeroSlide>) => <MarketHeroSlide slide={item} width={slideWidth} colors={colors} onPress={onPressSlide ? () => onPressSlide(item) : undefined} />, [colors, onPressSlide, slideWidth]);

  if (data.length === 0) return null;

  return (
    <View style={styles.container} accessibilityLabel="شرائح السوق الترويجية">
      <FlatList ref={listRef} horizontal inverted={isRTL} data={data} keyExtractor={(item) => item.id} renderItem={renderItem} showsHorizontalScrollIndicator={false} snapToInterval={itemLength} decelerationRate="fast" disableIntervalMomentum onScroll={handleScroll} onScrollBeginDrag={handleScrollBeginDrag} onMomentumScrollEnd={handleMomentumScrollEnd} scrollEventThrottle={16} getItemLayout={(_, index) => ({ length: itemLength, offset: itemLength * index, index })} contentContainerStyle={styles.listContent} ItemSeparatorComponent={() => <View style={{ width: SLIDE_GAP }} />} />
      {data.length > 1 && <View style={styles.pagination} accessibilityLabel={`الشريحة ${activeIndex + 1} من ${data.length}`}>{data.map((slide, index) => <View key={slide.id} style={[styles.dot, { backgroundColor: index === activeIndex ? colors.primary : colors.borderSubtle }]} />)}</View>}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { width: "100%", marginBottom: 16 },
  listContent: { paddingHorizontal: HORIZONTAL_MARGIN },
  slide: { height: 206, borderRadius: 22, overflow: "hidden", borderWidth: 1, position: "relative" },
  image: { ...StyleSheet.absoluteFill },
  placeholder: { ...StyleSheet.absoluteFill, alignItems: "flex-end", justifyContent: "center", paddingRight: 36, overflow: "hidden" },
  placeholderOrb: { position: "absolute", width: 180, height: 180, borderRadius: 90, right: -60, top: -54, backgroundColor: "rgba(255,255,255,0.14)" },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(0,0,0,0.32)" },
  content: { flex: 1, justifyContent: "flex-end", alignItems: "flex-end", padding: 18, gap: 7 },
  typePill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 99 },
  typeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  title: { color: "#fff", fontSize: 24, lineHeight: 30, fontWeight: "900", textAlign: "right", maxWidth: "92%" },
  description: { color: "rgba(255,255,255,0.9)", fontSize: 13, lineHeight: 19, fontWeight: "600", textAlign: "right", maxWidth: "90%" },
  cta: { flexDirection: "row-reverse", alignItems: "center", gap: 6, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginTop: 3 },
  ctaText: { color: "#fff", fontSize: 12, fontWeight: "800" },
  pagination: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, marginTop: 10 },
  dot: { width: 7, height: 7, borderRadius: 4 },
});
