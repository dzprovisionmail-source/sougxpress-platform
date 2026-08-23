import React from "react";
import { Image, ImageStyle, StyleProp } from "react-native";
import { LOGO_OFFICIAL_WORDMARK } from "@/constants/brand";

export type BrandWordmarkSize = "compact" | "header" | "market";

interface BrandWordmarkProps {
  size?: BrandWordmarkSize;
  style?: StyleProp<ImageStyle>;
  accessibilityLabel?: string;
}

const SIZE_STYLES: Record<BrandWordmarkSize, ImageStyle> = {
  compact: { width: 84, height: 21 },
  header: { width: 104, height: 26 },
  market: { width: 118, height: 30 },
};

/**
 * Shared official Soug-XPRESS wordmark.
 * Width-driven presets preserve the source asset's 4:1 aspect ratio.
 */
export const BrandWordmark: React.FC<BrandWordmarkProps> = ({
  size = "header",
  style,
  accessibilityLabel = "Soug-XPRESS",
}) => (
  <Image
    source={LOGO_OFFICIAL_WORDMARK}
    style={[SIZE_STYLES[size], style]}
    resizeMode="contain"
    accessible
    accessibilityRole="image"
    accessibilityLabel={accessibilityLabel}
  />
);

export default BrandWordmark;
