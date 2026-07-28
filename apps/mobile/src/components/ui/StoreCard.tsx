import type { StyleProp, ViewStyle } from "react-native";
import React from "react";
import { 
  View, 
  StyleSheet, 
  Image, 
  I18nManager 
} from "react-native";
import { Typography } from "./Typography";
import Card from "./Card";
import { TOKENS } from "../../constants/tokens";
import { getThemeColors, DEFAULT_THEME, ThemeType } from "../../constants/theme";
import { Ionicons } from "@expo/vector-icons";

interface StoreCardProps {
  id: string;
  name: string;
  category: string;
  rating: string;
  deliveryTime?: string;
  coverImage?: string;
  logoImage?: string;
  isOpen?: boolean;
  isFeatured?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  theme?: ThemeType;
  address?: string;
}

export const StoreCard: React.FC<StoreCardProps> = ({
  name,
  category,
  rating,
  deliveryTime = "20-30 دقيقة",
  coverImage,
  logoImage,
  isOpen = true,
  isFeatured = false,
  onPress,
  style,
  theme = DEFAULT_THEME,
  address,
}) => {
  const colors = getThemeColors(theme);
  const isRTL = I18nManager.isRTL;

  return (
    <Card 
      onPress={onPress} 
      style={[styles.container, style, { backgroundColor: colors.bgElevated }]}
    >
      <View style={styles.imageContainer}>
        {coverImage ? (
          <Image 
            source={{ uri: coverImage }} 
            style={[styles.image, { backgroundColor: colors.bgSurface }]}
            resizeMode="cover"
          />
        ) : logoImage ? (
          <View style={[styles.image, styles.logoFallbackContainer, { backgroundColor: colors.primary + "12" }]}>
            <Image source={{ uri: logoImage }} style={styles.fallbackLogo} resizeMode="cover" />
          </View>
        ) : (
          <View style={[styles.image, styles.placeholderContainer, { backgroundColor: colors.primary + "12" }]}>
            <Ionicons name="storefront" size={32} color={colors.primary} />
            <Typography variant="caption" color="primary" style={{ marginTop: 4, fontWeight: "600" }}>{name}</Typography>
          </View>
        )}
        
        <View style={[styles.badgesContainer, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <View 
            style={[
              styles.badge,
              { 
                backgroundColor: isOpen ? colors.success : colors.error,
              }
            ]}
          >
            <Typography 
              variant="caption" 
              align="center"
              style={{ color: colors.textOnBrand, fontWeight: "700" }}
            >
              {isOpen ? "مفتوح" : "مغلق"}
            </Typography>
          </View>
          
          {isFeatured && (
            <View 
              style={[
                styles.badge,
                { backgroundColor: colors.primary }
              ]}
            >
              <Typography 
                variant="caption" 
                align="center"
                style={{ color: colors.textOnBrand, fontWeight: "700" }}
              >
                مميز
              </Typography>
            </View>
          )}
        </View>
      </View>
      
      <View style={styles.content}>
        <Typography 
          variant="h3" 
          numberOfLines={1} 
          align="right"
          style={[styles.storeName, { color: colors.textPrimary }]}
        >
          {name}
        </Typography>
        
        <Typography 
          variant="caption" 
          color="secondary" 
          numberOfLines={1}
          align="right"
          style={[styles.category, { color: colors.textSecondary }]}
        >
          {category}
        </Typography>
        
        {address ? (
          <View style={[styles.addressRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <Ionicons 
              name="location-outline" 
              size={12} 
              color={colors.textSecondary}
              style={{ marginRight: isRTL ? 0 : 4, marginLeft: isRTL ? 4 : 0 }}
            />
            <Typography 
              variant="caption" 
              color="secondary"
              align="right"
              numberOfLines={1}
              style={{ color: colors.textSecondary, fontSize: 11 }}
            >
              {address}
            </Typography>
          </View>
        ) : null}
        
        <View style={[styles.footer, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <View style={[styles.ratingContainer, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <Ionicons 
              name="star" 
              size={14} 
              color={colors.primary}
              style={{ marginRight: isRTL ? 0 : 4, marginLeft: isRTL ? 4 : 0 }}
            />
            <Typography 
              variant="caption" 
              align="right"
              style={{ fontWeight: "700", color: colors.textPrimary }}
            >
              {rating}
            </Typography>
          </View>
          
          <View style={[styles.deliveryContainer, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <Ionicons 
              name="time-outline" 
              size={14} 
              color={colors.textSecondary}
              style={{ marginRight: isRTL ? 0 : 4, marginLeft: isRTL ? 4 : 0 }}
            />
            <Typography 
              variant="caption" 
              color="secondary"
              align="right"
              style={{ color: colors.textSecondary }}
            >
              {deliveryTime}
            </Typography>
          </View>
        </View>
      </View>
    </Card>
  );
};

const IMAGE_HEIGHT = 140;

const styles = StyleSheet.create({
  container: {
    width: "100%",
    padding: 0,
    marginVertical: TOKENS.spacing.xs,
    overflow: "hidden",
  },
  imageContainer: {
    width: "100%",
    height: IMAGE_HEIGHT,
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  placeholderContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  logoFallbackContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  fallbackLogo: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  badgesContainer: {
    position: "absolute",
    top: TOKENS.spacing.sm,
    right: TOKENS.spacing.sm,
    gap: TOKENS.spacing.xs,
  },
  badge: {
    paddingHorizontal: TOKENS.spacing.sm,
    paddingVertical: 4,
    borderRadius: TOKENS.radius.sm,
  },
  content: {
    padding: TOKENS.spacing.md,
  },
  storeName: {
    marginBottom: 2,
    fontWeight: "700",
  },
  category: {
    marginBottom: 4,
  },
  addressRow: {
    alignItems: "center",
    gap: 4,
    marginBottom: 8,
  },
  footer: {
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  ratingContainer: {
    alignItems: "center",
    gap: 4,
  },
  deliveryContainer: {
    alignItems: "center",
    gap: 4,
  },
});
